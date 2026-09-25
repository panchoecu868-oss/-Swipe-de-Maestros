import { SM2_MIN_EF } from "@/config/srs";
import { addDays } from "@/lib/time";

export interface Sm2State {
  ef: number;
  interval_days: number;
  repetitions: number;
}

/** SM-2 clásico (Wozniak 1987). quality 0–5; ≥3 = recordado. */
export function sm2(prev: Sm2State, quality: number, today: string): Sm2State & { due_on: string } {
  const q = Math.max(0, Math.min(5, Math.round(quality)));
  let { ef, interval_days, repetitions } = prev;
  if (q >= 3) {
    interval_days = repetitions === 0 ? 1 : repetitions === 1 ? 6 : Math.round(interval_days * ef);
    repetitions += 1;
  } else {
    repetitions = 0;
    interval_days = 1;
  }
  ef = Math.max(SM2_MIN_EF, ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  return { ef: Math.round(ef * 1000) / 1000, interval_days, repetitions, due_on: addDays(today, interval_days) };
}

export const INITIAL_SM2: Sm2State = { ef: 2.5, interval_days: 0, repetitions: 0 };
