import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthUI";
import { getCurrentUser } from "@/lib/supabase/server";
import { NewPasswordForm } from "./new-password-form";

export const metadata = { title: "Nueva contraseña · Swipe de Maestros" };

export default async function NewPasswordPage() {
  // La sesión llega desde el enlace de recuperación (/auth/confirm o /auth/callback).
  if (!(await getCurrentUser())) redirect("/recuperar");
  return (
    <AuthShell title="Elige tu nueva contraseña">
      <NewPasswordForm />
    </AuthShell>
  );
}
