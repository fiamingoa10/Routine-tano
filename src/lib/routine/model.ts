export const STATUSES = [
  "pendiente",
  "preparacion",
  "en_curso",
  "realizada",
  "parcial",
  "aplazada",
  "reprogramada",
  "omitida",
  "cancelada",
] as const;

export type ActivityStatus = (typeof STATUSES)[number];

export const OPEN_STATUSES: ActivityStatus[] = [
  "pendiente",
  "preparacion",
  "en_curso",
  "parcial",
  "aplazada",
  "reprogramada",
];

export type Priority = "alta" | "media" | "baja";
export type Energy = "baja" | "media" | "alta";
export type Reminder = "none" | "night_before" | "hours_before" | "hour_before" | "custom";
export type Repeat = "none" | "daily" | "weekdays" | "weekly" | "custom";
export type ActivityKind =
  | "actividad"
  | "tarea"
  | "comida"
  | "estudio"
  | "entrenamiento"
  | "recordatorio"
  | "nota"
  | "descanso";

export type Transport =
  | ""
  | "pie"
  | "bici"
  | "moto"
  | "auto"
  | "bus"
  | "tren"
  | "taxi"
  | "app"
  | "otro";

export type ColorKey =
  | "teach"
  | "uni"
  | "spirit"
  | "food"
  | "gym"
  | "rest"
  | "family"
  | "home"
  | "travel"
  | "study"
  | "personal"
  | "preach";

export type IconKey =
  | "school"
  | "scale"
  | "flower"
  | "megaphone"
  | "utensils"
  | "dumbbell"
  | "moon"
  | "users"
  | "house"
  | "bus"
  | "book"
  | "heart"
  | "sun"
  | "target";

export type CheckItem = { id: string; text: string; done: boolean };

export type HistoryEntry = {
  at: string;
  fromDate: string;
  fromStart: string;
  toDate: string;
  toStart: string;
  reason: string;
};

export type Activity = {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  subcategory: string;
  date: string;
  start: string;
  end: string;
  placeId: string | null;
  address: string;
  notes: string;
  priority: Priority;
  reminder: Reminder;
  repeat: Repeat;
  repeatDays: number[];
  skipDates: string[];
  seriesId: string;
  prep: string[];
  materials: string[];
  travelMin: number;
  transport: Transport;
  status: ActivityStatus;
  tags: string[];
  checklist: CheckItem[];
  people: string[];
  locked: boolean;
  flexible: boolean;
  postponeCount: number;
  history: HistoryEntry[];
  kind: ActivityKind;
  dispensable: boolean;
};

export type ActivityDraft = Omit<
  Activity,
  "id" | "checklist" | "history" | "postponeCount" | "skipDates" | "seriesId"
>;

export type Category = {
  id: string;
  name: string;
  icon: IconKey;
  color: ColorKey;
  description: string;
  visible: boolean;
  order: number;
};

export type GoalStatus =
  | "no_iniciado"
  | "en_progreso"
  | "cumplido"
  | "pausado"
  | "reprogramado"
  | "cancelado";

export type Goal = {
  id: string;
  name: string;
  area: string;
  description: string;
  start: string;
  due: string;
  frequency: string;
  target: number;
  unit: string;
  priority: Priority;
  progress: number;
  status: GoalStatus;
  categoryId: string;
};

export type Place = {
  id: string;
  name: string;
  kind: string;
  address: string;
};

export type RoutineKind =
  | "diaria"
  | "semanal"
  | "mensual"
  | "laborable"
  | "fin_de_semana"
  | "vacaciones"
  | "especial"
  | "temporal"
  | "familiar";

export type RoutineItem = {
  name: string;
  categoryId: string;
  start: string;
  end: string;
  kind: ActivityKind;
  prep: string[];
  locked: boolean;
  placeId: string | null;
  travelMin: number;
};

export type RoutineTemplate = {
  id: string;
  name: string;
  description: string;
  kind: RoutineKind;
  items: RoutineItem[];
};

export type PrepItem = { id: string; text: string; done: boolean };

export type FamilyMember = { id: string; name: string; role: string };

export type Privacy = "privado" | "persona" | "familia" | "ocupado" | "detalle";

export type FamilyTask = {
  id: string;
  title: string;
  assigneeId: string;
  date: string;
  time: string;
  status: "pendiente" | "hecha";
  privacy: Privacy;
  comment: string;
};

export type Subject = {
  id: string;
  name: string;
  teacher: string;
  schedule: string;
  room: string;
  mode: string;
  bibliography: string;
  progress: number;
  pendingTopics: string[];
  doneTopics: string[];
};

export type Course = {
  id: string;
  institution: string;
  grade: string;
  subject: string;
  schedule: string;
  color: ColorKey;
};

export type Profile = {
  name: string;
  motto: string;
  theme: "light" | "dark";
  tomorrowReminder: string;
  freeEvening: boolean;
  catchUpDate: string;
  alarm: string;
  energy: Energy;
};

export type Tab = "hoy" | "manana" | "calendario" | "rutinas" | "mas";

export type MoreScreen =
  | "hub"
  | "alimentacion"
  | "universidad"
  | "profesorado"
  | "espiritual"
  | "gimnasio"
  | "objetivos"
  | "organigrama"
  | "estadisticas"
  | "pendientes"
  | "familia"
  | "ajustes";

export type CalMode = "dia" | "semana" | "mes";

export type CreateKind =
  | "actividad"
  | "tarea"
  | "comida"
  | "recordatorio"
  | "estudio"
  | "entrenamiento"
  | "nota"
  | "objetivo"
  | "rutina";

export type Overlay =
  | { type: "none" }
  | { type: "create"; kind: CreateKind }
  | { type: "detail"; id: string }
  | { type: "focus"; id: string }
  | { type: "organize" }
  | { type: "prepare" }
  | { type: "close" }
  | { type: "week" }
  | { type: "menu" };

export type Change =
  | {
      type: "move";
      id: string;
      date: string;
      start: string;
      end: string;
      title: string;
      reason: string;
    }
  | { type: "shorten"; id: string; end: string; title: string; reason: string }
  | { type: "undate"; id: string; title: string; reason: string }
  | { type: "create"; draft: ActivityDraft; title: string; reason: string };

export const STATUS_LABEL: Record<ActivityStatus, string> = {
  pendiente: "Pendiente",
  preparacion: "En preparación",
  en_curso: "En curso",
  realizada: "Realizada",
  parcial: "Parcial",
  aplazada: "Aplazada",
  reprogramada: "Reprogramada",
  omitida: "Omitida",
  cancelada: "Cancelada",
};

export const TRANSPORT_LABEL: Record<Exclude<Transport, "">, string> = {
  pie: "A pie",
  bici: "Bicicleta",
  moto: "Motocicleta",
  auto: "Automóvil",
  bus: "Autobús",
  tren: "Tren",
  taxi: "Taxi",
  app: "App de transporte",
  otro: "Otro",
};

export const COLOR_KEYS: ColorKey[] = [
  "teach",
  "uni",
  "spirit",
  "food",
  "gym",
  "rest",
  "family",
  "home",
  "travel",
  "study",
  "personal",
  "preach",
];

export const ICON_KEYS: IconKey[] = [
  "school",
  "scale",
  "flower",
  "megaphone",
  "utensils",
  "dumbbell",
  "moon",
  "users",
  "house",
  "bus",
  "book",
  "heart",
  "sun",
  "target",
];

export function blankDraft(partial: Partial<ActivityDraft> = {}): ActivityDraft {
  return {
    name: "",
    description: "",
    categoryId: "personal",
    subcategory: "",
    date: "",
    start: "",
    end: "",
    placeId: null,
    address: "",
    notes: "",
    priority: "media",
    reminder: "none",
    repeat: "none",
    repeatDays: [],
    prep: [],
    materials: [],
    travelMin: 0,
    transport: "",
    status: "pendiente",
    tags: [],
    people: [],
    locked: false,
    flexible: true,
    kind: "actividad",
    dispensable: false,
    ...partial,
  };
}

export function makeActivity(
  draft: ActivityDraft & {
    id: string;
    checklist?: CheckItem[];
    history?: HistoryEntry[];
    postponeCount?: number;
    skipDates?: string[];
    seriesId?: string;
  },
): Activity {
  const prep = draft.prep ?? [];
  return {
    ...blankDraft(),
    ...draft,
    prep,
    skipDates: draft.skipDates ?? [],
    seriesId: draft.seriesId ?? "",
    postponeCount: draft.postponeCount ?? 0,
    history: draft.history ?? [],
    checklist:
      draft.checklist ??
      prep.map((text, i) => ({ id: `${draft.id}-c${i}`, text, done: false })),
  };
}

export function toDraft(a: Activity): ActivityDraft {
  return {
    name: a.name,
    description: a.description,
    categoryId: a.categoryId,
    subcategory: a.subcategory,
    date: a.date,
    start: a.start,
    end: a.end,
    placeId: a.placeId,
    address: a.address,
    notes: a.notes,
    priority: a.priority,
    reminder: a.reminder,
    repeat: a.repeat,
    repeatDays: a.repeatDays,
    prep: a.prep,
    materials: a.materials,
    travelMin: a.travelMin,
    transport: a.transport,
    status: a.status,
    tags: a.tags,
    people: a.people,
    locked: a.locked,
    flexible: a.flexible,
    kind: a.kind,
    dispensable: a.dispensable,
  };
}
