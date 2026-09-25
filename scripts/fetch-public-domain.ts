/**
 * Descarga los libros de dominio público de config/public-domain-books.ts a /books (ignorado por git).
 * Prueba el servidor oficial de Gutenberg y, si falla, el espejo GITenberg; verifica título y autor.
 *
 * Uso: npm run books:fetch                 (todos)
 *      npm run books:fetch -- --only lasker-chess-strategy
 * Después: npm run build:lessons -- --file books/lasker-chess-strategy.txt --max 5
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { gutenbergPage, gutenbergSources, licenseNote, PUBLIC_DOMAIN_BOOKS } from "../config/public-domain-books";
import { verifyGutenbergText } from "../lib/lessons/gutenberg-verify";
import type { BookMeta } from "../lib/lessons/store";

const only = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : null;

async function main() {
  mkdirSync("books", { recursive: true });
  let failed = 0;
  for (const b of PUBLIC_DOMAIN_BOOKS.filter((x) => !only || x.slug === only)) {
    let saved = false;
    for (const url of gutenbergSources(b)) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        const errors = verifyGutenbergText(text, b);
        if (errors.length) throw new Error(`verificación: ${errors.join("; ")}`);
        writeFileSync(path.join("books", `${b.slug}.txt`), text);
        const meta: BookMeta & { cutAtLastLine?: string } = {
          title: b.title,
          author: b.author,
          year: b.year,
          license_note: licenseNote(b),
          source_format: "gutenberg_txt",
          source_url: gutenbergPage(b.gutenbergId),
          public_domain: true,
          gutenberg_id: b.gutenbergId,
          ...(b.cutAtLastLine ? { cutAtLastLine: b.cutAtLastLine } : {}),
        };
        writeFileSync(path.join("books", `${b.slug}.json`), `${JSON.stringify(meta, null, 2)}\n`);
        console.log(`✓ ${b.slug} (${(text.length / 1024).toFixed(0)} KB) desde ${url}`);
        saved = true;
        break;
      } catch (e) {
        console.warn(`  ${b.slug}: ${url} → ${(e as Error).message}`);
      }
    }
    if (!saved) failed++;
  }
  if (failed) {
    console.error(`${failed} libro(s) no se pudieron descargar.`);
    process.exit(1);
  }
}

main();
