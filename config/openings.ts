/**
 * Banco de preguntas de aperturas del onboarding.
 * Las claves son familias oficiales de Lichess (config/data/opening-families.json,
 * generado desde github.com/lichess-org/chess-openings con `npm run gen:openings`),
 * las mismas que aparecen en OpeningTags de los puzzles y en opening_tags de las lecciones.
 */
export interface RepertoireOption {
  id: string;
  label: string;
  /** Selector de familias: por prefijo de jugadas de su línea más corta o por clave exacta. */
  match: { movesPrefix?: string[]; families?: string[] } | "any";
}

export const WHITE_FIRST_MOVE: RepertoireOption[] = [
  { id: "e4", label: "1.e4", match: { movesPrefix: ["e4"] } },
  { id: "d4", label: "1.d4", match: { movesPrefix: ["d4"] } },
  { id: "c4", label: "1.c4", match: { movesPrefix: ["c4"] } },
  { id: "Nf3", label: "1.Cf3", match: { movesPrefix: ["Nf3"] } },
  { id: "otro", label: "Otro", match: "any" },
];

export const BLACK_VS_E4: RepertoireOption[] = [
  { id: "e5", label: "1...e5", match: { movesPrefix: ["e4", "e5"] } },
  { id: "Sicilian_Defense", label: "Siciliana", match: { families: ["Sicilian_Defense"] } },
  { id: "French_Defense", label: "Francesa", match: { families: ["French_Defense"] } },
  { id: "Caro-Kann_Defense", label: "Caro-Kann", match: { families: ["Caro-Kann_Defense"] } },
  { id: "Scandinavian_Defense", label: "Escandinava", match: { families: ["Scandinavian_Defense"] } },
  { id: "Pirc_Defense", label: "Pirc", match: { families: ["Pirc_Defense"] } },
  { id: "Modern_Defense", label: "Moderna", match: { families: ["Modern_Defense"] } },
  { id: "Alekhine_Defense", label: "Alekhine", match: { families: ["Alekhine_Defense"] } },
  { id: "otra", label: "Otra", match: { movesPrefix: ["e4"] } },
];

export const BLACK_VS_D4: RepertoireOption[] = [
  { id: "Queens_Gambit_Declined", label: "Gambito de Dama Rehusado", match: { families: ["Queens_Gambit_Declined"] } },
  { id: "Queens_Gambit_Accepted", label: "Gambito de Dama Aceptado", match: { families: ["Queens_Gambit_Accepted"] } },
  { id: "Slav_Defense", label: "Eslava / Semieslava", match: { families: ["Slav_Defense", "Semi-Slav_Defense"] } },
  { id: "Kings_Indian_Defense", label: "India de Rey", match: { families: ["Kings_Indian_Defense"] } },
  { id: "Nimzo-Indian_Defense", label: "Nimzoindia", match: { families: ["Nimzo-Indian_Defense"] } },
  { id: "Queens_Indian_Defense", label: "India de Dama", match: { families: ["Queens_Indian_Defense"] } },
  { id: "Grunfeld_Defense", label: "Grünfeld", match: { families: ["Grunfeld_Defense"] } },
  { id: "Dutch_Defense", label: "Holandesa", match: { families: ["Dutch_Defense"] } },
  { id: "Benoni_Defense", label: "Benoni", match: { families: ["Benoni_Defense"] } },
  { id: "otra", label: "Otra", match: { movesPrefix: ["d4"] } },
];
