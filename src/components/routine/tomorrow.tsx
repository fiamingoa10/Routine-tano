import { useEffect, useState } from "react";
import { CalendarDays, Check, ChevronRight, House, Leaf, MapPin, Sparkles, Sun } from "lucide-react";
import { wakeAndBed } from "@/lib/routine/planner";
import { OPEN_STATUSES } from "@/lib/routine/model";
import { useRoutine } from "@/lib/routine/store";
import {
  addDaysIso,
  dayItems,
  findOverlaps,
  humanMinutes,
  isoDate,
  occupiedMinutes,
  prettyDate,
  weekdayName,
  windowMinutes,
} from "@/lib/routine/time";
import { Bubble, CAT_STYLE, categoryOf, cn, placeName, useMounted, useNow } from "./bits";

export function TomorrowView() {
  const activities = useRoutine((s) => s.activities);
  const categories = useRoutine((s) => s.categories);
  const places = useRoutine((s) => s.places);
  const prep = useRoutine((s) => s.prep);
  const togglePrep = useRoutine((s) => s.togglePrep);
  const addPrep = useRoutine((s) => s.addPrep);
  const ensurePrep = useRoutine((s) => s.ensurePrep);
  const setTab = useRoutine((s) => s.setTab);
  const setSelected = useRoutine((s) => s.setSelectedDate);
  const setOverlay = useRoutine((s) => s.setOverlay);
  const mounted = useMounted();
  const now = useNow(mounted);
  const today = isoDate(now ?? new Date());
  const tomorrow = addDaysIso(today, 1);
  const [allPrep, setAllPrep] = useState(false);
  useEffect(() => {
    if (mounted) ensurePrep(tomorrow);
  }, [mounted, tomorrow, ensurePrep]);

  const items = dayItems(activities, tomorrow);
  const occupied = occupiedMinutes(items);
  const free = Math.max(0, windowMinutes() - occupied);
  const span = Math.max(windowMinutes(), 1);
  const times = wakeAndBed(activities, tomorrow);
  const first = items.find((a) => a.start);
  const overlaps = findOverlaps(items);
  const pendingToday = dayItems(activities, today).filter((a) => OPEN_STATUSES.includes(a.status));
  const shownPrep = allPrep ? prep : prep.slice(0, 8);

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-1.5 text-3xl font-extrabold tracking-tight text-ink">
            Mañana
            <Leaf className="size-5 text-sage" aria-hidden="true" />
          </h1>
          <p className="text-sm text-muted">Tu próximo día, un paso adelante</p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-sage-soft/80 px-3 py-2 text-forest">
          <CalendarDays className="size-5 shrink-0" aria-hidden="true" />
          <span className="text-right leading-tight">
            <span className="block text-sm font-extrabold">{weekdayName(tomorrow)}</span>
            <span className="block text-[11px] font-semibold">{prettyDate(tomorrow)}</span>
          </span>
        </div>
      </div>

      <section className="flex items-center gap-2 rounded-3xl bg-sage-soft/70 px-3 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-card text-gold">
            <Sun className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-ink">Primera actividad</p>
            <p className="text-xs font-extrabold text-ink">
              {first?.start ? `${first.start}${first.end ? ` – ${first.end}` : ""}` : "Sin horario"}
            </p>
            <p className="truncate text-sm font-extrabold text-ink">{first ? first.name : "Día libre"}</p>
          </div>
        </div>
        <span className="h-10 w-px shrink-0 bg-forest/15" />
        <div className="flex shrink-0 items-center gap-2 text-right">
          <div>
            <p className="max-w-24 text-[11px] leading-tight font-bold text-ink">Hora sugerida para despertar</p>
            <p className="text-xl font-extrabold text-ink">{times.wake}</p>
          </div>
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-bubble-uni text-bubble-uni-fg">
            <House className="size-5" aria-hidden="true" />
          </span>
        </div>
      </section>

      {overlaps.length ? (
        <p className="rounded-2xl bg-bubble-food px-3 py-2 text-xs font-bold text-bubble-food-fg">
          Hay {overlaps.length} horario{overlaps.length === 1 ? "" : "s"} superpuesto{overlaps.length === 1 ? "" : "s"}. Puedes revisarlo antes de cambiar nada.
        </p>
      ) : null}

      <div className="grid grid-cols-2 items-start gap-2">
        <section className="min-w-0 rounded-3xl bg-card p-3 shadow-card">
          <div className="mb-2 flex items-center justify-between gap-1">
            <h2 className="flex items-center gap-1 text-sm font-extrabold text-ink">
              <span className="text-forest" aria-hidden="true">≡</span>
              Plan de mañana
            </h2>
            <button
              type="button"
              onClick={() => {
                setSelected(tomorrow);
                setTab("calendario");
              }}
              className="text-[11px] font-bold text-sage"
            >
              Ver día completo
            </button>
          </div>
          <ol>
            {items.map((a, index) => {
              const cat = categoryOf(categories, a.categoryId);
              const style = CAT_STYLE[cat?.color ?? "personal"];
              const where = placeName(places, a.placeId);
              return (
                <li key={a.id} className="flex gap-1.5">
                  <span className="flex w-3 flex-col items-center">
                    <span className={cn("mt-4 size-2 rounded-full", style.dot)} />
                    {index < items.length - 1 ? <span className="w-px flex-1 bg-line" /> : null}
                  </span>
                  <button
                    type="button"
                    onClick={() => setOverlay({ type: "detail", id: a.id })}
                    className="mb-2 flex min-w-0 flex-1 items-start gap-2 rounded-2xl bg-sand px-2 py-2 text-left"
                  >
                    {cat ? <Bubble categoryId={a.categoryId} icon={cat.icon} color={cat.color} /> : null}
                    <span className="min-w-0">
                      <span className="block text-[11px] font-semibold text-muted">
                        {a.start || "Sin hora"}
                        {a.end ? ` – ${a.end}` : ""}
                      </span>
                      <span className="block truncate text-xs font-extrabold text-ink">{a.name}</span>
                      {where ? (
                        <span className="mt-0.5 flex items-center gap-1 text-[11px] text-muted">
                          {a.placeId === "hogar" ? <House className="size-3" /> : <MapPin className="size-3" />}
                          {where}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          {items.length === 0 ? <p className="text-xs text-muted">Todavía no hay actividades. Puedes armar el día con una rutina.</p> : null}
        </section>

        <div className="min-w-0 space-y-2">
          <section className="rounded-3xl bg-card p-3 shadow-card">
            <h2 className="text-sm font-extrabold text-ink">Tiempo del día</h2>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-sand">
              <div className="h-full rounded-full bg-forest" style={{ width: `${Math.min(100, Math.round((occupied / span) * 100))}%` }} />
            </div>
            <p className="mt-2 text-xs font-bold text-ink">{humanMinutes(occupied)} ocupadas</p>
            <p className="text-xs font-bold text-sage">{humanMinutes(free)} libres</p>
          </section>

          <section className="rounded-3xl bg-card p-3 shadow-card">
            <h2 className="text-sm font-extrabold text-ink">Preparar para mañana</h2>
            <ul className="mt-2 space-y-1.5">
              {shownPrep.map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => togglePrep(item.id)} className="flex w-full items-center gap-2 text-left">
                    <span
                      className={cn(
                        "grid size-5 shrink-0 place-items-center rounded-full",
                        item.done ? "bg-forest text-forest-fg" : "border border-line bg-card",
                      )}
                    >
                      {item.done ? <Check className="size-3" /> : null}
                    </span>
                    <span className={cn("text-xs font-semibold text-ink", item.done && "text-muted line-through")}>{item.text}</span>
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => setAllPrep((v) => !v)} className="mt-2 text-[11px] font-bold text-sage">
              {allPrep ? "Ver menos" : "Ver lista completa"}
            </button>
            {allPrep ? <PrepAdd onAdd={addPrep} /> : null}
          </section>

          <button
            type="button"
            onClick={() => setTab("hoy")}
            className="flex w-full items-center gap-2 rounded-3xl bg-card p-3 text-left shadow-card"
          >
            <span className="grid size-8 place-items-center rounded-xl bg-sage-soft text-forest">
              <span className="text-sm font-extrabold">≡</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-sm font-extrabold text-ink">
                Pendientes de hoy
                {pendingToday.length ? (
                  <span className="grid size-5 place-items-center rounded-full bg-blush text-[10px] font-bold text-paper">
                    {pendingToday.length}
                  </span>
                ) : null}
              </span>
              <span className="block text-[11px] text-muted">
                {pendingToday.length ? `${pendingToday.length} actividades para revisar` : "Hoy está al día"}
              </span>
            </span>
            <ChevronRight className="size-4 text-muted" />
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOverlay({ type: "prepare" })}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-forest px-4 text-sm font-extrabold text-forest-fg shadow-card"
      >
        <Sparkles className="size-4" aria-hidden="true" />
        Preparar mi día de mañana
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function PrepAdd({ onAdd }: { onAdd: (text: string) => void }) {
  return (
    <form
      className="mt-2 flex gap-1"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        onAdd(String(data.get("item") ?? ""));
        event.currentTarget.reset();
      }}
    >
      <input name="item" placeholder="Agregar" className="min-h-10 min-w-0 flex-1 rounded-xl border border-line bg-paper px-2 text-xs" />
      <button type="submit" className="min-h-10 rounded-xl bg-sage-soft px-2 text-xs font-bold text-forest">
        Sumar
      </button>
    </form>
  );
}
