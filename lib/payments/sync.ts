import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { enrollGuarantee, markSubscriptionBroken } from "@/lib/guarantee/service";
import type { MembershipSnapshot } from "./PaymentProvider";

/** Aplica el estado autoritativo de una membresía a Supabase y a la garantía. */
export async function syncMembership(db: SupabaseClient, provider: string, m: MembershipSnapshot): Promise<string> {
  const { data: prev } = await db.from("subscriptions").select("status, user_id").eq("provider_membership_id", m.membershipId).maybeSingle();
  const userId = m.userId ?? (prev?.user_id as string | null) ?? null;
  const now = new Date().toISOString();
  const { error } = await db.from("subscriptions").upsert(
    {
      provider,
      provider_membership_id: m.membershipId,
      user_id: userId,
      plan: m.plan,
      status: m.status,
      current_period_end: m.currentPeriodEnd,
      activated_at: m.status === "active" && prev?.status !== "active" ? now : undefined,
      updated_at: now,
      raw: m.raw as object,
    },
    { onConflict: "provider_membership_id" },
  );
  if (error) throw new Error(error.message);
  if (!userId) return "sin usuario vinculado (metadata.supabase_user_id ausente)";
  if (m.status === "active") return `activa; garantía: ${await enrollGuarantee(db, userId)}`;
  if (m.status === "canceled" || m.status === "expired") {
    await markSubscriptionBroken(db, userId);
    return "desactivada";
  }
  return m.status;
}
