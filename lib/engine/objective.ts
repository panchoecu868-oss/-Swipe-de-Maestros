import { ENGINE_OBJECTIVES } from "@/config/engine";

export type Objective = "convert" | "draw" | "survive";
type Cfg = typeof ENGINE_OBJECTIVES;

/** Objetivo según el tipo de carta y la evaluación inicial (cp desde el lado del usuario). */
export function chooseObjective(type: "apertura" | "estrategia" | "final", initialCp: number, cfg: Cfg = ENGINE_OBJECTIVES): { objective: Objective; targetMoves: number } {
  const winning = initialCp >= cfg.WINNING_CP;
  if (type === "apertura") return { objective: "survive", targetMoves: cfg.SURVIVE_MOVES };
  if (type === "final") return { objective: winning ? "convert" : "draw", targetMoves: cfg.MAX_MOVES };
  return winning ? { objective: "convert", targetMoves: cfg.MAX_MOVES } : { objective: "survive", targetMoves: cfg.SURVIVE_MOVES };
}

export type GameOver = { kind: "checkmate"; winner: "player" | "engine" } | { kind: "draw"; reason: string } | null;

export interface JudgeInput {
  objective: Objective;
  targetMoves: number;
  playerMoves: number;
  gameOver: GameOver;
  /** Evaluaciones tras cada respuesta del motor, desde el lado del usuario (cp). */
  evals: number[];
}

export type Verdict = { status: "ongoing" } | { status: "met" | "failed"; reason: string };

const streak = (evals: number[], n: number, pred: (x: number) => boolean) => evals.length >= n && evals.slice(-n).every(pred);

export function judge(s: JudgeInput, cfg: Cfg = ENGINE_OBJECTIVES): Verdict {
  const last = s.evals.at(-1);
  if (s.gameOver?.kind === "checkmate") {
    if (s.gameOver.winner === "player") return { status: "met", reason: "Diste mate" };
    return { status: "failed", reason: "Recibiste mate" };
  }
  if (s.gameOver?.kind === "draw") {
    return s.objective === "convert" ? { status: "failed", reason: `Tablas (${s.gameOver.reason}): no convertiste la ventaja` } : { status: "met", reason: `Tablas (${s.gameOver.reason})` };
  }
  switch (s.objective) {
    case "convert":
      if (streak(s.evals, cfg.RESIGN_STREAK, (x) => x >= cfg.RESIGN_CP)) return { status: "met", reason: "Ventaja decisiva: el motor abandona" };
      if (s.playerMoves >= s.targetMoves) {
        return last !== undefined && last >= cfg.CONVERT_HOLD_CP
          ? { status: "met", reason: "Ventaja decisiva al llegar al límite de jugadas" }
          : { status: "failed", reason: "Se acabaron las jugadas sin convertir" };
      }
      return { status: "ongoing" };
    case "draw":
      if (streak(s.evals, cfg.LOST_STREAK, (x) => x <= cfg.LOST_CP)) return { status: "failed", reason: "La posición quedó perdida" };
      if (s.playerMoves >= s.targetMoves) {
        return last === undefined || last >= cfg.DRAW_HOLD_CP ? { status: "met", reason: "Sostuviste la posición" } : { status: "failed", reason: "Llegaste al límite en desventaja" };
      }
      return { status: "ongoing" };
    case "survive":
      if (last !== undefined && last < cfg.SURVIVE_MIN_CP) return { status: "failed", reason: `La evaluación cayó por debajo de ${cfg.SURVIVE_MIN_CP / 100}` };
      if (s.playerMoves >= s.targetMoves) return { status: "met", reason: `Sobreviviste ${s.targetMoves} jugadas` };
      return { status: "ongoing" };
  }
}
