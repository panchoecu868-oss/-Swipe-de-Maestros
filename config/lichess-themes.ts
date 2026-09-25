/**
 * Temas oficiales de puzzles de Lichess.
 * Fuente: https://github.com/lichess-org/lila/blob/master/translation/source/puzzleTheme.xml
 * (se excluyen claves de UI que no son temas: mix, playerGames, puzzleDownloadInformation,
 *  promotePawnToQueenRookOrMinor y las *Description).
 */
export const LICHESS_THEMES = [
  "advancedPawn", "advantage", "anastasiaMate", "arabianMate", "attackingF2F7", "attraction",
  "backRankMate", "balestraMate", "blindSwineMate", "bishopEndgame", "bodenMate", "castling",
  "capturingDefender", "collinearMove", "cornerMate", "crushing", "discoveredCheck", "doubleBishopMate",
  "dovetailMate", "equality", "kingsideAttack", "clearance", "defensiveMove", "deflection",
  "discoveredAttack", "doubleCheck", "endgame", "epauletteMate", "exposedKing", "fork", "hangingPiece",
  "hookMate", "interference", "intermezzo", "killBoxMate", "pillsburysMate", "morphysMate",
  "swallowstailMate", "triangleMate", "vukovicMate", "knightEndgame", "long", "master", "masterVsMaster",
  "mate", "mateIn1", "mateIn2", "mateIn3", "mateIn4", "mateIn5", "middlegame", "oneMove", "opening",
  "operaMate", "pawnEndgame", "pin", "promotion", "queenEndgame", "queenRookEndgame", "queensideAttack",
  "quietMove", "rookEndgame", "sacrifice", "short", "skewer", "smotheredMate", "superGM", "trappedPiece",
  "underPromotion", "veryLong", "xRayAttack", "zugzwang",
] as const;

export type LichessTheme = (typeof LICHESS_THEMES)[number];

export function isLichessTheme(t: string): t is LichessTheme {
  return (LICHESS_THEMES as readonly string[]).includes(t);
}
