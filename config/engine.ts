/**
 * Fuerza de Stockfish contra el usuario.
 * Rangos verificados en el motor servido (Stockfish 19 Lite WASM, comando "uci"):
 *   option name UCI_Elo type spin default 1320 min 1320 max 3190
 *   option name Skill Level type spin default 20 min 0 max 20
 */
export const ENGINE_FILE = "/stockfish/stockfish-19-lite-single.js";

export const ENGINE_STRENGTH = {
  /** Se suma al ELO de trabajo del usuario (negativo = motor más débil que el usuario). */
  ELO_OFFSET: 0,
  /** Rango de UCI_Elo que usamos (dentro del que acepta el motor). */
  UCI_ELO_MIN: 1320,
  UCI_ELO_MAX: 2400,
  /** Tiempo por jugada del motor en modo UCI_Elo. */
  MOVETIME_MS: 400,
  /**
   * PROVISIONAL — AJUSTAR. Por debajo de UCI_ELO_MIN se usa Skill Level + profundidad limitada.
   * Interpolado entre filas; ninguna fila supera el mínimo de UCI_Elo.
   */
  SKILL_TABLE: [
    { elo: 1000, skill: 0, depth: 1, movetimeMs: 100 },
    { elo: 1100, skill: 2, depth: 2, movetimeMs: 150 },
    { elo: 1200, skill: 4, depth: 4, movetimeMs: 200 },
    { elo: 1319, skill: 6, depth: 6, movetimeMs: 250 },
  ],
} as const;

/** Objetivos de la partida desde la posición de la carta. */
export const ENGINE_OBJECTIVES = {
  /** Profundidad del motor de análisis (a fuerza completa) para evaluar posiciones. */
  ANALYSIS_DEPTH: 12,
  /** Evaluación inicial ≥ esto (cp, desde el lado del usuario) = posición ganadora → "convertir". */
  WINNING_CP: 150,
  /** Convertir: si la evaluación supera esto N veces seguidas, el motor "abandona". */
  RESIGN_CP: 900,
  RESIGN_STREAK: 3,
  /** Entablar/sobrevivir: por debajo de esto N veces seguidas se considera perdido. */
  LOST_CP: -700,
  LOST_STREAK: 3,
  /** Sobrevivir: jugadas del usuario y pérdida máxima tolerada. */
  SURVIVE_MOVES: 10,
  SURVIVE_MIN_CP: -200,
  /** Tope de jugadas (del usuario) para convertir o entablar. */
  MAX_MOVES: 40,
  /** Entablar: al llegar al tope con evaluación ≥ esto se cuenta como tablas sostenidas. */
  DRAW_HOLD_CP: -100,
  /** Convertir: al llegar al tope con evaluación ≥ esto se cuenta como convertida. */
  CONVERT_HOLD_CP: 500,
} as const;
