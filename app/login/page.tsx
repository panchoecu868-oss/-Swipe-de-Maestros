import Link from "next/link";
import { AuthShell, Divider, GoogleButton, NotConfigured } from "@/components/auth/AuthUI";
import { isSupabaseConfigured } from "@/lib/env";
import { safeNextPath } from "@/lib/safe-redirect";
import { LoginForm } from "./login-form";

export const metadata = { title: "Entrar · Swipe de Maestros" };

const MESSAGES: Record<string, string> = {
  auth: "No pudimos validar el enlace. Pide uno nuevo.",
  confirmado: "Correo confirmado. Ya puedes entrar.",
  contrasena: "Contraseña actualizada. Entra con la nueva.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : null);
  const msgKey = typeof params.error === "string" ? params.error : typeof params.ok === "string" ? params.ok : "";
  const configured = isSupabaseConfigured();
  return (
    <AuthShell
      title="Entrar"
      footer={
        <>
          ¿No tienes cuenta? <Link href={`/registro?next=${encodeURIComponent(next)}`} className="font-semibold underline">Crear cuenta</Link>
        </>
      }
    >
      {MESSAGES[msgKey] && (
        <p role={params.error ? "alert" : "status"} className={`text-sm ${params.error ? "text-danger" : "text-accent"}`}>{MESSAGES[msgKey]}</p>
      )}
      {!configured && <NotConfigured />}
      <GoogleButton next={next} configured={configured} />
      <Divider />
      <LoginForm next={next} configured={configured} />
    </AuthShell>
  );
}
