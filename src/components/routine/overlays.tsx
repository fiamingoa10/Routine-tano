import { useMemo, useState } from "react";
import { Pause, Play } from "lucide-react";
import {
  blankDraft,
  STATUS_LABEL,
  STATUSES,
  TRANSPORT_LABEL,
  toDraft,
  type ActivityDraft,
  type ActivityStatus,
  type Change,
  type CreateKind,
  type Priority,
  type Transport,
} from "@/lib/routine/model";
import {
  departAt,
  previewActivities,
  proposeDay,
  proposeTomorrow,
  proposeWeek,
  wakeAndBed,
} from "@/lib/routine/planner";
import { useRoutine } from "@/lib/routine/store";
import {
  addDaysIso,
  dayItems,
  durationMin,
  fmt,
  humanMinutes,
  isoDate,
  minutes,
  occupiedMinutes,
  prettyDate,
  roundUpQuarter,
  weekDates,
  windowMinutes,
} from "@/lib/routine/time";
import {
  categoryOf,
  cn,
  fieldClass,
  GhostButton,
  placeName,
  PrimaryButton,
  Sheet,
  useMounted,
  useNow,
} from "./bits";

export function Overlays() {
  const overlay = useRoutine((s) => s.overlay);
  if (overlay.type === "none") return null;
  if (overlay.type === "menu") return <CreateMenu />;
  if (overlay.type === "create") return <CreateSheet kind={overlay.kind} />;
  if (overlay.type === "detail") return <DetailSheet id={overlay.id} />;
  if (overlay.type === "focus") return <FocusSheet id={overlay.id} />;
  if (overlay.type === "organize") return <OrganizeSheet />;
  if (overlay.type === "prepare") return <PrepareSheet />;
  if (overlay.type === "close") return <CloseSheet />;
  if (overlay.type === "week") return <WeekSheet />;
  return null;
}

function close() {
  useRoutine.getState().setOverlay({ type: "none" });
}

function CreateMenu() {
  const setOverlay = useRoutine((s) => s.setOverlay);
  const items: { kind: CreateKind; label: string; hint: string }[] = [
    { kind: "actividad", label: "Actividad", hint: "Con horario, lugar y preparación" },
    { kind: "rutina", label: "Rutina", hint: "Ir a las plantillas" },
    { kind: "tarea", label: "Tarea", hint: "Algo por hacer, con o sin hora" },
    { kind: "comida", label: "Comida", hint: "Desayuno, almuerzo o cena" },
    { kind: "recordatorio", label: "Recordatorio", hint: "Un aviso corto" },
    { kind: "objetivo", label: "Objetivo", hint: "Una meta por área" },
    { kind: "estudio", label: "Sesión de estudio", hint: "Un bloque para abogacía u otra materia" },
    { kind: "entrenamiento", label: "Entrenamiento", hint: "Gimnasio o movimiento" },
    { kind: "nota", label: "Nota", hint: "Una nota sin fecha" },
  ];
  return (
    <Sheet title="Crear" subtitle="Elige qué quieres sumar" onClose={close}>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.kind}>
            <button
              type="button"
              onClick={() => {
                if (item.kind === "rutina") {
                  useRoutine.getState().setTab("rutinas");
                  close();
                  return;
                }
                setOverlay({ type: "create", kind: item.kind });
              }}
              className="flex min-h-14 w-full flex-col justify-center rounded-2xl bg-sand px-3 py-2 text-left"
            >
              <span className="font-bold">{item.label}</span>
              <span className="text-xs text-muted">{item.hint}</span>
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}

function defaultsFor(kind: CreateKind, date: string): ActivityDraft {
  const now = new Date();
  const startMin = roundUpQuarter(now.getHours() * 60 + now.getMinutes() + 15);
  const start = fmt(startMin);
  if (kind === "comida") {
    return blankDraft({ categoryId: "alimentacion", kind: "comida", date, start, end: fmt(startMin + 30), flexible: false });
  }
  if (kind === "estudio") {
    return blankDraft({
      name: "Sesión de estudio",
      categoryId: "estudio",
      kind: "estudio",
      date,
      start,
      end: fmt(startMin + 50),
      prep: ["Dejar el material a mano"],
    });
  }
  if (kind === "entrenamiento") {
    return blankDraft({
      name: "Entrenamiento",
      categoryId: "gimnasio",
      kind: "entrenamiento",
      date,
      start,
      end: fmt(startMin + 50),
      prep: ["Ropa deportiva", "Agua", "Toalla"],
      placeId: "gym",
    });
  }
  if (kind === "tarea") return blankDraft({ categoryId: "personal", kind: "tarea", date, flexible: true });
  if (kind === "recordatorio") {
    return blankDraft({ categoryId: "personal", kind: "recordatorio", date, start, end: fmt(startMin + 10) });
  }
  if (kind === "nota") return blankDraft({ categoryId: "personal", kind: "nota", date: "" });
  return blankDraft({ categoryId: "personal", kind: "actividad", date, start, end: fmt(startMin + 45) });
}

function CreateSheet({ kind }: { kind: CreateKind }) {
  const categories = useRoutine((s) => s.categories);
  const places = useRoutine((s) => s.places);
  const addActivity = useRoutine((s) => s.addActivity);
  const addGoal = useRoutine((s) => s.addGoal);
  const today = isoDate(new Date());
  const [draft, setDraft] = useState<ActivityDraft>(() => defaultsFor(kind, today));
  const [prepText, setPrepText] = useState(draft.prep.join("\n"));
  const [materialsText, setMaterialsText] = useState("");
  const [goalTarget, setGoalTarget] = useState(3);
  const [goalUnit, setGoalUnit] = useState("veces");
  const [goalDue, setGoalDue] = useState(addDaysIso(today, 14));

  if (kind === "objetivo") {
    return (
      <Sheet title="Nuevo objetivo" onClose={close}>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!draft.name.trim()) return;
            addGoal({
              name: draft.name.trim(),
              area: categoryOf(categories, draft.categoryId)?.name ?? "Personal",
              description: draft.description,
              start: today,
              due: goalDue,
              frequency: "A elección",
              target: goalTarget,
              unit: goalUnit,
              priority: draft.priority,
              progress: 0,
              status: "no_iniciado",
              categoryId: draft.categoryId,
            });
            close();
          }}
        >
          <label className="block text-sm font-bold">
            Nombre
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={`mt-1 ${fieldClass}`} required />
          </label>
          <label className="block text-sm font-bold">
            Área
            <select value={draft.categoryId} onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })} className={`mt-1 ${fieldClass}`}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm font-bold">
              Cantidad
              <input type="number" min={1} step={0.5} value={goalTarget} onChange={(e) => setGoalTarget(Number(e.target.value))} className={`mt-1 ${fieldClass}`} />
            </label>
            <label className="text-sm font-bold">
              Unidad
              <input value={goalUnit} onChange={(e) => setGoalUnit(e.target.value)} className={`mt-1 ${fieldClass}`} />
            </label>
          </div>
          <label className="block text-sm font-bold">
            Fecha límite
            <input type="date" value={goalDue} onChange={(e) => setGoalDue(e.target.value)} className={`mt-1 ${fieldClass}`} />
          </label>
          <PrimaryButton type="submit">Guardar objetivo</PrimaryButton>
        </form>
      </Sheet>
    );
  }

  return (
    <Sheet title="Nueva actividad" subtitle={kind} onClose={close}>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!draft.name.trim()) return;
          addActivity({
            ...draft,
            name: draft.name.trim(),
            prep: prepText.split("\n").map((l) => l.trim()).filter(Boolean),
            materials: materialsText.split("\n").map((l) => l.trim()).filter(Boolean),
          });
        }}
      >
        <label className="block text-sm font-bold">
          Nombre
          <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={`mt-1 ${fieldClass}`} required />
        </label>
        <label className="block text-sm font-bold">
          Categoría
          <select value={draft.categoryId} onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })} className={`mt-1 ${fieldClass}`}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-3 gap-2">
          <label className="text-sm font-bold">
            Fecha
            <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className={`mt-1 ${fieldClass}`} />
          </label>
          <label className="text-sm font-bold">
            Inicio
            <input type="time" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} className={`mt-1 ${fieldClass}`} />
          </label>
          <label className="text-sm font-bold">
            Fin
            <input type="time" value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} className={`mt-1 ${fieldClass}`} />
          </label>
        </div>
        <label className="block text-sm font-bold">
          Lugar
          <select
            value={draft.placeId ?? ""}
            onChange={(e) => setDraft({ ...draft, placeId: e.target.value || null })}
            className={`mt-1 ${fieldClass}`}
          >
            <option value="">Sin lugar</option>
            {places.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-bold">
          Prioridad
          <select value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value as Priority })} className={`mt-1 ${fieldClass}`}>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm font-bold">
          <input type="checkbox" checked={draft.locked} onChange={(e) => setDraft({ ...draft, locked: e.target.checked, flexible: e.target.checked ? false : draft.flexible })} />
          Horario fijo, no mover
        </label>
        <label className="block text-sm font-bold">
          Preparación, una por línea
          <textarea value={prepText} onChange={(e) => setPrepText(e.target.value)} rows={3} className={`mt-1 ${fieldClass}`} />
        </label>
        <label className="block text-sm font-bold">
          Materiales, uno por línea
          <textarea value={materialsText} onChange={(e) => setMaterialsText(e.target.value)} rows={2} className={`mt-1 ${fieldClass}`} />
        </label>
        <label className="block text-sm font-bold">
          Notas
          <textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} rows={2} className={`mt-1 ${fieldClass}`} />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-sm font-bold">
            Viaje (min)
            <input type="number" min={0} value={draft.travelMin} onChange={(e) => setDraft({ ...draft, travelMin: Number(e.target.value) })} className={`mt-1 ${fieldClass}`} />
          </label>
          <label className="text-sm font-bold">
            Transporte
            <select value={draft.transport} onChange={(e) => setDraft({ ...draft, transport: e.target.value as Transport })} className={`mt-1 ${fieldClass}`}>
              <option value="">Sin definir</option>
              {Object.entries(TRANSPORT_LABEL).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="block text-sm font-bold">
          Repetición
          <select value={draft.repeat} onChange={(e) => setDraft({ ...draft, repeat: e.target.value as ActivityDraft["repeat"] })} className={`mt-1 ${fieldClass}`}>
            <option value="none">No se repite</option>
            <option value="daily">Todos los días</option>
            <option value="weekdays">Días laborables</option>
            <option value="weekly">Cada semana</option>
          </select>
        </label>
        <PrimaryButton type="submit">Guardar</PrimaryButton>
      </form>
    </Sheet>
  );
}

function DetailSheet({ id }: { id: string }) {
  const activity = useRoutine((s) => s.activities.find((a) => a.id === id));
  const categories = useRoutine((s) => s.categories);
  const places = useRoutine((s) => s.places);
  const setStatus = useRoutine((s) => s.setStatus);
  const nudge = useRoutine((s) => s.nudge);
  const reschedule = useRoutine((s) => s.reschedule);
  const splitActivity = useRoutine((s) => s.splitActivity);
  const clearDate = useRoutine((s) => s.clearDate);
  const markDispensable = useRoutine((s) => s.markDispensable);
  const findWeekSlot = useRoutine((s) => s.findWeekSlot);
  const toggleCheck = useRoutine((s) => s.toggleCheck);
  const addNote = useRoutine((s) => s.addNote);
  const updateFromDraft = useRoutine((s) => s.updateFromDraft);
  const removeActivity = useRoutine((s) => s.removeActivity);
  const duplicateActivity = useRoutine((s) => s.duplicateActivity);
  const shortenTo = useRoutine((s) => s.shortenTo);
  const setOverlay = useRoutine((s) => s.setOverlay);
  const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [editing, setEditing] = useState(false);
  if (!activity) return null;
  const cat = categoryOf(categories, activity.categoryId);
  const place = places.find((p) => p.id === activity.placeId);
  const leave = departAt(activity.start, activity.travelMin);
  const maps = place?.address || activity.address;
  const tomorrow = activity.date ? addDaysIso(activity.date, 1) : addDaysIso(isoDate(new Date()), 1);

  return (
    <Sheet title={activity.name} subtitle={cat ? `${cat.name} · ${STATUS_LABEL[activity.status]}` : STATUS_LABEL[activity.status]} onClose={close}>
      <div className="space-y-4">
        <p className="text-sm text-muted">
          {activity.date ? prettyDate(activity.date) : "Sin fecha"}
          {activity.start ? ` · ${activity.start}` : ""}
          {activity.end ? `–${activity.end}` : ""}
          {durationMin(activity) ? ` · ${humanMinutes(durationMin(activity))}` : ""}
        </p>
        {place ? <p className="text-sm">{place.name}{place.address ? ` · ${place.address}` : ""}</p> : null}
        {leave ? (
          <p className="rounded-2xl bg-sand px-3 py-2 text-sm">
            Salir a las {leave}
            {activity.transport ? ` · ${TRANSPORT_LABEL[activity.transport]}` : ""}. Hay {activity.travelMin} min de viaje.
          </p>
        ) : null}
        {activity.description ? <p className="text-sm">{activity.description}</p> : null}
        {activity.postponeCount >= 2 ? (
          <div className="rounded-2xl border border-line bg-sand p-3 text-sm leading-relaxed">
            Esta actividad se movió {activity.postponeCount} veces. Puedes mantenerla, hacerla más corta, dividirla o soltarla. No hay apuro.
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <GhostButton onClick={() => { setStatus(id, "en_curso"); setOverlay({ type: "focus", id }); }}>Iniciar</GhostButton>
          <GhostButton onClick={() => setStatus(id, "realizada")}>Completar</GhostButton>
          <GhostButton onClick={() => setStatus(id, "parcial")}>Parcial</GhostButton>
          <GhostButton onClick={() => nudge(id, 30)}>Posponer 30 min</GhostButton>
          <GhostButton onClick={() => reschedule(id, tomorrow, activity.start, activity.end, "Pasó al día siguiente.")}>Pasar a mañana</GhostButton>
          <GhostButton onClick={() => setStatus(id, "omitida")}>Omitir</GhostButton>
          <GhostButton onClick={() => findWeekSlot(id)}>Buscar en la semana</GhostButton>
          <GhostButton onClick={() => splitActivity(id)}>Dividir</GhostButton>
          <GhostButton onClick={() => clearDate(id)}>Dejar sin fecha</GhostButton>
          <GhostButton onClick={() => markDispensable(id)}>Prescindible</GhostButton>
          <GhostButton
            onClick={() => {
              if (activity.start && durationMin(activity) > 40) {
                shortenTo(id, fmt(minutes(activity.start) + 40), "Se dejó una versión más breve.");
              }
            }}
          >
            Versión breve
          </GhostButton>
          <GhostButton onClick={() => setOverlay({ type: "focus", id })}>Temporizador</GhostButton>
        </div>
        {maps ? (
          <a
            className="inline-flex min-h-11 items-center font-bold text-forest"
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(maps)}`}
            target="_blank"
            rel="noreferrer"
          >
            Abrir ubicación
          </a>
        ) : null}
        {activity.checklist.length ? (
          <div>
            <h3 className="font-bold">Preparación previa</h3>
            <ul className="mt-2 space-y-2">
              {activity.checklist.map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => toggleCheck(id, item.id)} className="flex min-h-11 w-full items-center gap-2 text-left text-sm">
                    <span className={cn("grid size-6 place-items-center rounded-md", item.done ? "bg-forest text-forest-fg" : "bg-sand")}>
                      {item.done ? "✓" : ""}
                    </span>
                    <span className={item.done ? "text-muted line-through" : ""}>{item.text}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {activity.materials.length ? (
          <p className="text-sm"><span className="font-bold">Materiales. </span>{activity.materials.join(", ")}</p>
        ) : null}
        {activity.people.length ? <p className="text-sm">Con: {activity.people.join(", ")}</p> : null}
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            addNote(id, note);
            setNote("");
          }}
        >
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Agregar una nota" className={fieldClass} />
          <button type="submit" className="min-h-11 rounded-2xl bg-sand px-3 text-sm font-bold">Nota</button>
        </form>
        {activity.notes ? <p className="whitespace-pre-wrap text-sm text-muted">{activity.notes}</p> : null}
        {activity.history.length ? (
          <div>
            <h3 className="font-bold">Historial</h3>
            <ul className="mt-1 space-y-1 text-xs text-muted">
              {activity.history.slice(-4).reverse().map((entry) => (
                <li key={entry.at}>{entry.reason} {entry.fromStart ? `(antes ${entry.fromStart})` : ""}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <button type="button" onClick={() => setEditing((v) => !v)} className="text-sm font-bold text-forest">
          {editing ? "Ocultar edición" : "Editar horarios y datos"}
        </button>
        {editing ? <EditForm id={id} initial={toDraft(activity)} onSave={updateFromDraft} /> : null}
        <div className="flex gap-2">
          <GhostButton onClick={() => duplicateActivity(id)}>Duplicar</GhostButton>
        </div>
        {confirm ? (
          <div className="rounded-2xl bg-sand p-3">
            <p className="text-sm">¿Eliminar «{activity.name}»? Se puede deshacer enseguida.</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <GhostButton onClick={() => setConfirm(false)}>Conservar</GhostButton>
              <button type="button" onClick={() => removeActivity(id)} className="min-h-11 rounded-2xl bg-danger px-3 text-sm font-bold text-forest-fg">
                Eliminar
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirm(true)} className="text-sm font-bold text-danger">
            Eliminar
          </button>
        )}
        <label className="block text-sm font-bold">
          Estado
          <select
            value={activity.status}
            onChange={(e) => setStatus(id, e.target.value as ActivityStatus)}
            className={`mt-1 ${fieldClass}`}
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>{STATUS_LABEL[status]}</option>
            ))}
          </select>
        </label>
      </div>
    </Sheet>
  );
}

function EditForm({
  id,
  initial,
  onSave,
}: {
  id: string;
  initial: ActivityDraft;
  onSave: (id: string, draft: ActivityDraft) => void;
}) {
  const categories = useRoutine((s) => s.categories);
  const places = useRoutine((s) => s.places);
  const [draft, setDraft] = useState(initial);
  const [prepText, setPrepText] = useState(initial.prep.join("\n"));
  return (
    <form
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(id, { ...draft, prep: prepText.split("\n").map((l) => l.trim()).filter(Boolean) });
      }}
    >
      <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={fieldClass} />
      <div className="grid grid-cols-3 gap-2">
        <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className={fieldClass} />
        <input type="time" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} className={fieldClass} />
        <input type="time" value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} className={fieldClass} />
      </div>
      <select value={draft.categoryId} onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })} className={fieldClass}>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <select value={draft.placeId ?? ""} onChange={(e) => setDraft({ ...draft, placeId: e.target.value || null })} className={fieldClass}>
        <option value="">Sin lugar</option>
        {places.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      <textarea value={prepText} onChange={(e) => setPrepText(e.target.value)} rows={3} className={fieldClass} />
      <PrimaryButton type="submit">Guardar edición</PrimaryButton>
    </form>
  );
}

function FocusSheet({ id }: { id: string }) {
  const activity = useRoutine((s) => s.activities.find((a) => a.id === id));
  const setStatus = useRoutine((s) => s.setStatus);
  const mounted = useMounted();
  const now = useNow(mounted);
  const [paused, setPaused] = useState(false);
  const [frozen, setFrozen] = useState<number | null>(null);
  if (!activity) return null;
  const nowMin = now ? now.getHours() * 60 + now.getMinutes() : null;
  const live = activity.end && nowMin != null ? Math.max(0, minutes(activity.end) - nowMin) : durationMin(activity) || 25;
  const remain = paused && frozen != null ? frozen : live;
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-paper px-5 py-8 text-ink">
      <p className="text-sm font-bold text-muted">Concentrarme ahora</p>
      <h2 className="mt-2 font-display text-4xl leading-tight">{activity.name}</h2>
      <p className="mt-4 font-display text-5xl text-forest">{humanMinutes(remain)}</p>
      <p className="text-sm text-muted">{activity.start}{activity.end ? ` – ${activity.end}` : ""}</p>
      {activity.checklist.length ? (
        <ul className="mt-6 space-y-2">
          {activity.checklist.map((item) => (
            <li key={item.id} className="rounded-2xl bg-sand px-3 py-2 text-sm">{item.text}</li>
          ))}
        </ul>
      ) : null}
      {activity.materials.length ? <p className="mt-4 text-sm">Material: {activity.materials.join(", ")}</p> : null}
      <div className="mt-auto grid gap-2">
        <button
          type="button"
          onClick={() => {
            if (!paused) setFrozen(live);
            setPaused((v) => !v);
          }}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-sand font-bold"
        >
          {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
          {paused ? "Seguir" : "Pausar"}
        </button>
        <PrimaryButton onClick={() => { setStatus(id, "realizada"); close(); }}>Completar</PrimaryButton>
        <GhostButton onClick={() => { setStatus(id, "parcial"); close(); }}>Finalizar antes</GhostButton>
        <button type="button" onClick={close} className="min-h-11 text-sm font-bold text-muted">Volver</button>
      </div>
    </div>
  );
}

function ChangeList({
  changes,
  picked,
  onToggle,
}: {
  changes: Change[];
  picked: boolean[];
  onToggle: (index: number) => void;
}) {
  if (!changes.length) return <p className="text-sm text-muted">No hay movimientos que proponer. Puedes dejar el día como está.</p>;
  return (
    <ul className="space-y-2">
      {changes.map((change, index) => (
        <li key={`${change.title}-${index}`}>
          <label className="flex gap-3 rounded-2xl border border-line bg-sand p-3">
            <input type="checkbox" className="mt-1 size-5" checked={picked[index] ?? true} onChange={() => onToggle(index)} />
            <span>
              <span className="block font-bold">{change.title}</span>
              <span className="mt-1 block text-sm text-muted">{change.reason}</span>
            </span>
          </label>
        </li>
      ))}
    </ul>
  );
}

function usePicked(changes: Change[]) {
  const key = changes.map((c) => c.title).join("|");
  const [seen, setSeen] = useState(key);
  const [picked, setPicked] = useState<boolean[]>(() => changes.map(() => true));
  if (seen !== key) {
    setSeen(key);
    setPicked(changes.map(() => true));
  }
  return {
    picked,
    toggle: (index: number) => setPicked((curr) => curr.map((v, i) => (i === index ? !v : v))),
  };
}

function OrganizeSheet() {
  const activities = useRoutine((s) => s.activities);
  const energy = useRoutine((s) => s.profile.energy);
  const variant = useRoutine((s) => s.proposalVariant);
  const setVariant = () => useRoutine.setState({ proposalVariant: useRoutine.getState().proposalVariant + 1 });
  const applyChanges = useRoutine((s) => s.applyChanges);
  const mounted = useMounted();
  const now = useNow(mounted);
  const today = isoDate(now ?? new Date());
  const tomorrow = addDaysIso(today, 1);
  const proposal = useMemo(
    () => proposeDay({ activities, date: today, tomorrow, variant, energy }),
    [activities, today, tomorrow, variant, energy],
  );
  const { picked, toggle } = usePicked(proposal.changes);
  const chosen = proposal.changes.filter((_, i) => picked[i] !== false);
  const after = previewActivities(activities, chosen);
  const freeNow = Math.max(0, windowMinutes() - occupiedMinutes(dayItems(activities, today)));
  const freeNext = Math.max(0, windowMinutes() - occupiedMinutes(dayItems(after, today)));
  return (
    <Sheet title="Organizar mi día" subtitle="Nada cambia hasta que lo apruebes" onClose={close}>
      <div className="space-y-3">
        <p className="text-sm text-muted">
          Libre ahora: {humanMinutes(freeNow)}. Si aplicas lo marcado: {humanMinutes(freeNext)}.
        </p>
        {proposal.notes.map((note) => (
          <p key={note} className="text-sm">{note}</p>
        ))}
        <ChangeList changes={proposal.changes} picked={picked} onToggle={toggle} />
        {proposal.unscheduled.length ? (
          <p className="text-sm text-muted">Siguen sin horario: {proposal.unscheduled.join(", ")}.</p>
        ) : null}
        <PrimaryButton
          onClick={() => {
            applyChanges(chosen);
            close();
          }}
        >
          Aplicar cambios
        </PrimaryButton>
        <GhostButton onClick={setVariant}>Generar otra opción</GhostButton>
        <GhostButton onClick={close}>Mantener planificación</GhostButton>
      </div>
    </Sheet>
  );
}

function PrepareSheet() {
  const activities = useRoutine((s) => s.activities);
  const places = useRoutine((s) => s.places);
  const energy = useRoutine((s) => s.profile.energy);
  const applyChanges = useRoutine((s) => s.applyChanges);
  const updateProfile = useRoutine((s) => s.updateProfile);
  const markTomorrowReviewed = useRoutine((s) => s.markTomorrowReviewed);
  const setTab = useRoutine((s) => s.setTab);
  const reschedule = useRoutine((s) => s.reschedule);
  const mounted = useMounted();
  const now = useNow(mounted);
  const today = isoDate(now ?? new Date());
  const tomorrow = addDaysIso(today, 1);
  const [variant, setVariant] = useState(0);
  const proposal = useMemo(
    () => proposeTomorrow({ activities, today, tomorrow, variant, energy }),
    [activities, today, tomorrow, variant, energy],
  );
  const { picked, toggle } = usePicked(proposal.changes);
  const chosen = proposal.changes.filter((_, i) => picked[i] !== false);
  const summary = [
    prettyDate(tomorrow),
    `Despertarse ${proposal.wake}. Acostarse hoy ${proposal.bed}.`,
    ...dayItems(previewActivities(activities, chosen), tomorrow).map((a) => `${a.start || "sin hora"} ${a.name}${placeName(places, a.placeId) ? ` (${placeName(places, a.placeId)})` : ""}`),
  ].join("\n");

  return (
    <Sheet title="Preparar mañana" subtitle={prettyDate(tomorrow)} onClose={close}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-sand p-3">
            <p className="text-xs text-muted">Despertarse</p>
            <p className="font-display text-2xl">{proposal.wake}</p>
          </div>
          <div className="rounded-2xl bg-sand p-3">
            <p className="text-xs text-muted">Acostarse hoy</p>
            <p className="font-display text-2xl">{proposal.bed}</p>
          </div>
        </div>
        {proposal.notes.map((note) => (
          <p key={note} className="text-sm">{note}</p>
        ))}
        <ChangeList changes={proposal.changes} picked={picked} onToggle={toggle} />
        {proposal.carry.length ? (
          <div>
            <h3 className="font-bold">Pendientes de hoy que pueden viajar</h3>
            <ul className="mt-1 space-y-1 text-sm">
              {proposal.carry.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2">
                  <span>{a.name}</span>
                  <button
                    type="button"
                    className="min-h-10 rounded-xl bg-sand px-2 text-xs font-bold"
                    onClick={() => reschedule(a.id, tomorrow, a.start, a.end, "Se trasladó al preparar mañana.")}
                  >
                    Trasladar
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {proposal.materials.length ? (
          <div>
            <h3 className="font-bold">Materiales y preparación</h3>
            <ul className="mt-1 list-disc pl-5 text-sm">
              {proposal.materials.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <PrimaryButton
          onClick={() => {
            applyChanges(chosen);
            updateProfile({ alarm: proposal.wake });
            markTomorrowReviewed(tomorrow);
            close();
          }}
        >
          Aprobar organización de mañana
        </PrimaryButton>
        <GhostButton onClick={() => setVariant((v) => v + 1)}>Generar otra propuesta</GhostButton>
        <GhostButton
          onClick={() => {
            updateProfile({ alarm: proposal.wake });
            useRoutine.getState().flash(`Alarma anotada a las ${proposal.wake}.`);
          }}
        >
          Configurar alarma
        </GhostButton>
        <GhostButton
          onClick={() => {
            void sharePlan(summary);
          }}
        >
          Compartir planificación
        </GhostButton>
        <GhostButton
          onClick={() => {
            useRoutine.getState().setSelectedDate(tomorrow);
            useRoutine.getState().setCalMode("dia");
            setTab("calendario");
            close();
          }}
        >
          Ver día completo
        </GhostButton>
        <GhostButton onClick={close}>Mantener como está</GhostButton>
      </div>
    </Sheet>
  );
}

async function sharePlan(text: string) {
  const flash = useRoutine.getState().flash;
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title: "My Routine Tano", text });
      return;
    } catch {
      return;
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    flash("Copié la planificación para que puedas pegarla.");
  } catch {
    flash("No pude compartir desde aquí.");
  }
}

function CloseSheet() {
  const activities = useRoutine((s) => s.activities);
  const setStatus = useRoutine((s) => s.setStatus);
  const reschedule = useRoutine((s) => s.reschedule);
  const prep = useRoutine((s) => s.prep);
  const profile = useRoutine((s) => s.profile);
  const mounted = useMounted();
  const now = useNow(mounted);
  const today = isoDate(now ?? new Date());
  const tomorrow = addDaysIso(today, 1);
  const items = dayItems(activities, today).filter((a) => a.status !== "omitida");
  const [step, setStep] = useState(0);
  const [move, setMove] = useState<Record<string, boolean>>({});
  const times = wakeAndBed(activities, tomorrow);
  const first = dayItems(activities, tomorrow).find((a) => a.start);
  const done = items.filter((a) => a.status === "realizada" || a.status === "parcial");
  const pending = items.filter((a) => a.status !== "realizada" && a.status !== "parcial" && a.status !== "cancelada");

  return (
    <Sheet title="Cierre del día" subtitle={step === 0 ? "Qué quedó" : step === 1 ? "Para mañana" : "Resumen"} onClose={close}>
      {step === 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-muted">Marca lo que sí hiciste. Lo demás puede pasar a mañana, si quieres.</p>
          {items.map((a) => (
            <div key={a.id} className="rounded-2xl border border-line p-3">
              <p className="font-bold">{a.name}</p>
              <p className="text-xs text-muted">{STATUS_LABEL[a.status]}</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button type="button" className="min-h-10 rounded-xl bg-sand text-sm font-bold" onClick={() => setStatus(a.id, "realizada")}>
                  La completé
                </button>
                <button
                  type="button"
                  className={cn("min-h-10 rounded-xl text-sm font-bold", move[a.id] ? "bg-forest text-forest-fg" : "bg-sand")}
                  onClick={() => setMove((curr) => ({ ...curr, [a.id]: !curr[a.id] }))}
                >
                  Pasar a mañana
                </button>
              </div>
            </div>
          ))}
          <PrimaryButton onClick={() => setStep(1)}>Seguir</PrimaryButton>
        </div>
      ) : null}
      {step === 1 ? (
        <div className="space-y-3">
          <p className="text-sm">¿La alarma está en {profile.alarm || times.wake}? Puedes dejarla anotada al terminar.</p>
          <ul className="space-y-1 text-sm">
            {prep.slice(0, 6).map((item) => (
              <li key={item.id}>{item.done ? "Listo" : "Pendiente"} · {item.text}</li>
            ))}
          </ul>
          <PrimaryButton
            onClick={() => {
              for (const [id, yes] of Object.entries(move)) {
                if (!yes) continue;
                const a = activities.find((x) => x.id === id);
                if (!a) continue;
                reschedule(id, tomorrow, a.start, a.end, "Se trasladó en el cierre del día.");
              }
              useRoutine.getState().updateProfile({ alarm: profile.alarm || times.wake });
              setStep(2);
            }}
          >
            Trasladar lo marcado
          </PrimaryButton>
          <GhostButton onClick={() => setStep(2)}>No mover nada</GhostButton>
        </div>
      ) : null}
      {step === 2 ? (
        <div className="space-y-2 text-sm">
          <p>Completadas: {done.length}. Siguen abiertas: {pending.length}.</p>
          <p>Primera de mañana: {first ? `${first.start} ${first.name}` : "todavía sin horario"}.</p>
          <p>Despertarse alrededor de las {times.wake}. Alarma: {useRoutine.getState().profile.alarm || "sin anotar"}.</p>
          <p>Preparación marcada: {prep.filter((p) => p.done).length} de {prep.length}.</p>
          <PrimaryButton onClick={close}>Terminar el día</PrimaryButton>
        </div>
      ) : null}
    </Sheet>
  );
}

function WeekSheet() {
  const activities = useRoutine((s) => s.activities);
  const freeEvening = useRoutine((s) => s.profile.freeEvening);
  const applyChanges = useRoutine((s) => s.applyChanges);
  const mounted = useMounted();
  const now = useNow(mounted);
  const today = isoDate(now ?? new Date());
  const days = weekDates(today);
  const [variant, setVariant] = useState(0);
  const proposal = useMemo(
    () => proposeWeek({ activities, days, freeEvening, variant }),
    [activities, days, freeEvening, variant],
  );
  const { picked, toggle } = usePicked(proposal.changes);
  const chosen = proposal.changes.filter((_, i) => picked[i] !== false);
  return (
    <Sheet title="Planificar mi semana" subtitle="Los horarios fijos se quedan" onClose={close}>
      <div className="space-y-3">
        <p className="text-sm text-muted">Desmarca lo que no quieras mover. Nada se aplica solo.</p>
        {proposal.notes.map((note) => (
          <p key={note} className="text-sm">{note}</p>
        ))}
        <ChangeList changes={proposal.changes} picked={picked} onToggle={toggle} />
        {proposal.unscheduled.length ? <p className="text-sm text-muted">Sin programar: {proposal.unscheduled.join(", ")}.</p> : null}
        <PrimaryButton
          onClick={() => {
            applyChanges(chosen);
            close();
          }}
        >
          Aplicar planificación
        </PrimaryButton>
        <GhostButton onClick={() => setVariant((v) => v + 1)}>Generar otra propuesta</GhostButton>
        <GhostButton onClick={close}>Mantener la anterior</GhostButton>
      </div>
    </Sheet>
  );
}
