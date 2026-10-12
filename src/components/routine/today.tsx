import { CalendarDays, Check, Leaf, Sparkles } from "lucide-react";
import type { Activity, Energy } from "@/lib/routine/model";
import { OPEN_STATUSES, STATUS_LABEL } from "@/lib/routine/model";
import { dailyTip, departAt, travelWarnings } from "@/lib/routine/planner";
import { useRoutine } from "@/lib/routine/store";
import { addDaysIso, dayItems, greetingFor, humanMinutes, isoDate, minutes, occupiedMinutes, prettyDate, windowMinutes } from "@/lib/routine/time";
import { Bubble, CAT_STYLE, categoryOf, cn, Meter, placeName, useMounted, useNow } from "./bits";

function nextOf(items: Activity[], nowMin: number | null, categoryId?: string) {
  const pool = items.filter((a) => {
    if (!OPEN_STATUSES.includes(a.status)) return false;
    if (categoryId && a.categoryId !== categoryId) return false;
    if (!a.start) return categoryId ? true : false;
    if (nowMin == null) return true;
    return minutes(a.end || a.start) >= nowMin;
  });
  return pool[0];
}

export function TodayView() {
  const activities = useRoutine((s) => s.activities);
  const categories = useRoutine((s) => s.categories);
  const places = useRoutine((s) => s.places);
  const profile = useRoutine((s) => s.profile);
  const reviewed = useRoutine((s) => s.reviewedTomorrowOn);
  const setTab = useRoutine((s) => s.setTab);
  const setOverlay = useRoutine((s) => s.setOverlay);
  const setStatus = useRoutine((s) => s.setStatus);
  const setEnergy = useRoutine((s) => s.setEnergy);
  const mounted = useMounted();
  const now = useNow(mounted);
  const today = isoDate(now ?? new Date());
  const tomorrowIso = addDaysIso(today, 1);
  const nowMin = now ? now.getHours() * 60 + now.getMinutes() : null;
  const items = dayItems(activities, today);
  const open = items.filter((a) => OPEN_STATUSES.includes(a.status));
  const done = items.filter((a) => a.status === "realizada" || a.status === "parcial");
  const occupied = occupiedMinutes(items);
  const free = Math.max(0, windowMinutes() - occupied);
  const progress = items.length ? done.length / items.length : 0;
  const current =
    nowMin == null
      ? undefined
      : open.find((a) => a.start && a.end && minutes(a.start) <= nowMin && nowMin < minutes(a.end));
  const upcoming = open.find((a) => !current && a.start && (nowMin == null || minutes(a.start) >= nowMin));
  const hero = current ?? upcoming ?? open[0];
  const late =
    nowMin == null
      ? []
      : open.filter((a) => a.end && minutes(a.end) < nowMin && a.id !== hero?.id);
  const warnings = travelWarnings(open);
  const tip = dailyTip(items, nowMin);
  const showReminder =
    nowMin != null &&
    minutes(profile.tomorrowReminder) <= nowMin &&
    reviewed !== tomorrowIso;

  const spots = [
    { label: "Comida", id: "alimentacion" },
    { label: "Estudio", id: "estudio" },
    { label: "Gimnasio", id: "gimnasio" },
    { label: "Espiritual", id: "espiritual" },
    { label: "Viaje", id: "desplazamiento" },
    { label: "Descanso", id: "descanso" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-1.5 text-3xl font-extrabold tracking-tight text-ink">
            Hoy
            <Leaf className="size-5 text-sage" aria-hidden="true" />
          </h1>
          <p className="text-sm text-muted">
            {now ? greetingFor(now.getHours()) : "Hola"}, {profile.name}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-sage-soft/80 px-3 py-2 text-forest">
          <CalendarDays className="size-5 shrink-0" aria-hidden="true" />
          <span className="text-right leading-tight">
            <span className="block text-sm font-extrabold">{prettyDate(today).split(" ")[0]}</span>
            <span className="block text-[11px] font-semibold">{prettyDate(today).slice(prettyDate(today).indexOf(" ") + 1)}</span>
          </span>
        </div>
      </div>

      {showReminder ? (
        <button
          type="button"
          onClick={() => setTab("manana")}
          className="w-full rounded-3xl border border-line bg-sand px-4 py-3 text-left"
        >
          <span className="block font-bold text-ink">¿Quieres revisar y preparar las actividades de mañana?</span>
          <span className="mt-1 block text-sm text-muted">El recordatorio está a las {profile.tomorrowReminder}.</span>
        </button>
      ) : null}

      <section className="rounded-3xl border border-line bg-paper p-4 shadow-card">
        <div className="mb-2 flex items-end justify-between gap-3">
          <p className="text-sm font-bold text-ink">Progreso de hoy</p>
          <p className="text-sm text-muted">
            {done.length} de {items.length}
          </p>
        </div>
        <Meter value={progress} max={1} />
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Stat label="Ocupado" value={humanMinutes(occupied)} />
          <Stat label="Libre" value={humanMinutes(free)} />
          <Stat label="Pendientes" value={String(open.length)} />
        </div>
      </section>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Energía de hoy">
        {(["baja", "media", "alta"] as Energy[]).map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => setEnergy(level)}
            className={cn(
              "min-h-10 rounded-full px-3 text-sm font-bold",
              profile.energy === level ? "bg-forest text-forest-fg" : "bg-sand text-ink",
            )}
          >
            Energía {level}
          </button>
        ))}
      </div>

      {hero ? <Hero activity={hero} current={Boolean(current)} nowMin={nowMin} /> : (
        <section className="rounded-3xl border border-line bg-paper p-4">
          <p className="font-bold">Nada pendiente con horario.</p>
          <p className="text-sm text-muted">Puedes agregar una actividad o aplicar una rutina.</p>
        </section>
      )}

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {spots.map((spot) => {
          const found = nextOf(items, nowMin, spot.id);
          const cat = categoryOf(categories, spot.id);
          return (
            <button
              key={spot.id}
              type="button"
              onClick={() => found && setOverlay({ type: "detail", id: found.id })}
              className="w-36 shrink-0 rounded-2xl border border-line bg-paper p-3 text-left"
            >
              <span className="flex items-center gap-1.5 text-xs font-bold text-muted">
                <span className={cn("size-2 rounded-full", CAT_STYLE[cat?.color ?? "personal"].dot)} />
                {spot.label}
              </span>
              <span className="mt-1 block truncate text-sm font-bold text-ink">
                {found ? found.name : "Sin horario"}
              </span>
              <span className="block text-xs text-muted">{found?.start || "—"}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setOverlay({ type: "organize" })}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-forest px-4 text-sm font-extrabold text-forest-fg shadow-card"
      >
        <Sparkles className="size-4" aria-hidden="true" />
        Organizar mi día
      </button>
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => hero && setOverlay({ type: "focus", id: hero.id })}
          disabled={!hero}
          className="min-h-11 rounded-2xl bg-sand px-2 text-xs font-bold text-ink disabled:opacity-50"
        >
          Concentrarme
        </button>
        <button type="button" onClick={() => setTab("manana")} className="min-h-11 rounded-2xl bg-sand px-2 text-xs font-bold text-ink">
          Ver mañana
        </button>
        <button type="button" onClick={() => setOverlay({ type: "close" })} className="min-h-11 rounded-2xl bg-sand px-2 text-xs font-bold text-ink">
          Cerrar el día
        </button>
      </div>

      <section className="rounded-3xl border border-line bg-sand/70 p-4">
        <p className="flex items-center gap-2 text-sm font-bold text-ink">
          <Sparkles className="size-4 text-gold" aria-hidden="true" />
          Recomendación
        </p>
        <p className="mt-1 text-sm leading-relaxed text-ink">{tip}</p>
      </section>

      {late.length ? (
        <section>
          <h2 className="mb-2 font-display text-xl text-ink">Atrasadas</h2>
          <div className="space-y-2">
            {late.map((a) => (
              <article key={a.id} className="flex items-center gap-2 rounded-2xl border border-line bg-paper p-3">
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setOverlay({ type: "detail", id: a.id })}>
                  <span className="block truncate font-bold">{a.name}</span>
                  <span className="text-xs text-muted">Era a las {a.start}. Puedes completarla o moverla.</span>
                </button>
                <button
                  type="button"
                  aria-label={`Completar ${a.name}`}
                  onClick={() => setStatus(a.id, "realizada")}
                  className="grid size-11 shrink-0 place-items-center rounded-2xl bg-sand"
                >
                  <Check className="size-5" />
                </button>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {warnings.length ? (
        <section className="rounded-3xl border border-line bg-paper p-4">
          <h2 className="font-display text-xl">Salidas justas</h2>
          <ul className="mt-2 space-y-2 text-sm leading-relaxed text-muted">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="mb-2 font-display text-xl text-ink">Línea del día</h2>
        <ol className="space-y-2">
          {items.map((a) => {
            const cat = categoryOf(categories, a.categoryId);
            const isCurrent = current?.id === a.id;
            const isDone = a.status === "realizada";
            return (
              <li key={a.id}>
                <article className={cn("mb-2 flex items-stretch gap-2 rounded-2xl bg-sand p-2", isCurrent && "ring-2 ring-forest", isDone && "opacity-70")}>
                  <button type="button" className="flex min-w-0 flex-1 items-start gap-2 text-left" onClick={() => setOverlay({ type: "detail", id: a.id })}>
                    {cat ? <Bubble categoryId={a.categoryId} icon={cat.icon} color={cat.color} /> : null}
                    <span className="min-w-0">
                      <span className="block text-[11px] font-semibold text-muted">
                        {a.start || "Sin hora"}
                        {a.end ? ` – ${a.end}` : ""}
                      </span>
                      <span className="block truncate text-sm font-extrabold text-ink">{a.name}</span>
                      <span className="block truncate text-[11px] text-muted">
                        {placeName(places, a.placeId) || STATUS_LABEL[a.status]}
                        {a.locked ? " · Fija" : ""}
                      </span>
                    </span>
                  </button>
                  {!isDone ? (
                    <button
                      type="button"
                      aria-label={`Completar ${a.name}`}
                      onClick={() => setStatus(a.id, "realizada")}
                      className="grid size-11 place-items-center self-center rounded-2xl bg-sand"
                    >
                      <Check className="size-5" />
                    </button>
                  ) : (
                    <span className="grid size-11 place-items-center self-center text-ok">
                      <Check className="size-5" />
                    </span>
                  )}
                </article>
              </li>
            );
          })}
        </ol>
      </section>
      <p className="sr-only">Mañana es {prettyDate(tomorrowIso)}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-sand px-2 py-2">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-sm font-bold text-ink">{value}</p>
    </div>
  );
}

function Hero({
  activity,
  current,
  nowMin,
}: {
  activity: Activity;
  current: boolean;
  nowMin: number | null;
}) {
  const categories = useRoutine((s) => s.categories);
  const places = useRoutine((s) => s.places);
  const setOverlay = useRoutine((s) => s.setOverlay);
  const cat = categoryOf(categories, activity.categoryId);
  const style = CAT_STYLE[cat?.color ?? "personal"];
  const remain =
    current && nowMin != null && activity.end ? Math.max(0, minutes(activity.end) - nowMin) : null;
  const until =
    !current && nowMin != null && activity.start ? Math.max(0, minutes(activity.start) - nowMin) : null;
  const leave = departAt(activity.start, activity.travelMin);

  return (
    <section className={cn("rounded-3xl border border-line border-l-4 bg-paper p-4 shadow-card", style.rail)}>
      <p className="text-xs font-bold uppercase tracking-wide text-muted">{current ? "Ahora" : "Siguiente"}</p>
      <h2 className="mt-1 font-display text-3xl leading-tight text-ink">{activity.name}</h2>
      <p className="mt-1 text-sm text-muted">
        {activity.start || "Sin hora"}
        {activity.end ? ` – ${activity.end}` : ""}
        {placeName(places, activity.placeId) ? ` · ${placeName(places, activity.placeId)}` : ""}
      </p>
      {remain != null ? <p className="mt-2 text-sm font-bold text-forest">Quedan {humanMinutes(remain)}</p> : null}
      {until != null ? <p className="mt-2 text-sm font-bold text-forest">Empieza en {humanMinutes(until)}</p> : null}
      {leave ? <p className="mt-1 text-sm text-muted">Conviene salir a las {leave}.</p> : null}
      {activity.checklist.length ? (
        <p className="mt-2 text-sm text-muted">
          Preparación: {activity.checklist.filter((c) => c.done).length}/{activity.checklist.length}
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => setOverlay({ type: "detail", id: activity.id })}
        className="mt-3 min-h-11 rounded-2xl bg-forest px-4 text-sm font-bold text-forest-fg"
      >
        Abrir actividad
      </button>
    </section>
  );
}
