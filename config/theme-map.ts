import type { LichessTheme } from "./lichess-themes";
import type { TopicId } from "./self-assessment";

/**
 * BORRADOR — AJUSTAR. Tema de autoevaluación → temas oficiales de Lichess
 * para buscar puzzles cuando una lección no trae lichess_themes propios.
 * Los temas estratégicos (estructuras, piezas buenas/malas, casillas débiles, profilaxis,
 * planes cerrados) NO tienen equivalente en Lichess: van vacíos a propósito y usan el fallback.
 */
export const THEME_MAP: Record<TopicId, LichessTheme[]> = {
  calculo_tactico: ["fork", "pin", "skewer", "discoveredAttack", "deflection", "attraction", "doubleCheck", "intermezzo"],
  ataque_al_rey: ["kingsideAttack", "exposedKing", "mateIn2", "mateIn3", "sacrifice"],
  estructuras_peones: [],
  piezas_buenas_malas: [],
  casillas_debiles: [],
  profilaxis: [],
  planes_cerradas: [],
  conversion_ventaja: ["crushing", "advantage"],
  defensa: ["defensiveMove", "equality"],
  finales_peones: ["pawnEndgame"],
  finales_torres: ["rookEndgame"],
  finales_piezas_menores: ["bishopEndgame", "knightEndgame"],
  finales_damas: ["queenEndgame", "queenRookEndgame"],
  tecnica_basica: ["rookEndgame"],
};

/** Si ni la lección ni el mapeo dan temas, la ronda de descarte usa estos. */
export const FALLBACK_PUZZLE_THEMES: LichessTheme[] = ["middlegame", "quietMove"];
