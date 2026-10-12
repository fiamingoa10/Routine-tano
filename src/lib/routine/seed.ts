import {
  blankDraft,
  makeActivity,
  type Activity,
  type ActivityDraft,
  type Category,
  type Course,
  type FamilyMember,
  type FamilyTask,
  type Goal,
  type Place,
  type PrepItem,
  type Profile,
  type RoutineTemplate,
  type Subject,
} from "./model";
import { addDaysIso, isoDate, parseLocal } from "./time";

const PREP_CLASS = [
  "Preparar el material",
  "Revisar la planificación",
  "Llevar documentos",
  "Preparar ejercicios",
];
const PREP_UNI = [
  "Llevar apuntes",
  "Llevar material jurídico",
  "Cargar el ordenador",
  "Revisar el aula",
];
const PREP_MEET = [
  "Preparar la asignación",
  "Llevar publicaciones",
  "Revisar las notas",
  "Confirmar horario y lugar",
];
const PREP_GYM = ["Ropa deportiva", "Calzado", "Agua", "Toalla"];

export const DEFAULT_PREP = [
  "Preparar ropa",
  "Cargar el celular",
  "Llevar documentos",
  "Preparar mochila/bolso",
  "Preparar comida",
  "Ropa de gimnasio",
  "Revisar transporte",
  "Configurar alarma",
  "Cargar la computadora o tableta",
  "Preparar botella de agua",
  "Revisar materiales",
  "Confirmar citas",
  "Preparar publicaciones o asignaciones",
];

function act(id: string, draft: ActivityDraft, past: boolean): Activity {
  return makeActivity({
    ...draft,
    id,
    status: past && draft.status === "pendiente" ? "realizada" : draft.status,
  });
}

function base(
  partial: Partial<ActivityDraft> & Pick<ActivityDraft, "name" | "categoryId" | "date">,
): ActivityDraft {
  return blankDraft(partial);
}

export function buildCategories(): Category[] {
  return [
    { id: "profesorado", name: "Profesorado", icon: "school", color: "teach", description: "Clases, preparación y corrección.", visible: true, order: 1 },
    { id: "universidad", name: "Universidad", icon: "scale", color: "uni", description: "Abogacía: cursada, entregas y exámenes.", visible: true, order: 2 },
    { id: "estudio", name: "Estudio", icon: "book", color: "study", description: "Estudio personal y repasos.", visible: true, order: 3 },
    { id: "espiritual", name: "Espiritual", icon: "flower", color: "spirit", description: "Estudio, reuniones y adoración en familia.", visible: true, order: 4 },
    { id: "predicacion", name: "Predicación", icon: "megaphone", color: "preach", description: "Salidas al territorio y preparación.", visible: true, order: 5 },
    { id: "alimentacion", name: "Alimentación", icon: "utensils", color: "food", description: "Comidas y preparación.", visible: true, order: 6 },
    { id: "gimnasio", name: "Gimnasio", icon: "dumbbell", color: "gym", description: "Entrenamiento y movimiento.", visible: true, order: 7 },
    { id: "descanso", name: "Descanso", icon: "moon", color: "rest", description: "Sueño, pausas y noches libres.", visible: true, order: 8 },
    { id: "familia", name: "Familia", icon: "users", color: "family", description: "Tiempo juntos.", visible: true, order: 9 },
    { id: "hogar", name: "Hogar", icon: "house", color: "home", description: "Tareas de la casa y trámites.", visible: true, order: 10 },
    { id: "desplazamiento", name: "Desplazamiento", icon: "bus", color: "travel", description: "Viajes entre lugares.", visible: true, order: 11 },
    { id: "personal", name: "Personal", icon: "heart", color: "personal", description: "Vida personal y tiempo libre.", visible: true, order: 12 },
  ];
}

function workday(iso: string, dow: number, mode: "today" | "tomorrow" | "other", past: boolean): Activity[] {
  const items: Activity[] = [];
  const push = (id: string, draft: ActivityDraft) => items.push(act(`${iso}-${id}`, draft, past));

  push("desayuno", base({
    name: "Desayuno",
    categoryId: "alimentacion",
    kind: "comida",
    date: iso,
    start: "06:30",
    end: "06:55",
    placeId: "hogar",
    flexible: false,
    priority: "media",
  }));
  push("viaje-escuela", base({
    name: "Viaje a la escuela",
    categoryId: "desplazamiento",
    kind: "actividad",
    date: iso,
    start: "07:05",
    end: "07:40",
    placeId: "escuela",
    travelMin: 30,
    transport: "bus",
    locked: true,
    flexible: false,
    materials: ["Boleto o tarjeta"],
  }));

  if (mode === "other") {
    push("clases", base({
      name: "Clases en la escuela",
      categoryId: "profesorado",
      kind: "actividad",
      date: iso,
      start: "08:00",
      end: "12:10",
      placeId: "escuela",
      locked: true,
      flexible: false,
      prep: PREP_CLASS,
      people: ["Cursos del día"],
    }));
  } else {
    push("lengua-a", base({
      name: "Lengua 4° A",
      categoryId: "profesorado",
      subcategory: "Lengua",
      kind: "actividad",
      date: iso,
      start: "08:00",
      end: "09:20",
      placeId: "escuela",
      locked: true,
      flexible: false,
      prep: PREP_CLASS,
      people: ["4° A"],
      materials: ["Planificación", "Ejercicios"],
    }));
    push("lengua-b", base({
      name: "Lengua 4° B",
      categoryId: "profesorado",
      kind: "actividad",
      date: iso,
      start: "09:30",
      end: "10:50",
      placeId: "escuela",
      locked: true,
      flexible: false,
      people: ["4° B"],
      prep: ["Llevar la misma carpeta de Lengua"],
    }));
    push("literatura", base({
      name: "Literatura 2° C",
      categoryId: "profesorado",
      kind: "actividad",
      date: iso,
      start: "11:00",
      end: "12:10",
      placeId: "escuela",
      locked: true,
      flexible: false,
      people: ["2° C"],
      materials: ["Cuentos impresos"],
    }));
  }

  push("almuerzo", base({
    name: "Almuerzo",
    categoryId: "alimentacion",
    kind: "comida",
    date: iso,
    start: "12:25",
    end: "13:05",
    placeId: "escuela",
    priority: "alta",
    flexible: false,
  }));

  if (mode === "today") {
    push("preparar", base({
      name: "Preparar las clases de mañana",
      categoryId: "profesorado",
      kind: "tarea",
      date: iso,
      start: "13:10",
      end: "14:20",
      placeId: "escuela",
      flexible: true,
      priority: "alta",
      prep: ["Revisar la planificación", "Armar ejercicios"],
    }));
    push("corregir", base({
      name: "Corregir evaluaciones",
      categoryId: "profesorado",
      kind: "tarea",
      date: iso,
      start: "13:40",
      end: "15:00",
      placeId: "escuela",
      flexible: true,
      priority: "media",
      notes: "Se pisa con la preparación y con la salida a la facultad. Se puede acortar o mover.",
    }));
  } else if (mode === "tomorrow") {
    push("preparar", base({
      name: "Preparar materiales de Lengua",
      categoryId: "profesorado",
      kind: "tarea",
      date: iso,
      start: "13:15",
      end: "14:00",
      flexible: true,
      priority: "media",
      placeId: "escuela",
    }));
  }

  const uniDay = dow === 2 || dow === 4 || mode === "today";
  if (uniDay && mode !== "other") {
    push("viaje-uni", base({
      name: "Viaje a la facultad",
      categoryId: "desplazamiento",
      date: iso,
      start: "14:30",
      end: "15:00",
      placeId: "uni",
      travelMin: 25,
      transport: "bus",
      locked: true,
      flexible: false,
    }));
    push("civil", base({
      name: "Derecho Civil II",
      categoryId: "universidad",
      subcategory: "Cursada",
      date: iso,
      start: "15:00",
      end: "17:00",
      placeId: "uni",
      address: "Aula 3",
      locked: true,
      flexible: false,
      prep: PREP_UNI,
      materials: ["Código Civil y Comercial", "Apuntes", "Ordenador"],
      people: ["Prof. Álvarez"],
    }));
  } else if (dow === 2 || dow === 4) {
    push("civil", base({
      name: "Derecho Civil II",
      categoryId: "universidad",
      date: iso,
      start: "15:00",
      end: "17:00",
      placeId: "uni",
      locked: true,
      flexible: false,
      travelMin: 25,
      transport: "bus",
      prep: PREP_UNI,
    }));
  }

  if (mode === "tomorrow" && !uniDay) {
    push("estudio", base({
      name: "Estudio de Obligaciones",
      categoryId: "estudio",
      kind: "estudio",
      date: iso,
      start: "16:00",
      end: "17:30",
      placeId: "hogar",
      flexible: true,
      priority: "alta",
      materials: ["Manual", "Resumen de la clase"],
      prep: ["Dejar el escritorio listo esta noche"],
    }));
  }

  if (dow === 1 || dow === 3 || dow === 5 || mode === "today") {
    const gymStart = mode === "today" ? "17:20" : "17:40";
    const gymEnd = mode === "today" ? "18:20" : "18:40";
    push("gym", base({
      name: "Gimnasio",
      categoryId: "gimnasio",
      kind: "entrenamiento",
      date: iso,
      start: gymStart,
      end: gymEnd,
      placeId: "gym",
      travelMin: mode === "today" ? 25 : 20,
      transport: "bus",
      flexible: true,
      prep: PREP_GYM,
      materials: ["Ropa", "Agua", "Toalla"],
    }));
  }

  if (dow === 4 || (mode === "today" && parseLocal(iso).getDay() === 4)) {
    push("reunion", base({
      name: "Reunión entre semana",
      categoryId: "espiritual",
      subcategory: "Congregación",
      date: iso,
      start: "19:00",
      end: "20:45",
      placeId: "salon",
      locked: true,
      flexible: false,
      travelMin: 20,
      transport: "auto",
      prep: PREP_MEET,
      materials: ["Publicaciones", "Biblia", "Notas de la asignación"],
      people: ["Congregación"],
    }));
  }

  push("cena", base({
    name: "Cena en familia",
    categoryId: "familia",
    kind: "comida",
    date: iso,
    start: "21:00",
    end: "21:35",
    placeId: "hogar",
    flexible: false,
    people: ["Martín", "Sofía"],
  }));

  if (mode !== "other") {
    push("adoracion", base({
      name: "Adoración en familia",
      categoryId: "espiritual",
      date: iso,
      start: "21:40",
      end: "22:05",
      placeId: "hogar",
      flexible: true,
      people: ["Familia"],
      prep: ["Elegir el texto y un comentario breve"],
    }));
  }

  push("descanso", base({
    name: "Rutina de sueño",
    categoryId: "descanso",
    kind: "descanso",
    date: iso,
    start: "22:20",
    end: "22:45",
    placeId: "hogar",
    flexible: false,
    priority: "alta",
  }));

  return items;
}

function saturday(iso: string, past: boolean): Activity[] {
  const push = (id: string, draft: ActivityDraft) => act(`${iso}-${id}`, draft, past);
  return [
    push("desayuno", base({ name: "Desayuno tranquilo", categoryId: "alimentacion", kind: "comida", date: iso, start: "08:00", end: "08:30", placeId: "hogar" })),
    push("pred", base({
      name: "Predicación",
      categoryId: "predicacion",
      date: iso,
      start: "09:30",
      end: "12:00",
      placeId: "territorio",
      locked: true,
      flexible: false,
      travelMin: 20,
      transport: "pie",
      prep: ["Revisar el territorio", "Llevar publicaciones", "Cargar el teléfono"],
      materials: ["Publicaciones", "Mapa del territorio"],
    })),
    push("almuerzo", base({ name: "Almuerzo", categoryId: "alimentacion", kind: "comida", date: iso, start: "12:40", end: "13:30", placeId: "hogar" })),
    push("estudio", base({ name: "Estudio personal", categoryId: "estudio", kind: "estudio", date: iso, start: "16:00", end: "17:30", placeId: "hogar", flexible: true, priority: "media" })),
    push("compras", base({ name: "Compras de la semana", categoryId: "hogar", kind: "tarea", date: iso, start: "18:00", end: "19:00", placeId: null, flexible: true, people: ["Martín"] })),
    push("libre", base({ name: "Tarde libre en casa", categoryId: "personal", date: iso, start: "19:30", end: "21:00", placeId: "hogar", flexible: true, priority: "baja" })),
  ];
}

function sunday(iso: string, past: boolean): Activity[] {
  const push = (id: string, draft: ActivityDraft) => act(`${iso}-${id}`, draft, past);
  return [
    push("reunion", base({
      name: "Reunión del fin de semana",
      categoryId: "espiritual",
      date: iso,
      start: "10:00",
      end: "11:45",
      placeId: "salon",
      locked: true,
      flexible: false,
      travelMin: 20,
      transport: "auto",
      prep: ["Preparar la ropa", "Salir con margen"],
    })),
    push("almuerzo", base({ name: "Almuerzo familiar", categoryId: "familia", kind: "comida", date: iso, start: "13:00", end: "14:30", placeId: "hogar", people: ["Familia"] })),
    push("descanso", base({ name: "Descanso", categoryId: "descanso", kind: "descanso", date: iso, start: "15:00", end: "16:30", placeId: "hogar", flexible: true })),
    push("semana", base({ name: "Mirar la semana que viene", categoryId: "personal", kind: "tarea", date: iso, start: "18:00", end: "18:40", flexible: true, priority: "media" })),
  ];
}

export function buildActivities(now: Date): Activity[] {
  const today = isoDate(now);
  const tomorrow = addDaysIso(today, 1);
  const monday = parseLocal(today);
  const dow0 = monday.getDay();
  const diff = dow0 === 0 ? -6 : 1 - dow0;
  monday.setDate(monday.getDate() + diff);

  const activities: Activity[] = [];
  let tomorrowAdded = false;
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const iso = isoDate(d);
    const past = iso < today;
    const dow = d.getDay();
    if (iso === today) {
      if (dow === 6) activities.push(...saturday(iso, false));
      else if (dow === 0) activities.push(...sunday(iso, false));
      else activities.push(...workday(iso, dow, "today", false));
    } else if (iso === tomorrow) {
      tomorrowAdded = true;
      if (dow === 6) activities.push(...saturday(iso, false));
      else if (dow === 0) activities.push(...sunday(iso, false));
      else activities.push(...workday(iso, dow, "tomorrow", false));
    } else if (dow === 6) activities.push(...saturday(iso, past));
    else if (dow === 0) activities.push(...sunday(iso, past));
    else activities.push(...workday(iso, dow, "other", past));
  }
  if (!tomorrowAdded) {
    const d = parseLocal(tomorrow);
    const dow = d.getDay();
    if (dow === 6) activities.push(...saturday(tomorrow, false));
    else if (dow === 0) activities.push(...sunday(tomorrow, false));
    else activities.push(...workday(tomorrow, dow, "tomorrow", false));
  }

  const y = addDaysIso(today, -1);
  activities.push(
    act(
      "extra-correccion",
      base({
        name: "Terminar la corrección de Literatura",
        categoryId: "profesorado",
        kind: "tarea",
        date: y,
        start: "18:00",
        end: "18:40",
        flexible: true,
        priority: "alta",
        status: "pendiente",
        notes: "Quedó de ayer. Se puede pasar a un hueco de esta semana.",
      }),
      false,
    ),
  );
  activities.push(
    makeActivity({
      ...base({
        name: "Trabajo práctico de Obligaciones",
        categoryId: "universidad",
        kind: "tarea",
        date: "",
        priority: "alta",
        flexible: true,
        notes: "Sin fecha. El planificador puede buscarle un lugar.",
        materials: ["Consigna", "Código"],
      }),
      id: "extra-tp",
    }),
  );
  activities.push(
    makeActivity({
      ...base({
        name: "Leer el capítulo de Personas",
        categoryId: "estudio",
        kind: "estudio",
        date: "",
        priority: "media",
        flexible: true,
      }),
      id: "extra-lectura",
    }),
  );
  const exam = addDaysIso(today, 12);
  activities.push(
    makeActivity({
      ...base({
        name: "Parcial de Derecho Civil II",
        categoryId: "universidad",
        kind: "actividad",
        date: exam,
        start: "18:00",
        end: "20:00",
        placeId: "uni",
        locked: true,
        flexible: false,
        priority: "alta",
        prep: ["Repasar unidades 1 a 4", "Dormir bien la noche anterior"],
        materials: ["Resúmenes", "Código autorizado"],
      }),
      id: "extra-parcial",
    }),
  );
  return activities;
}

export function buildRoutines(): RoutineTemplate[] {
  const item = (
    name: string,
    categoryId: string,
    start: string,
    end: string,
    extra: Partial<RoutineTemplate["items"][number]> = {},
  ): RoutineTemplate["items"][number] => ({
    name,
    categoryId,
    start,
    end,
    kind: categoryId === "alimentacion" ? "comida" : categoryId === "gimnasio" ? "entrenamiento" : categoryId === "estudio" ? "estudio" : categoryId === "descanso" ? "descanso" : "actividad",
    prep: [] as string[],
    locked: false,
    placeId: null,
    travelMin: 0,
    ...extra,
  });
  return [
    {
      id: "rt-trabajo",
      name: "Día de trabajo (escuela)",
      description: "Clases, preparación y correcciones",
      kind: "laborable",
      items: [
        item("Desayuno", "alimentacion", "06:30", "06:55", { placeId: "hogar" }),
        item("Viaje a la escuela", "desplazamiento", "07:05", "07:40", { placeId: "escuela", travelMin: 30, locked: true }),
        item("Clases", "profesorado", "08:00", "12:10", { placeId: "escuela", locked: true, prep: PREP_CLASS }),
        item("Almuerzo", "alimentacion", "12:25", "13:05"),
        item("Preparar clases", "profesorado", "13:15", "14:15"),
        item("Cena en familia", "familia", "21:00", "21:40", { placeId: "hogar" }),
      ],
    },
    {
      id: "rt-estudio",
      name: "Estudio universitario (Abogacía)",
      description: "Clases, estudio y trabajos",
      kind: "diaria",
      items: [
        item("Repaso de Civil", "estudio", "09:00", "10:30", { prep: ["Abrir el resumen de la última clase"] }),
        item("Pausa", "descanso", "10:30", "10:45"),
        item("Obligaciones", "universidad", "10:45", "12:15"),
        item("Almuerzo", "alimentacion", "12:30", "13:10"),
        item("Ejercicios", "estudio", "15:00", "16:30"),
      ],
    },
    {
      id: "rt-clases",
      name: "Día de clases",
      description: "Mañana escolar con recreos ya incluidos en el bloque.",
      kind: "laborable",
      items: [
        item("Lengua", "profesorado", "08:00", "10:00", { locked: true, placeId: "escuela" }),
        item("Literatura", "profesorado", "10:20", "12:10", { locked: true, placeId: "escuela" }),
        item("Almuerzo", "alimentacion", "12:25", "13:00"),
      ],
    },
    {
      id: "rt-reunion",
      name: "Actividades espirituales",
      description: "Reuniones, predicación y estudio personal",
      kind: "especial",
      items: [
        item("Revisar la asignación", "espiritual", "17:30", "18:10", { prep: PREP_MEET }),
        item("Viaje al Salón", "desplazamiento", "18:30", "18:55", { placeId: "salon", travelMin: 20 }),
        item("Reunión", "espiritual", "19:00", "20:45", { placeId: "salon", locked: true }),
      ],
    },
    {
      id: "rt-pred",
      name: "Día de predicación",
      description: "Salida de sábado por la mañana.",
      kind: "fin_de_semana",
      items: [
        item("Preparar publicaciones", "predicacion", "08:40", "09:10", { prep: ["Revisar el territorio"] }),
        item("Predicación", "predicacion", "09:30", "12:00", { placeId: "territorio", locked: true, travelMin: 15 }),
        item("Almuerzo", "alimentacion", "12:40", "13:30"),
      ],
    },
    {
      id: "rt-gym",
      name: "Gimnasio",
      description: "Entrenamiento y bienestar",
      kind: "diaria",
      items: [
        item("Preparar el bolso", "gimnasio", "16:40", "16:55", { prep: PREP_GYM }),
        item("Viaje", "desplazamiento", "17:00", "17:25", { travelMin: 20, placeId: "gym" }),
        item("Entrenamiento", "gimnasio", "17:30", "18:30", { placeId: "gym", kind: "entrenamiento" }),
      ],
    },
    {
      id: "rt-food",
      name: "Alimentación saludable",
      description: "Plan de comidas y preparación",
      kind: "diaria",
      items: [
        item("Desayuno", "alimentacion", "07:00", "07:30", { placeId: "hogar" }),
        item("Almuerzo", "alimentacion", "12:30", "13:10", { placeId: "hogar" }),
        item("Merienda", "alimentacion", "16:30", "16:50", { placeId: "hogar" }),
        item("Cena", "alimentacion", "21:00", "21:40", { placeId: "hogar" }),
      ],
    },
    {
      id: "rt-finde",
      name: "Fin de semana",
      description: "Más aire, familia y un bloque de estudio si entra.",
      kind: "fin_de_semana",
      items: [
        item("Desayuno", "alimentacion", "08:30", "09:10"),
        item("Tiempo en familia", "familia", "10:00", "12:00"),
        item("Estudio breve", "estudio", "16:00", "17:00"),
      ],
    },
    {
      id: "rt-descanso",
      name: "Día de descanso",
      description: "Poco programado, a propósito.",
      kind: "especial",
      items: [
        item("Desayuno", "alimentacion", "09:00", "09:30"),
        item("Descanso", "descanso", "11:00", "12:30", { kind: "descanso" }),
        item("Caminata", "personal", "17:00", "17:40"),
      ],
    },
    {
      id: "rt-examen",
      name: "Semana de exámenes",
      description: "Estudio repartido, con comida y sueño intactos.",
      kind: "temporal",
      items: [
        item("Estudio profundo", "estudio", "08:30", "10:30"),
        item("Pausa", "descanso", "10:30", "10:50"),
        item("Práctica", "universidad", "10:50", "12:20"),
        item("Almuerzo", "alimentacion", "12:40", "13:20"),
        item("Repaso corto", "estudio", "16:00", "17:00"),
      ],
    },
    {
      id: "rt-hogar",
      name: "Organización del hogar",
      description: "Un bloque doméstico sin ocupar el día entero.",
      kind: "familiar",
      items: [
        item("Ordenar la cocina", "hogar", "10:00", "10:40"),
        item("Lavar ropa", "hogar", "10:45", "11:30"),
        item("Compras", "hogar", "11:45", "12:45"),
      ],
    },
    {
      id: "rt-manana",
      name: "Preparación del día siguiente",
      description: "Cierre corto de la noche.",
      kind: "diaria",
      items: [
        item("Revisar la agenda de mañana", "personal", "21:15", "21:30"),
        item("Dejar el bolso listo", "hogar", "21:30", "21:45", { prep: ["Ropa", "Documentos", "Cargadores"] }),
        item("Configurar la alarma", "descanso", "21:45", "21:50"),
      ],
    },
  ];
}

export function buildGoals(today: string): Goal[] {
  const due = addDaysIso(today, 20);
  return [
    { id: "g1", name: "Estudiar 6 horas por semana", area: "Estudios", description: "Civil, Penal y Obligaciones, en bloques cortos.", start: today, due, frequency: "Semanal", target: 6, unit: "horas", priority: "alta", progress: 2.5, status: "en_progreso", categoryId: "estudio" },
    { id: "g2", name: "Entrenar 3 días", area: "Gimnasio", description: "Aunque sea una versión más corta.", start: today, due, frequency: "Semanal", target: 3, unit: "días", priority: "media", progress: 1, status: "en_progreso", categoryId: "gimnasio" },
    { id: "g3", name: "Preparar las reuniones", area: "Actividades espirituales", description: "Asignación lista la noche anterior.", start: today, due, frequency: "Semanal", target: 2, unit: "reuniones", priority: "alta", progress: 1, status: "en_progreso", categoryId: "espiritual" },
    { id: "g4", name: "Mantener una noche libre", area: "Descanso", description: "Una tarde o noche sin obligaciones nuevas.", start: today, due, frequency: "Semanal", target: 1, unit: "noche", priority: "media", progress: 0, status: "no_iniciado", categoryId: "descanso" },
    { id: "g5", name: "Dormir 7 horas y media", area: "Descanso", description: "La hora de acostarse sigue a la de despertarse.", start: today, due, frequency: "Diaria", target: 7.5, unit: "horas", priority: "alta", progress: 7, status: "en_progreso", categoryId: "descanso" },
    { id: "g6", name: "Cerrar el trabajo práctico", area: "Universidad", description: "Obligaciones, antes del parcial.", start: today, due: addDaysIso(today, 10), frequency: "Una vez", target: 1, unit: "entrega", priority: "alta", progress: 0, status: "en_progreso", categoryId: "universidad" },
  ];
}

export function buildPlaces(): Place[] {
  return [
    { id: "hogar", name: "En casa", kind: "Hogar", address: "Casa" },
    { id: "escuela", name: "Escuela", kind: "Escuela", address: "Av. San Martín 420" },
    { id: "uni", name: "Facultad de Derecho", kind: "Universidad", address: "Calle 48 580" },
    { id: "gym", name: "Centro deportivo", kind: "Gimnasio", address: "Belgrano 210" },
    { id: "salon", name: "Salón del Reino", kind: "Salón del Reino", address: "Los Álamos 115" },
    { id: "territorio", name: "Territorio centro", kind: "Territorio", address: "Zona céntrica" },
  ];
}

export function buildFamily(today: string): { family: FamilyMember[]; familyTasks: FamilyTask[] } {
  return {
    family: [
      { id: "lolo", name: "Lolo", role: "Yo" },
      { id: "martin", name: "Martín", role: "Pareja" },
      { id: "sofia", name: "Sofía", role: "Hija" },
    ],
    familyTasks: [
      { id: "ft1", title: "Compras del sábado", assigneeId: "martin", date: addDaysIso(today, (6 - parseLocal(today).getDay() + 7) % 7 || 7), time: "18:00", status: "pendiente", privacy: "familia", comment: "Lista en la cocina." },
      { id: "ft2", title: "Preparar el almuerzo del domingo", assigneeId: "lolo", date: today, time: "11:00", status: "pendiente", privacy: "familia", comment: "" },
    ],
  };
}

export function buildSubjects(): Subject[] {
  return [
    { id: "civil", name: "Derecho Civil II", teacher: "Prof. Álvarez", schedule: "Mar y jue 15:00", room: "Aula 3", mode: "Presencial", bibliography: "Código Civil y Comercial. Manual de la cátedra.", progress: 42, pendingTopics: ["Personas jurídicas", "Derechos personalísimos"], doneTopics: ["Persona humana", "Capacidad"] },
    { id: "penal", name: "Derecho Penal I", teacher: "Prof. Ruiz", schedule: "Vie 18:00", room: "Aula 8", mode: "Presencial", bibliography: "Código Penal. Casos de la guía.", progress: 28, pendingTopics: ["Tipicidad", "Antijuridicidad"], doneTopics: ["Introducción"] },
    { id: "obl", name: "Obligaciones", teacher: "Prof. Mendes", schedule: "A distancia", room: "Campus", mode: "Virtual", bibliography: "Guía de trabajos prácticos.", progress: 15, pendingTopics: ["Fuentes", "Pago"], doneTopics: [] },
  ];
}

export function buildCourses(): Course[] {
  return [
    { id: "c1", institution: "Escuela del Sol", grade: "4° A", subject: "Lengua", schedule: "Lun a vie 08:00", color: "teach" },
    { id: "c2", institution: "Escuela del Sol", grade: "4° B", subject: "Lengua", schedule: "Lun a vie 09:30", color: "study" },
    { id: "c3", institution: "Escuela del Sol", grade: "2° C", subject: "Literatura", schedule: "Lun a vie 11:00", color: "personal" },
  ];
}

export function buildProfile(): Profile {
  return {
    name: "Lolo",
    motto: "Organiza hoy, construye tu mañana",
    theme: "light",
    tomorrowReminder: "21:00",
    freeEvening: true,
    catchUpDate: "",
    alarm: "",
    energy: "media",
  };
}

export function buildPrep(): PrepItem[] {
  return DEFAULT_PREP.map((text, i) => ({ id: `prep-${i}`, text, done: i < 4 }));
}

export function createInitialData(_now: Date) {
  return {
    profile: {
      ...buildProfile(),
      name: "Mi perfil",
      catchUpDate: "",
      alarm: "",
    },
    categories: buildCategories(),
    activities: [] as Activity[],
    goals: [] as Goal[],
    places: [] as Place[],
    routines: [] as RoutineTemplate[],
    prep: [] as PrepItem[],
    prepFor: "",
    family: [] as FamilyMember[],
    familyTasks: [] as FamilyTask[],
    subjects: [] as Subject[],
    courses: [] as Course[],
    reviewedTomorrowOn: "",
  };
}
