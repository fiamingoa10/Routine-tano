import {
  blankDraft,
  makeActivity,
  type Activity,
  type ActivityDraft,
  type Change,
  type Energy,
} from "./model";
import {
  addDaysIso,
  dayItems,
  durationMin,
  findGap,
  findOverlaps,
  fmt,
  humanMinutes,
  isTimed,
  minutes,
  occupiedMinutes,
  prettyDate,
  shortDate,
  windowMinutes,
} from "./time";

export type Proposal = {
  changes: Change[];
  notes: string[];
  unscheduled: string[];
  freeAfter: number;
};

function priorityScore(a: Activity): number {
  if (a.dispensable || a.priority === "baja") return 0;
  if (a.priority === "media") return 1;
  return 2;
}

function openOn(a: Activity, date: string): boolean {
  return (
    a.date === date &&
    a.status !== "cancelada" &&
    a.status !== "omitida" &&
    a.status !== "realizada"
  );
}

function applyWorking(list: Activity[], change: Change): Activity[] {
  if (change.type === "move") {
    return list.map((a) =>
      a.id === change.id ? { ...a, date: change.date, start: change.start, end: change.end } : a,
    );
  }
  if (change.type === "shorten") {
    return list.map((a) => (a.id === change.id ? { ...a, end: change.end } : a));
  }
  if (change.type === "undate") {
    return list.map((a) =>
      a.id === change.id ? { ...a, date: "", start: "", end: "" } : a,
    );
  }
  return [
    ...list,
    makeActivity({ ...change.draft, id: `tmp-${change.title}`, status: "pendiente" }),
  ];
}

export function previewActivities(activities: Activity[], changes: Change[]): Activity[] {
  return changes.reduce(applyWorking, activities);
}

function mealDraft(date: string, start: string, end: string, name: string): ActivityDraft {
  return blankDraft({
    name,
    categoryId: "alimentacion",
    kind: "comida",
    date,
    start,
    end,
    flexible: true,
    locked: false,
    priority: "media",
    prep: ["Revisar qué hay en casa"],
  });
}

function restDraft(date: string, start: string, end: string): ActivityDraft {
  return blankDraft({
    name: "Pausa",
    categoryId: "descanso",
    kind: "descanso",
    date,
    start,
    end,
    flexible: true,
    priority: "media",
    description: "Un corte corto, sin pantallas si puedes.",
  });
}

export function proposeDay(opts: {
  activities: Activity[];
  date: string;
  tomorrow: string;
  variant: number;
  energy: Energy;
}): Proposal {
  let working = opts.activities.map((a) => ({ ...a }));
  const changes: Change[] = [];
  const notes: string[] = [];
  const touched = new Set<string>();

  const dayNow = () => working.filter((a) => openOn(a, opts.date));

  for (const [a, b] of findOverlaps(dayNow())) {
    notes.push(`${a.name} se cruza con ${b.name}.`);
    const candidates = [a, b].filter((x) => !x.locked && x.flexible);
    if (!candidates.length) {
      notes.push("Esas dos están fijas. Conviene mirarlas a mano.");
      continue;
    }
    candidates.sort(
      (x, y) => priorityScore(x) - priorityScore(y) || durationMin(y) - durationMin(x),
    );
    const victim = candidates[opts.variant % candidates.length]!;
    if (touched.has(victim.id)) continue;
    const other = victim.id === a.id ? b : a;
    const dur = Math.max(20, durationMin(victim) || 40);

    if (opts.variant % 2 === 0) {
      const after = other.end ? minutes(other.end) + 10 : 14 * 60;
      const gap = findGap(
        dayNow().filter((x) => x.id !== victim.id),
        dur,
        Math.max(after, 7 * 60),
        21 * 60 + 30,
      );
      if (gap) {
        const change: Change = {
          type: "move",
          id: victim.id,
          date: opts.date,
          start: fmt(gap.start),
          end: fmt(gap.end),
          title: `Mover «${victim.name}»`,
          reason: `Queda después de ${other.name} y desaparece el cruce.`,
        };
        changes.push(change);
        touched.add(victim.id);
        working = applyWorking(working, change);
        continue;
      }
    }

    if (victim.start && other.start && minutes(victim.start) < minutes(other.start)) {
      const newEndMin = minutes(other.start) - 5;
      if (newEndMin - minutes(victim.start) >= 20) {
        const change: Change = {
          type: "shorten",
          id: victim.id,
          end: fmt(newEndMin),
          title: `Acortar «${victim.name}»`,
          reason: `Una versión más breve termina antes de ${other.name}. El resto puede esperar.`,
        };
        changes.push(change);
        touched.add(victim.id);
        working = applyWorking(working, change);
        continue;
      }
    }

    const change: Change = {
      type: "move",
      id: victim.id,
      date: opts.tomorrow,
      start: victim.start,
      end: victim.end,
      title: `Pasar «${victim.name}» a mañana`,
      reason: "Hoy no entra con calma. Mañana hay otro momento.",
    };
    changes.push(change);
    touched.add(victim.id);
    working = applyWorking(working, change);
  }

  const ordered = dayNow()
    .filter((a) => isTimed(a))
    .sort((a, b) => a.start.localeCompare(b.start));
  for (let i = 1; i < ordered.length; i++) {
    const prev = ordered[i - 1]!;
    const cur = ordered[i]!;
    if (!cur.travelMin || cur.locked || touched.has(cur.id)) continue;
    const gap = minutes(cur.start) - minutes(prev.end);
    if (gap >= cur.travelMin) continue;
    const missing = cur.travelMin - Math.max(0, gap);
    notes.push(
      `Para llegar a «${cur.name}» faltan unos ${missing} min de viaje.`,
    );
    const shift = missing + 5;
    const endMin = minutes(cur.end) + shift;
    if (endMin > 22 * 60 + 15) continue;
    const change: Change = {
      type: "move",
      id: cur.id,
      date: opts.date,
      start: fmt(minutes(cur.start) + shift),
      end: fmt(endMin),
      title: `Dejar margen antes de «${cur.name}»`,
      reason: `El viaje desde la actividad anterior pide ${cur.travelMin} min.`,
    };
    changes.push(change);
    touched.add(cur.id);
    working = applyWorking(working, change);
  }

  const meals = dayNow().filter((a) => a.categoryId === "alimentacion" && a.start);
  const hasLunch = meals.some((a) => {
    const s = minutes(a.start);
    return s >= 11 * 60 && s <= 15 * 60;
  });
  if (!hasLunch) {
    const gap = findGap(dayNow(), 40, 12 * 60, 15 * 60);
    if (gap) {
      changes.push({
        type: "create",
        title: "Reservar un almuerzo",
        reason: "No hay una comida entre las 11:00 y las 15:00.",
        draft: mealDraft(opts.date, fmt(gap.start), fmt(gap.end), "Almuerzo"),
      });
      working = applyWorking(working, changes[changes.length - 1]!);
    } else {
      notes.push("No aparece un almuerzo y el mediodía está lleno.");
    }
  }

  const hasPause = dayNow().some(
    (a) => a.categoryId === "descanso" && a.start && minutes(a.start) < 21 * 60,
  );
  const occ = occupiedMinutes(dayNow());
  const threshold = opts.energy === "baja" ? 5 * 60 : 6.5 * 60;
  if (!hasPause && occ > threshold) {
    const gap = findGap(dayNow(), 20, 14 * 60, 18 * 60 + 30);
    if (gap) {
      const change: Change = {
        type: "create",
        title: "Sumar una pausa",
        reason:
          opts.energy === "baja"
            ? "Marcaste energía baja. Una pausa corta alcanza."
            : "El día va lleno. Una pausa corta deja aire.",
        draft: restDraft(opts.date, fmt(gap.start), fmt(gap.end)),
      };
      changes.push(change);
      working = applyWorking(working, change);
    }
  }

  if (opts.energy === "baja") {
    const gym = dayNow().find(
      (a) => a.categoryId === "gimnasio" && !a.locked && durationMin(a) >= 50 && !touched.has(a.id),
    );
    if (gym?.start) {
      const change: Change = {
        type: "shorten",
        id: gym.id,
        end: fmt(minutes(gym.start) + Math.max(30, durationMin(gym) - 20)),
        title: `Hacer más breve «${gym.name}»`,
        reason: "Con menos energía, una sesión corta sigue siendo válida.",
      };
      changes.push(change);
      touched.add(gym.id);
      working = applyWorking(working, change);
    }
  }

  const loose = working.filter((a) => !a.date && a.status === "pendiente");
  const important = loose.filter((a) => a.priority === "alta");
  const pool = important.length ? important : loose;
  const pick = pool[opts.variant % Math.max(pool.length, 1)];
  if (pick && pool.length && !touched.has(pick.id)) {
    const gap = findGap(dayNow(), 45, 13 * 60, 20 * 60 + 30);
    if (gap) {
      const change: Change = {
        type: "move",
        id: pick.id,
        date: opts.date,
        start: fmt(gap.start),
        end: fmt(gap.end),
        title: `Ubicar «${pick.name}»`,
        reason: "Todavía no tiene horario y entra en un hueco.",
      };
      changes.push(change);
      working = applyWorking(working, change);
    } else if (pick.priority === "alta") {
      notes.push(`«${pick.name}» sigue sin fecha: hoy no hay 45 min seguidos.`);
    }
  }

  const freeAfter = Math.max(
    0,
    windowMinutes() -
      occupiedMinutes(
        working.filter((a) => a.date === opts.date && a.status !== "cancelada"),
      ),
  );

  return {
    changes,
    notes,
    unscheduled: working.filter((a) => !a.date && a.status === "pendiente").map((a) => a.name),
    freeAfter,
  };
}

export function wakeAndBed(activities: Activity[], date: string): { wake: string; bed: string } {
  const first = dayItems(activities, date).find((a) => a.start && a.status !== "omitida");
  let wakeMin = 6 * 60 + 30;
  if (first?.start) {
    wakeMin = minutes(first.start) - (first.travelMin || 0) - 40 - 15;
  }
  wakeMin = Math.min(9 * 60, Math.max(5 * 60, Math.round(wakeMin / 5) * 5));
  return { wake: fmt(wakeMin), bed: fmt(wakeMin - 8 * 60) };
}

export function proposeTomorrow(opts: {
  activities: Activity[];
  today: string;
  tomorrow: string;
  variant: number;
  energy: Energy;
}): Proposal & {
  wake: string;
  bed: string;
  materials: string[];
  carry: Activity[];
} {
  const base = proposeDay({
    activities: opts.activities,
    date: opts.tomorrow,
    tomorrow: addDaysIso(opts.tomorrow, 1),
    variant: opts.variant,
    energy: opts.energy,
  });
  const preview = previewActivities(opts.activities, base.changes);
  const times = wakeAndBed(preview, opts.tomorrow);
  const tom = dayItems(preview, opts.tomorrow).filter((a) => a.status !== "omitida");
  const materials = [
    ...new Set(tom.flatMap((a) => [...a.materials, ...a.prep])),
  ];
  const carry = opts.activities.filter(
    (a) =>
      a.date === opts.today &&
      a.flexible &&
      !a.locked &&
      (a.status === "pendiente" ||
        a.status === "parcial" ||
        a.status === "aplazada" ||
        a.status === "preparacion" ||
        a.status === "reprogramada"),
  );
  const breakfast = tom.some((a) => a.categoryId === "alimentacion" && a.start && minutes(a.start) < 10 * 60);
  if (!breakfast) {
    const wakeMin = minutes(times.wake);
    base.changes.push({
      type: "create",
      title: "Reservar el desayuno",
      reason: "Conviene comer algo antes de la primera salida.",
      draft: mealDraft(opts.tomorrow, fmt(wakeMin + 15), fmt(wakeMin + 40), "Desayuno"),
    });
  }
  return { ...base, ...times, materials, carry };
}

export function proposeWeek(opts: {
  activities: Activity[];
  days: string[];
  freeEvening: boolean;
  variant: number;
}): Proposal {
  let working = opts.activities.map((a) => ({ ...a }));
  const changes: Change[] = [];
  const notes: string[] = [];
  const load = (date: string) =>
    occupiedMinutes(working.filter((a) => a.date === date && a.status !== "cancelada"));

  const heavy = opts.days
    .map((d) => ({ d, m: load(d) }))
    .filter((x) => x.m >= 8 * 60)
    .sort((a, b) => b.m - a.m);

  for (const { d } of heavy) {
    notes.push(`${prettyDate(d)} está muy cargado.`);
    const movable = working.filter(
      (a) => a.date === d && !a.locked && a.flexible && a.status === "pendiente" && a.priority !== "alta",
    );
    if (!movable.length) continue;
    movable.sort((a, b) => durationMin(b) - durationMin(a));
    const victim = movable[opts.variant % movable.length]!;
    const light = opts.days
      .filter((x) => x !== d)
      .sort((a, b) => load(a) - load(b))[0];
    if (!light) continue;
    const dur = Math.max(30, durationMin(victim) || 45);
    const eveningCap = opts.freeEvening && light === opts.days[5] ? 17 * 60 : 20 * 60;
    const gap = findGap(
      working.filter((a) => a.date === light),
      dur,
      9 * 60,
      eveningCap,
    );
    if (!gap) {
      notes.push(`«${victim.name}» no entra en otro día sin apretar la agenda.`);
      continue;
    }
    const change: Change = {
      type: "move",
      id: victim.id,
      date: light,
      start: fmt(gap.start),
      end: fmt(gap.end),
      title: `Repartir «${victim.name}»`,
      reason: `Sale de ${shortDate(d)} y entra el ${shortDate(light)}, donde hay aire.`,
    };
    changes.push(change);
    working = applyWorking(working, change);
  }

  const loose = working.filter((a) => !a.date && a.status === "pendiente");
  const perDay = new Map<string, number>();
  loose.forEach((task, idx) => {
    const ordered = [...opts.days].sort((a, b) => load(a) - load(b));
    const day = ordered[(idx + opts.variant) % ordered.length]!;
    if ((perDay.get(day) ?? 0) >= 2) {
      notes.push(`«${task.name}» queda sin programar para no llenar más ${shortDate(day)}.`);
      return;
    }
    const gap = findGap(working.filter((a) => a.date === day), 40, 9 * 60, 19 * 60);
    if (!gap) {
      notes.push(`«${task.name}» no encontró hueco esta semana.`);
      return;
    }
    const change: Change = {
      type: "move",
      id: task.id,
      date: day,
      start: fmt(gap.start),
      end: fmt(gap.end),
      title: `Programar «${task.name}»`,
      reason: "Se reparte en la semana en vez de acumularse en un solo día.",
    };
    changes.push(change);
    perDay.set(day, (perDay.get(day) ?? 0) + 1);
    working = applyWorking(working, change);
  });

  if (opts.freeEvening) {
    notes.push("Pediste una tarde libre. Revisa lo que quede después de las 18:00 y desmárcalo si quieres conservarlo.");
  }
  if (!changes.length && !notes.length) {
    notes.push("La semana ya está bastante equilibrada. No hace falta mover nada.");
  }

  return {
    changes,
    notes,
    unscheduled: working.filter((a) => !a.date && a.status === "pendiente").map((a) => a.name),
    freeAfter: 0,
  };
}

export function travelWarnings(items: Activity[]): string[] {
  const ordered = items
    .filter((a) => a.status !== "omitida" && a.status !== "cancelada" && a.status !== "realizada" && isTimed(a))
    .sort((a, b) => a.start.localeCompare(b.start));
  const out: string[] = [];
  for (let i = 1; i < ordered.length; i++) {
    const prev = ordered[i - 1]!;
    const cur = ordered[i]!;
    const gap = minutes(cur.start) - minutes(prev.end);
    const need = cur.travelMin || (prev.placeId && cur.placeId && prev.placeId !== cur.placeId ? 15 : 0);
    if (need > 0 && gap < need) {
      const missing = need - Math.max(0, gap);
      out.push(
        `${cur.name}: el viaje pide ${need} min y hay ${Math.max(0, gap)}. Faltan ${missing}. Salir a las ${fmt(minutes(cur.start) - need)} dejaría el margen.`,
      );
    }
  }
  return out;
}

export function dailyTip(items: Activity[], nowMin: number | null): string {
  const open = items.filter((a) => a.status !== "cancelada" && a.status !== "omitida" && a.status !== "realizada");
  if (findOverlaps(open).length) {
    return "Hay actividades que se pisan. Organizar mi día propone un orden y no toca lo que está fijo hasta que lo apruebes.";
  }
  const warn = travelWarnings(open);
  if (warn.length) return "Una salida queda justa. Puedes adelantar la hora o dejar un margen.";
  if (nowMin != null) {
    const late = open.filter((a) => a.end && minutes(a.end) < nowMin && a.date);
    if (late.length) {
      return "Quedó algo de más temprano. Puedes completarlo, acortarlo o pasarlo a mañana, sin apuro.";
    }
    const gap = findGap(open, 25, nowMin, 21 * 60);
    if (gap && gap.start - nowMin < 90) {
      return `Hay un rato libre cerca de las ${fmt(gap.start)}. Sirve para una pausa o una tarea corta.`;
    }
  }
  const free = Math.max(0, windowMinutes() - occupiedMinutes(items));
  if (free < 90) return "El día está lleno. Si algo puede achicarse, el resto respira.";
  return "El ritmo de hoy se puede sostener. Si algo cambia, se reacomoda.";
}

export function categoryMinutes(
  activities: Activity[],
  from: string,
  to: string,
  onlyDone: boolean,
): Record<string, number> {
  const acc: Record<string, number> = {};
  for (const a of activities) {
    if (!a.date || a.date < from || a.date > to) continue;
    if (a.status === "cancelada" || a.status === "omitida") continue;
    if (onlyDone && a.status !== "realizada" && a.status !== "parcial") continue;
    const mins = durationMin(a) || (a.date ? 0 : 0);
    if (!mins) continue;
    acc[a.categoryId] = (acc[a.categoryId] ?? 0) + (a.status === "parcial" && onlyDone ? mins / 2 : mins);
  }
  return acc;
}

export function departAt(start: string, travelMin: number): string {
  if (!start || travelMin <= 0) return "";
  return fmt(minutes(start) - travelMin);
}

export function describeFree(mins: number): string {
  return humanMinutes(mins);
}
