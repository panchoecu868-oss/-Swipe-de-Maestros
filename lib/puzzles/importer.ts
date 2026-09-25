import type { Client } from "pg";
import { assertOfficialHeader, parsePuzzleLine, rejectReason, type ImportFilters, type PuzzleRow, type RejectReason } from "./csv";

export interface ImportOptions {
  filters: ImportFilters;
  maxRows: number;
  maxPerTheme: number;
  nonMotifThemes: readonly string[];
  batchSize: number;
  onProgress?: (s: ImportStats) => void;
}

export interface ImportStats {
  read: number;
  imported: number;
  rejected: Record<RejectReason | "quota" | "parse", number>;
  perTheme: Record<string, number>;
}

/** Decide por cuota: entra si algún tema de motivo sigue bajo el tope (o si no tiene temas de motivo). */
export function passesQuota(row: PuzzleRow, perTheme: Record<string, number>, max: number, nonMotif: Set<string>) {
  const motifs = row.themes.filter((t) => !nonMotif.has(t));
  if (motifs.length === 0) return true;
  return motifs.some((t) => (perTheme[t] ?? 0) < max);
}

async function flush(client: Client, batch: PuzzleRow[]) {
  if (batch.length === 0) return;
  const cols = 11;
  const values: unknown[] = [];
  const tuples = batch.map((r, i) => {
    values.push(r.id, r.fen, r.moves, r.rating, r.ratingDeviation, r.popularity, r.nbPlays, r.themes, r.gameUrl, r.openingTags, r.dailyDate);
    const b = i * cols;
    return `(${Array.from({ length: cols }, (_, k) => `$${b + k + 1}`).join(",")})`;
  });
  await client.query(
    `insert into public.puzzles (id, fen, moves, rating, rating_dev, popularity, nb_plays, themes, game_url, opening_tags, daily_date)
     values ${tuples.join(",")}
     on conflict (id) do update set
       fen = excluded.fen, moves = excluded.moves, rating = excluded.rating, rating_dev = excluded.rating_dev,
       popularity = excluded.popularity, nb_plays = excluded.nb_plays, themes = excluded.themes,
       game_url = excluded.game_url, opening_tags = excluded.opening_tags, daily_date = excluded.daily_date`,
    values,
  );
}

/** Importa desde un iterable de líneas (la primera DEBE ser el header oficial). */
export async function importPuzzleLines(lines: AsyncIterable<string>, client: Client, opts: ImportOptions): Promise<ImportStats> {
  const stats: ImportStats = {
    read: 0,
    imported: 0,
    rejected: { rating: 0, popularity: 0, plays: 0, deviation: 0, illegal: 0, quota: 0, parse: 0 },
    perTheme: {},
  };
  const nonMotif = new Set(opts.nonMotifThemes);
  let headerChecked = false;
  let batch: PuzzleRow[] = [];

  for await (const line of lines) {
    if (!headerChecked) {
      assertOfficialHeader(line);
      headerChecked = true;
      continue;
    }
    if (!line.trim()) continue;
    stats.read++;
    let row: PuzzleRow;
    try {
      row = parsePuzzleLine(line);
    } catch {
      stats.rejected.parse++;
      continue;
    }
    const reason = rejectReason(row, opts.filters);
    if (reason) {
      stats.rejected[reason]++;
      continue;
    }
    if (!passesQuota(row, stats.perTheme, opts.maxPerTheme, nonMotif)) {
      stats.rejected.quota++;
      continue;
    }
    for (const t of row.themes) stats.perTheme[t] = (stats.perTheme[t] ?? 0) + 1;
    batch.push(row);
    stats.imported++;
    if (batch.length >= opts.batchSize) {
      await flush(client, batch);
      batch = [];
      opts.onProgress?.(stats);
    }
    if (stats.imported >= opts.maxRows) break;
  }
  if (!headerChecked) throw new Error("Archivo vacío: no hay header");
  await flush(client, batch);
  opts.onProgress?.(stats);
  return stats;
}
