/**
 * Libros (PDF en /books, nunca en git) → lecciones con reviewed=false.
 *
 * Uso:
 *   npm run build:lessons -- --file books/mi-libro.pdf [--max 5] [--chapters 1,3-4] [--dry-run]
 *   npm run build:lessons -- --file books/lasker-chess-strategy.txt --max 5     (dominio público, ver books:fetch)
 * Metadatos: books/mi-libro.json  { "title": "...", "author": "...", "year": 1921, "license_note": "..." }
 * Requiere ANTHROPIC_API_KEY y SUPABASE_DB_URL (salvo --dry-run).
 * Rechazos y errores → logs/build-lessons-<fecha>.jsonl
 */
import "dotenv/config";
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { ClaudeLessonGenerator } from "../lib/lessons/generator";
import { extractBook } from "../lib/lessons/pdf";
import { extractTextBook } from "../lib/lessons/text-source";
import { runPipeline } from "../lib/lessons/pipeline";
import type { BookMeta } from "../lib/lessons/store";

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

export function parseRanges(spec: string | undefined): number[] | undefined {
  if (!spec) return undefined;
  return spec.split(",").flatMap((part) => {
    const [a, b] = part.split("-").map(Number);
    return b ? Array.from({ length: b - a + 1 }, (_, i) => a + i) : [a];
  });
}

async function main() {
  const file = arg("file");
  if (!file) throw new Error("Falta --file books/<libro>.pdf");
  const isText = /\.txt$/i.test(file);
  const metaPath = file.replace(/\.(pdf|txt)$/i, ".json");
  const meta = JSON.parse(readFileSync(metaPath, "utf8")) as BookMeta & { cutAtLastLine?: string };
  if (!meta.title || !meta.author || !meta.license_note) throw new Error(`${metaPath}: faltan title/author/license_note`);
  const dryRun = process.argv.includes("--dry-run");

  // --extract-only: muestra capítulos, unidad de cita y diagramas sin llamar al modelo ni a la BD.
  if (process.argv.includes("--extract-only")) {
    const book = isText
      ? extractTextBook(readFileSync(file, "utf8"), { cutAtLastLine: meta.cutAtLastLine ? new RegExp(meta.cutAtLastLine) : undefined })
      : await extractBook(new Uint8Array(readFileSync(file)));
    console.log(`${meta.title} — ${book.pages.size} ${book.citationUnit === "página" ? "páginas" : "secciones"}, capítulos por ${book.chapterSource}, ${book.diagrams.length} diagramas`);
    book.chapters.forEach((c, i) => console.log(`  ${String(i + 1).padStart(2)}. ${c.title}  [${book.citationUnit} ${c.startPage}–${c.endPage}]`));
    return;
  }

  mkdirSync("logs", { recursive: true });
  const logFile = path.join("logs", `build-lessons-${new Date().toISOString().replace(/[:.]/g, "-")}.jsonl`);

  let db: Client | null = null;
  if (!dryRun) {
    const url = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL;
    if (!url) throw new Error("Falta SUPABASE_DB_URL (o usa --dry-run)");
    db = new Client({ connectionString: url });
    await db.connect();
  }
  try {
    const stats = await runPipeline({
      source: isText
        ? { kind: "text", text: readFileSync(file, "utf8"), cutAtLastLine: meta.cutAtLastLine ? new RegExp(meta.cutAtLastLine) : undefined }
        : { kind: "pdf", bytes: new Uint8Array(readFileSync(file)) },
      meta,
      generator: new ClaudeLessonGenerator(),
      db,
      maxLessons: arg("max") ? Number(arg("max")) : undefined,
      chapterIndexes: parseRanges(arg("chapters")),
      log: (e) => {
        appendFileSync(logFile, `${JSON.stringify(e)}\n`);
        const mark = e.kind === "inserted" ? "✓" : e.kind === "duplicate" ? "=" : "✗";
        console.log(`${mark} [${e.chapter}] ${e.title ?? ""} ${e.errors ? `→ ${e.errors.join("; ")}` : ""}`);
      },
    });
    console.log("\nResumen:", stats, `\nLog: ${logFile}`);
    if (!dryRun) console.log("Revisa y aprueba en /admin/review.");
  } finally {
    await db?.end();
  }
}

if (process.argv[1]?.endsWith("build-lessons.ts")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
