import Link from "next/link";
import { AuthShell, GoogleButton, Divider, NotConfigured } from "@/components/auth/AuthUI";
import { isSupabaseConfigured } from "@/lib/env";
import { safeNextPath } from "@/lib/safe-redirect";
import { SignupForm } from "./signup-form";

export const metadata = { title: "Crear cuenta · Swipe de Maestros" };

export default async function SignupPage({ searchParams }: PageProps<"/registro">) {
  const sp = await searchParams;
  const next = safeNextPath(typeof sp.next === "string" ? sp.next : null, "/onboarding");
  const configured = isSupabaseConfigured();
  return (
    <AuthShell
      title="Crea tu cuenta"
      subtitle="3 cartas de demo gratis, sin tarjeta."
      footer={
        <>
          ¿Ya tienes cuenta? <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold underline">Entrar</Link>
        </>
      }
    >
      {!configured && <NotConfigured />}
      <GoogleButton next={next} label="Registrarme con Google" configured={configured} />
      <Divider />
      <SignupForm next={next} configured={configured} />
    </AuthShell>
  );
}
