/**
 * Generación de lecciones con la API de Claude.
 * Docs: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
 *       https://platform.claude.com/docs/en/build-with-claude/refusals-and-fallback
 * SDK: @anthropic-ai/sdk (client.beta.messages.parse + betaZodOutputFormat).
 */
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { LESSON_PIPELINE } from "@/config/lessons";
import { LICHESS_THEMES } from "@/config/lichess-themes";
import { GAME_CONFIG } from "@/config/game";
import { ALL_TOPICS, OPENING_TOPIC } from "@/config/self-assessment";
import { LessonBatchSchema, type LessonDraft } from "./schema";

export interface GenerationInput {
  bookTitle: string;
  bookAuthor: string;
  chapter: string;
  pages: Map<number, string>;
  maxLessons: number;
}

export interface GenerationOutput {
  lessons: LessonDraft[];
  model: string;
  stopReason: string | null;
  usage: { input: number; output: number };
}

export interface LessonGenerator {
  generate(input: GenerationInput): Promise<GenerationOutput>;
}

export const SYSTEM_PROMPT = `Eres editor de un curso de ajedrez en español. Recibes el texto de UN capítulo de un libro que el usuario posee, con marcadores [[PÁGINA n]].
Tu trabajo: escribir lecciones de ~1 minuto de lectura que resuman ideas del capítulo EN PALABRAS PROPIAS.

Reglas obligatorias (una lección que las incumpla se descarta automáticamente):
1. PROHIBIDO copiar frases del libro de más de 10 palabras seguidas. Parafrasea siempre.
2. PROHIBIDO inventar posiciones, jugadas, evaluaciones o conceptos que no estén en el texto. Si el capítulo no trae una posición concreta reconstruible, no generes lección para esa idea.
3. Cada lección cita su fuente con page_start/page_end (números de los marcadores [[PÁGINA n]]).
4. La posición de ejemplo se da SIEMPRE por referencia al texto:
   - source="moves_from_start": moves_san = las jugadas de la partida/línea del libro desde la posición inicial, en SAN inglés (N, B, R, Q, K). Si el libro usa notación descriptiva (P-K4, Kt-KB3) conviértela a SAN con cuidado.
   - source="piece_list": el texto enumera las piezas; start_fen = FEN de esa posición; moves_san = jugadas del texto desde ahí (puede ser vacío).
   - quote = fragmento LITERAL y contiguo del texto (tal como aparece) que contiene esas jugadas o esa lista de piezas.
5. body: máximo ${GAME_CONFIG.LESSON_MAX_WORDS} palabras. summary: máximo ${LESSON_PIPELINE.SUMMARY_MAX_WORDS} palabras. Español neutro.
6. type: "apertura" | "estrategia" | "final". Las de apertura llevan opening_tags con los nombres de familia de Lichess (ej. "Sicilian_Defense", "Queens_Gambit_Declined"), solo si el texto nombra esa apertura.
7. lichess_themes: solo temas de esta lista que correspondan a la idea del texto: ${LICHESS_THEMES.join(", ")}.
8. topics: 1 a 3 temas de esta lista que la lección trabaja (las de apertura llevan "${OPENING_TOPIC}"): ${ALL_TOPICS.map((t) => `${t.id} (${t.label})`).join(", ")}, ${OPENING_TOPIC}.
9. elo_min/elo_max dentro de ${GAME_CONFIG.ELO_MIN}–${GAME_CONFIG.ELO_MAX}, según la dificultad del material.
Si el capítulo no da para ninguna lección que cumpla todo, devuelve lessons: [].`;

export function renderChapter(input: GenerationInput): string {
  const pages = [...input.pages.entries()].map(([n, t]) => `[[PÁGINA ${n}]]\n${t}`).join("\n\n");
  return `Libro: "${input.bookTitle}" — ${input.bookAuthor}\nCapítulo: ${input.chapter}\nGenera como máximo ${input.maxLessons} lecciones.\n\n${pages}`;
}

export class ClaudeLessonGenerator implements LessonGenerator {
  private client = new Anthropic();
  constructor(private model: string = LESSON_PIPELINE.MODEL) {}

  async generate(input: GenerationInput): Promise<GenerationOutput> {
    const response = await this.client.beta.messages.parse({
      model: this.model,
      max_tokens: 16000,
      // Si el modelo principal rechaza, la API reintenta con el modelo de respaldo por defecto.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      thinking: { type: "adaptive" },
      output_config: { effort: "high", format: betaZodOutputFormat(LessonBatchSchema) },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: renderChapter(input) }],
    });
    if (response.stop_reason === "refusal") {
      throw new Error(`El modelo rechazó el capítulo "${input.chapter}"`);
    }
    if (response.stop_reason === "max_tokens") {
      throw new Error(`Respuesta truncada (max_tokens) en "${input.chapter}"`);
    }
    const parsed = response.parsed_output;
    if (!parsed) throw new Error(`Salida no parseable en "${input.chapter}"`);
    return {
      lessons: parsed.lessons,
      model: response.model,
      stopReason: response.stop_reason,
      usage: { input: response.usage.input_tokens, output: response.usage.output_tokens },
    };
  }
}
