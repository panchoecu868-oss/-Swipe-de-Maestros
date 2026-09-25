import { describe, expect, it, vi } from "vitest";
import { Webhook } from "standardwebhooks";
import { findMembershipId, mapWhopStatus, whopProvider, type WhopConfig } from "@/lib/payments/whop";

const cfg: WhopConfig = { apiKey: "k", webhookSecret: "ws_test_secret_123", planMonthly: "plan_M", planYearly: "plan_Y" };
const USER = "00000000-0000-4000-8000-000000000123";

/** Firma como Whop: HMAC con los bytes literales del secreto (ver @whop/sdk/helpers verifyWebhook). */
function sign(body: string, id = "msg_1", at = new Date()) {
  const wh = new Webhook(Buffer.from(cfg.webhookSecret, "utf8").toString("base64"));
  return { "webhook-id": id, "webhook-timestamp": String(Math.floor(at.getTime() / 1000)), "webhook-signature": wh.sign(id, at, body) };
}

const fakeClient = {
  checkoutConfigurations: { create: vi.fn(async () => ({ purchase_url: "https://whop.com/checkout/ch_1" })) },
  memberships: {
    retrieve: vi.fn(async () => ({ id: "mem_1", status: "past_due", current_period_end: "2026-12-01T00:00:00Z", metadata: { supabase_user_id: USER }, plan_id: "plan_Y" })),
  },
};
type Client = NonNullable<Parameters<typeof whopProvider>[1]>;

describe("Whop", () => {
  const p = whopProvider(cfg, fakeClient as unknown as Client);

  it("verifica una firma válida y extrae la membresía", () => {
    const body = JSON.stringify({ type: "membership.activated", data: { id: "mem_1" } });
    const ev = p.verifyWebhook(body, sign(body));
    expect(ev).toMatchObject({ eventId: "msg_1", type: "membership.activated", membershipId: "mem_1" });
  });

  it("rechaza body alterado, firma de otro secreto y timestamps viejos", () => {
    const body = JSON.stringify({ type: "membership.activated", data: { id: "mem_1" } });
    expect(() => p.verifyWebhook(`${body} `, sign(body))).toThrow();
    const other = whopProvider({ ...cfg, webhookSecret: "ws_otro" }, fakeClient as unknown as Client);
    expect(() => other.verifyWebhook(body, sign(body))).toThrow();
    expect(() => p.verifyWebhook(body, sign(body, "msg_2", new Date(Date.now() - 3600_000)))).toThrow();
  });

  it("encuentra el id mem_ sin asumir la estructura exacta del payload", () => {
    expect(findMembershipId({ data: { membership: { id: "mem_9" } } })).toBe("mem_9");
    expect(findMembershipId({ data: { id: "pay_1", membership_id: "mem_8" } })).toBe("mem_8");
    expect(findMembershipId({ data: { id: "pay_1" } })).toBeNull();
  });

  it("mapea estados del SDK a los nuestros", () => {
    expect(["active", "trialing", "canceling", "completed"].map(mapWhopStatus)).toEqual(["active", "active", "active", "active"]);
    expect(mapWhopStatus("past_due")).toBe("past_due");
    expect(mapWhopStatus("canceled")).toBe("canceled");
    expect(mapWhopStatus("expired")).toBe("expired");
    expect(mapWhopStatus("unresolved")).toBe("expired");
  });

  it("checkout con metadata del usuario y estado autoritativo desde la API", async () => {
    const { url } = await p.createCheckout({ plan: "yearly", userId: USER, redirectUrl: "https://app/feed" });
    expect(url).toBe("https://whop.com/checkout/ch_1");
    expect(fakeClient.checkoutConfigurations.create).toHaveBeenCalledWith({ plan_id: "plan_Y", metadata: { supabase_user_id: USER }, redirect_url: "https://app/feed" });
    expect(await p.getMembership("mem_1")).toMatchObject({ userId: USER, plan: "yearly", status: "past_due" });
  });
});
