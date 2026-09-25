"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { safeNextPath } from "@/lib/safe-redirect";

export function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const redirectTo = () =>
    `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNextPath(next))}`;

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo() },
    });
    setStatus(error ? "error" : "sent");
  }

  async function google() {
    await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirectTo() } });
  }

  return (
    <div className="flex flex-col gap-4">
      <button type="button" onClick={google} className="btn-secondary">
        Continuar con Google
      </button>
      <form onSubmit={sendMagicLink} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
        </label>
        <button type="submit" disabled={status === "sending"} className="btn-primary">
          {status === "sending" ? "Enviando…" : "Enviarme un enlace"}
        </button>
      </form>
      <p aria-live="polite" className="text-sm">
        {status === "sent" && "Revisa tu correo: te mandamos el enlace de acceso."}
        {status === "error" && "No se pudo enviar el enlace. Intenta de nuevo."}
      </p>
    </div>
  );
}
