import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("manifest instalable y service worker activo", async ({ page, request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.ok()).toBe(true);
  const m = await res.json();
  expect(m).toMatchObject({ name: "Swipe de Maestros", lang: "es", display: "standalone", start_url: "/feed" });
  expect(m.icons.map((i: { sizes: string }) => i.sizes)).toEqual(expect.arrayContaining(["192x192", "512x512"]));
  await page.goto("/");
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  expect(scope).toMatch(/\/$/);
  const sw = await request.get("/sw.js");
  expect(sw.headers()["cache-control"]).toContain("no-cache");
});

for (const path of ["/", "/login", "/garantia/terminos", "/licencias", "/dev/harness?view=swipe", "/dev/harness?view=puzzle"]) {
  test(`sin violaciones graves de accesibilidad: ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const serious = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${v.id}: ${v.nodes.length} nodos — ${v.help}`)).toEqual([]);
  });
}

test("modo oscuro: los tokens cambian con prefers-color-scheme", async ({ browser }) => {
  const ctx = await browser.newContext({ colorScheme: "dark" });
  const page = await ctx.newPage();
  await page.goto("/");
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe("rgb(18, 17, 15)");
  await ctx.close();
});
