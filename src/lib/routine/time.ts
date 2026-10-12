import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Activity } from "./model";

export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseLocal(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y || 1970, (m || 1) - 1, d || 1);
}

export function addDaysIso(iso: string, n: number): string {
  const d = parseLocal(iso);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

export function minutes(hhmm: string): number {
  if (!hhmm || !hhmm.includes(":")) return -1;
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return -1;
  return h * 60 + m;
}

export function fmt(total: number): string {
  const day = 24 * 60;
  const wrapped = ((Math.round(total) % day) + day) % day;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function humanMinutes(total: number): string {
  const mins = Math.max(0, Math.round(total));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h <= 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

export function prettyDate(iso: string): string {
  if (!iso) return "Sin fecha";
  const raw = format(parseLocal(iso), "EEEE d 'de' MMMM", { locale: es });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function shortDate(iso: string): string {
  if (!iso) return "Sin fecha";
  const raw = format(parseLocal(iso), "EEE d", { locale: es });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function weekdayName(iso: string): string {
  const raw = format(parseLocal(iso), "EEEE", { locale: es });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function durationMin(a: { start: string; end: string }): number {
  if (!a.start || !a.end) return 0;
  const d = minutes(a.end) - minutes(a.start);
  return d > 0 ? d : 0;
}

export function dayItems(all: Activity[], date: string): Activity[] {
  return all
    .filter((a) => a.date === date && a.status !== "cancelada")
    .slice()
    .sort(
      (a, b) =>
        (a.start || "99:99").localeCompare(b.start || "99:99") ||
        a.name.localeCompare(b.name, "es"),
    );
}

export function isTimed(a: Activity): boolean {
  return Boolean(a.start && a.end && minutes(a.end) > minutes(a.start));
}

export function occupies(a: Activity): boolean {
  return a.status !== "omitida" && a.status !== "cancelada";
}

export function findOverlaps(items: Activity[]): [Activity, Activity][] {
  const timed = items.filter((a) => occupies(a) && isTimed(a));
  const pairs: [Activity, Activity][] = [];
  for (let i = 0; i < timed.length; i++) {
    for (let j = i + 1; j < timed.length; j++) {
      const a = timed[i]!;
      const b = timed[j]!;
      const as = minutes(a.start);
      const ae = minutes(a.end);
      const bs = minutes(b.start);
      const be = minutes(b.end);
      if (as < be && bs < ae) pairs.push([a, b]);
    }
  }
  return pairs;
}

export function occupiedMinutes(items: Activity[], from = 7 * 60, to = 22 * 60 + 30): number {
  const blocks = items
    .filter((a) => occupies(a) && isTimed(a))
    .map((a) => [Math.max(minutes(a.start), from), Math.min(minutes(a.end), to)] as const)
    .filter(([s, e]) => e > s)
    .sort((a, b) => a[0] - b[0]);
  let total = 0;
  let cursor = -1;
  for (const [s, e] of blocks) {
    const start = Math.max(s, cursor);
    if (e > start) total += e - start;
    cursor = Math.max(cursor, e);
  }
  return total;
}

export function windowMinutes(from = 7 * 60, to = 22 * 60 + 30): number {
  return to - from;
}

export function findGap(
  items: Activity[],
  duration: number,
  from = 7 * 60,
  to = 21 * 60 + 30,
): { start: number; end: number } | null {
  if (duration <= 0) return null;
  const blocks = items
    .filter((a) => occupies(a) && isTimed(a))
    .map((a) => ({ s: minutes(a.start), e: minutes(a.end) }))
    .filter((b) => b.e > b.s)
    .sort((a, b) => a.s - b.s);
  let cursor = from;
  for (const b of blocks) {
    if (b.e <= cursor) continue;
    if (b.s - cursor >= duration) return { start: cursor, end: cursor + duration };
    cursor = Math.max(cursor, b.e);
  }
  if (to - cursor >= duration) return { start: cursor, end: cursor + duration };
  return null;
}

export function weekDates(anchorIso: string): string[] {
  const d = parseLocal(anchorIso);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(monday);
    x.setDate(monday.getDate() + i);
    return isoDate(x);
  });
}

export function monthGrid(anchorIso: string): { iso: string; inMonth: boolean }[] {
  const d = parseLocal(anchorIso);
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const startDow = first.getDay();
  const lead = startDow === 0 ? 6 : startDow - 1;
  const start = new Date(first);
  start.setDate(first.getDate() - lead);
  const cells: { iso: string; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const x = new Date(start);
    x.setDate(start.getDate() + i);
    cells.push({ iso: isoDate(x), inMonth: x.getMonth() === d.getMonth() });
  }
  return cells;
}

export function monthTitle(anchorIso: string): string {
  const raw = format(parseLocal(anchorIso), "MMMM yyyy", { locale: es });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function greetingFor(hour: number): string {
  if (hour < 6) return "Buenas noches";
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

export function roundUpQuarter(total: number): number {
  return Math.ceil(total / 15) * 15;
}
