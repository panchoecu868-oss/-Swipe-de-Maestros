/** Temas de autoevaluación (escala 1–5) del onboarding. */
export const MIDDLEGAME_TOPICS = [
  { id: "calculo_tactico", label: "Cálculo táctico" },
  { id: "ataque_al_rey", label: "Ataque al rey" },
  { id: "estructuras_peones", label: "Estructuras de peones" },
  { id: "piezas_buenas_malas", label: "Piezas buenas y malas" },
  { id: "casillas_debiles", label: "Casillas débiles" },
  { id: "profilaxis", label: "Profilaxis" },
  { id: "planes_cerradas", label: "Planes en posiciones cerradas" },
  { id: "conversion_ventaja", label: "Conversión de ventaja" },
  { id: "defensa", label: "Defensa" },
] as const;

export const ENDGAME_TOPICS = [
  { id: "finales_peones", label: "Finales de peones" },
  { id: "finales_torres", label: "Finales de torres" },
  { id: "finales_piezas_menores", label: "Finales de piezas menores" },
  { id: "finales_damas", label: "Finales de damas" },
  { id: "tecnica_basica", label: "Técnica básica (Lucena/Philidor)" },
] as const;

export const ALL_TOPICS = [...MIDDLEGAME_TOPICS, ...ENDGAME_TOPICS];
export type TopicId = (typeof ALL_TOPICS)[number]["id"];
export const TOPIC_IDS = ALL_TOPICS.map((t) => t.id) as [TopicId, ...TopicId[]];
/** Tema sintético para lecciones de apertura (no hay autoevaluación de aperturas). */
export const OPENING_TOPIC = "aperturas";
