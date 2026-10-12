import { useEffect, useState } from "react";
import { CalendarDays, ChevronRight, MoreHorizontal, Plane, Plus, Star, Sun } from "lucide-react";
import type { RoutineKind } from "@/lib/routine/model";
import { useRoutine } from "@/lib/routine/store";
import { addDaysIso, isoDate, prettyDate } from "@/lib/routine/time";
import { Bubble, categoryOf, cn, fieldClass, useMounted, useNow } from "./bits";

const FILTERS: { id: string; label: string; kinds: RoutineKind[]; icon: typeof Sun; bubble: string }[] = [
  { id: "diaria", label: "Diaria", kinds: ["diaria", "laborable"], icon: Sun, bubble: "bg-sage-soft text-forest" },
  { id: "semanal", label: "Semanal", kinds: ["semanal", "familiar"], icon: CalendarDays, bubble: "bg-bubble-gym text-bubble-gym-fg" },
  { id: "mensual", label: "Mensual", kinds: ["mensual"], icon: CalendarDays, bubble: "bg-bubble-study text-bubble-study-fg" },
  { id: "vacaciones", label: "Vacaciones", kinds: ["vacaciones", "fin_de_semana"], icon: Plane, bubble: "bg-bubble-personal text-bubble-personal-fg" },
  { id: "especial", label: "Especial", kinds: ["especial", "temporal"], icon: Star, bubble: "bg-bubble-food text-bubble-food-fg" },
];

const DAYS: Record<string, string[]> = {
  "rt-trabajo": ["Lun", "Mar", "Mié", "Jue", "Vie"],
  "rt-estudio": ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"],
  "rt-clases": ["Lun", "Mar", "Mié", "Jue", "Vie"],
  "rt-reunion": ["Mar", "Jue", "Sáb", "Dom"],
  "rt-pred": ["Sáb"],
  "rt-gym": ["Lun", "Mié", "Vie"],
  "rt-food": ["Todos los días"],
  "rt-finde": ["Sáb", "Dom"],
  "rt-descanso": ["Dom"],
  "rt-examen": ["Esta semana"],
  "rt-hogar": ["Sáb"],
  "rt-manana": ["Todos los días"],
};

export function RoutinesView() {
  const routines = useRoutine((s) => s.routines);
  const categories = useRoutine((s) => s.categories);
  const applyRoutine = useRoutine((s) => s.applyRoutine);
  const removeRoutine = useRoutine((s) => s.removeRoutine);
  const saveDayAsRoutine = useRoutine((s) => s.saveDayAsRoutine);
  const search = useRoutine((s) => s.search);
  const mounted = useMounted();
  const now = useNow(mounted);
  const today = isoDate(now ?? new Date());
  const tomorrow = addDaysIso(today, 1);
  const [pane, setPane] = useState<"mias" | "plantillas" | "categorias">("mias");
  const [filter, setFilter] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("Mi día de trabajo");

  useEffect(() => {
    const openForm = () => setCreating(true);
    window.addEventListener("tana-new-routine", openForm);
    return () => window.removeEventListener("tana-new-routine", openForm);
  }, []);

  const query = search.trim().toLowerCase();
  const visible = routines.filter((routine) => {
    if (filter) {
      const kinds = FILTERS.find((f) => f.id === filter)?.kinds ?? [];
      if (!kinds.includes(routine.kind)) return false;
    }
    if (!query) return true;
    return routine.name.toLowerCase().includes(query) || routine.description.toLowerCase().includes(query);
  });
  const suggestion = suggestRoutine(now?.getDay() ?? 1);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">Rutinas</h1>
          <p className="text-sm text-muted">Organiza tus actividades y crea hábitos</p>
        </div>
        <p className="font-script max-w-36 text-right text-xl leading-tight text-forest">
          Buenas rutinas, una vida en equilibrio
        </p>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="inline-flex min-h-11 items-center gap-1 rounded-full bg-forest px-4 text-sm font-extrabold text-forest-fg"
        >
          <Plus className="size-4" />
          Nueva rutina
        </button>
      </div>

      {creating ? (
        <section className="rounded-3xl bg-card p-4 shadow-card">
          <h2 className="text-sm font-extrabold">Guardar un día como rutina</h2>
          <label className="mt-2 block text-xs font-bold" htmlFor="routine-name">
            Nombre
          </label>
          <input id="routine-name" value={name} onChange={(e) => setName(e.target.value)} className={`mt-1 ${fieldClass}`} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => saveDayAsRoutine(today, name)} className="min-h-11 rounded-2xl bg-sage-soft text-sm font-bold text-forest">
              Desde hoy
            </button>
            <button type="button" onClick={() => saveDayAsRoutine(tomorrow, name || "Mañana")} className="min-h-11 rounded-2xl bg-sand text-sm font-bold">
              Desde mañana
            </button>
          </div>
        </section>
      ) : null}

      <div className="grid grid-cols-3 rounded-full bg-sand p-1">
        {(
          [
            ["mias", "Mis rutinas"],
            ["plantillas", "Plantillas"],
            ["categorias", "Categorías"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setPane(id)}
            className={cn(
              "min-h-10 rounded-full text-xs font-extrabold",
              pane === id ? "bg-sage-soft text-forest" : "text-muted",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {pane === "categorias" ? (
        <ul className="grid grid-cols-2 gap-2">
          {categories.filter((c) => c.visible).map((cat) => (
            <li key={cat.id} className="rounded-3xl bg-card p-3 shadow-card">
              <Bubble icon={cat.icon} color={cat.color} />
              <p className="mt-2 text-sm font-extrabold">{cat.name}</p>
              <p className="text-[11px] text-muted">{cat.description}</p>
            </li>
          ))}
        </ul>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {FILTERS.map((item) => {
              const Icon = item.icon;
              const on = filter === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(on ? null : item.id)}
                  className={cn("flex w-20 shrink-0 flex-col items-center gap-1 rounded-2xl px-2 py-3 text-[11px] font-bold", on ? "ring-2 ring-forest" : "", item.bubble)}
                >
                  <Icon className="size-5" aria-hidden="true" />
                  {item.label}
                </button>
              );
            })}
          </div>

          {pane === "mias" ? (
            <section className="rounded-3xl bg-sage-soft/70 p-3">
              <p className="text-xs font-bold text-forest">Sugerencia para hoy</p>
              <p className="text-sm font-extrabold text-ink">{routines.find((r) => r.id === suggestion)?.name ?? "Día de trabajo"}</p>
              <button
                type="button"
                onClick={() => applyRoutine(suggestion, today)}
                className="mt-2 min-h-10 rounded-2xl bg-forest px-3 text-xs font-bold text-forest-fg"
              >
                Aplicar esta sugerencia a hoy
              </button>
            </section>
          ) : (
            <p className="text-sm text-muted">Las plantillas no se aplican solas. Elige un día y confirma.</p>
          )}

          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-ink">Mis rutinas ({visible.length})</h2>
            <button type="button" onClick={() => setFilter(null)} className="text-xs font-bold text-sage">
              Ver todas
            </button>
          </div>

          <ul className="space-y-2">
            {visible.map((routine) => {
              const cat = categoryOf(categories, routine.items[0]?.categoryId ?? "personal");
              const expanded = open === routine.id;
              const days = DAYS[routine.id] ?? ["Personal"];
              return (
                <li key={routine.id} className="rounded-3xl bg-card p-3 shadow-card">
                  <div className="flex items-start gap-2">
                    {cat ? <Bubble categoryId={routine.items[0]?.categoryId} icon={cat.icon} color={cat.color} /> : null}
                    <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setOpen(expanded ? null : routine.id)}>
                      <span className="block text-sm font-extrabold text-ink">{routine.name}</span>
                      <span className="block text-xs text-muted">{routine.description}</span>
                    </button>
                    <button type="button" aria-label={`Opciones de ${routine.name}`} onClick={() => setOpen(expanded ? null : routine.id)} className="grid size-8 place-items-center text-muted">
                      <MoreHorizontal className="size-4" />
                    </button>
                    <ChevronRight className="mt-1 size-4 text-muted" />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1 pl-11">
                    {days.map((day) => (
                      <span key={day} className="rounded-full bg-sand px-2 py-0.5 text-[10px] font-bold text-muted">
                        {day}
                      </span>
                    ))}
                  </div>
                  {expanded ? (
                    <div className="mt-3 space-y-2 border-t border-line pt-3">
                      <ol className="space-y-1 text-xs">
                        {routine.items.map((item) => (
                          <li key={`${routine.id}-${item.start}-${item.name}`}>
                            <span className="font-extrabold">{item.start}</span> {item.name}
                          </li>
                        ))}
                      </ol>
                      <button type="button" onClick={() => applyRoutine(routine.id, today)} className="min-h-11 w-full rounded-2xl bg-forest text-sm font-bold text-forest-fg">
                        Aplicar a hoy
                      </button>
                      <button type="button" onClick={() => applyRoutine(routine.id, tomorrow)} className="min-h-11 w-full rounded-2xl bg-sage-soft text-sm font-bold text-forest">
                        Aplicar a mañana · {prettyDate(tomorrow)}
                      </button>
                      {routine.description === "Guardada desde un día real." ? (
                        <button type="button" onClick={() => removeRoutine(routine.id)} className="text-xs font-bold text-danger">
                          Quitar rutina
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

function suggestRoutine(day: number) {
  if (day === 0) return "rt-finde";
  if (day === 6) return "rt-pred";
  return "rt-trabajo";
}
