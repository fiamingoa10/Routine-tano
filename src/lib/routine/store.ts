import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  blankDraft,
  makeActivity,
  toDraft,
  type Activity,
  type ActivityDraft,
  type ActivityStatus,
  type CalMode,
  type Category,
  type Change,
  type Energy,
  type FamilyTask,
  type Goal,
  type MoreScreen,
  type Overlay,
  type Place,
  type PrepItem,
  type Profile,
  type RoutineTemplate,
  type Subject,
  type Course,
  type Tab,
} from "./model";
import { createInitialData } from "./seed";
import {
  addDaysIso,
  dayItems,
  durationMin,
  findGap,
  fmt,
  isoDate,
  minutes,
  parseLocal,
  roundUpQuarter,
} from "./time";

type Data = ReturnType<typeof createInitialData>;

type RoutineStore = Data & {
  undoStack: Activity[][];
  tab: Tab;
  more: MoreScreen;
  selectedDate: string;
  calMode: CalMode;
  search: string;
  categoryFilter: string;
  overlay: Overlay;
  proposalVariant: number;
  weekVariant: number;
  toast: string;
  setTab: (tab: Tab) => void;
  setMore: (more: MoreScreen) => void;
  setSelectedDate: (iso: string) => void;
  setCalMode: (mode: CalMode) => void;
  setSearch: (q: string) => void;
  setCategoryFilter: (id: string) => void;
  setOverlay: (overlay: Overlay) => void;
  flash: (message: string) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  setEnergy: (energy: Energy) => void;
  catchUp: () => void;
  undo: () => void;
  addActivity: (draft: ActivityDraft) => void;
  updateFromDraft: (id: string, draft: ActivityDraft) => void;
  removeActivity: (id: string) => void;
  duplicateActivity: (id: string) => void;
  setStatus: (id: string, status: ActivityStatus) => void;
  reschedule: (id: string, date: string, start: string, end: string, reason: string, countPostpone?: boolean) => void;
  nudge: (id: string, mins: number) => void;
  shortenTo: (id: string, end: string, reason: string) => void;
  splitActivity: (id: string) => void;
  clearDate: (id: string) => void;
  markDispensable: (id: string) => void;
  toggleCheck: (id: string, checkId: string) => void;
  addNote: (id: string, note: string) => void;
  applyChanges: (changes: Change[]) => void;
  applyRoutine: (routineId: string, date: string) => void;
  saveDayAsRoutine: (date: string, name: string) => void;
  removeRoutine: (id: string) => void;
  ensurePrep: (tomorrow: string) => void;
  togglePrep: (id: string) => void;
  addPrep: (text: string) => void;
  markTomorrowReviewed: (iso: string) => void;
  addGoal: (goal: Omit<Goal, "id">) => void;
  bumpGoal: (id: string, delta: number) => void;
  setGoalStatus: (id: string, status: Goal["status"]) => void;
  toggleTopic: (subjectId: string, topic: string) => void;
  addCourseNote: (id: string, schedule: string) => void;
  addSubject: (subject: Omit<Subject, "id" | "progress" | "pendingTopics" | "doneTopics">) => void;
  removeSubject: (id: string) => void;
  addCourse: (course: Omit<Course, "id">) => void;
  removeCourse: (id: string) => void;
  renameMember: (id: string, name: string) => void;
  addFamilyTask: (task: Omit<FamilyTask, "id">) => void;
  toggleFamilyTask: (id: string) => void;
  addCategory: (cat: Omit<Category, "id" | "order">) => void;
  toggleCategory: (id: string) => void;
  addPlace: (place: Omit<Place, "id">) => void;
  findWeekSlot: (id: string) => void;
};

const bootNow = new Date();
const boot = createInitialData(bootNow);

function snapshot(activities: Activity[], stack: Activity[][]): Activity[][] {
  const copy = activities.map((a) => ({
    ...a,
    checklist: a.checklist.map((c) => ({ ...c })),
    history: a.history.map((h) => ({ ...h })),
    prep: [...a.prep],
    materials: [...a.materials],
    tags: [...a.tags],
    people: [...a.people],
    repeatDays: [...a.repeatDays],
  }));
  return [...stack, copy].slice(-12);
}

function projectCopies(a: Activity): Activity[] {
  if (a.repeat === "none" || !a.date) return [];
  const out: Activity[] = [];
  const originDow = parseLocal(a.date).getDay();
  const seriesId = a.seriesId || a.id;
  for (let i = 1; i <= 14; i++) {
    const date = addDaysIso(a.date, i);
    const dow = parseLocal(date).getDay();
    const ok =
      a.repeat === "daily" ||
      (a.repeat === "weekdays" && dow !== 0 && dow !== 6) ||
      (a.repeat === "weekly" && dow === originDow) ||
      (a.repeat === "custom" && a.repeatDays.includes(dow));
    if (!ok || a.skipDates.includes(date)) continue;
    const id = crypto.randomUUID();
    out.push(
      makeActivity({
        ...toDraft(a),
        id,
        date,
        status: "pendiente",
        seriesId,
      }),
    );
  }
  return out;
}

export const useRoutine = create<RoutineStore>()(
  persist(
    (set, get) => ({
      ...boot,
      undoStack: [],
      tab: "hoy",
      more: "hub",
      selectedDate: isoDate(bootNow),
      calMode: "dia",
      search: "",
      categoryFilter: "",
      overlay: { type: "none" },
      proposalVariant: 0,
      weekVariant: 0,
      toast: "",
      setTab: (tab) => set({ tab }),
      setMore: (more) => set({ more, tab: "mas" }),
      setSelectedDate: (selectedDate) => set({ selectedDate }),
      setCalMode: (calMode) => set({ calMode }),
      setSearch: (search) => set({ search }),
      setCategoryFilter: (categoryFilter) => set({ categoryFilter }),
      setOverlay: (overlay) => set({ overlay }),
      flash: (message) => {
        set({ toast: message });
        const token = message;
        setTimeout(() => {
          if (get().toast === token) set({ toast: "" });
        }, 4200);
      },
      updateProfile: (patch) => set({ profile: { ...get().profile, ...patch } }),
      setEnergy: (energy) => set({ profile: { ...get().profile, energy } }),
      catchUp: () => {
        const today = isoDate(new Date());
        if (get().profile.catchUpDate === today) return;
        const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
        set({
          profile: { ...get().profile, catchUpDate: today },
          activities: get().activities.map((a) => {
            if (
              a.date === today &&
              a.status === "pendiente" &&
              a.end &&
              minutes(a.end) < nowMin - 20 &&
              a.kind !== "nota" &&
              a.kind !== "recordatorio"
            ) {
              return { ...a, status: "realizada" };
            }
            return a;
          }),
        });
      },
      undo: () => {
        const prev = get().undoStack.at(-1);
        if (!prev) {
          get().flash("No hay un cambio reciente para deshacer.");
          return;
        }
        set({ activities: prev, undoStack: get().undoStack.slice(0, -1), toast: "Listo, volvimos al paso anterior." });
      },
      addActivity: (draft) => {
        const id = crypto.randomUUID();
        const activity = makeActivity({
          ...draft,
          id,
          seriesId: draft.repeat !== "none" ? id : "",
        });
        const copies = projectCopies(activity);
        set({
          undoStack: snapshot(get().activities, get().undoStack),
          activities: [...get().activities, activity, ...copies],
          overlay: { type: "detail", id },
        });
        get().flash(copies.length ? "Actividad creada y proyectada en las próximas semanas." : "Actividad creada.");
      },
      updateFromDraft: (id, draft) => {
        set({
          undoStack: snapshot(get().activities, get().undoStack),
          activities: get().activities.map((a) => {
            if (a.id !== id) return a;
            const checklist = draft.prep.map((text, i) => {
              const prev = a.checklist.find((c) => c.text === text);
              return { id: prev?.id ?? `${id}-n${i}`, text, done: prev?.done ?? false };
            });
            return {
              ...a,
              ...draft,
              checklist,
              history: a.history,
              postponeCount: a.postponeCount,
              skipDates: a.skipDates,
              seriesId: a.seriesId,
            };
          }),
        });
        get().flash("Cambios guardados.");
      },
      removeActivity: (id) => {
        set({
          undoStack: snapshot(get().activities, get().undoStack),
          activities: get().activities.filter((a) => a.id !== id),
          overlay: { type: "none" },
        });
        get().flash("Actividad eliminada. Puedes deshacer.");
      },
      duplicateActivity: (id) => {
        const a = get().activities.find((x) => x.id === id);
        if (!a) return;
        const copyId = crypto.randomUUID();
        const copy = makeActivity({
          ...toDraft(a),
          id: copyId,
          name: `${a.name} (copia)`,
          status: "pendiente",
          date: a.date ? addDaysIso(a.date, 1) : isoDate(new Date()),
        });
        set({
          undoStack: snapshot(get().activities, get().undoStack),
          activities: [...get().activities, copy],
          overlay: { type: "detail", id: copyId },
        });
      },
      setStatus: (id, status) => {
        set({
          undoStack: snapshot(get().activities, get().undoStack),
          activities: get().activities.map((a) => (a.id === id ? { ...a, status } : a)),
        });
      },
      reschedule: (id, date, start, end, reason, countPostpone = true) => {
        set({
          undoStack: snapshot(get().activities, get().undoStack),
          activities: get().activities.map((a) => {
            if (a.id !== id) return a;
            const movedDay = a.date !== date && Boolean(date);
            return {
              ...a,
              date,
              start,
              end,
              status: movedDay && a.status !== "realizada" ? "reprogramada" : a.status,
              postponeCount: a.postponeCount + (movedDay && countPostpone ? 1 : 0),
              history: [
                ...a.history,
                {
                  at: new Date().toISOString(),
                  fromDate: a.date,
                  fromStart: a.start,
                  toDate: date,
                  toStart: start,
                  reason,
                },
              ],
            };
          }),
        });
      },
      nudge: (id, mins) => {
        const a = get().activities.find((x) => x.id === id);
        if (!a) return;
        if (!a.start || !a.end) {
          const now = new Date();
          const start = roundUpQuarter(now.getHours() * 60 + now.getMinutes() + Math.max(15, mins));
          const date = a.date || isoDate(now);
          get().reschedule(id, date, fmt(start), fmt(start + 45), "Se dejó para un poco más tarde.");
          return;
        }
        get().reschedule(
          id,
          a.date,
          fmt(minutes(a.start) + mins),
          fmt(minutes(a.end) + mins),
          "Se movió el horario.",
          false,
        );
      },
      shortenTo: (id, end, reason) => {
        set({
          undoStack: snapshot(get().activities, get().undoStack),
          activities: get().activities.map((a) =>
            a.id === id
              ? {
                  ...a,
                  end,
                  history: [
                    ...a.history,
                    {
                      at: new Date().toISOString(),
                      fromDate: a.date,
                      fromStart: a.start,
                      toDate: a.date,
                      toStart: a.start,
                      reason,
                    },
                  ],
                }
              : a,
          ),
        });
      },
      splitActivity: (id) => {
        const a = get().activities.find((x) => x.id === id);
        if (!a) return;
        const dur = durationMin(a) || 60;
        const half = Math.max(20, Math.round(dur / 2 / 5) * 5);
        const date = a.date || isoDate(new Date());
        const tomorrow = addDaysIso(date, 1);
        const end = a.start ? fmt(minutes(a.start) + half) : a.end;
        const restDur = Math.max(20, dur - half);
        const gap = findGap(
          dayItems(get().activities, tomorrow).filter((x) => x.id !== id),
          restDur,
          8 * 60,
          21 * 60,
        );
        const rest = makeActivity({
          ...toDraft(a),
          id: crypto.randomUUID(),
          name: `${a.name} (resto)`,
          date: tomorrow,
          start: gap ? fmt(gap.start) : a.start,
          end: gap ? fmt(gap.end) : a.start ? fmt(minutes(a.start) + restDur) : "",
          status: "pendiente",
          notes: "Segunda parte, para otro momento.",
        });
        set({
          undoStack: snapshot(get().activities, get().undoStack),
          activities: [
            ...get().activities.map((x) => (x.id === id ? { ...x, end, status: "parcial" as const } : x)),
            rest,
          ],
        });
        get().flash("Quedó dividida. La otra parte está en el día siguiente.");
      },
      clearDate: (id) => {
        const a = get().activities.find((x) => x.id === id);
        if (!a) return;
        set({
          undoStack: snapshot(get().activities, get().undoStack),
          activities: get().activities.map((x) =>
            x.id === id
              ? {
                  ...x,
                  date: "",
                  start: "",
                  end: "",
                  status: "aplazada",
                  history: [
                    ...x.history,
                    {
                      at: new Date().toISOString(),
                      fromDate: a.date,
                      fromStart: a.start,
                      toDate: "",
                      toStart: "",
                      reason: "Pasó a actividades sin fecha.",
                    },
                  ],
                }
              : x,
          ),
        });
      },
      markDispensable: (id) => {
        set({
          activities: get().activities.map((a) =>
            a.id === id ? { ...a, dispensable: true, priority: "baja", flexible: true } : a,
          ),
        });
        get().flash("Quedó como prescindible. Si no entra, no pasa nada.");
      },
      toggleCheck: (id, checkId) => {
        set({
          activities: get().activities.map((a) =>
            a.id === id
              ? {
                  ...a,
                  checklist: a.checklist.map((c) => (c.id === checkId ? { ...c, done: !c.done } : c)),
                }
              : a,
          ),
        });
      },
      addNote: (id, note) => {
        const text = note.trim();
        if (!text) return;
        set({
          activities: get().activities.map((a) =>
            a.id === id ? { ...a, notes: a.notes ? `${a.notes}\n${text}` : text } : a,
          ),
        });
      },
      applyChanges: (changes) => {
        if (!changes.length) {
          get().flash("No había cambios para aplicar.");
          return;
        }
        let activities = get().activities;
        for (const change of changes) {
          if (change.type === "move") {
            activities = activities.map((a) => {
              if (a.id !== change.id) return a;
              const movedDay = a.date !== change.date && Boolean(a.date);
              return {
                ...a,
                date: change.date,
                start: change.start,
                end: change.end,
                status: movedDay && a.status !== "realizada" ? "reprogramada" : a.status === "realizada" ? a.status : a.status,
                postponeCount: a.postponeCount + (movedDay ? 1 : 0),
                history: [
                  ...a.history,
                  {
                    at: new Date().toISOString(),
                    fromDate: a.date,
                    fromStart: a.start,
                    toDate: change.date,
                    toStart: change.start,
                    reason: change.reason,
                  },
                ],
              };
            });
          } else if (change.type === "shorten") {
            activities = activities.map((a) => (a.id === change.id ? { ...a, end: change.end } : a));
          } else if (change.type === "undate") {
            activities = activities.map((a) =>
              a.id === change.id ? { ...a, date: "", start: "", end: "", status: "aplazada" } : a,
            );
          } else {
            activities = [
              ...activities,
              makeActivity({ ...change.draft, id: crypto.randomUUID(), status: "pendiente" }),
            ];
          }
        }
        set({
          undoStack: snapshot(get().activities, get().undoStack),
          activities,
          proposalVariant: get().proposalVariant + 1,
        });
        get().flash("Listo. La agenda cambió solo en lo que aprobaste.");
      },
      applyRoutine: (routineId, date) => {
        const routine = get().routines.find((r) => r.id === routineId);
        if (!routine) return;
        const existing = new Set(
          get().activities.filter((a) => a.date === date).map((a) => `${a.name}|${a.start}`),
        );
        const created = routine.items
          .filter((item) => !existing.has(`${item.name}|${item.start}`))
          .map((item) =>
            makeActivity({
              ...blankDraft({
                name: item.name,
                categoryId: item.categoryId,
                date,
                start: item.start,
                end: item.end,
                kind: item.kind,
                prep: item.prep,
                locked: item.locked,
                flexible: !item.locked,
                placeId: item.placeId,
                travelMin: item.travelMin,
              }),
              id: crypto.randomUUID(),
            }),
          );
        if (!created.length) {
          get().flash("Esa plantilla ya está en ese día.");
          return;
        }
        set({
          undoStack: snapshot(get().activities, get().undoStack),
          activities: [...get().activities, ...created],
        });
        get().flash(`Se agregaron ${created.length} actividades. Puedes deshacer.`);
      },
      saveDayAsRoutine: (date, name) => {
        const items = dayItems(get().activities, date)
          .filter((a) => a.start && a.end && a.status !== "omitida")
          .map((a) => ({
            name: a.name,
            categoryId: a.categoryId,
            start: a.start,
            end: a.end,
            kind: a.kind,
            prep: a.prep,
            locked: a.locked,
            placeId: a.placeId,
            travelMin: a.travelMin,
          }));
        if (!items.length) {
          get().flash("Ese día todavía no tiene horarios para guardar.");
          return;
        }
        const routine: RoutineTemplate = {
          id: crypto.randomUUID(),
          name: name.trim() || "Mi rutina",
          description: "Guardada desde un día real.",
          kind: "diaria",
          items,
        };
        set({ routines: [routine, ...get().routines] });
        get().flash("Rutina guardada. La encuentras en Rutinas.");
      },
      removeRoutine: (id) => set({ routines: get().routines.filter((r) => r.id !== id) }),
      ensurePrep: (tomorrow) => {
        if (get().prepFor === tomorrow) return;
        const firstOpen = !get().prepFor;
        set({
          prepFor: tomorrow,
          prep: get().prep.map((p) => ({ ...p, done: firstOpen ? p.done : false })),
        });
      },
      togglePrep: (id) =>
        set({ prep: get().prep.map((p) => (p.id === id ? { ...p, done: !p.done } : p)) }),
      addPrep: (text) => {
        const clean = text.trim();
        if (!clean) return;
        const item: PrepItem = { id: crypto.randomUUID(), text: clean, done: false };
        set({ prep: [...get().prep, item] });
      },
      markTomorrowReviewed: (iso) => set({ reviewedTomorrowOn: iso }),
      addGoal: (goal) => set({ goals: [{ ...goal, id: crypto.randomUUID() }, ...get().goals] }),
      bumpGoal: (id, delta) =>
        set({
          goals: get().goals.map((g) => {
            if (g.id !== id) return g;
            const progress = Math.max(0, Math.round((g.progress + delta) * 10) / 10);
            const status = progress >= g.target ? "cumplido" : progress > 0 ? "en_progreso" : g.status;
            return { ...g, progress, status };
          }),
        }),
      setGoalStatus: (id, status) =>
        set({ goals: get().goals.map((g) => (g.id === id ? { ...g, status } : g)) }),
      toggleTopic: (subjectId, topic) =>
        set({
          subjects: get().subjects.map((s) => {
            if (s.id !== subjectId) return s;
            const pending = s.pendingTopics.includes(topic);
            const pendingTopics = pending ? s.pendingTopics.filter((t) => t !== topic) : [...s.pendingTopics, topic];
            const doneTopics = pending ? [...s.doneTopics, topic] : s.doneTopics.filter((t) => t !== topic);
            const total = pendingTopics.length + doneTopics.length || 1;
            return {
              ...s,
              pendingTopics,
              doneTopics,
              progress: Math.round((doneTopics.length / total) * 100),
            };
          }),
        }),
      addCourseNote: (id, schedule) =>
        set({ courses: get().courses.map((c) => (c.id === id ? { ...c, schedule } : c)) }),
      addSubject: (subject) =>
        set({
          subjects: [
            ...get().subjects,
            {
              ...subject,
              id: crypto.randomUUID(),
              progress: 0,
              pendingTopics: [],
              doneTopics: [],
            },
          ],
        }),
      removeSubject: (id) =>
        set({ subjects: get().subjects.filter((subject) => subject.id !== id) }),
      addCourse: (course) =>
        set({
          courses: [
            ...get().courses,
            {
              ...course,
              id: crypto.randomUUID(),
            },
          ],
        }),
      removeCourse: (id) =>
        set({ courses: get().courses.filter((course) => course.id !== id) }),
      renameMember: (id, name) =>
        set({ family: get().family.map((m) => (m.id === id ? { ...m, name } : m)) }),
      addFamilyTask: (task) =>
        set({ familyTasks: [{ ...task, id: crypto.randomUUID() }, ...get().familyTasks] }),
      toggleFamilyTask: (id) =>
        set({
          familyTasks: get().familyTasks.map((t) =>
            t.id === id ? { ...t, status: t.status === "hecha" ? "pendiente" : "hecha" } : t,
          ),
        }),
      addCategory: (cat) => {
        const id = `cat-${crypto.randomUUID().slice(0, 8)}`;
        const order = get().categories.length + 1;
        set({ categories: [...get().categories, { ...cat, id, order }] });
      },
      toggleCategory: (id) =>
        set({
          categories: get().categories.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c)),
        }),
      addPlace: (place) => set({ places: [...get().places, { ...place, id: crypto.randomUUID() }] }),
      findWeekSlot: (id) => {
        const a = get().activities.find((x) => x.id === id);
        if (!a) return;
        const dur = Math.max(30, durationMin(a) || 45);
        const start = isoDate(new Date());
        for (let i = 0; i < 7; i++) {
          const date = addDaysIso(start, i);
          if (date === a.date) continue;
          const gap = findGap(
            dayItems(get().activities, date).filter((x) => x.id !== id),
            dur,
            8 * 60,
            20 * 60 + 30,
          );
          if (gap) {
            get().reschedule(id, date, fmt(gap.start), fmt(gap.end), "Se buscó otro espacio en la semana.");
            get().flash(`Encontré un lugar el ${date.split("-").reverse().slice(0, 2).join("/")}.`);
            return;
          }
        }
        get().flash("Esta semana no hay un hueco de ese largo. Puede quedar pendiente.");
      },
    }),
    {
      name: "my-routine-v4",
      skipHydration: true,
      partialize: (s) => ({
        profile: s.profile,
        categories: s.categories,
        activities: s.activities,
        goals: s.goals,
        places: s.places,
        routines: s.routines,
        prep: s.prep,
        prepFor: s.prepFor,
        family: s.family,
        familyTasks: s.familyTasks,
        subjects: s.subjects,
        courses: s.courses,
        reviewedTomorrowOn: s.reviewedTomorrowOn,
      }),
    },
  ),
);

export function activityById(id: string): Activity | undefined {
  return useRoutine.getState().activities.find((a) => a.id === id);
}
