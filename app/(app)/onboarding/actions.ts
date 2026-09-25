"use server";
import { redirect } from "next/navigation";
import { TOPIC_IDS } from "@/config/self-assessment";
import { OnboardingSchema } from "@/lib/personalization/onboarding";
import { computeThemeWeights, workingElo, type Scores } from "@/lib/personalization/theme-weights";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export type OnboardingState = { error?: string } | null;

export async function saveOnboarding(_prev: OnboardingState, form: FormData): Promise<OnboardingState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login?next=/onboarding");
  const uid = auth.user.id;

  const parsed = OnboardingSchema.safeParse({
    elo_source: form.get("elo_source"),
    fide_elo: form.get("fide_elo") || undefined,
    declared_elo: form.get("declared_elo") || undefined,
    white_first: form.get("white_first"),
    black_vs_e4: form.get("black_vs_e4"),
    black_vs_d4: form.get("black_vs_d4"),
    scores: Object.fromEntries(TOPIC_IDS.map((t) => [t, form.get(`score_${t}`)])),
    platform: form.get("platform"),
    platform_username: form.get("platform_username"),
    time_control: form.get("time_control"),
    timezone: form.get("timezone") || "UTC",
  });
  if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join(" · ") };
  const v = parsed.data;

  const elo = workingElo(v.elo_source === "fide" ? { source: "fide", fide: v.fide_elo! } : { source: v.elo_source, declared: v.declared_elo! });

  // Datos del usuario: con su propia sesión (RLS).
  const profile = await supabase
    .from("profiles")
    .update({
      elo_source: v.elo_source,
      fide_elo: v.elo_source === "fide" ? v.fide_elo : null,
      declared_elo: v.elo_source === "fide" ? null : v.declared_elo,
      working_elo: elo,
      platform: v.platform,
      platform_username: v.platform_username,
      time_control: v.time_control,
      timezone: v.timezone,
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", uid);
  if (profile.error) return { error: profile.error.message };

  const rep = await supabase
    .from("repertoire")
    .upsert({ user_id: uid, white_first: v.white_first, black_vs_e4: v.black_vs_e4, black_vs_d4: v.black_vs_d4, updated_at: new Date().toISOString() });
  if (rep.error) return { error: rep.error.message };

  const sa = await supabase.from("self_assessment").upsert(TOPIC_IDS.map((t) => ({ user_id: uid, topic: t, score: v.scores[t] })));
  if (sa.error) return { error: sa.error.message };

  // Pesos: solo servidor.
  const weights = computeThemeWeights(v.scores as Scores);
  const tw = await createServiceClient()
    .from("theme_weights")
    .upsert(Object.entries(weights).map(([theme, weight]) => ({ user_id: uid, theme, weight, updated_at: new Date().toISOString() })));
  if (tw.error) return { error: tw.error.message };

  redirect("/feed");
}
