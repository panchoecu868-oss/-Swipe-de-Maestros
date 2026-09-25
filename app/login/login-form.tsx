"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field } from "@/components/auth/AuthUI";
import { authErrorMessage, fieldErrors, LoginSchema } from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({ next, configured }: { next: string; configured: boolean }) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const parsed = LoginSchema.safeParse({ email: f.get("email"), password: f.get("password") });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    if (!configured) return setErrors({ form: "Supabase no está configurado todavía." });
    setErrors({});
    setSending(true);
    const { error } = await createClient().auth.signInWithPassword(parsed.data);
    if (error) {
      setSending(false);
      return setErrors({ form: authErrorMessage(error.message) });
    }
    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      <Field label="Correo" name="email" type="email" autoComplete="email" inputMode="email" required error={errors.email} />
      <Field label="Contraseña" name="password" type="password" autoComplete="current-password" required error={errors.password} />
      <Link href="/recuperar" className="-mt-1 self-end text-xs underline">¿Olvidaste tu contraseña?</Link>
      {errors.form && <p role="alert" className="text-sm text-danger">{errors.form}</p>}
      <button type="submit" className="btn-primary" disabled={sending}>
        {sending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
