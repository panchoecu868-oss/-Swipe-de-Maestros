/**
 * Whop.
 * Documentación: https://docs.whop.com/api-reference (no accesible desde el entorno de desarrollo).
 * Todo lo de abajo sale del SDK oficial @whop/sdk v2 (github.com/whopio/whopsdk-typescript):
 *  - Checkout: client.checkoutConfigurations.create({ plan_id, metadata, redirect_url }) → purchase_url.
 *    "metadata: Custom key-value metadata copied to payments and memberships."
 *  - Webhooks: helper oficial unwrapWebhook (Standard Webhooks: headers webhook-id / webhook-timestamp /
 *    webhook-signature, body crudo, secreto `ws_…` tal cual).
 *    Eventos (enum del SDK): membership.activated, membership.deactivated, membership.went_valid,
 *    membership.went_invalid, membership.cancel_at_period_end_changed, …
 *  - Estado: client.memberships.retrieve({ id }) → Membership { id, status, current_period_end, metadata, plan_id }.
 * PENDIENTE DE CONFIRMAR con la doc: la forma exacta del payload del webhook. El SDK dice que NO define
 * modelos de payload, así que solo se extrae el id `mem_…` de forma defensiva y el estado se pide a la API.
 */
import { WhopClient } from "@whop/sdk";
import { unwrapWebhook } from "@whop/sdk/helpers";
import type { PlanKind } from "@/config/pricing";
import type { MembershipSnapshot, PaymentProvider, SubscriptionStatus, VerifiedEvent } from "./PaymentProvider";

export interface WhopConfig {
  apiKey: string;
  webhookSecret: string;
  planMonthly: string;
  planYearly: string;
  accountId?: string;
}

export function whopConfigFromEnv(): WhopConfig {
  const need = (k: string) => {
    const v = process.env[k];
    if (!v) throw new Error(`Falta ${k}`);
    return v;
  };
  return {
    apiKey: need("WHOP_API_KEY"),
    webhookSecret: need("WHOP_WEBHOOK_SECRET"),
    planMonthly: need("WHOP_PLAN_MONTHLY"),
    planYearly: need("WHOP_PLAN_YEARLY"),
    accountId: process.env.WHOP_ACCOUNT_ID || undefined,
  };
}

/** Estados del SDK (MembershipStatus) → los nuestros. */
export function mapWhopStatus(s: string): SubscriptionStatus {
  switch (s) {
    case "active":
    case "trialing":
    case "canceling": // cancelará al final del periodo: sigue con acceso
    case "completed":
      return "active";
    case "past_due": // periodo de gracia tras un pago fallido
      return "past_due";
    case "canceled":
      return "canceled";
    default: // expired, unresolved, drafted
      return "expired";
  }
}

/** Busca un id de membresía `mem_…` en el payload sin asumir su estructura exacta. */
export function findMembershipId(payload: unknown): string | null {
  const seen = new Set<unknown>();
  const walk = (v: unknown, depth: number): string | null => {
    if (depth > 3 || v === null || typeof v !== "object" || seen.has(v)) return null;
    seen.add(v);
    const o = v as Record<string, unknown>;
    for (const key of ["membership_id", "id"]) {
      if (typeof o[key] === "string" && (o[key] as string).startsWith("mem_")) return o[key] as string;
    }
    for (const child of Object.values(o)) {
      const r = walk(child, depth + 1);
      if (r) return r;
    }
    return null;
  };
  return walk(payload, 0);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function whopProvider(cfg: WhopConfig, client: Pick<WhopClient, "checkoutConfigurations" | "memberships"> = new WhopClient({ token: cfg.apiKey })): PaymentProvider {
  const planOf = (planId: string): PlanKind | null => (planId === cfg.planMonthly ? "monthly" : planId === cfg.planYearly ? "yearly" : null);
  return {
    name: "whop",
    async createCheckout({ plan, userId, redirectUrl }) {
      const res = await client.checkoutConfigurations.create({
        ...(cfg.accountId ? { account_id: cfg.accountId } : {}),
        plan_id: plan === "monthly" ? cfg.planMonthly : cfg.planYearly,
        metadata: { supabase_user_id: userId },
        redirect_url: redirectUrl,
      });
      if (!res.purchase_url) throw new Error("Whop no devolvió purchase_url");
      return { url: res.purchase_url };
    },
    verifyWebhook(rawBody, headers): VerifiedEvent {
      const payload = unwrapWebhook<Record<string, unknown>>(rawBody, { headers, key: cfg.webhookSecret });
      const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
      return {
        eventId: lower["webhook-id"] ?? "",
        type: typeof payload.type === "string" ? payload.type : "unknown",
        membershipId: findMembershipId(payload),
        payload,
      };
    },
    async getMembership(id): Promise<MembershipSnapshot> {
      const m = await client.memberships.retrieve({ id });
      const ref = m.metadata?.supabase_user_id;
      return {
        membershipId: m.id,
        userId: typeof ref === "string" && UUID_RE.test(ref) ? ref : null,
        plan: planOf(m.plan_id),
        status: mapWhopStatus(m.status),
        currentPeriodEnd: m.current_period_end,
        raw: m,
      };
    },
  };
}
