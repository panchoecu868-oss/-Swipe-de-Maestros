/**
 * ELO FIDE (o estimado declarado) → rango de rating de puzzles de Lichess.
 * NO son la misma escala y no existe una tabla oficial de equivalencia:
 * PROVISIONAL — ajustar con datos reales (tasa de acierto por usuario en checkpoints/descartes).
 * Entre filas se interpola linealmente; fuera del rango se usa la fila extrema.
 */
export interface EloPuzzleRow {
  elo: number;
  puzzleMin: number;
  puzzleMax: number;
}

export const ELO_TO_PUZZLE_RATING: EloPuzzleRow[] = [
  { elo: 1000, puzzleMin: 900, puzzleMax: 1300 },
  { elo: 1400, puzzleMin: 1250, puzzleMax: 1650 },
  { elo: 1800, puzzleMin: 1600, puzzleMax: 2000 },
  { elo: 2200, puzzleMin: 1950, puzzleMax: 2400 },
];

/** Cuánto se ensancha el rango (en cada lado) si no hay suficientes puzzles del tema. */
export const PUZZLE_RANGE_WIDEN_STEP = 150;
export const PUZZLE_RANGE_WIDEN_MAX_STEPS = 4;
