import "server-only";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { GAME_CONFIG } from "@/config/game";
import { buildDailyDeck, type DeckLesson } from "@/lib/deck/daily-deck";
import { repertoireFamilies } from "@/lib/personalization/repertoire";
import { selectPuzzles, type PuzzleRecord } from "@/lib/puzzles/select";
import { createServiceClient, getCurrentUser } from "@/lib/supabase/server";
import { localDay } from "@/lib/time";
import type { CardState } from "./rules";
import { puzzleThemesForLesson } from "./lesson-themes";

export interface UserContext {
  userId: string;
  elo: number;
  timezone: string;
  today: string;
  subscribed: boolean;
  db: SupabaseClient;
}

export const LESSON_PUBLIC_COLUMNS =
  "id, type, title, summary, body, fen, lichess_themes, opening_tags, topics, elo_min, elo_max, chapter, page_start, page_end, books(title, author, year, citation_unit, public_domain, source_url)";

/** Usuario autenticado + onboarding completo. Redirige si falta algo. */
export async function requireUserContext(): Promise<UserContext> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/feed");
  const db = createServiceClient();
  const { data: profile } = await db.from("profiles").select("working_elo, timezone, onboarded_at").eq("id", user.id).single();
  if (!profile?.onboarded_at || !profile.working_elo) redirect("/onboarding");
  const { data: subscribed } = await db.rpc("has_active_subscription", { uid: user.id });
  return {
    userId: user.id,
    elo: profile.working_elo,
    timezone: profile.timezone ?? "UTC",
    today: localDay(profile.timezone ?? "UTC"),
    subscribed: Boolean(subscribed),
    db,
  };
}

export async function loadCardState(ctx: UserContext, lessonId: string): Promise<CardState | null> {
  const { data } = await ctx.db
    .from("card_states")
    .select("status, ef, interval_days, repetitions, due_on, forced_until_seen")
    .eq("user_id", ctx.userId)
    .eq("lesson_id", lessonId)
    .maybeSingle();
  return (data as CardState | null) ?? null;
}

/** Cartas distintas que el usuario resolvió alguna vez (para el límite de demo). */
export async function lifetimeResolvedCount(ctx: UserContext): Promise<number> {
  const { data } = await ctx.db.from("card_events").select("lesson_id").eq("user_id", ctx.userId);
  return new Set((data ?? []).map((r) => r.lesson_id)).size;
}

/** Mazo del día: se construye una vez y se congela en daily_decks. */
export async function getOrCreateDeck(ctx: UserContext): Promise<string[]> {
  const existing = await ctx.db.from("daily_decks").select("lesson_ids").eq("user_id", ctx.userId).eq("local_day", ctx.today).maybeSingle();
  if (existing.data) return existing.data.lesson_ids as string[];

  const [lessons, states, weights, rep] = await Promise.all([
    ctx.db.from("lessons").select("id, type, topics, opening_tags, elo_min, elo_max").eq("reviewed", true),
    ctx.db.from("card_states").select("lesson_id, status, ef, interval_days, repetitions, due_on, forced_until_seen").eq("user_id", ctx.userId),
    ctx.db.from("theme_weights").select("theme, weight").eq("user_id", ctx.userId),
    ctx.db.from("repertoire").select("white_first, black_vs_e4, black_vs_d4").eq("user_id", ctx.userId).maybeSingle(),
  ]);
  const deck = buildDailyDeck({
    lessons: (lessons.data ?? []) as DeckLesson[],
    states: new Map((states.data ?? []).map((s) => [s.lesson_id as string, s as unknown as CardState])),
    weights: Object.fromEntries((weights.data ?? []).map((w) => [w.theme, w.weight])),
    repertoire: rep.data ? repertoireFamilies(rep.data) : new Set(),
    elo: ctx.elo,
    today: ctx.today,
    size: GAME_CONFIG.DAILY_DECK_SIZE,
  });
  // upsert ignora carreras entre dos pestañas: gana la primera.
  await ctx.db.from("daily_decks").upsert({ user_id: ctx.userId, local_day: ctx.today, lesson_ids: deck }, { onConflict: "user_id,local_day", ignoreDuplicates: true });
  const saved = await ctx.db.from("daily_decks").select("lesson_ids").eq("user_id", ctx.userId).eq("local_day", ctx.today).single();
  return (saved.data?.lesson_ids as string[]) ?? deck;
}

/** Puzzles que el usuario ya vio (checkpoints y descartes recientes) para no repetirlos. */
async function seenPuzzleIds(ctx: UserContext): Promise<string[]> {
  const [cp, dr] = await Promise.all([
    ctx.db.from("checkpoint_attempts").select("puzzle_id").eq("user_id", ctx.userId).order("created_at", { ascending: false }).limit(300),
    ctx.db.from("discard_rounds").select("puzzle_ids").eq("user_id", ctx.userId).order("started_at", { ascending: false }).limit(100),
  ]);
  return [...(cp.data ?? []).map((r) => r.puzzle_id as string), ...(dr.data ?? []).flatMap((r) => r.puzzle_ids as string[])];
}

export async function puzzlesForLesson(
  ctx: UserContext,
  lesson: { lichess_themes: string[]; topics: string[] },
  count: number,
): Promise<{ themes: string[]; puzzles: PuzzleRecord[] }> {
  const themes = puzzleThemesForLesson(lesson);
  const puzzles = await selectPuzzles(ctx.db, { themes, elo: ctx.elo, count, exclude: await seenPuzzleIds(ctx) });
  return { themes, puzzles };
}
