import { Chess } from "chess.js";
import { z } from "zod";
import { GAME_CONFIG } from "@/config/game";
import { LICHESS_THEMES } from "@/config/lichess-themes";
import { wordCount } from "./text";

/** Ediciones permitidas en /admin/review, validadas igual que en el pipeline. */
export const LessonEditSchema = z
  .object({
    title: z.string().trim().min(1),
    summary: z.string().trim().min(1),
    body: z.string().trim().min(1).refine((b) => wordCount(b) <= GAME_CONFIG.LESSON_MAX_WORDS, {
      message: `Máximo ${GAME_CONFIG.LESSON_MAX_WORDS} palabras`,
    }),
    fen: z.string().refine((f) => {
      try {
        new Chess(f);
        return true;
      } catch {
        return false;
      }
    }, "FEN inválido"),
    lichess_themes: z.array(z.enum(LICHESS_THEMES)),
    opening_tags: z.array(z.string().regex(/^[A-Z][A-Za-z0-9_]*$/)),
    elo_min: z.number().int().min(GAME_CONFIG.ELO_MIN).max(GAME_CONFIG.ELO_MAX),
    elo_max: z.number().int().min(GAME_CONFIG.ELO_MIN).max(GAME_CONFIG.ELO_MAX),
  })
  .refine((v) => v.elo_min <= v.elo_max, { message: "elo_min > elo_max", path: ["elo_min"] });

export type LessonEdit = z.infer<typeof LessonEditSchema>;

export const splitList = (s: string) => s.split(/[\s,]+/).map((x) => x.trim()).filter(Boolean);
