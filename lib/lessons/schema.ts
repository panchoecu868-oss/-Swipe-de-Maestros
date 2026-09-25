import { z } from "zod";
import { LICHESS_THEMES } from "@/config/lichess-themes";

/**
 * Forma que el modelo DEBE devolver (structured outputs).
 * La posición nunca se pide como FEN libre: se reconstruye jugando las jugadas citadas
 * del texto, así chess.js puede verificarla y el revisor ve la cita literal.
 */
export const LessonDraftSchema = z.object({
  type: z.enum(["apertura", "estrategia", "final"]),
  title: z.string(),
  summary: z.string(),
  body: z.string(),
  position: z.object({
    /** moves_from_start: jugadas desde la posición inicial. piece_list: el texto describe las piezas. */
    source: z.enum(["moves_from_start", "piece_list"]),
    /** Fragmento LITERAL del texto del libro que contiene las jugadas o la lista de piezas. */
    quote: z.string(),
    /** Solo para piece_list: FEN construido a partir de la lista citada. */
    start_fen: z.string().nullable(),
    /** Jugadas en SAN (convertidas si el libro usa notación descriptiva). */
    moves_san: z.array(z.string()),
  }),
  lichess_themes: z.array(z.enum(LICHESS_THEMES)),
  opening_tags: z.array(z.string()),
  elo_min: z.number().int(),
  elo_max: z.number().int(),
  page_start: z.number().int(),
  page_end: z.number().int(),
});

export const LessonBatchSchema = z.object({
  lessons: z.array(LessonDraftSchema),
});

export type LessonDraft = z.infer<typeof LessonDraftSchema>;
export type LessonBatch = z.infer<typeof LessonBatchSchema>;
