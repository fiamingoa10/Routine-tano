import { useEffect, useLayoutEffect, useState, useRef, type ReactNode } from "react";
import {
  Bell,
  CalendarCheck,
  CalendarDays,
  Heart,
  House,
  LayoutGrid,
  List,
  MoreHorizontal,
  Plus,
  Search,
  Undo2,
  UserRound,
} from "lucide-react";
import mark from "@/assets/mark.png";
import type { Tab } from "@/lib/routine/model";
import { OPEN_STATUSES } from "@/lib/routine/model";
import { useRoutine } from "@/lib/routine/store";
import { dayItems, isoDate } from "@/lib/routine/time";
import { initializeOneSignal } from "@/lib/onesignal";
import { cn, useMounted, useNow } from "./bits";
import { CalendarView } from "./calendar-view";
import { MoreView } from "./more-view";
import { Overlays } from "./overlays";
import { RoutinesView } from "./routines-view";
import { TodayView } from "./today";
import { TomorrowView } from "./tomorrow";

const NAV: { id: Tab; label: string; icon: typeof House }[] = [
  { id: "hoy", label: "Hoy", icon: House },
  { id: "manana", label: "Mañana", icon: CalendarCheck },
  { id: "calendario", label: "Calendario", icon: CalendarDays },
  { id: "rutinas", label: "Rutinas", icon: List },
  { id: "mas", label: "Más", icon: LayoutGrid },
];

function LiveClock() {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const hours = String(time.getHours()).padStart(2, "0");
  const minutes = String(time.getMinutes()).padStart(2, "0");
  const seconds = String(time.getSeconds()).padStart(2, "0");

  return (
    <div
      className="ml-auto flex min-w-[76px] flex-col items-center rounded-2xl bg-sage-soft/70 px-2 py-1.5 text-forest"
      aria-label={`Hora actual: ${hours}:${minutes}:${seconds}`}
    >
      <span className="font-display text-xl font-bold leading-none tabular-nums">
        {hours}:{minutes}
      </span>
      <span className="mt-0.5 text-[10px] font-bold leading-none tabular-nums text-sage">
        {seconds} segundos
      </span>
    </div>
  );
}

export function RoutineApp() {
  const tab = useRoutine((s) => s.tab);
  const setTab = useRoutine((s) => s.setTab);
  const setMore = useRoutine((s) => s.setMore);
  const setOverlay = useRoutine((s) => s.setOverlay);
  const undo = useRoutine((s) => s.undo);
  const canUndo = useRoutine((s) => s.undoStack.length > 0);
  const toast = useRoutine((s) => s.toast);
  const activities = useRoutine((s) => s.activities);
  const motto = useRoutine((s) => s.profile.motto);
  const search = useRoutine((s) => s.search);
  const setSearch = useRoutine((s) => s.setSearch);
  const mounted = useMounted();
  const now = useNow(mounted);
  const touch = useRef({ x: 0, y: 0 });
  const [notes, setNotes] = useState(false);
  const [seek, setSeek] = useState(false);
  const today = isoDate(now ?? new Date());
  const pending = dayItems(activities, today).filter((a) => OPEN_STATUSES.includes(a.status)).length;

  useLayoutEffect(() => {
    let alive = true;

    void initializeOneSignal().catch((error) => {
      console.warn("[OneSignal] No se pudo inicializar:", error);
    });
    void (async () => {
      await useRoutine.persist.rehydrate();
      if (!alive) return;
      useRoutine.getState().catchUp();
      document.documentElement.classList.toggle("dark", useRoutine.getState().profile.theme === "dark");
    })();
    const unsub = useRoutine.subscribe((state) => {
      document.documentElement.classList.toggle("dark", state.profile.theme === "dark");
    });
    return () => {
      alive = false;
      unsub();
    };
  }, []);

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <div className="relative mx-auto min-h-dvh max-w-[480px] overflow-hidden bg-paper shadow-card">
        <div className="pointer-events-none absolute -top-6 -right-10 size-40 rounded-full bg-sage-soft/80" />
        <div className="pointer-events-none absolute top-72 -left-16 size-36 rounded-full bg-sage-soft/50" />
        <header className="relative flex items-center gap-2 px-4 pt-4">
          <img src={mark} alt="" className="size-14 object-contain" />
          <div className="min-w-0 leading-none">
            <p className="text-lg font-extrabold tracking-tight text-forest">My Routine Tano</p>
            {motto.trim() ? (
              <p className="mt-1 text-sm font-semibold text-sage">
                {motto}
              </p>
            ) : null}
          </div>
          <LiveClock />
          <div className="flex items-center gap-2">
            {tab === "rutinas" ? (
              <>
                <RoundIcon label={seek ? "Cerrar búsqueda" : "Buscar rutinas"} onClick={() => setSeek((v) => !v)}>
                  <Search className="size-5" />
                </RoundIcon>
                <RoundIcon
                  label="Nueva rutina"
                  onClick={() => {
                    setTab("rutinas");
                    window.dispatchEvent(new CustomEvent("tana-new-routine"));
                  }}
                >
                  <MoreHorizontal className="size-5" />
                </RoundIcon>
              </>
            ) : (
              <>
                <RoundIcon label="Avisos" onClick={() => setNotes((v) => !v)}>
                  <Bell className="size-5" />
                  {pending > 0 ? (
                    <span className="absolute -top-0.5 -right-0.5 grid size-4 place-items-center rounded-full bg-blush text-[10px] font-bold text-paper">
                      {pending > 9 ? "9" : pending}
                    </span>
                  ) : null}
                </RoundIcon>
                <RoundIcon label="Perfil y ajustes" onClick={() => setMore("ajustes")}>
                  <UserRound className="size-5" />
                </RoundIcon>
              </>
            )}
          </div>
        </header>
        {seek && (tab === "rutinas" || tab === "calendario") ? (
          <div className="relative px-4 pt-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar"
              className="min-h-11 w-full rounded-2xl border border-line bg-card px-3 text-base outline-none focus-visible:border-forest"
            />
          </div>
        ) : null}
        {notes ? (
          <div className="relative mx-4 mt-3 rounded-3xl bg-card p-4 shadow-card">
            <p className="font-extrabold text-ink">Avisos de hoy</p>
            <p className="mt-1 text-sm text-muted">
              {pending ? `${pending} actividades siguen abiertas.` : "No queda nada urgente por ahora."}
            </p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => { setTab("hoy"); setNotes(false); }} className="min-h-10 rounded-2xl bg-sage-soft px-3 text-sm font-bold text-forest">
                Ver hoy
              </button>
              <button type="button" onClick={() => { setTab("manana"); setNotes(false); }} className="min-h-10 rounded-2xl bg-sand px-3 text-sm font-bold text-ink">
                Preparar mañana
              </button>
            </div>
            {canUndo ? (
              <button type="button" onClick={undo} className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-forest">
                <Undo2 className="size-4" aria-hidden="true" />
                Deshacer el último cambio
              </button>
            ) : null}
          </div>
        ) : null}
        <main
          className="relative px-4 pt-4 pb-28"
          onTouchStart={(event) => {
            const point = event.changedTouches[0];
            if (!point) return;
            touch.current = { x: point.clientX, y: point.clientY };
          }}
          onTouchEnd={(event) => {
            const point = event.changedTouches[0];
            if (!point) return;
            const dx = point.clientX - touch.current.x;
            const dy = point.clientY - touch.current.y;
            if (Math.abs(dx) < 72 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
            if (dx < 0 && tab === "hoy") setTab("manana");
            if (dx > 0 && tab === "manana") setTab("hoy");
          }}
        >
          {tab === "hoy" ? <TodayView /> : null}
          {tab === "manana" ? <TomorrowView /> : null}
          {tab === "calendario" ? <CalendarView /> : null}
          {tab === "rutinas" ? <RoutinesView /> : null}
          {tab === "mas" ? <MoreView /> : null}
        </main>
        {toast ? (
          <p className="fixed bottom-24 left-1/2 z-40 w-[min(100%,480px)] -translate-x-1/2 px-4">
            <span className="block rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-paper shadow-card">{toast}</span>
          </p>
        ) : null}
        {tab === "hoy" || tab === "calendario" || tab === "mas" ? (
          <div className="pointer-events-none fixed bottom-24 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2">
            <button
              type="button"
              onClick={() => setOverlay({ type: "menu" })}
              className="pointer-events-auto absolute right-4 grid size-14 place-items-center rounded-full bg-forest text-forest-fg shadow-card"
              aria-label="Crear"
            >
              <Plus className="size-7" />
            </button>
          </div>
        ) : null}
        <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 border-t border-line bg-paper/95 backdrop-blur" aria-label="Secciones">
          <ul className="grid grid-cols-5 px-1">
            {NAV.map((item) => {
              const active = tab === item.id;
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setTab(item.id)}
                    className={cn(
                      "my-2 flex min-h-14 w-full flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-bold",
                      active ? "bg-sage-soft text-forest" : "text-muted",
                    )}
                  >
                    <Icon className="size-5" aria-hidden="true" />
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
        <Overlays />
      </div>
    </div>
  );
}

function RoundIcon({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="relative grid size-11 place-items-center rounded-full bg-sage-soft/80 text-forest"
    >
      {children}
    </button>
  );
}
