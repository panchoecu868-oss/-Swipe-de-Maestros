import { GUARANTEE } from "@/config/guarantee";
import { daysBetween } from "@/lib/time";

export interface Enrollment {
  start_rating: number;
  start_games: number;
  started_on: string; // día local
  ends_on: string; // día local (inclusive)
  target_delta: number;
}

export interface GuaranteeInput {
  enrollment: Enrollment;
  current: { rating: number | null; games: number } | null;
  completedDaysInWindow: number;
  continuousSubscription: boolean;
  today: string;
}

export interface Check {
  id: "days" | "games" | "subscription" | "window";
  label: string;
  ok: boolean;
  detail: string;
}

export type GuaranteeStatus = "in_progress" | "goal_reached" | "refund_eligible" | "refund_not_eligible" | "claim_expired";

export interface GuaranteeReport {
  status: GuaranteeStatus;
  startRating: number;
  currentRating: number | null;
  targetRating: number;
  delta: number | null;
  gamesPlayed: number;
  daysLeft: number;
  checks: Check[];
}

type Cfg = Pick<typeof GUARANTEE, "MIN_COMPLETED_DAYS" | "MIN_GAMES" | "REQUIRE_CONTINUOUS_SUBSCRIPTION" | "CLAIM_WINDOW_DAYS">;

export function evaluateGuarantee(i: GuaranteeInput, cfg: Cfg = GUARANTEE): GuaranteeReport {
  const e = i.enrollment;
  const currentRating = i.current?.rating ?? null;
  const delta = currentRating === null ? null : currentRating - e.start_rating;
  const gamesPlayed = Math.max(0, (i.current?.games ?? e.start_games) - e.start_games);
  const ended = i.today > e.ends_on;
  const daysLeft = Math.max(0, daysBetween(i.today, e.ends_on) + 1);

  const checks: Check[] = [
    { id: "days", label: "Días cumplidos", ok: i.completedDaysInWindow >= cfg.MIN_COMPLETED_DAYS, detail: `${i.completedDaysInWindow}/${cfg.MIN_COMPLETED_DAYS}` },
    { id: "games", label: "Partidas en tu ritmo", ok: gamesPlayed >= cfg.MIN_GAMES, detail: `${gamesPlayed}/${cfg.MIN_GAMES}` },
    {
      id: "subscription",
      label: "Suscripción sin interrupciones",
      ok: !cfg.REQUIRE_CONTINUOUS_SUBSCRIPTION || i.continuousSubscription,
      detail: i.continuousSubscription ? "sí" : "no",
    },
    { id: "window", label: "Plazo terminado", ok: ended, detail: ended ? "sí" : `faltan ${daysLeft} días` },
  ];

  let status: GuaranteeStatus;
  if (delta !== null && delta >= e.target_delta) status = "goal_reached";
  else if (!ended) status = "in_progress";
  else if (daysBetween(e.ends_on, i.today) > cfg.CLAIM_WINDOW_DAYS) status = "claim_expired";
  else status = checks.filter((c) => c.id !== "window").every((c) => c.ok) ? "refund_eligible" : "refund_not_eligible";

  return { status, startRating: e.start_rating, currentRating, targetRating: e.start_rating + e.target_delta, delta, gamesPlayed, daysLeft, checks };
}
