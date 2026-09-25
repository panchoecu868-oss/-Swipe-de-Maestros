import { expect, test } from "@playwright/test";

test("la biblioteca lista los clásicos de dominio público con enlace a Gutenberg", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Biblioteca" }).click();
  await expect(page.getByRole("heading", { name: "Biblioteca" })).toBeVisible();
  for (const t of ["Chess Fundamentals", "Chess Strategy", "Chess and Checkers", "Chess Generalship"]) {
    await expect(page.getByRole("heading", { name: new RegExp(t) })).toBeVisible();
  }
  await expect(page.getByRole("link", { name: /Project Gutenberg \(#33870\)/ })).toHaveAttribute("href", "https://www.gutenberg.org/ebooks/33870");
});
