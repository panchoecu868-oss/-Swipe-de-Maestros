/**
 * Parser de la base de puzzles de Lichess.
 * Header oficial verificado en https://database.lichess.org/#puzzles
 * (fuente: github.com/lichess-org/database, web/index.html.tpl).
 */
import { isPuzzleLegal } from "@/lib/chess/puzzle";

export const LICHESS_PUZZLE_HEADER = [
  "PuzzleId",
  "FEN",
  "Moves",
  "Rating",
  "RatingDeviation",
  "Popularity",
  "NbPlays",
  "Themes",
  "GameUrl",
  "OpeningTags",
  "DailyDate",
] as const;

export interface PuzzleRow {
  id: string;
  fen: string;
  moves: string[];
  rating: number;
  ratingDeviation: number;
  popularity: number;
  nbPlays: number;
  themes: string[];
  gameUrl: string | null;
  openingTags: string[];
  /** DailyDate: timestamp Unix en ms si fue puzzle del día. */
  dailyDate: Date | null;
}

/** Split CSV con soporte de comillas (la base actual no las usa, pero no lo asumimos). */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

export function assertOfficialHeader(line: string): void {
  const got = splitCsvLine(line.trim());
  const expected = [...LICHESS_PUZZLE_HEADER];
  if (got.join(",") !== expected.join(",")) {
    throw new Error(
      `El header del CSV no coincide con el formato oficial de Lichess.\n  esperado: ${expected.join(",")}\n  recibido: ${got.join(",")}\n` +
        "Revisa https://database.lichess.org/#puzzles: el formato pudo haber cambiado.",
    );
  }
}

const words = (s: string) => (s.trim() ? s.trim().split(/\s+/) : []);

export function parsePuzzleLine(line: string): PuzzleRow {
  const f = splitCsvLine(line.replace(/\r$/, ""));
  if (f.length !== LICHESS_PUZZLE_HEADER.length) {
    throw new Error(`Se esperaban ${LICHESS_PUZZLE_HEADER.length} columnas y llegaron ${f.length}`);
  }
  const [id, fen, moves, rating, rd, popularity, nbPlays, themes, gameUrl, openingTags, dailyDate] = f;
  const num = (v: string, name: string) => {
    const n = Number(v);
    if (!Number.isFinite(n)) throw new Error(`${name} no numérico: ${v}`);
    return n;
  };
  return {
    id,
    fen,
    moves: words(moves),
    rating: num(rating, "Rating"),
    ratingDeviation: num(rd, "RatingDeviation"),
    popularity: num(popularity, "Popularity"),
    nbPlays: num(nbPlays, "NbPlays"),
    themes: words(themes),
    gameUrl: gameUrl || null,
    openingTags: words(openingTags),
    dailyDate: dailyDate ? new Date(num(dailyDate, "DailyDate")) : null,
  };
}

export interface ImportFilters {
  ratingMin: number;
  ratingMax: number;
  minPopularity: number;
  minPlays: number;
  maxRatingDeviation: number;
}

export type RejectReason = "rating" | "popularity" | "plays" | "deviation" | "illegal";

export function rejectReason(row: PuzzleRow, f: ImportFilters): RejectReason | null {
  if (row.rating < f.ratingMin || row.rating > f.ratingMax) return "rating";
  if (row.popularity < f.minPopularity) return "popularity";
  if (row.nbPlays < f.minPlays) return "plays";
  if (row.ratingDeviation > f.maxRatingDeviation) return "deviation";
  if (!isPuzzleLegal(row)) return "illegal";
  return null;
}
