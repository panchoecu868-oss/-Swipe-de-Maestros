import { NextResponse, type NextRequest } from "next/server";
import { whopConfigFromEnv, whopProvider } from "@/lib/payments/whop";
import { syncMembership } from "@/lib/payments/sync";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Webhook de Whop → activa/desactiva la suscripción en Supabase.
 * Firma: Standard Webhooks vía el helper oficial del SDK (body crudo con request.text()).
 */
export async function POST(request: NextRequest) {
  const raw = await request.text();
  const headers = Object.fromEntries(request.headers.entries());
  const provider = whopProvider(whopConfigFromEnv());

  let event;
  try {
    event = provider.verifyWebhook(raw, headers);
  } catch {
    return NextResponse.json({ error: "firma inválida" }, { status: 401 });
  }

  const db = createServiceClient();
  // Idempotencia: Whop reintenta entregas; la misma webhook-id se procesa una sola vez.
  const inserted = await db
    .from("webhook_events")
    .insert({ id: event.eventId || `${event.type}:${Date.now()}`, provider: "whop", type: event.type, payload: event.payload })
    .select("id");
  if (inserted.error?.code === "23505") return NextResponse.json({ ok: true, duplicate: true });
  if (inserted.error) return NextResponse.json({ error: inserted.error.message }, { status: 500 });

  if (!event.membershipId) return NextResponse.json({ ok: true, ignored: event.type });
  try {
    const m = await provider.getMembership(event.membershipId);
    const result = await syncMembership(db, "whop", m);
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    // Borramos el registro para que el reintento de Whop vuelva a procesarlo.
    await db.from("webhook_events").delete().eq("id", event.eventId);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
