import { expect, test } from "@playwright/test";

test.describe("registro", () => {
  test("muestra Google, el formulario y valida antes de enviar", async ({ page }) => {
    await page.goto("/registro");
    await expect(page.getByRole("heading", { name: "Crea tu cuenta" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Registrarme con Google" })).toBeVisible();

    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page.getByText("Escribe tu nombre")).toBeVisible();
    await expect(page.getByText("Correo inválido")).toBeVisible();
    await expect(page.getByText("Acepta los términos para continuar")).toBeVisible();

    await page.getByLabel("Nombre").fill("Ana");
    await page.getByLabel("Correo").fill("ana@correo.com");
    await page.getByLabel("Contraseña", { exact: true }).fill("solamenteletras");
    await page.getByLabel("Repite la contraseña").fill("otracosa1");
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page.getByText("Incluye al menos un número")).toBeVisible();
    await expect(page.getByText("Las contraseñas no coinciden")).toBeVisible();
    await expect(page.getByLabel("Contraseña", { exact: true })).toHaveAttribute("aria-invalid", "true");
  });

  test("navega entre registro, login y recuperar contraseña", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Crear cuenta: 3 cartas gratis/ }).click();
    await expect(page).toHaveURL(/\/registro/);
    await page.getByRole("link", { name: "Entrar", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continuar con Google" })).toBeVisible();
    await page.getByRole("link", { name: "¿Olvidaste tu contraseña?" }).click();
    await expect(page.getByRole("heading", { name: "Recuperar contraseña" })).toBeVisible();
    await page.getByRole("link", { name: "Volver a entrar" }).click();
    await page.getByRole("link", { name: "Crear cuenta" }).last().click();
    await expect(page).toHaveURL(/\/registro/);
  });

  test("la suscripción sin sesión lleva al registro", async ({ page }) => {
    await page.goto("/suscribirse?plan=yearly");
    await expect(page).toHaveURL(/\/registro\?next=%2Fsuscribirse%3Fplan%3Dyearly/);
  });
});
