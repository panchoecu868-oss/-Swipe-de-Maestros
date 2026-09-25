import { expect, test } from "@playwright/test";

test("la landing en español muestra los 3 gestos, precios, garantía y FAQ", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Cómo funciona: 3 gestos" })).toBeVisible();
  for (const g of ["Recibir", "Descartar", "Jugarlo"]) await expect(page.getByRole("heading", { name: new RegExp(g) })).toBeVisible();
  await expect(page.getByText("25 USD", { exact: true })).toBeVisible();
  await expect(page.getByText("125 USD", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Garantía", exact: true })).toBeVisible();
  await page.getByText("¿Leen mis partidas?").click();
  await expect(page.getByText(/Solo leemos tu rating público/)).toBeVisible();
});

test("los términos de la garantía se generan desde la config", async ({ page }) => {
  await page.goto("/garantia/terminos");
  await expect(page.getByRole("heading", { name: "Términos de la garantía" })).toBeVisible();
  await expect(page.getByText(/75 días cumplidos/)).toBeVisible();
  await expect(page.getByText(/60 partidas/)).toBeVisible();
});

test("el login está disponible", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
});

test("licencias enlazan el código fuente de Stockfish y sirven el texto GPL", async ({ page, request }) => {
  await page.goto("/licencias");
  await expect(page.getByRole("link", { name: /Código fuente correspondiente/ })).toHaveAttribute("href", /stockfish\.js\/tree\/v19\.0\.0/);
  const gpl = await request.get("/stockfish/COPYING.txt");
  expect(gpl.ok()).toBe(true);
  expect(await gpl.text()).toContain("GNU GENERAL PUBLIC LICENSE");
});
