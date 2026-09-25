import { GAME_CONFIG } from "@/config/game";
import { streakState } from "@/lib/deck/streak";
import { localHour } from "@/lib/time";
import { getOrCreateDeck, lifetimeResolvedCount, LESSON_PUBLIC_COLUMNS, requireUserContext } from "@/lib/cards/server";
import { FeedClient, type FeedCard } from "./feed-client";

export const metadata = { title: "Tu mazo · Swipe de Maestros" };

export default async function FeedPage() {
  const ctx = await requireUserContext();
  const deckIds = await getOrCreateDeck(ctx);

  const [lessons, resolvedToday, states, log, completedDays] = await Promise.all([
    ctx.db.from("lessons").select(LESSON_PUBLIC_COLUMNS).in("id", deckIds.length ? deckIds : ["00000000-0000-0000-0000-000000000000"]),
    ctx.db.from("card_events").select("lesson_id").eq("user_id", ctx.userId).eq("local_day", ctx.today),
    ctx.db.from("card_states").select("lesson_id, forced_until_seen").eq("user_id", ctx.userId).in("lesson_id", deckIds.length ? deckIds : ["00000000-0000-0000-0000-000000000000"]),
    ctx.db.from("daily_log").select("cards_resolved, completed").eq("user_id", ctx.userId).eq("local_day", ctx.today).maybeSingle(),
    ctx.db.from("daily_log").select("local_day").eq("user_id", ctx.userId).eq("completed", true),
  ]);
  const streak = streakState((completedDays.data ?? []).map((d) => d.local_day as string), ctx.today, localHour(ctx.timezone));
  const done = new Set((resolvedToday.data ?? []).map((r) => r.lesson_id as string));
  const forced = new Set((states.data ?? []).filter((s) => s.forced_until_seen).map((s) => s.lesson_id as string));
  const byId = new Map((lessons.data ?? []).map((l) => [l.id as string, l]));

  // Pendientes = del mazo del día, no resueltas hoy, más las que volvieron forzadas hoy.
  const cards: FeedCard[] = deckIds
    .filter((id) => !done.has(id) || forced.has(id))
    .map((id) => byId.get(id))
    .filter((l): l is NonNullable<typeof l> => Boolean(l))
    .map((l) => ({ lesson: l as unknown as FeedCard["lesson"], forced: forced.has(l.id as string) }));

  const demoLeft = ctx.subscribed ? null : Math.max(0, GAME_CONFIG.DEMO_CARDS - (await lifetimeResolvedCount(ctx)));

  return (
    <FeedClient
      initialCards={cards}
      resolvedToday={log.data?.cards_resolved ?? 0}
      dailyTarget={GAME_CONFIG.DAILY_DECK_SIZE}
      dayCompleted={log.data?.completed ?? false}
      demoLeft={demoLeft}
      streakBase={streak.base}
      streakAtRiskHourReached={streak.atRisk}
    />
  );
}
