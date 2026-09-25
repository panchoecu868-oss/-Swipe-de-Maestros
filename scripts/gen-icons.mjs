// Renderiza public/icons/icon.svg a PNG (192, 512 y maskable 512) con Chromium vía Playwright.
import { readFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const svg = readFileSync("public/icons/icon.svg", "utf8");
const exe = process.env.PW_CHROMIUM_PATH ?? "/opt/pw-browsers/chromium";
const browser = await chromium.launch({ executablePath: exe });
for (const [size, name, pad] of [[192, "icon-192.png", 0], [512, "icon-512.png", 0], [512, "maskable-512.png", 0.1]]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  const inner = Math.round(size * (1 - pad * 2));
  await page.setContent(`<html><body style="margin:0;background:#2f6f4f;display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px">${svg.replace("<svg ", `<svg width="${inner}" height="${inner}" `)}</body></html>`);
  await page.screenshot({ path: `public/icons/${name}`, omitBackground: pad === 0 });
  await page.close();
}
await browser.close();
console.log("íconos generados");
