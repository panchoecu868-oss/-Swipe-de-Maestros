import { STREAK_AT_RISK_HOUR, STREAK_MILESTONES } from "@/config/streak";
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

export interface Milestone {
  days: number;
  label: string;
}

export interface StreakState {
  /** Racha que se muestra (incluye hoy si ya se cumplió). */
  current: number;
  /** Racha acumulada hasta ayer: al cumplir hoy pasa a base + 1. */
  base: number;
  completedToday: boolean;
  /** Hay racha viva, hoy no se cumplió y ya es tarde. */
  atRisk: boolean;
  longest: number;
  next: (Milestone & { remaining: number }) | null;
  reached: Milestone[];
}

export function streakState(
  completedDays: Iterable<string>,
  today: string,
  hour: number,
  milestones: Milestone[] = STREAK_MILESTONES,
  atRiskHour = STREAK_AT_RISK_HOUR,
): StreakState {
  const days = [...new Set(completedDays)];
  const set = new Set(days);
  const completedToday = set.has(today);
  const current = currentStreak(set, today);
  const base = completedToday ? current - 1 : current;
  const longest = longestStreak(days);
  const nextM = milestones.find((m) => m.days > current) ?? null;
  return {
    current,
    base,
    completedToday,
    atRisk: !completedToday && base > 0 && hour >= atRiskHour,
    longest,
    next: nextM ? { ...nextM, remaining: nextM.days - current } : null,
    reached: milestones.filter((m) => m.days <= longest),
  };
}

/** Hito que se cruza al pasar de `before` a `after` días (para celebrarlo), o null. */
export function milestoneCrossed(before: number, after: number, milestones: Milestone[] = STREAK_MILESTONES): Milestone | null {
  return [...milestones].reverse().find((m) => before < m.days && after >= m.days) ?? null;
}
