import { useRef, useState } from "react";
import {
  BarChart3,
  ChevronLeft,
  Dumbbell,
  Flower2,
  GraduationCap,
  LayoutGrid,
  Scale,
  Settings,
  Target,
  Users,
  Utensils,
  ListChecks,
} from "lucide-react";
import type { GoalStatus, IconKey, MoreScreen, Privacy } from "@/lib/routine/model";
import { COLOR_KEYS, ICON_KEYS, OPEN_STATUSES } from "@/lib/routine/model";
import { categoryMinutes } from "@/lib/routine/planner";
import { useRoutine } from "@/lib/routine/store";
import {
  disableNotifications,
  enableNotifications,
  notificationState,
  oneSignalConfigured,
} from "@/lib/onesignal";
import {
  addDaysIso,
  dayItems,
  humanMinutes,
  isoDate,
  prettyDate,
  shortDate,
  weekDates,
} from "@/lib/routine/time";
import logo from "@/assets/logo.png";
import { CAT_STYLE, CatIcon, categoryOf, cn, fieldClass, Meter, PrimaryButton, useMounted, useNow } from "./bits";

const HUB: { id: MoreScreen; label: string; text: string; icon: typeof Settings }[] = [
  { id: "alimentacion", label: "Alimentación", text: "Comidas de la semana", icon: Utensils },
  { id: "universidad", label: "Universidad", text: "Carreras y materias", icon: Scale },
  { id: "profesorado", label: "Profesorado", text: "Cursos y horarios", icon: GraduationCap },
  { id: "espiritual", label: "Espiritual", text: "Reuniones y estudio", icon: Flower2 },
  { id: "gimnasio", label: "Gimnasio", text: "Entrenamientos", icon: Dumbbell },
  { id: "objetivos", label: "Objetivos", text: "Avance por áreas", icon: Target },
  { id: "organigrama", label: "Organigrama", text: "La semana de un vistazo", icon: LayoutGrid },
  { id: "estadisticas", label: "Estadísticas", text: "Cómo se reparte el tiempo", icon: BarChart3 },
  { id: "pendientes", label: "Pendientes", text: "Lo que sigue abierto", icon: ListChecks },
  { id: "familia", label: "Plan familiar", text: "Tareas compartidas", icon: Users },
  { id: "ajustes", label: "Ajustes", text: "Nombre, aviso y categorías", icon: Settings },
];

export function MoreView() {
  const more = useRoutine((s) => s.more);
  const setMore = useRoutine((s) => s.setMore);
  const motto = useRoutine((s) => s.profile.motto);
  if (more === "hub") {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">Más</h1>
          <p className="text-sm text-muted">Cada área de la vida, en su lugar.</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {HUB.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setMore(item.id)}
              className="min-h-24 rounded-3xl border border-line bg-paper p-3 text-left shadow-card"
            >
              <item.icon className="size-5 text-forest" aria-hidden="true" />
              <span className="mt-2 block font-bold text-ink">{item.label}</span>
              <span className="block text-xs text-muted">{item.text}</span>
            </button>
          ))}
        </div>
        <section className="overflow-hidden rounded-3xl bg-card p-4 text-center shadow-card">
          <img src="/routine-icon.png" alt="My Routine Tano" className="mx-auto w-44" />
          {motto.trim() ? (
            <p className="font-script text-2xl text-forest">{motto}</p>
          ) : null}
        </section>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <button type="button" onClick={() => setMore("hub")} className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-forest">
        <ChevronLeft className="size-4" /> Más
      </button>
      {more === "alimentacion" ? <Food /> : null}
      {more === "universidad" ? <Uni /> : null}
      {more === "profesorado" ? <Teach /> : null}
      {more === "espiritual" ? <Spirit /> : null}
      {more === "gimnasio" ? <Gym /> : null}
      {more === "objetivos" ? <Goals /> : null}
      {more === "organigrama" ? <WeekMap /> : null}
      {more === "estadisticas" ? <Stats /> : null}
      {more === "pendientes" ? <Inbox /> : null}
      {more === "familia" ? <Family /> : null}
      {more === "ajustes" ? <SettingsView /> : null}
    </div>
  );
}

function useWeek() {
  const mounted = useMounted();
  const now = useNow(mounted);
  const today = isoDate(now ?? new Date());
  return { today, days: weekDates(today) };
}

function Food() {
  const activities = useRoutine((s) => s.activities);
  const setOverlay = useRoutine((s) => s.setOverlay);
  const { days } = useWeek();
  const meals = activities.filter((a) => a.categoryId === "alimentacion" && days.includes(a.date));
  return (
    <section className="space-y-3">
      <h1 className="font-display text-3xl">Alimentación</h1>
      {days.map((iso) => {
        const list = meals.filter((a) => a.date === iso);
        return (
          <div key={iso}>
            <h2 className="text-sm font-bold text-muted">{shortDate(iso)}</h2>
            {list.length ? (
              list.map((a) => (
                <button key={a.id} type="button" onClick={() => setOverlay({ type: "detail", id: a.id })} className="mt-1 block w-full rounded-2xl bg-paper px-3 py-2 text-left">
                  <span className="font-bold">{a.start || "Sin hora"}</span> {a.name}
                </button>
              ))
            ) : (
              <p className="text-sm text-muted">Sin comida anotada.</p>
            )}
          </div>
        );
      })}
      <PrimaryButton onClick={() => setOverlay({ type: "create", kind: "comida" })}>Agregar comida</PrimaryButton>
    </section>
  );
}

function Uni() {
  const subjects = useRoutine((s) => s.subjects);
  const addSubject = useRoutine((s) => s.addSubject);
  const removeSubject = useRoutine((s) => s.removeSubject);
  const setOverlay = useRoutine((s) => s.setOverlay);

  const [name, setName] = useState("");
  const [teacher, setTeacher] = useState("");
  const [schedule, setSchedule] = useState("");
  const [room, setRoom] = useState("");
  const [mode, setMode] = useState("Presencial");
  const [bibliography, setBibliography] = useState("");

  return (
    <section className="space-y-4">
      <div>
        <h1 className="font-display text-3xl">Universidad</h1>
        <p className="text-sm text-muted">
          Añade aquí tus materias, docentes, horarios, aulas y material de estudio.
        </p>
      </div>

      {!subjects.length ? (
        <div className="rounded-3xl border border-dashed border-line bg-paper p-5 text-center">
          <p className="font-bold">Todavía no añadiste materias.</p>
          <p className="mt-1 text-sm text-muted">
            Completa el formulario para comenzar tu plan universitario.
          </p>
        </div>
      ) : null}

      {subjects.map((subject) => (
        <article key={subject.id} className="rounded-3xl border border-line bg-paper p-4">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-2xl leading-tight">{subject.name}</h2>
              <p className="text-sm text-muted">
                {[subject.teacher, subject.schedule, subject.room, subject.mode]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => removeSubject(subject.id)}
              className="min-h-10 rounded-xl bg-sand px-3 text-xs font-bold"
            >
              Eliminar
            </button>
          </div>

          {subject.bibliography ? (
            <p className="mt-2 text-sm">{subject.bibliography}</p>
          ) : null}

          <button
            type="button"
            onClick={() => setOverlay({ type: "create", kind: "estudio" })}
            className="mt-3 min-h-11 rounded-2xl bg-forest px-3 text-sm font-bold text-forest-fg"
          >
            Añadir sesión de estudio
          </button>
        </article>
      ))}

      <form
        className="space-y-2 rounded-3xl border border-line bg-paper p-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim()) return;

          addSubject({
            name: name.trim(),
            teacher: teacher.trim(),
            schedule: schedule.trim(),
            room: room.trim(),
            mode,
            bibliography: bibliography.trim(),
          });

          setName("");
          setTeacher("");
          setSchedule("");
          setRoom("");
          setMode("Presencial");
          setBibliography("");
        }}
      >
        <h2 className="font-display text-xl">Añadir materia</h2>

        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nombre de la materia"
          className={fieldClass}
          required
        />

        <input
          value={teacher}
          onChange={(event) => setTeacher(event.target.value)}
          placeholder="Docente"
          className={fieldClass}
        />

        <input
          value={schedule}
          onChange={(event) => setSchedule(event.target.value)}
          placeholder="Días y horarios"
          className={fieldClass}
        />

        <input
          value={room}
          onChange={(event) => setRoom(event.target.value)}
          placeholder="Aula, sede o enlace"
          className={fieldClass}
        />

        <select
          value={mode}
          onChange={(event) => setMode(event.target.value)}
          className={fieldClass}
        >
          <option>Presencial</option>
          <option>Virtual</option>
          <option>Híbrida</option>
        </select>

        <textarea
          value={bibliography}
          onChange={(event) => setBibliography(event.target.value)}
          placeholder="Bibliografía, materiales o notas"
          className={fieldClass}
          rows={3}
        />

        <PrimaryButton type="submit">Guardar materia</PrimaryButton>
      </form>
    </section>
  );
}

function Teach() {
  const courses = useRoutine((s) => s.courses);
  const addCourse = useRoutine((s) => s.addCourse);
  const removeCourse = useRoutine((s) => s.removeCourse);
  const activities = useRoutine((s) => s.activities);
  const setOverlay = useRoutine((s) => s.setOverlay);
  const { days } = useWeek();

  const [institution, setInstitution] = useState("");
  const [grade, setGrade] = useState("");
  const [subject, setSubject] = useState("");
  const [schedule, setSchedule] = useState("");

  const tasks = activities.filter(
    (activity) =>
      activity.categoryId === "profesorado" &&
      (activity.date === "" ||
        (activity.date >= days[0]! && activity.date <= days[6]!)) &&
      OPEN_STATUSES.includes(activity.status),
  );

  return (
    <section className="space-y-4">
      <div>
        <h1 className="font-display text-3xl">Profesorado y colegios</h1>
        <p className="text-sm text-muted">
          Registra tus instituciones, cursos, asignaturas y horarios.
        </p>
      </div>

      {!courses.length ? (
        <div className="rounded-3xl border border-dashed border-line bg-paper p-5 text-center">
          <p className="font-bold">Todavía no añadiste cursos.</p>
          <p className="mt-1 text-sm text-muted">
            Puedes registrar cada colegio o institución desde el formulario.
          </p>
        </div>
      ) : null}

      {courses.map((course) => (
        <article
          key={course.id}
          className={cn(
            "rounded-3xl border border-line border-l-4 bg-paper p-4",
            CAT_STYLE[course.color].rail,
          )}
        >
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <h2 className="font-bold">
                {[course.grade, course.subject].filter(Boolean).join(" · ")}
              </h2>
              <p className="text-sm text-muted">
                {[course.institution, course.schedule].filter(Boolean).join(" · ")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => removeCourse(course.id)}
              className="min-h-10 rounded-xl bg-sand px-3 text-xs font-bold"
            >
              Eliminar
            </button>
          </div>
        </article>
      ))}

      <form
        className="space-y-2 rounded-3xl border border-line bg-paper p-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!institution.trim() || !subject.trim()) return;

          addCourse({
            institution: institution.trim(),
            grade: grade.trim(),
            subject: subject.trim(),
            schedule: schedule.trim(),
            color: "study",
          });

          setInstitution("");
          setGrade("");
          setSubject("");
          setSchedule("");
        }}
      >
        <h2 className="font-display text-xl">Añadir institución o curso</h2>

        <input
          value={institution}
          onChange={(event) => setInstitution(event.target.value)}
          placeholder="Nombre de la institución"
          className={fieldClass}
          required
        />

        <input
          value={grade}
          onChange={(event) => setGrade(event.target.value)}
          placeholder="Curso, división o nivel"
          className={fieldClass}
        />

        <input
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          placeholder="Asignatura"
          className={fieldClass}
          required
        />

        <input
          value={schedule}
          onChange={(event) => setSchedule(event.target.value)}
          placeholder="Días y horarios"
          className={fieldClass}
        />

        <PrimaryButton type="submit">Guardar curso</PrimaryButton>
      </form>

      <div>
        <h2 className="font-display text-xl">Por hacer</h2>

        {!tasks.length ? (
          <p className="mt-1 text-sm text-muted">No hay tareas pendientes.</p>
        ) : null}

        {tasks.map((activity) => (
          <button
            key={activity.id}
            type="button"
            onClick={() => setOverlay({ type: "detail", id: activity.id })}
            className="mt-2 block w-full rounded-2xl bg-sand px-3 py-3 text-left text-sm font-bold"
          >
            {activity.date ? shortDate(activity.date) : "Sin fecha"} · {activity.name}
          </button>
        ))}
      </div>
    </section>
  );
}

function Spirit() {
  const activities = useRoutine((s) => s.activities);
  const setOverlay = useRoutine((s) => s.setOverlay);
  const { days } = useWeek();
  const list = activities.filter(
    (a) => (a.categoryId === "espiritual" || a.categoryId === "predicacion") && days.includes(a.date),
  );
  return (
    <section className="space-y-3">
      <h1 className="font-display text-3xl">Actividades espirituales</h1>
      <p className="text-sm text-muted">Reuniones, estudio, predicación y adoración en familia. Esto no se comparte con el plan familiar salvo que lo pases a una tarea explícita.</p>
      {list.map((a) => (
        <button key={a.id} type="button" onClick={() => setOverlay({ type: "detail", id: a.id })} className="block w-full rounded-2xl border border-line bg-paper px-3 py-3 text-left">
          <span className="text-xs font-bold text-muted">{shortDate(a.date)} · {a.start || "Sin hora"}</span>
          <span className="block font-bold">{a.name}</span>
        </button>
      ))}
      {!list.length ? <p className="text-sm text-muted">Esta semana no hay actividades espirituales en la agenda.</p> : null}
    </section>
  );
}

function Gym() {
  const activities = useRoutine((s) => s.activities);
  const setOverlay = useRoutine((s) => s.setOverlay);
  const { days } = useWeek();
  const list = activities.filter((a) => a.categoryId === "gimnasio" && days.includes(a.date));
  const done = list.filter((a) => a.status === "realizada").length;
  return (
    <section className="space-y-3">
      <h1 className="font-display text-3xl">Gimnasio</h1>
      <p className="text-sm text-muted">{done} de {list.length || 0} sesiones de esta semana marcadas.</p>
      {list.map((a) => (
        <button key={a.id} type="button" onClick={() => setOverlay({ type: "detail", id: a.id })} className="block w-full rounded-2xl bg-paper px-3 py-3 text-left">
          <span className="font-bold">{shortDate(a.date)} · {a.start}</span>
          <span className="block text-sm text-muted">{a.name} · {a.status === "realizada" ? "Hecha" : "Pendiente"}</span>
        </button>
      ))}
      <PrimaryButton onClick={() => setOverlay({ type: "create", kind: "entrenamiento" })}>Registrar entrenamiento</PrimaryButton>
    </section>
  );
}

function Goals() {
  const goals = useRoutine((s) => s.goals);
  const bumpGoal = useRoutine((s) => s.bumpGoal);
  const setGoalStatus = useRoutine((s) => s.setGoalStatus);
  const setOverlay = useRoutine((s) => s.setOverlay);
  return (
    <section className="space-y-3">
      <h1 className="font-display text-3xl">Mis objetivos</h1>
      <p className="text-sm text-muted">El avance es tuyo. Sumar no borra lo que falta: solo lo muestra.</p>
      {goals.map((goal) => (
        <article key={goal.id} className="rounded-3xl border border-line bg-paper p-4">
          <p className="text-xs font-bold text-sage">{goal.area}</p>
          <h2 className="font-display text-2xl leading-tight">{goal.name}</h2>
          <p className="text-sm text-muted">{goal.description}</p>
          <p className="mt-2 text-sm">
            {goal.progress} / {goal.target} {goal.unit} · {goal.frequency}
          </p>
          <div className="mt-2">
            <Meter value={goal.progress} max={goal.target} />
          </div>
          <p className="mt-2 text-xs text-muted">
            {goal.status === "cumplido" ? "Cumplido. Bien hecho." : "En marcha."} Prioridad {goal.priority}. Hasta {prettyDate(goal.due)}.
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button type="button" className="min-h-11 rounded-2xl bg-sand text-sm font-bold" onClick={() => bumpGoal(goal.id, goal.unit === "horas" ? 0.5 : 1)}>
              Sumar
            </button>
            <button type="button" className="min-h-11 rounded-2xl bg-sand text-sm font-bold" onClick={() => setGoalStatus(goal.id, "pausado")}>
              Pausar
            </button>
            <button type="button" className="min-h-11 rounded-2xl bg-sand text-sm font-bold" onClick={() => setGoalStatus(goal.id, goal.status === "cumplido" ? "en_progreso" : "cumplido")}>
              {goal.status === "cumplido" ? "Reabrir" : "Listo"}
            </button>
          </div>
        </article>
      ))}
      <PrimaryButton onClick={() => setOverlay({ type: "create", kind: "objetivo" })}>Nuevo objetivo</PrimaryButton>
      <GoalStatusHint />
    </section>
  );
}

function GoalStatusHint() {
  const statuses: GoalStatus[] = ["no_iniciado", "en_progreso", "cumplido", "pausado", "reprogramado", "cancelado"];
  return <p className="text-xs text-muted">Estados posibles: {statuses.join(", ").replaceAll("_", " ")}.</p>;
}

function WeekMap() {
  const activities = useRoutine((s) => s.activities);
  const categories = useRoutine((s) => s.categories);
  const { days } = useWeek();
  return (
    <section className="space-y-3">
      <h1 className="font-display text-3xl">Organigrama</h1>
      <p className="text-sm text-muted">Cada bloque es una actividad. Desliza para ver la semana.</p>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
        {days.map((iso) => (
          <div key={iso} className="w-40 shrink-0 rounded-2xl bg-sand p-2">
            <p className="mb-2 text-xs font-bold">{shortDate(iso)}</p>
            <div className="space-y-1">
              {dayItems(activities, iso).slice(0, 8).map((a) => {
                const cat = categoryOf(categories, a.categoryId);
                return (
                  <div key={a.id} className="flex items-center gap-1 rounded-xl bg-paper px-2 py-1">
                    <span className={cn("size-2 shrink-0 rounded-full", CAT_STYLE[cat?.color ?? "personal"].dot)} />
                    <span className="truncate text-xs">{a.start} {a.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Stats() {
  const activities = useRoutine((s) => s.activities);
  const categories = useRoutine((s) => s.categories);
  const { days } = useWeek();
  const from = days[0]!;
  const to = days[6]!;
  const planned = categoryMinutes(activities, from, to, false);
  const done = categoryMinutes(activities, from, to, true);
  const rows = categories
    .map((cat) => ({ cat, mins: planned[cat.id] ?? 0, did: done[cat.id] ?? 0 }))
    .filter((row) => row.mins > 0)
    .sort((a, b) => b.mins - a.mins);
  const max = rows[0]?.mins ?? 1;
  return (
    <section className="space-y-3">
      <h1 className="font-display text-3xl">Estadísticas</h1>
      <p className="text-sm text-muted">Minutos previstos esta semana, y cuántos ya marcaste como hechos.</p>
      {rows.map((row) => (
        <div key={row.cat.id}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="font-bold">{row.cat.name}</span>
            <span className="text-muted">
              {humanMinutes(row.did)} / {humanMinutes(row.mins)}
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-sand">
            <div className={cn("h-full rounded-full", CAT_STYLE[row.cat.color].dot)} style={{ width: `${Math.round((row.mins / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </section>
  );
}

function Inbox() {
  const activities = useRoutine((s) => s.activities);
  const reschedule = useRoutine((s) => s.reschedule);
  const setStatus = useRoutine((s) => s.setStatus);
  const setOverlay = useRoutine((s) => s.setOverlay);
  const mounted = useMounted();
  const now = useNow(mounted);
  const today = isoDate(now ?? new Date());
  const tomorrow = addDaysIso(today, 1);
  const week = weekDates(today);
  const open = activities.filter((a) => OPEN_STATUSES.includes(a.status) && a.status !== "cancelada");
  const groups = [
    { title: "Pendientes de hoy", items: open.filter((a) => a.date === today) },
    { title: "De ayer", items: open.filter((a) => a.date && a.date < today) },
    { title: "Para mañana", items: open.filter((a) => a.date === tomorrow) },
    { title: "Esta semana", items: open.filter((a) => a.date && week.includes(a.date) && a.date !== today && a.date !== tomorrow) },
    { title: "Sin fecha", items: open.filter((a) => !a.date) },
    { title: "Movidas varias veces", items: open.filter((a) => a.postponeCount >= 2) },
  ];
  const [picked, setPicked] = useState<string[]>([]);
  const toggle = (id: string) => setPicked((curr) => (curr.includes(id) ? curr.filter((x) => x !== id) : [...curr, id]));
  return (
    <section className="space-y-4">
      <h1 className="font-display text-3xl">Pendientes</h1>
      {picked.length ? (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="min-h-11 rounded-2xl bg-forest text-sm font-bold text-forest-fg"
            onClick={() => {
              for (const id of picked) {
                const a = activities.find((x) => x.id === id);
                if (!a) continue;
                reschedule(id, tomorrow, a.start, a.end, "Pasó a mañana desde pendientes.");
              }
              setPicked([]);
            }}
          >
            Pasar a mañana
          </button>
          <button
            type="button"
            className="min-h-11 rounded-2xl bg-sand text-sm font-bold"
            onClick={() => {
              for (const id of picked) setStatus(id, "realizada");
              setPicked([]);
            }}
          >
            Completar
          </button>
        </div>
      ) : (
        <p className="text-sm text-muted">Marca varias para moverlas juntas.</p>
      )}
      {groups.map((group) =>
        group.items.length ? (
          <div key={group.title}>
            <h2 className="mb-2 font-display text-xl">{group.title}</h2>
            <ul className="space-y-2">
              {group.items.map((a) => (
                <li key={`${group.title}-${a.id}`} className="flex items-center gap-2 rounded-2xl bg-paper p-2">
                  <input
                    type="checkbox"
                    className="size-5"
                    checked={picked.includes(a.id)}
                    onChange={() => toggle(a.id)}
                    aria-label={`Seleccionar ${a.name}`}
                  />
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setOverlay({ type: "detail", id: a.id })}>
                    <span className="block truncate font-bold">{a.name}</span>
                    <span className="text-xs text-muted">{a.date ? shortDate(a.date) : "Sin fecha"} {a.start}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null,
      )}
    </section>
  );
}

const PRIVACY: Record<Privacy, string> = {
  privado: "Privado",
  persona: "Con una persona",
  familia: "Grupo familiar",
  ocupado: "Solo como horario ocupado",
  detalle: "Con todos los detalles",
};

function Family() {
  const family = useRoutine((s) => s.family);
  const tasks = useRoutine((s) => s.familyTasks);
  const renameMember = useRoutine((s) => s.renameMember);
  const toggleFamilyTask = useRoutine((s) => s.toggleFamilyTask);
  const addFamilyTask = useRoutine((s) => s.addFamilyTask);
  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState(family[0]?.id ?? "");
  const [privacy, setPrivacy] = useState<Privacy>("familia");
  return (
    <section className="space-y-4">
      <h1 className="font-display text-3xl">Plan familiar</h1>
      <p className="text-sm leading-relaxed text-muted">
        Aquí solo vive lo que eliges compartir: comidas, compras, tareas de la casa. Notas personales, estudio, reflexiones y documentos siguen fuera de esta lista.
      </p>
      <ul className="space-y-2">
        {family.map((member) => (
          <li key={member.id}>
            <label className="text-xs font-bold text-muted" htmlFor={`member-${member.id}`}>
              {member.role}
            </label>
            <input
              id={`member-${member.id}`}
              value={member.name}
              onChange={(event) => renameMember(member.id, event.target.value)}
              className={fieldClass}
            />
          </li>
        ))}
      </ul>
      <ul className="space-y-2">
        {tasks.map((task) => {
          const who = family.find((m) => m.id === task.assigneeId)?.name ?? "Alguien";
          return (
            <li key={task.id} className="rounded-2xl border border-line bg-paper p-3">
              <button type="button" onClick={() => toggleFamilyTask(task.id)} className="w-full text-left">
                <span className={cn("font-bold", task.status === "hecha" && "text-muted line-through")}>{task.title}</span>
                <span className="mt-1 block text-xs text-muted">
                  {who} · {task.date || "sin fecha"} {task.time} · {PRIVACY[task.privacy]}
                </span>
                {task.comment ? <span className="mt-1 block text-sm">{task.comment}</span> : null}
              </button>
            </li>
          );
        })}
      </ul>
      <form
        className="space-y-2 rounded-3xl bg-sand p-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!title.trim()) return;
          addFamilyTask({
            title: title.trim(),
            assigneeId: assigneeId || family[0]?.id || "",
            date: isoDate(new Date()),
            time: "18:00",
            status: "pendiente",
            privacy,
            comment: "",
          });
          setTitle("");
        }}
      >
        <h2 className="font-bold">Nueva tarea familiar</h2>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Qué hay que hacer" className={fieldClass} />
        <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className={fieldClass}>
          {family.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <select value={privacy} onChange={(e) => setPrivacy(e.target.value as Privacy)} className={fieldClass}>
          {(Object.keys(PRIVACY) as Privacy[]).map((key) => (
            <option key={key} value={key}>
              {PRIVACY[key]}
            </option>
          ))}
        </select>
        <PrimaryButton type="submit">Asignar</PrimaryButton>
      </form>
    </section>
  );
}

async function prepareAvatar(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("El archivo seleccionado no es una imagen.");
  }

  if (file.size > 12 * 1024 * 1024) {
    throw new Error("La imagen es demasiado grande. Elige una menor de 12 MB.");
  }

  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("No se pudo leer la imagen."));
      }
    };

    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo procesar la imagen."));
    img.src = source;
  });

  const size = Math.min(image.naturalWidth, image.naturalHeight);
  const sourceX = Math.max(0, (image.naturalWidth - size) / 2);
  const sourceY = Math.max(0, (image.naturalHeight - size) / 2);

  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("El navegador no permite procesar la imagen.");
  }

  context.drawImage(
    image,
    sourceX,
    sourceY,
    size,
    size,
    0,
    0,
    256,
    256,
  );

  return canvas.toDataURL("image/jpeg", 0.82);
}

function SettingsView() {
  const profile = useRoutine((s) => s.profile);
  const updateProfile = useRoutine((s) => s.updateProfile);
  const categories = useRoutine((s) => s.categories);
  const toggleCategory = useRoutine((s) => s.toggleCategory);
  const addCategory = useRoutine((s) => s.addCategory);
  const places = useRoutine((s) => s.places);
  const addPlace = useRoutine((s) => s.addPlace);
  const [catName, setCatName] = useState("");
  const [placeNameInput, setPlaceNameInput] = useState("");
  const [placeKind, setPlaceKind] = useState("Personalizado");
  const [placeAddress, setPlaceAddress] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationBusy, setNotificationBusy] = useState(false);
  const avatarInput = useRef<HTMLInputElement>(null);
  const [avatarMessage, setAvatarMessage] = useState("");
  return (
    <section className="space-y-4">
      <h1 className="font-display text-3xl">Ajustes</h1>

      <div className="rounded-3xl border border-line bg-paper p-4">
        <h2 className="font-display text-xl">Foto de perfil</h2>

        <div className="mt-3 flex items-center gap-4">
          <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-full bg-sage-soft text-forest">
            {profile.avatar ? (
              <img
                src={profile.avatar}
                alt="Foto de perfil"
                className="size-full object-cover"
              />
            ) : (
              <Users className="size-8" aria-hidden="true" />
            )}
          </div>

          <div className="flex-1">
            <p className="text-sm text-muted">
              Elige una imagen desde este dispositivo. La foto se guarda solamente
              en la aplicación.
            </p>

            <input
              ref={avatarInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = "";

                if (!file) return;

                setAvatarMessage("Procesando imagen...");

                try {
                  const avatar = await prepareAvatar(file);
                  updateProfile({ avatar });
                  setAvatarMessage("Foto de perfil actualizada.");
                } catch (error) {
                  setAvatarMessage(
                    error instanceof Error
                      ? error.message
                      : "No se pudo guardar la imagen.",
                  );
                }
              }}
            />

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => avatarInput.current?.click()}
                className="min-h-10 rounded-2xl bg-forest px-4 text-sm font-bold text-forest-fg"
              >
                {profile.avatar ? "Cambiar foto" : "Elegir foto"}
              </button>

              {profile.avatar ? (
                <button
                  type="button"
                  onClick={() => {
                    updateProfile({ avatar: "" });
                    setAvatarMessage("Foto de perfil eliminada.");
                  }}
                  className="min-h-10 rounded-2xl bg-sand px-4 text-sm font-bold"
                >
                  Quitar foto
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {avatarMessage ? (
          <p className="mt-3 text-sm font-semibold text-forest">
            {avatarMessage}
          </p>
        ) : null}
      </div>

      <div className="rounded-3xl border border-line bg-paper p-4">
        <h2 className="font-display text-xl">Notificaciones</h2>

        <p className="mt-1 text-sm text-muted">
          Activa los avisos para recibir recordatorios de My Routine Tano.
        </p>

        {!oneSignalConfigured() ? (
          <p className="mt-2 rounded-2xl bg-sand p-3 text-sm">
            Falta configurar el App ID de OneSignal en Vercel.
          </p>
        ) : null}

        <div className="mt-3 grid gap-2">
          <button
            type="button"
            disabled={notificationBusy || !oneSignalConfigured()}
            onClick={async () => {
              setNotificationBusy(true);
              setNotificationMessage("");

              try {
                await enableNotifications();
                const state = await notificationState();

                setNotificationMessage(
                  state.subscribed
                    ? "Notificaciones activadas correctamente."
                    : "El permiso fue concedido, pero la suscripción aún no está activa.",
                );
              } catch (error) {
                setNotificationMessage(
                  error instanceof Error
                    ? error.message
                    : "No se pudieron activar las notificaciones.",
                );
              } finally {
                setNotificationBusy(false);
              }
            }}
            className="min-h-11 rounded-2xl bg-forest px-4 text-sm font-bold text-forest-fg disabled:opacity-50"
          >
            {notificationBusy
              ? "Configurando..."
              : "Activar notificaciones"}
          </button>

          <button
            type="button"
            disabled={notificationBusy || !oneSignalConfigured()}
            onClick={async () => {
              setNotificationBusy(true);
              setNotificationMessage("");

              try {
                await disableNotifications();
                setNotificationMessage("Notificaciones desactivadas.");
              } catch (error) {
                setNotificationMessage(
                  error instanceof Error
                    ? error.message
                    : "No se pudieron desactivar las notificaciones.",
                );
              } finally {
                setNotificationBusy(false);
              }
            }}
            className="min-h-11 rounded-2xl bg-sand px-4 text-sm font-bold disabled:opacity-50"
          >
            Desactivar notificaciones
          </button>

          <button
            type="button"
            disabled={notificationBusy || !oneSignalConfigured()}
            onClick={async () => {
              setNotificationBusy(true);

              try {
                const state = await notificationState();

                if (!state.supported) {
                  setNotificationMessage(
                    "Este navegador no admite notificaciones web.",
                  );
                } else if (state.permission === "denied") {
                  setNotificationMessage(
                    "Las notificaciones están bloqueadas en los ajustes del navegador.",
                  );
                } else if (state.subscribed) {
                  setNotificationMessage(
                    "El dispositivo está suscrito y listo para recibir avisos.",
                  );
                } else {
                  setNotificationMessage(
                    "Las notificaciones todavía no están activadas.",
                  );
                }
              } catch {
                setNotificationMessage(
                  "No se pudo consultar el estado de las notificaciones.",
                );
              } finally {
                setNotificationBusy(false);
              }
            }}
            className="min-h-11 rounded-2xl border border-line bg-paper px-4 text-sm font-bold disabled:opacity-50"
          >
            Comprobar estado
          </button>
        </div>

        {notificationMessage ? (
          <p className="mt-3 text-sm font-semibold text-forest">
            {notificationMessage}
          </p>
        ) : null}

        <p className="mt-3 text-xs text-muted">
          En iPhone, instala My Routine Tano en la pantalla de inicio antes de activar
          las notificaciones.
        </p>
      </div>
      <label className="block text-sm font-bold" htmlFor="user-name">
        Tu nombre
        <input id="user-name" value={profile.name} onChange={(e) => updateProfile({ name: e.target.value })} className={`mt-1 ${fieldClass}`} />
      </label>
      <label className="block text-sm font-bold" htmlFor="motto">
        Frase
        <input id="motto" value={profile.motto} onChange={(e) => updateProfile({ motto: e.target.value })} className={`mt-1 ${fieldClass}`} />
      </label>
      <label className="block text-sm font-bold" htmlFor="reminder">
        Aviso para preparar mañana
        <input id="reminder" type="time" value={profile.tomorrowReminder} onChange={(e) => updateProfile({ tomorrowReminder: e.target.value })} className={`mt-1 ${fieldClass}`} />
      </label>
      <button
        type="button"
        onClick={() => updateProfile({ theme: profile.theme === "dark" ? "light" : "dark" })}
        className="min-h-11 w-full rounded-2xl bg-sand text-sm font-bold"
      >
        {profile.theme === "dark" ? "Usar modo claro" : "Usar modo oscuro"}
      </button>
      <button
        type="button"
        onClick={() => updateProfile({ freeEvening: !profile.freeEvening })}
        className="min-h-11 w-full rounded-2xl bg-sand text-sm font-bold"
      >
        {profile.freeEvening ? "Quiero una tarde libre en la semana" : "No hace falta reservar una tarde libre"}
      </button>
      <div>
        <h2 className="font-display text-xl">Categorías</h2>
        <ul className="mt-2 space-y-2">
          {categories.map((cat) => (
            <li key={cat.id} className="flex items-center gap-2">
              <span className={cn("size-3 rounded-full", CAT_STYLE[cat.color].dot)} />
              <CatIcon name={cat.icon} className="size-4" />
              <span className="flex-1 text-sm font-bold">{cat.name}</span>
              <button type="button" onClick={() => toggleCategory(cat.id)} className="min-h-10 rounded-xl bg-sand px-3 text-xs font-bold">
                {cat.visible ? "Visible" : "Oculta"}
              </button>
            </li>
          ))}
        </ul>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!catName.trim()) return;
            const color = COLOR_KEYS[categories.length % COLOR_KEYS.length] ?? "personal";
            const icon: IconKey = ICON_KEYS[categories.length % ICON_KEYS.length] ?? "heart";
            addCategory({
              name: catName.trim(),
              icon,
              color,
              description: "Categoría propia.",
              visible: true,
            });
            setCatName("");
          }}
        >
          <input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="Nueva categoría" className={fieldClass} />
          <button type="submit" className="min-h-11 rounded-2xl bg-forest px-3 text-sm font-bold text-forest-fg">
            Crear
          </button>
        </form>
      </div>
      <div>
        <h2 className="font-display text-xl">Lugares</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {places.map((place) => (
            <li key={place.id}>
              <span className="font-bold">{place.name}</span>
              <span className="text-muted"> · {place.kind} · {place.address}</span>
            </li>
          ))}
        </ul>
        <form
          className="mt-3 space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!placeNameInput.trim()) return;
            addPlace({
              name: placeNameInput.trim(),
              kind: placeKind,
              address: placeAddress.trim(),
            });
            setPlaceNameInput("");
            setPlaceAddress("");
          }}
        >
          <input value={placeNameInput} onChange={(e) => setPlaceNameInput(e.target.value)} placeholder="Nuevo lugar" className={fieldClass} />
          <input
            value={placeAddress}
            onChange={(e) => setPlaceAddress(e.target.value)}
            placeholder="Dirección, calle y número"
            className={fieldClass}
          />
          <select value={placeKind} onChange={(e) => setPlaceKind(e.target.value)} className={fieldClass}>
            {["Hogar", "Escuela", "Universidad", "Trabajo", "Gimnasio", "Salón del Reino", "Territorio", "Familia", "Comercio", "Personalizado"].map((kind) => (
              <option key={kind}>{kind}</option>
            ))}
          </select>
          <PrimaryButton type="submit">Guardar lugar</PrimaryButton>
        </form>
      </div>
      <p className="text-center font-display text-lg text-sage">My Routine Tano</p>
    </section>
  );
}
