import { addDays } from "@/lib/time";

/**
 * Racha actual: días cumplidos consecutivos que terminan hoy, o ayer si hoy todavía no se cumplió
 * (la racha no se rompe hasta que termina el día).
 */
export function currentStreak(completedDays: Iterable<string>, today: string): number {
  const set = new Set(completedDays);
  let day = set.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (set.has(day)) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}

export function longestStreak(completedDays: Iterable<string>): number {
  const days = [...new Set(completedDays)].sort();
  let best = 0;
  let run = 0;
  for (let i = 0; i < days.length; i++) {
    run = i > 0 && addDays(days[i - 1], 1) === days[i] ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best;
}

/** Días cumplidos dentro de [from, to] (inclusive). */
export function completedInWindow(completedDays: Iterable<string>, from: string, to: string): number {
  let n = 0;
  for (const d of new Set(completedDays)) if (d >= from && d <= to) n++;
  return n;
}

/** Últimos N días (del más antiguo al de hoy) con su estado, para el calendario. */
export function calendar(completedDays: Iterable<string>, today: string, n: number): { day: string; completed: boolean }[] {
  const set = new Set(completedDays);
  return Array.from({ length: n }, (_, i) => {
    const day = addDays(today, i - n + 1);
    return { day, completed: set.has(day) };
  });
}
