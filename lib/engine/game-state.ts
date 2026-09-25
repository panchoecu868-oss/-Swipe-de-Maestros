import { Chess } from "chess.js";
import type { GameOver } from "./objective";

/** Estado terminal desde la perspectiva del usuario (que juega `playerColor`). */
export function gameOverFor(chess: Chess, playerColor: "w" | "b"): GameOver {
  if (chess.isCheckmate()) return { kind: "checkmate", winner: chess.turn() === playerColor ? "engine" : "player" };
  if (chess.isStalemate()) return { kind: "draw", reason: "ahogado" };
  if (chess.isThreefoldRepetition()) return { kind: "draw", reason: "triple repetición" };
  if (chess.isInsufficientMaterial()) return { kind: "draw", reason: "material insuficiente" };
  if (chess.isDrawByFiftyMoves()) return { kind: "draw", reason: "regla de 50 jugadas" };
  return null;
}

/** Re-juega una partida desde un FEN; lanza si alguna jugada es ilegal. */
export function replay(startFen: string, uciMoves: string[]): Chess {
  const c = new Chess(startFen);
  for (const m of uciMoves) {
    try {
      c.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] });
    } catch {
      throw new Error(`Jugada ilegal en la partida: ${m}`);
    }
  }
  return c;
}
