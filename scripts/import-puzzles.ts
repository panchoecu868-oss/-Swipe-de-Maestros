/**
 * Importa la base oficial de puzzles de Lichess (CC0) a Postgres.
 * Formato: https://database.lichess.org/#puzzles
 *
 * Uso:
 *   npm run import:puzzles                          # descarga SOURCE_URL de config/import.ts
 *   npm run import:puzzles -- --file ./data/lichess_db_puzzle.csv.zst
 *   npm run import:puzzles -- --file x.csv --max 5000
 * Base destino: SUPABASE_DB_URL (o DATABASE_URL).
 */
import "dotenv/config";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { Readable } from "node:stream";
import zlib from "node:zlib";
import { Client } from "pg";
import { PUZZLE_IMPORT } from "../config/import";
import { importPuzzleLines } from "../lib/puzzles/importer";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function openSource(): Promise<{ stream: NodeJS.ReadableStream; label: string }> {
  const file = arg("file");
  let raw: NodeJS.ReadableStream;
  let label: string;
  if (file) {
    raw = createReadStream(file);
    label = file;
  } else {
    const res = await fetch(PUZZLE_IMPORT.SOURCE_URL);
    if (!res.ok || !res.body) throw new Error(`Descarga falló: HTTP ${res.status} ${PUZZLE_IMPORT.SOURCE_URL}`);
    raw = Readable.fromWeb(res.body as import("node:stream/web").ReadableStream);
    label = PUZZLE_IMPORT.SOURCE_URL;
  }
  // Node ≥22.15 trae zstd nativo en zlib.
  const stream = label.endsWith(".zst") ? raw.pipe(zlib.createZstdDecompress()) : raw;
  return { stream, label };
}

async function main() {
  const url = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("Falta SUPABASE_DB_URL (o DATABASE_URL)");
  const maxRows = Number(arg("max") ?? PUZZLE_IMPORT.MAX_ROWS);
  const { stream, label } = await openSource();
  console.log(`Importando desde ${label} (máx ${maxRows} filas)…`);

  const client = new Client({ connectionString: url });
  await client.connect();
  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  try {
    const stats = await importPuzzleLines(rl, client, {
      filters: PUZZLE_IMPORT.FILTERS,
      maxRows,
      maxPerTheme: PUZZLE_IMPORT.MAX_PER_THEME,
      nonMotifThemes: PUZZLE_IMPORT.NON_MOTIF_THEMES,
      batchSize: PUZZLE_IMPORT.BATCH_SIZE,
      onProgress: (s) => process.stdout.write(`\r  leídas ${s.read} · importadas ${s.imported}`),
    });
    console.log("\nRechazos:", stats.rejected);
    const top = Object.entries(stats.perTheme).sort((a, b) => b[1] - a[1]).slice(0, 15);
    console.log("Temas más frecuentes:", Object.fromEntries(top));
  } finally {
    rl.close();
    (stream as unknown as { destroy?: () => void }).destroy?.();
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
