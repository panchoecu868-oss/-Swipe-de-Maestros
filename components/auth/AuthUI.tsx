"use client";
import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { safeNextPath } from "@/lib/safe-redirect";

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-4 py-8">
      <Link href="/" className="text-sm font-semibold text-accent">Swipe de Maestros</Link>
      <header>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </header>
      {children}
      {footer && <div className="text-center text-sm">{footer}</div>}
    </main>
  );
}

export function Field({ label, name, error, ...input }: { label: string; name: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = `f-${name}`;
  return (
    <div className="flex flex-col gap-1 text-sm">
      <label htmlFor={id}>{label}</label>
      <input id={id} name={name} className="input" aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-err` : undefined} {...input} />
      {error && <span id={`${id}-err`} role="alert" className="text-xs text-danger">{error}</span>}
    </div>
  );
}

export function Divider() {
  return (
    <div className="flex items-center gap-3 text-xs text-muted" aria-hidden>
      <span className="h-px flex-1 bg-border" />o<span className="h-px flex-1 bg-border" />
    </div>
  );
}

/** Registro o ingreso con Google (el mismo flujo OAuth crea la cuenta si no existe). */
export function GoogleButton({ next, label = "Continuar con Google", configured }: { next: string; label?: string; configured: boolean }) {
  const [error, setError] = useState<string | null>(null);
  async function go() {
    if (!configured) return setError("Supabase no está configurado todavía.");
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNextPath(next))}`;
    const { error } = await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
    if (error) setError("No se pudo abrir Google. Inténtalo de nuevo.");
  }
  return (
    <div className="flex flex-col gap-1">
      <button type="button" onClick={go} className="btn-secondary flex items-center justify-center gap-2">
        <svg aria-hidden width="18" height="18" viewBox="0 0 48 48">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
        {label}
      </button>
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
    </div>
  );
}

export function NotConfigured() {
  return (
    <p role="status" className="rounded-lg border border-border p-2 text-xs text-muted">
      Supabase no está configurado: copia <code>.env.example</code> a <code>.env.local</code> y completa las claves para registrar usuarios.
    </p>
  );
}
