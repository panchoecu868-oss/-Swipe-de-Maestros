import { describe, expect, it } from "vitest";
import { authErrorMessage, fieldErrors, LoginSchema, NewPasswordSchema, SignupSchema, validateWithConfirm } from "@/lib/auth/validation";

const ok = { name: "Ana", email: " Ana@Correo.com ", password: "clave1234", confirm: "clave1234", terms: true };

describe("registro", () => {
  it("acepta datos válidos y normaliza el correo", () => {
    const r = SignupSchema.safeParse(ok);
    expect(r.success && r.data.email).toBe("ana@correo.com");
  });
  it("exige contraseña de 8+ con letra y número, confirmación y términos", () => {
    const errs = (v: object) => {
      const r = SignupSchema.safeParse({ ...ok, ...v });
      return r.success ? {} : fieldErrors(r.error);
    };
    expect(errs({ password: "corta1", confirm: "corta1" }).password).toMatch(/8 caracteres/);
    expect(errs({ password: "solamenteletras", confirm: "solamenteletras" }).password).toMatch(/número/);
    expect(errs({ password: "12345678", confirm: "12345678" }).password).toMatch(/letra/);
    expect(errs({ confirm: "otra12345" }).confirm).toMatch(/no coinciden/);
    expect(errs({ terms: false }).terms).toMatch(/términos/);
    expect(errs({ email: "no-es-correo" }).email).toMatch(/inválido/);
  });
});

describe("todos los errores a la vez", () => {
  it("reporta la contraseña no coincidente aunque otros campos fallen", () => {
    const r = validateWithConfirm(SignupSchema, { name: "", email: "x", password: "abc", confirm: "abd", terms: false });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["confirm", "email", "name", "password", "terms"]);
  });
  it("devuelve los datos cuando todo es válido", () => {
    const r = validateWithConfirm(SignupSchema, { ...ok });
    expect(r.ok && r.data.email).toBe("ana@correo.com");
  });
});

describe("login y nueva contraseña", () => {
  it("valida login", () => {
    expect(LoginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
    expect(LoginSchema.safeParse({ email: "a@b.co", password: "x" }).success).toBe(true);
  });
  it("valida nueva contraseña", () => {
    expect(NewPasswordSchema.safeParse({ password: "nueva1234", confirm: "nueva1234" }).success).toBe(true);
    expect(NewPasswordSchema.safeParse({ password: "nueva1234", confirm: "x" }).success).toBe(false);
  });
  it("traduce errores de Supabase", () => {
    expect(authErrorMessage("Invalid login credentials")).toMatch(/incorrectos/);
    expect(authErrorMessage("Email not confirmed")).toMatch(/Confirma tu correo/);
    expect(authErrorMessage("User already registered")).toMatch(/ya tiene cuenta/);
  });
});
