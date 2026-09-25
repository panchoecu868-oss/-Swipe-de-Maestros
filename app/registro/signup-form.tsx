"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field } from "@/components/auth/AuthUI";
import { authErrorMessage, SignupSchema, validateWithConfirm } from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/client";

export function SignupForm({ next, configured }: { next: string; configured: boolean }) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "check-email">("idle");
  const [sentTo, setSentTo] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const parsed = validateWithConfirm(SignupSchema, {
      name: f.get("name"),
      email: f.get("email"),
      password: f.get("password"),
      confirm: f.get("confirm"),
      terms: f.get("terms") === "on",
    });
    if (!parsed.ok) return setErrors(parsed.errors);
    if (!configured) return setErrors({ form: "Supabase no está configurado todavía." });
    setErrors({});
    setStatus("sending");
    const { data, error } = await createClient().auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { full_name: parsed.data.name },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setStatus("idle");
      return setErrors({ form: authErrorMessage(error.message) });
    }
    // Con la confirmación de correo desactivada en Supabase llega sesión directa.
    if (data.session) return router.push(next);
    setSentTo(parsed.data.email);
    setStatus("check-email");
  }

  if (status === "check-email") {
    return (
      <div role="status" className="flex flex-col gap-2 rounded-xl border border-accent p-4 text-sm">
        <p className="font-semibold">Revisa tu correo</p>
        <p>
          Te enviamos un enlace de confirmación a <strong>{sentTo}</strong>. Ábrelo para activar tu cuenta (revisa también spam). Si ese correo ya tenía cuenta,{" "}
          <Link href="/login" className="underline">entra</Link> o <Link href="/recuperar" className="underline">recupera tu contraseña</Link>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      <Field label="Nombre" name="name" autoComplete="name" required error={errors.name} />
      <Field label="Correo" name="email" type="email" autoComplete="email" inputMode="email" required error={errors.email} />
      <Field label="Contraseña" name="password" type="password" autoComplete="new-password" required error={errors.password} />
      <p className="-mt-2 text-xs text-muted">Mínimo 8 caracteres, con al menos una letra y un número.</p>
      <Field label="Repite la contraseña" name="confirm" type="password" autoComplete="new-password" required error={errors.confirm} />
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="terms" className="mt-1" aria-invalid={Boolean(errors.terms)} />
        <span>
          Acepto los <Link href="/garantia/terminos" className="underline">términos</Link> y que solo se lea mi rating público de Chess.com/Lichess.
        </span>
      </label>
      {errors.terms && <p role="alert" className="-mt-2 text-xs text-danger">{errors.terms}</p>}
      {errors.form && <p role="alert" className="text-sm text-danger">{errors.form}</p>}
      <button type="submit" className="btn-primary" disabled={status === "sending"}>
        {status === "sending" ? "Creando cuenta…" : "Crear cuenta"}
      </button>
    </form>
  );
}
