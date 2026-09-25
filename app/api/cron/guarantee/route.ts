import { NextResponse, type NextRequest } from "next/server";
import { refreshGuarantee } from "@/lib/guarantee/service";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Snapshot diario de ratings de la garantía. Protegido con CRON_SECRET (Authorization: Bearer …).
 * Secuencial y con pausa entre usuarios: la API de Lichess pide una petición a la vez.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = createServiceClient();
  const since = new Date(Date.now() - 20 * 3_600_000).toISOString();
  const { data } = await db.from("guarantee_enrollments").select("user_id, last_checked_at, ends_at");
  const due = (data ?? []).filter((e) => (!e.last_checked_at || e.last_checked_at < since) && new Date(e.ends_at).getTime() + 2 * 86_400_000 > Date.now());
  const results: Record<string, string> = {};
  for (const e of due) {
    results[e.user_id] = await refreshGuarantee(db, e.user_id);
    await new Promise((r) => setTimeout(r, 1500));
  }
  return NextResponse.json({ checked: due.length, results });
}
