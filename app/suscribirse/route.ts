import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";
import { whopConfigFromEnv, whopProvider } from "@/lib/payments/whop";
import { getCurrentUser } from "@/lib/supabase/server";

/** /suscribirse?plan=monthly|yearly → checkout de Whop con el usuario vinculado por metadata. */
export async function GET(request: NextRequest) {
  const plan = request.nextUrl.searchParams.get("plan") === "yearly" ? "yearly" : "monthly";
  const user = await getCurrentUser();
  if (!user) {
    const url = new URL("/registro", request.url);
    url.searchParams.set("next", `/suscribirse?plan=${plan}`);
    return NextResponse.redirect(url);
  }
  try {
    const { url } = await whopProvider(whopConfigFromEnv()).createCheckout({ plan, userId: user.id, redirectUrl: `${publicEnv.siteUrl}/feed?bienvenida=1` });
    return NextResponse.redirect(url);
  } catch (e) {
    return NextResponse.json({ error: `No se pudo iniciar el pago: ${(e as Error).message}` }, { status: 503 });
  }
}
