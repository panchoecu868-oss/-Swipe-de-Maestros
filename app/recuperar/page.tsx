import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthUI";
import { isSupabaseConfigured } from "@/lib/env";
import { RecoverForm } from "./recover-form";

export const metadata = { title: "Recuperar contraseña · Swipe de Maestros" };

export default function RecoverPage() {
  return (
    <AuthShell title="Recuperar contraseña" subtitle="Te enviamos un enlace para elegir una nueva." footer={<Link href="/login" className="underline">Volver a entrar</Link>}>
      <RecoverForm configured={isSupabaseConfigured()} />
    </AuthShell>
  );
}
