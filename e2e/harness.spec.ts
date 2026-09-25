import { expect, test, type Page } from "@playwright/test";

/** Toca origen y destino (tocar-tocar), igual que en el móvil. */
async function move(page: Page, uci: string) {
  await page.locator(`[data-square="${uci.slice(0, 2)}"]`).first().click();
  await page.locator(`[data-square="${uci.slice(2, 4)}"]`).first().click();
}
const log = (page: Page) => page.getByTestId("log");

test.describe("gestos de la carta", () => {
  test("teclado: → recibir, ← descartar, ↑ jugar", async ({ page }) => {
    await page.goto("/dev/harness?view=swipe");
    await expect(page.getByRole("heading", { name: "[FIXTURE] Carta de prueba" })).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(log(page)).toHaveText("receive");
    await page.keyboard.press("ArrowLeft");
    await expect(log(page)).toHaveText("receive\ndiscard");
    await page.keyboard.press("ArrowUp");
    await expect(log(page)).toHaveText("receive\ndiscard\nplay");
  });

  test("arrastre táctil/ratón hacia la derecha recibe", async ({ page }) => {
    await page.goto("/dev/harness?view=swipe");
    const card = page.getByTestId("swipe-card");
    const box = (await card.boundingBox())!;
    const cx = box.x + box.width / 2;
    const cy = box.y + 40;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) await page.mouse.move(cx + i * 25, cy);
    await page.mouse.up();
    await expect(log(page)).toHaveText("receive");
  });

  test("una carta forzada no se puede descartar", async ({ page }) => {
    await page.goto("/dev/harness?view=swipe&forced=1");
    await expect(page.getByText("Vuelta forzada")).toBeVisible();
    await expect(page.getByRole("button", { name: /Descartar/ })).toBeDisabled();
    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(400);
    await expect(log(page)).toHaveText("");
  });
});

test.describe("puzzles de Lichess", () => {
  test("anima la jugada del rival y resuelve con respuesta automática", async ({ page }) => {
    await page.goto("/dev/harness?view=puzzle");
    await expect(page.getByText(/Juegan las blancas/)).toBeVisible();
    await move(page, "a2e6");
    await expect(page.getByText(/Juegan las blancas/)).toBeVisible();
    await move(page, "f7f8");
    await expect(page.getByText("¡Resuelto!")).toBeVisible();
    await expect(log(page)).toHaveText('{"solved":true,"moves":["a2e6","f7f8"]}');
  });

  test("una jugada incorrecta falla el puzzle", async ({ page }) => {
    await page.goto("/dev/harness?view=puzzle");
    await expect(page.getByText(/Juegan las blancas/)).toBeVisible();
    await move(page, "f7f8"); // no es la solución y no es mate
    await expect(page.getByText("Jugada incorrecta")).toBeVisible();
  });
});

test.describe("ronda de descarte", () => {
  test("resolver los 3 dentro del tiempo envía las 3 soluciones", async ({ page }) => {
    await page.goto("/dev/harness?view=discard&limit=60000");
    const solutions = [["a2e6", "f7f8"], ["e8e1", "e1c1", "f4h6", "h6c1"], ["a5e1", "e1e3", "e3b6"]];
    for (const [i, sol] of solutions.entries()) {
      await expect(page.getByText(`Puzzle ${i + 1} de 3`)).toBeVisible();
      for (const m of sol) {
        await expect(page.getByText(/Juegan las/)).toBeVisible();
        await move(page, m);
      }
    }
    await expect(log(page)).toContainText('"id":"00sJb","moves":["a5e1","e1e3","e3b6"]');
  });

  test("se acaba el tiempo y la ronda termina sola", async ({ page }) => {
    await page.goto("/dev/harness?view=discard&limit=1500");
    await expect(page.getByRole("timer")).toHaveText("0.0s", { timeout: 4000 });
    await expect(log(page)).toHaveText("[]");
  });
});
