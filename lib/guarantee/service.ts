import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { GUARANTEE, type Platform, type TimeControl } from "@/config/guarantee";
import { completedInWindow } from "@/lib/deck/streak";
import { addDays, localDay } from "@/lib/time";
import { evaluateGuarantee, type GuaranteeReport } from "./evaluate";
import { providerFor } from "./providers";
import { ProviderError } from "./providers/types";

interface Profile {
  platform: Platform | null;
  platform_username: string | null;
  time_control: TimeControl | null;
  timezone: string | null;
}

async function profileOf(db: SupabaseClient, userId: string): Promise<Profile> {
  const { data } = await db.from("profiles").select("platform, platform_username, time_control, timezone").eq("id", userId).single();
  return data as Profile;
}

/** Al activar la suscripción: lee el rating público inicial y abre el plazo. Idempotente. */
export async function enrollGuarantee(db: SupabaseClient, userId: string, now = new Date()): Promise<"active" | "pending" | "exists" | "no_account"> {
  const existing = await db.from("guarantee_enrollments").select("status").eq("user_id", userId).maybeSingle();
  if (existing.data?.status === "active") return "exists";
  const p = await profileOf(db, userId);
  if (!p.platform || !p.platform_username || !p.time_control) return "no_account";
  const today = localDay(p.timezone ?? "UTC", now);
  const base = {
    user_id: userId,
    platform: p.platform,
    username: p.platform_username,
    time_control: p.time_control,
    started_at: now.toISOString(),
    ends_at: new Date(now.getTime() + GUARANTEE.WINDOW_DAYS * 86_400_000).toISOString(),
    started_on: today,
    ends_on: addDays(today, GUARANTEE.WINDOW_DAYS - 1),
    target_delta: GUARANTEE.TARGET_DELTA,
    last_checked_at: now.toISOString(),
  };
  try {
    const r = await providerFor(p.platform).fetchRating(p.platform_username, p.time_control);
    if (r.rating === null) throw new ProviderError(`La cuenta no tiene rating en ${p.time_control}`, "not_found");
    await db.from("guarantee_enrollments").upsert({ ...base, status: "active", start_rating: r.rating, start_games: r.games, last_error: null });
    await db.from("rating_snapshots").insert({ user_id: userId, rating: r.rating, games_count: r.games, source_url: r.sourceUrl });
    return "active";
  } catch (e) {
    // Si nunca se pudo leer el inicial, el plazo arranca cuando se lea (no antes).
    await db.from("guarantee_enrollments").upsert({ ...base, status: "pending", start_rating: null, start_games: null, last_error: (e as Error).message });
    return "pending";
  }
}

/** Snapshot diario (cron). Una petición a la vez, como pide la doc de Lichess. */
export async function refreshGuarantee(db: SupabaseClient, userId: string): Promise<string> {
  const { data: e } = await db.from("guarantee_enrollments").select("*").eq("user_id", userId).single();
  if (!e) return "sin inscripción";
  if (e.status === "pending") return enrollGuarantee(db, userId);
  try {
    const r = await providerFor(e.platform).fetchRating(e.username, e.time_control);
    if (r.rating !== null) await db.from("rating_snapshots").insert({ user_id: userId, rating: r.rating, games_count: r.games, source_url: r.sourceUrl });
    await db.from("guarantee_enrollments").update({ last_checked_at: new Date().toISOString(), last_error: null }).eq("user_id", userId);
    return "ok";
  } catch (err) {
    await db.from("guarantee_enrollments").update({ last_checked_at: new Date().toISOString(), last_error: (err as Error).message }).eq("user_id", userId);
    return (err as Error).message;
  }
}

/** La suscripción se cortó dentro del plazo: se pierde la condición de continuidad. */
export async function markSubscriptionBroken(db: SupabaseClient, userId: string, at = new Date()) {
  await db.from("guarantee_enrollments").update({ broken_at: at.toISOString() }).eq("user_id", userId).is("broken_at", null).gt("ends_at", at.toISOString());
}

export type GuaranteeView =
  | { kind: "none" }
  | { kind: "pending"; platform: Platform; error: string | null }
  | { kind: "active"; platform: Platform; username: string; timeControl: TimeControl; startedOn: string; endsOn: string; report: GuaranteeReport; lastCheckedAt: string | null; lastError: string | null };

export async function getGuaranteeView(db: SupabaseClient, userId: string, today: string): Promise<GuaranteeView> {
  const { data: e } = await db.from("guarantee_enrollments").select("*").eq("user_id", userId).maybeSingle();
  if (!e) return { kind: "none" };
  if (e.status === "pending") return { kind: "pending", platform: e.platform, error: e.last_error };
  const [{ data: snap }, { data: days }] = await Promise.all([
    db.from("rating_snapshots").select("rating, games_count").eq("user_id", userId).order("taken_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("daily_log").select("local_day").eq("user_id", userId).eq("completed", true).gte("local_day", e.started_on).lte("local_day", e.ends_on),
  ]);
  const report = evaluateGuarantee({
    enrollment: { start_rating: e.start_rating, start_games: e.start_games, started_on: e.started_on, ends_on: e.ends_on, target_delta: e.target_delta },
    current: snap ? { rating: snap.rating, games: snap.games_count } : null,
    completedDaysInWindow: completedInWindow((days ?? []).map((d) => d.local_day as string), e.started_on, e.ends_on),
    continuousSubscription: !e.broken_at,
    today,
  });
  return { kind: "active", platform: e.platform, username: e.username, timeControl: e.time_control, startedOn: e.started_on, endsOn: e.ends_on, report, lastCheckedAt: e.last_checked_at, lastError: e.last_error };
}
