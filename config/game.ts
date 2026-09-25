/** Parámetros de juego. Todo lo que quieras ajustar con datos vive aquí. */
export const GAME_CONFIG = {
  /** Puzzles en una ronda de descarte. */
  DISCARD_ROUND_SIZE: 3,
  /** Tiempo total para toda la ronda de descarte (no por puzzle). */
  DISCARD_TIME_LIMIT_SECONDS: 10,
  /** Margen de red que el servidor tolera al validar el tiempo (ms). */
  DISCARD_SERVER_GRACE_MS: 1500,
  /** Cartas por día; "día cumplido" = esta cantidad resuelta por cualquier gesto. */
  DAILY_DECK_SIZE: 10,
  /** Cartas visibles sin suscripción activa. */
  DEMO_CARDS: 3,
  /** Máximo de palabras por lección. */
  LESSON_MAX_WORDS: 150,
  /** Rango de ELO de trabajo. */
  ELO_MIN: 1000,
  ELO_MAX: 2200,
} as const;
