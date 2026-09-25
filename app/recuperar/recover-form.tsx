"use client";
import { useState } from "react";
import { Field } from "@/components/auth/AuthUI";
import { EmailSchema } from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/client";

export function RecoverForm({ configured }: { configured: boolean }) {
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = EmailSchema.safeParse(new FormData(e.currentTarget).get("email"));
    if (!parsed.success) return setError("Correo inválido");
    if (!configured) return setError("Supabase no está configurado todavía.");
    // Doc Supabase: resetPasswordForEmail no revela si la cuenta existe (evita enumeración).
    await createClient().auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${window.location.origin}/auth/callback?next=/nueva-contrasena`,
    });
    setSent(true);
  }

  if (sent) {
    return <p role="status" className="rounded-xl border border-accent p-4 text-sm">Si existe una cuenta con ese correo, te llegó un enlace para cambiar la contraseña.</p>;
  }
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      <Field label="Correo" name="email" type="email" autoComplete="email" required error={error} />
      <button type="submit" className="btn-primary">Enviarme el enlace</button>
    </form>
  );
}
