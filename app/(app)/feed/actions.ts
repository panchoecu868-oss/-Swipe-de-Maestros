"use server";
import { GAME_CONFIG } from "@/config/game";
import { DISCARD_LOSS_FACTOR, DISCARD_WIN_FACTOR, WEIGHT_MAX, WEIGHT_MIN } from "@/config/personalization";
import { verifySolution } from "@/lib/chess/puzzle";
import { canDiscard, cardAfterDiscard, cardAfterReview, evaluateDiscard, qualityForReceive, type SubmittedPuzzle } from "@/lib/cards/rules";
import { lifetimeResolvedCount, loadCardState, puzzlesForLesson, requireUserContext, type UserContext } from "@/lib/cards/server";

export interface ClientPuzzle {
  id: string;
  fen: string;
  moves: string[];
  rating: number;
}
export interface GestureResult {
  cardsResolved: number;
  dayCompleted: boolean;
}

const toClient = (p: { id: string; fen: string; moves: string[]; rating: number }): ClientPuzzle => ({ id: p.id, fen: p.fen, moves: p.moves, rating: p.rating });

async function assertCanPlay(ctx: UserContext, lessonId: string) {
  const deckCheck = await ctx.db.from("lessons").select("id, lichess_themes, topics").eq("id", lessonId).eq("reviewed", true).single();
  if (!deckCheck.data) throw new Error("Lección no disponible");
  if (!ctx.subscribed) {
    const seen = await ctx.db.from("card_events").select("lesson_id").eq("user_id", ctx.userId).eq("lesson_id", lessonId).limit(1);
    if ((seen.data?.length ?? 0) === 0 && (await lifetimeResolvedCount(ctx)) >= GAME_CONFIG.DEMO_CARDS) {
      throw new Error("PAYWALL");
    }
  }
  return deckCheck.data as { id: string; lichess_themes: string[]; topics: string[] };
}

async function applyGesture(
  ctx: UserContext,
  args: {
    lessonId: string;
    gesture: "receive" | "discard" | "play";
    outcome: string;
    card?: object;
    topics?: string[];
    factor?: number;
    discard?: object;
  },
): Promise<GestureResult> {
  const { data, error } = await ctx.db.rpc("apply_gesture", {
    p_user: ctx.userId,
    p_lesson: args.lessonId,
    p_gesture: args.gesture,
    p_outcome: args.outcome,
    p_local_day: ctx.today,
    p_daily_target: GAME_CONFIG.DAILY_DECK_SIZE,
    p_card: args.card ?? null,
    p_weight_topics: args.topics ?? [],
    p_weight_factor: args.factor ?? 1,
    p_weight_min: WEIGHT_MIN,
    p_weight_max: WEIGHT_MAX,
    p_discard: args.discard ?? null,
  });
  if (error) throw new Error(error.message);
  const row = (data as { cards_resolved: number; day_completed: boolean }[])[0];
  return { cardsResolved: row.cards_resolved, dayCompleted: row.day_completed };
}

// ───────────── Swipe derecha: recibir ─────────────

export async function startReceive(lessonId: string): Promise<{ checkpoint: ClientPuzzle | null }> {
  const ctx = await requireUserContext();
  const lesson = await assertCanPlay(ctx, lessonId);
  const { puzzles } = await puzzlesForLesson(ctx, lesson, 1);
  return { checkpoint: puzzles[0] ? toClient(puzzles[0]) : null };
}

export async function completeReceive(input: { lessonId: string; puzzleId: string | null; moves: string[]; ms: number }): Promise<GestureResult & { solved: boolean }> {
  const ctx = await requireUserContext();
  await assertCanPlay(ctx, input.lessonId);
  let solved = true; // sin puzzle disponible, recibir cuenta como visto
  if (input.puzzleId) {
    const { data: p } = await ctx.db.from("puzzles").select("id, fen, moves").eq("id", input.puzzleId).single();
    solved = Boolean(p && verifySolution(p, input.moves));
    await ctx.db.from("checkpoint_attempts").insert({ user_id: ctx.userId, lesson_id: input.lessonId, puzzle_id: input.puzzleId, solved, elapsed_ms: Math.max(0, Math.round(input.ms)) });
  }
  const card = cardAfterReview(await loadCardState(ctx, input.lessonId), qualityForReceive(solved), ctx.today);
  const r = await applyGesture(ctx, { lessonId: input.lessonId, gesture: "receive", outcome: solved ? "pass" : "fail", card });
  return { ...r, solved };
}

// ───────────── Swipe izquierda: ronda de descarte ─────────────

export async function startDiscard(lessonId: string): Promise<{ roundId: string; puzzles: ClientPuzzle[]; limitMs: number } | { error: string }> {
  const ctx = await requireUserContext();
  const lesson = await assertCanPlay(ctx, lessonId);
  if (!canDiscard(await loadCardState(ctx, lessonId))) return { error: "Esta carta volvió forzada: tienes que verla antes de poder descartarla." };
  const { themes, puzzles } = await puzzlesForLesson(ctx, lesson, GAME_CONFIG.DISCARD_ROUND_SIZE);
  if (puzzles.length < GAME_CONFIG.DISCARD_ROUND_SIZE) return { error: "No hay suficientes puzzles de este tema para una ronda de descarte." };
  const limitMs = GAME_CONFIG.DISCARD_TIME_LIMIT_SECONDS * 1000;
  const { data, error } = await ctx.db
    .from("discard_rounds")
    .insert({ user_id: ctx.userId, lesson_id: lessonId, theme: themes.join(","), puzzle_ids: puzzles.map((p) => p.id), time_limit_ms: limitMs })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "No se pudo iniciar la ronda" };
  return { roundId: data.id, puzzles: puzzles.map(toClient), limitMs };
}

export async function finishDiscard(input: { roundId: string; submitted: SubmittedPuzzle[] }): Promise<GestureResult & { won: boolean; elapsedMs: number; timedOut: boolean }> {
  const ctx = await requireUserContext();
  const { data: round } = await ctx.db
    .from("discard_rounds")
    .select("id, lesson_id, puzzle_ids, started_at, time_limit_ms, finished_at")
    .eq("id", input.roundId)
    .eq("user_id", ctx.userId)
    .single();
  if (!round || round.finished_at) throw new Error("Ronda inexistente o ya cerrada");
  const { data: puzzles } = await ctx.db.from("puzzles").select("id, fen, moves").in("id", round.puzzle_ids);
  const ordered = (round.puzzle_ids as string[]).map((id) => puzzles?.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => Boolean(p));

  const ev = evaluateDiscard({
    puzzles: ordered,
    submitted: input.submitted,
    startedAt: new Date(round.started_at),
    now: new Date(),
    limitMs: round.time_limit_ms,
    graceMs: GAME_CONFIG.DISCARD_SERVER_GRACE_MS,
  });
  const { data: lesson } = await ctx.db.from("lessons").select("topics").eq("id", round.lesson_id).single();
  const card = cardAfterDiscard(await loadCardState(ctx, round.lesson_id), ev.won, ctx.today);
  const r = await applyGesture(ctx, {
    lessonId: round.lesson_id,
    gesture: "discard",
    outcome: ev.won ? "win" : ev.timedOut ? "timeout" : "loss",
    card,
    topics: (lesson?.topics as string[]) ?? [],
    factor: ev.won ? DISCARD_WIN_FACTOR : DISCARD_LOSS_FACTOR,
    discard: { round_id: round.id, won: ev.won, elapsed_ms: ev.elapsedMs, per_puzzle_ms: ev.results.map((x) => x.ms), results: ev.results },
  });
  return { ...r, won: ev.won, elapsedMs: ev.elapsedMs, timedOut: ev.timedOut };
}
