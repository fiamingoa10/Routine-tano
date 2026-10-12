import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useRoutine } from "@/lib/routine/store";
import {
  addDaysIso,
  dayItems,
  findOverlaps,
  monthGrid,
  monthTitle,
  prettyDate,
  shortDate,
  weekDates,
} from "@/lib/routine/time";
import { CAT_STYLE, categoryOf, cn, placeName } from "./bits";

const MODES = [
  { id: "dia", label: "Día" },
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mes" },
] as const;

export function CalendarView() {
  const activities = useRoutine((s) => s.activities);
  const categories = useRoutine((s) => s.categories);
  const places = useRoutine((s) => s.places);
  const selected = useRoutine((s) => s.selectedDate);
  const setSelected = useRoutine((s) => s.setSelectedDate);
  const mode = useRoutine((s) => s.calMode);
  const setMode = useRoutine((s) => s.setCalMode);
  const search = useRoutine((s) => s.search);
  const setSearch = useRoutine((s) => s.setSearch);
  const filter = useRoutine((s) => s.categoryFilter);
  const setFilter = useRoutine((s) => s.setCategoryFilter);
  const setOverlay = useRoutine((s) => s.setOverlay);
  const visibleCats = categories.filter((c) => c.visible);

  const query = search.trim().toLowerCase();
  const matches = (name: string, notes: string, tags: string[], categoryId: string) => {
    if (filter && categoryId !== filter) return false;
    if (!query) return true;
    return (
      name.toLowerCase().includes(query) ||
      notes.toLowerCase().includes(query) ||
      tags.some((t) => t.toLowerCase().includes(query))
    );
  };

  const day = dayItems(activities, selected).filter((a) => matches(a.name, a.notes, a.tags, a.categoryId));
  const overlaps = findOverlaps(day);
  const week = weekDates(selected);
  const cells = monthGrid(selected);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-display text-3xl text-ink">Calendario</h1>
        <button
          type="button"
          onClick={() => setOverlay({ type: "week" })}
          className="min-h-11 rounded-2xl bg-forest px-3 text-sm font-bold text-forest-fg"
        >
          Planificar semana
        </button>
      </div>

      <div className="flex gap-2">
        {MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setMode(item.id)}
            className={cn(
              "min-h-10 flex-1 rounded-full text-sm font-bold",
              mode === item.id ? "bg-forest text-forest-fg" : "bg-sand text-ink",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <label className="flex min-h-11 items-center gap-2 rounded-2xl border border-line bg-paper px-3">
        <Search className="size-4 text-muted" aria-hidden="true" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nombre o nota"
          className="w-full bg-transparent py-2 text-base outline-none"
        />
      </label>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4">
        <button
          type="button"
          onClick={() => setFilter("")}
          className={cn("shrink-0 rounded-full px-3 py-2 text-sm font-bold", !filter ? "bg-forest text-forest-fg" : "bg-sand")}
        >
          Todas
        </button>
        {visibleCats.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setFilter(filter === cat.id ? "" : cat.id)}
            className={cn(
              "shrink-0 rounded-full px-3 py-2 text-sm font-bold",
              filter === cat.id ? "bg-forest text-forest-fg" : "bg-sand text-ink",
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <button type="button" aria-label="Anterior" onClick={() => setSelected(addDaysIso(selected, mode === "mes" ? -30 : mode === "semana" ? -7 : -1))} className="grid size-11 place-items-center rounded-2xl bg-sand">
          <ChevronLeft className="size-5" />
        </button>
        <p className="text-center text-sm font-bold">{mode === "mes" ? monthTitle(selected) : prettyDate(selected)}</p>
        <button type="button" aria-label="Siguiente" onClick={() => setSelected(addDaysIso(selected, mode === "mes" ? 30 : mode === "semana" ? 7 : 1))} className="grid size-11 place-items-center rounded-2xl bg-sand">
          <ChevronRight className="size-5" />
        </button>
      </div>

      {mode === "mes" ? (
        <div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-muted">
            {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((cell) => {
              const count = activities.filter(
                (a) => a.date === cell.iso && a.status !== "cancelada" && matches(a.name, a.notes, a.tags, a.categoryId),
              );
              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => {
                    setSelected(cell.iso);
                    setMode("dia");
                  }}
                  className={cn(
                    "flex min-h-11 flex-col items-center justify-center rounded-xl text-sm",
                    cell.iso === selected ? "bg-forest text-forest-fg" : "bg-paper text-ink",
                    !cell.inMonth && "opacity-40",
                  )}
                >
                  {Number(cell.iso.slice(-2))}
                  <span className="mt-0.5 flex h-1.5 gap-0.5">
                    {count.slice(0, 3).map((a) => {
                      const cat = categoryOf(categories, a.categoryId);
                      return <span key={a.id} className={cn("size-1.5 rounded-full", cell.iso === selected ? "bg-forest-fg" : CAT_STYLE[cat?.color ?? "personal"].dot)} />;
                    })}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {mode === "semana" ? (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {week.map((iso) => {
            const list = dayItems(activities, iso).filter((a) => matches(a.name, a.notes, a.tags, a.categoryId));
            return (
              <button
                key={iso}
                type="button"
                onClick={() => {
                  setSelected(iso);
                  setMode("dia");
                }}
                className={cn(
                  "w-36 shrink-0 rounded-2xl border border-line bg-paper p-2 text-left",
                  iso === selected && "ring-2 ring-forest",
                )}
              >
                <span className="text-xs font-bold text-muted">{shortDate(iso)}</span>
                <span className="mt-2 block space-y-1">
                  {list.slice(0, 5).map((a) => {
                    const cat = categoryOf(categories, a.categoryId);
                    return (
                      <span key={a.id} className="flex items-center gap-1 text-xs">
                        <span className={cn("size-2 shrink-0 rounded-full", CAT_STYLE[cat?.color ?? "personal"].dot)} />
                        <span className="truncate">{a.start || "·"} {a.name}</span>
                      </span>
                    );
                  })}
                  {!list.length ? <span className="text-xs text-muted">Libre</span> : null}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {mode === "dia" ? (
        <section className="space-y-2">
          {overlaps.length ? (
            <p className="rounded-2xl bg-sand px-3 py-2 text-sm">
              Hay {overlaps.length} superposición{overlaps.length === 1 ? "" : "es"} en este día.
            </p>
          ) : (
            <p className="text-sm text-muted">Sin superposiciones en lo que estás viendo.</p>
          )}
          {day.map((a) => {
            const cat = categoryOf(categories, a.categoryId);
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setOverlay({ type: "detail", id: a.id })}
                className={cn(
                  "flex w-full gap-3 rounded-2xl border border-line border-l-4 bg-paper p-3 text-left",
                  CAT_STYLE[cat?.color ?? "personal"].rail,
                )}
              >
                <span className="w-12 shrink-0 text-xs font-bold text-muted">{a.start || "—"}</span>
                <span className="min-w-0">
                  <span className="block font-bold">{a.name}</span>
                  <span className="block truncate text-xs text-muted">
                    {cat?.name}
                    {placeName(places, a.placeId) ? ` · ${placeName(places, a.placeId)}` : ""}
                    {a.locked ? " · Bloqueada" : ""}
                  </span>
                </span>
              </button>
            );
          })}
          {!day.length ? <p className="rounded-2xl bg-paper p-4 text-sm text-muted">No hay actividades con ese filtro.</p> : null}
          <Undated />
        </section>
      ) : null}
    </div>
  );
}

function Undated() {
  const activities = useRoutine((s) => s.activities);
  const filter = useRoutine((s) => s.categoryFilter);
  const search = useRoutine((s) => s.search).trim().toLowerCase();
  const setOverlay = useRoutine((s) => s.setOverlay);
  const loose = activities.filter((a) => !a.date && a.status !== "cancelada" && a.status !== "omitida");
  const shown = loose.filter((a) => {
    if (filter && a.categoryId !== filter) return false;
    if (!search) return true;
    return a.name.toLowerCase().includes(search) || a.notes.toLowerCase().includes(search);
  });
  if (!shown.length) return null;
  return (
    <div className="pt-2">
      <h2 className="mb-2 font-display text-xl">Sin horario</h2>
      <ul className="space-y-2">
        {shown.map((a) => (
          <li key={a.id}>
            <button type="button" onClick={() => setOverlay({ type: "detail", id: a.id })} className="w-full rounded-2xl bg-sand px-3 py-3 text-left text-sm font-bold">
              {a.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
