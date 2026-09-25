import { ELO_TO_PUZZLE_RATING, type EloPuzzleRow } from "@/config/elo-to-puzzle-rating";

export function puzzleRatingRange(elo: number, table: EloPuzzleRow[] = ELO_TO_PUZZLE_RATING) {
  const rows = [...table].sort((a, b) => a.elo - b.elo);
  if (rows.length === 0) throw new Error("Tabla ELO→puzzle vacía");
  if (elo <= rows[0].elo) return { min: rows[0].puzzleMin, max: rows[0].puzzleMax };
  const last = rows[rows.length - 1];
  if (elo >= last.elo) return { min: last.puzzleMin, max: last.puzzleMax };
  const i = rows.findIndex((r) => r.elo > elo);
  const a = rows[i - 1];
  const b = rows[i];
  const t = (elo - a.elo) / (b.elo - a.elo);
  return {
    min: Math.round(a.puzzleMin + t * (b.puzzleMin - a.puzzleMin)),
    max: Math.round(a.puzzleMax + t * (b.puzzleMax - a.puzzleMax)),
  };
}
