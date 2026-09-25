"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field } from "@/components/auth/AuthUI";
import { authErrorMessage, NewPasswordSchema, validateWithConfirm } from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/client";

export function NewPasswordForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const parsed = validateWithConfirm(NewPasswordSchema, { password: f.get("password"), confirm: f.get("confirm") });
    if (!parsed.ok) return setErrors(parsed.errors);
    const { error } = await createClient().auth.updateUser({ password: parsed.data.password });
    if (error) return setErrors({ form: authErrorMessage(error.message) });
    router.push("/feed");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      <Field label="Nueva contraseña" name="password" type="password" autoComplete="new-password" required error={errors.password} />
      <Field label="Repítela" name="confirm" type="password" autoComplete="new-password" required error={errors.confirm} />
      {errors.form && <p role="alert" className="text-sm text-danger">{errors.form}</p>}
      <button type="submit" className="btn-primary">Guardar contraseña</button>
    </form>
  );
}
