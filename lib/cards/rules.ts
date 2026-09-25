import { verifySolution, type Puzzle } from "@/lib/chess/puzzle";
import { INITIAL_SM2, sm2, type Sm2State } from "@/lib/deck/sm2";
import { SM2_QUALITY } from "@/config/srs";

export interface CardState extends Sm2State {
  status: "new" | "learning" | "discarded" | "forced";
  due_on: string | null;
  forced_until_seen: boolean;
}

export const NEW_CARD: CardState = { ...INITIAL_SM2, status: "new", due_on: null, forced_until_seen: false };

/** Una carta forzada (descarte perdido) no se puede volver a descartar hasta verla (recibirla o jugarla). */
export function canDiscard(state: CardState | null): boolean {
  return !state?.forced_until_seen;
}

export interface SubmittedPuzzle {
  puzzleId: string;
  moves: string[];
  ms: number;
}

export interface DiscardEvaluation {
  won: boolean;
  elapsedMs: number;
  timedOut: boolean;
  results: { puzzleId: string; solved: boolean; ms: number }[];
}

/**
 * Evalúa una ronda de descarte con el reloj del SERVIDOR (started_at → now).
 * Gana solo si resolvió los N puzzles asignados, en orden, dentro del límite (+ margen de red).
 */
export function evaluateDiscard(args: {
  puzzles: Pick<Puzzle, "id" | "fen" | "moves">[];
  submitted: SubmittedPuzzle[];
  startedAt: Date;
  now: Date;
  limitMs: number;
  graceMs: number;
}): DiscardEvaluation {
  const elapsedMs = Math.max(0, args.now.getTime() - args.startedAt.getTime());
  const timedOut = elapsedMs > args.limitMs + args.graceMs;
  const results = args.puzzles.map((p, i) => {
    const s = args.submitted[i];
    const solved = Boolean(s && s.puzzleId === p.id && verifySolution(p, s.moves));
    return { puzzleId: p.id, solved, ms: Math.max(0, Math.round(s?.ms ?? 0)) };
  });
  const won = !timedOut && results.length > 0 && results.every((r) => r.solved);
  return { won, elapsedMs, timedOut, results };
}

export function cardAfterDiscard(prev: CardState | null, won: boolean, today: string): CardState {
  const base = prev ?? NEW_CARD;
  return won
    ? { ...base, status: "discarded", due_on: null, forced_until_seen: false }
    : { ...base, status: "forced", due_on: today, forced_until_seen: true };
}

export function cardAfterReview(prev: CardState | null, quality: number, today: string): CardState {
  const base = prev ?? NEW_CARD;
  const next = sm2(base, quality, today);
  return { ...next, status: "learning", forced_until_seen: false };
}

export const qualityForReceive = (solved: boolean) =>
  solved ? SM2_QUALITY.receive_checkpoint_solved : SM2_QUALITY.receive_checkpoint_failed;
export const qualityForPlay = (met: boolean) => (met ? SM2_QUALITY.play_objective_met : SM2_QUALITY.play_objective_failed);
