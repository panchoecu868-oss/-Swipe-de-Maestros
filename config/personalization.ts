/** Peso base por nota de autoevaluación: nota baja = peso alto. */
export const WEIGHT_BY_SCORE: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 5, 2: 4, 3: 3, 4: 2, 5: 1 };
/** Peso fijo del tema "aperturas" (no se autoevalúa), relativo a la media 1.0. */
export const OPENING_TOPIC_WEIGHT = 1;
/** Ajustes tras una ronda de descarte. */
export const DISCARD_WIN_FACTOR = 0.8;
export const DISCARD_LOSS_FACTOR = 1.25;
export const WEIGHT_MIN = 0.1;
export const WEIGHT_MAX = 5;

/**
 * PROVISIONAL — AJUSTAR. Corrección que se suma al rating declarado de Chess.com/Lichess
 * para estimar un ELO de trabajo cuando el usuario no tiene FIDE. No existe tabla oficial.
 */
export const DECLARED_ELO_OFFSET = { chesscom: 0, lichess: 0 } as const;
