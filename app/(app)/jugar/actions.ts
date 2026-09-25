"use server";
import { GAME_CONFIG } from "@/config/game";
import { cardAfterReview, qualityForPlay } from "@/lib/cards/rules";
import { loadCardState, requireUserContext } from "@/lib/cards/server";
import { gameOverFor, replay } from "@/lib/engine/game-state";
import type { Objective } from "@/lib/engine/objective";
import type { EngineMode } from "@/lib/engine/strength";

export interface SaveGameInput {
  lessonId: string;
  objective: Objective;
  targetMoves: number;
  engineMode: EngineMode;
  movesUci: string[];
  objectiveMet: boolean;
  reason: string;
}

export async function saveEngineGame(input: SaveGameInput): Promise<{ cardsResolved: number; dayCompleted: boolean }> {
  const ctx = await requireUserContext();
  const { data: lesson } = await ctx.db.from("lessons").select("id, fen").eq("id", input.lessonId).eq("reviewed", true).single();
  if (!lesson) throw new Error("Lección no disponible");

  // Verificación en servidor: la partida debe ser legal desde la posición de la carta.
  const game = replay(lesson.fen, input.movesUci);
  const playerColor = lesson.fen.split(" ")[1] as "w" | "b";
  const over = gameOverFor(game, playerColor);
  // Un "mate del usuario" o un "mate recibido" declarados deben coincidir con el tablero.
  if (over?.kind === "checkmate" && over.winner === "engine" && input.objectiveMet) throw new Error("Resultado inconsistente");
  const header = `[SetUp "1"]\n[FEN "${lesson.fen}"]\n[Result "${over?.kind === "checkmate" ? (game.turn() === "w" ? "0-1" : "1-0") : over?.kind === "draw" ? "1/2-1/2" : "*"}"]\n\n`;
  const pgnBody = game.pgn().replace(/^(\[.*\]\s*)+/g, "").trim();

  await ctx.db.from("engine_games").insert({
    user_id: ctx.userId,
    lesson_id: lesson.id,
    start_fen: lesson.fen,
    objective: input.objective,
    target_plies: input.targetMoves * 2,
    engine_mode: input.engineMode,
    pgn: header + pgnBody,
    result: input.reason,
    objective_met: input.objectiveMet,
  });

  const card = cardAfterReview(await loadCardState(ctx, lesson.id), qualityForPlay(input.objectiveMet), ctx.today);
  const { data, error } = await ctx.db.rpc("apply_gesture", {
    p_user: ctx.userId,
    p_lesson: lesson.id,
    p_gesture: "play",
    p_outcome: input.objectiveMet ? "objective_met" : "objective_failed",
    p_local_day: ctx.today,
    p_daily_target: GAME_CONFIG.DAILY_DECK_SIZE,
    p_card: card,
  });
  if (error) throw new Error(error.message);
  const row = (data as { cards_resolved: number; day_completed: boolean }[])[0];
  return { cardsResolved: row.cards_resolved, dayCompleted: row.day_completed };
}
