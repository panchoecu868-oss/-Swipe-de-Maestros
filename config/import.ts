import type { ImportFilters } from "@/lib/puzzles/csv";

/**
 * Configuración del import de puzzles (scripts/import-puzzles.ts).
 * Beta: ~20k filas. Para más, sube MAX_ROWS (ojo: la base completa ronda varios millones de filas).
 */
export const PUZZLE_IMPORT = {
  /** Archivo oficial. Doc: https://database.lichess.org/#puzzles */
  SOURCE_URL: "https://database.lichess.org/lichess_db_puzzle.csv.zst",
  MAX_ROWS: 20_000,
  FILTERS: {
    ratingMin: 800,
    ratingMax: 2500,
    minPopularity: 90,
    minPlays: 500,
    /** RD bajo = rating del puzzle confiable. */
    maxRatingDeviation: 90,
  } satisfies ImportFilters,
  /**
   * Tope de puzzles por tema "de motivo" para que la muestra no se llene de mateIn1.
   * Un puzzle entra si al menos uno de sus temas de motivo sigue bajo el tope.
   */
  MAX_PER_THEME: 1_500,
  /**
   * Temas descriptivos (largo, fase, tipo de ventaja) que NO cuentan para el tope.
   * Nombres oficiales de lila/translation/source/puzzleTheme.xml.
   */
  NON_MOTIF_THEMES: [
    "short", "long", "veryLong", "oneMove", "opening", "middlegame", "endgame",
    "advantage", "crushing", "equality", "mate", "master", "masterVsMaster", "superGM",
  ],
  BATCH_SIZE: 1_000,
} as const;
