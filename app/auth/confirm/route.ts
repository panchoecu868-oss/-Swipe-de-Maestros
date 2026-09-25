import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";

/**
 * Confirmación de correo y recuperación de contraseña por token_hash (funciona aunque el enlace
 * se abra en otro dispositivo). Patrón de la doc oficial de Supabase:
 * https://supabase.com/docs/guides/auth/passwords (fuente: github.com/supabase/supabase
 * apps/docs/content/guides/auth/passwords.mdx). Requiere ajustar las plantillas de email (ver README).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const fallback = type === "recovery" ? "/nueva-contrasena" : "/onboarding";
  const next = safeNextPath(searchParams.get("next"), fallback);
  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
