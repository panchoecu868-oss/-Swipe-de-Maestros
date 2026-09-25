import { z } from "zod";

/** Contraseña: mínimo 8 caracteres con al menos una letra y un número. */
export const PasswordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(72, "Máximo 72 caracteres")
  .regex(/[A-Za-zÀ-ÿ]/, "Incluye al menos una letra")
  .regex(/\d/, "Incluye al menos un número");

export const EmailSchema = z.string().trim().toLowerCase().email("Correo inválido");

export const SignupSchema = z
  .object({
    name: z.string().trim().min(2, "Escribe tu nombre").max(60, "Nombre demasiado largo"),
    email: EmailSchema,
    password: PasswordSchema,
    confirm: z.string(),
    terms: z.literal(true, { message: "Acepta los términos para continuar" }),
  })
  .refine((v) => v.password === v.confirm, { message: "Las contraseñas no coinciden", path: ["confirm"] });

export const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, "Escribe tu contraseña"),
});

export const NewPasswordSchema = z
  .object({ password: PasswordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "Las contraseñas no coinciden", path: ["confirm"] });

/** Primer error por campo, para mostrarlo junto al input. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

/**
 * Valida un formulario con confirmación de contraseña mostrando TODOS los errores a la vez:
 * el refine de Zod sobre el objeto no corre si otro campo ya falló, así que la coincidencia
 * se comprueba aparte.
 */
export function validateWithConfirm<T extends { password: string; confirm: string }>(
  schema: z.ZodType<T>,
  input: Record<string, unknown>,
): { ok: true; data: T } | { ok: false; errors: Record<string, string> } {
  const parsed = schema.safeParse(input);
  const errors = parsed.success ? {} : fieldErrors(parsed.error);
  if (input.password !== input.confirm) errors.confirm ??= "Las contraseñas no coinciden";
  if (parsed.success && Object.keys(errors).length === 0) return { ok: true, data: parsed.data };
  return { ok: false, errors };
}

/** Mensajes de Supabase Auth → español. */
export function authErrorMessage(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Correo o contraseña incorrectos.";
  if (m.includes("email not confirmed")) return "Confirma tu correo: te enviamos un enlace al registrarte.";
  if (m.includes("already registered") || m.includes("already been registered")) return "Ese correo ya tiene cuenta. Entra o recupera tu contraseña.";
  if (m.includes("rate limit") || m.includes("too many")) return "Demasiados intentos. Espera un momento y vuelve a probar.";
  if (m.includes("password")) return "La contraseña no cumple los requisitos.";
  return "No se pudo completar la operación. Inténtalo de nuevo.";
}
