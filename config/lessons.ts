/** Pipeline de libros → lecciones (scripts/build-lessons.ts). */
export const LESSON_PIPELINE = {
  /** Modelo de Claude. Sobrescribible con LESSONS_MODEL. */
  MODEL: process.env.LESSONS_MODEL ?? "claude-opus-5",
  /** Regla del producto: prohibido copiar más de 10 palabras seguidas. */
  MAX_COPIED_WORDS: 10,
  SUMMARY_MAX_WORDS: 40,
  /** Lecciones que se piden por capítulo. */
  LESSONS_PER_CHAPTER: 3,
  /** Si el PDF no trae índice (outline), se detectan capítulos con esta regex al inicio de página. */
  CHAPTER_HEADING_RE: /^\s*(chapter|cap[ií]tulo|part|parte)\s+([ivxlc\d]+)\b/im,
  /** Sin índice ni encabezados: bloques de N páginas. */
  FALLBACK_PAGES_PER_CHUNK: 12,
} as const;
