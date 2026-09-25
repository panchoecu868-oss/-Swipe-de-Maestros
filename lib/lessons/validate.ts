import { Chess } from "chess.js";
import { GAME_CONFIG } from "@/config/game";
import { LESSON_PIPELINE } from "@/config/lessons";
import { isLichessTheme } from "@/config/lichess-themes";
import type { LessonDraft } from "./schema";
import { containsQuote, longestCopiedRun, wordCount } from "./text";

export interface ChapterSource {
  chapter: string;
  /** Texto por número de página (1-indexado, como se cita). */
  pages: Map<number, string>;
}

export interface ValidatedLesson {
  draft: LessonDraft;
  fen: string;
  movesUci: string[];
}

export type ValidationResult = { ok: true; lesson: ValidatedLesson } | { ok: false; errors: string[] };

const INITIAL_FEN = new Chess().fen();

/** Reconstruye la posición jugando las jugadas citadas. Lanza con mensaje claro si algo es ilegal. */
export function buildPosition(draft: Pick<LessonDraft, "position">): { fen: string; movesUci: string[] } {
  const { source, start_fen, moves_san } = draft.position;
  let chess: Chess;
  if (source === "piece_list") {
    if (!start_fen) throw new Error("piece_list sin start_fen");
    try {
      chess = new Chess(start_fen);
    } catch (e) {
      throw new Error(`FEN inválido (${start_fen}): ${(e as Error).message}`);
    }
  } else {
    if (start_fen && start_fen !== INITIAL_FEN) throw new Error("moves_from_start no admite start_fen distinto del inicial");
    chess = new Chess();
  }
  const movesUci: string[] = [];
  for (const san of moves_san) {
    try {
      const m = chess.move(san);
      movesUci.push(`${m.from}${m.to}${m.promotion ?? ""}`);
    } catch {
      throw new Error(`Jugada ilegal "${san}" en ${chess.fen()}`);
    }
  }
  return { fen: chess.fen(), movesUci };
}

export function validateLesson(draft: LessonDraft, src: ChapterSource): ValidationResult {
  const errors: string[] = [];
  const maxCopy = LESSON_PIPELINE.MAX_COPIED_WORDS;

  if (!draft.title.trim()) errors.push("título vacío");
  if (!draft.summary.trim()) errors.push("resumen vacío");
  const words = wordCount(draft.body);
  if (words === 0) errors.push("cuerpo vacío");
  if (words > GAME_CONFIG.LESSON_MAX_WORDS) errors.push(`cuerpo de ${words} palabras (máx ${GAME_CONFIG.LESSON_MAX_WORDS})`);
  if (wordCount(draft.summary) > LESSON_PIPELINE.SUMMARY_MAX_WORDS) errors.push("resumen demasiado largo");

  // Citas: páginas dentro del capítulo.
  const pageNums = [...src.pages.keys()];
  const minPage = Math.min(...pageNums);
  const maxPage = Math.max(...pageNums);
  if (draft.page_start > draft.page_end) errors.push("page_start > page_end");
  if (draft.page_start < minPage || draft.page_end > maxPage) {
    errors.push(`páginas ${draft.page_start}-${draft.page_end} fuera del capítulo (${minPage}-${maxPage})`);
  }
  const citedText = pageNums
    .filter((p) => p >= draft.page_start && p <= draft.page_end)
    .map((p) => src.pages.get(p) ?? "")
    .join("\n");

  // Copia textual: ninguna racha > 10 palabras seguidas del libro.
  for (const [field, text] of [["título", draft.title], ["resumen", draft.summary], ["cuerpo", draft.body]] as const) {
    const run = longestCopiedRun(text, [...src.pages.values()].join("\n"));
    if (run > maxCopy) errors.push(`${field} copia ${run} palabras seguidas del libro (máx ${maxCopy})`);
  }

  // La posición sale del texto: la cita debe existir literalmente en las páginas citadas.
  if (!draft.position.quote.trim()) errors.push("sin cita de la posición");
  else if (!containsQuote(citedText, draft.position.quote)) errors.push("la cita de la posición no aparece en las páginas citadas");
  if (draft.position.source === "moves_from_start" && draft.position.moves_san.length === 0) {
    errors.push("moves_from_start sin jugadas");
  }

  let position: { fen: string; movesUci: string[] } | null = null;
  try {
    position = buildPosition(draft);
  } catch (e) {
    errors.push((e as Error).message);
  }

  for (const t of draft.lichess_themes) if (!isLichessTheme(t)) errors.push(`tema desconocido: ${t}`);
  for (const t of draft.opening_tags) if (!/^[A-Z][A-Za-z0-9_]*$/.test(t)) errors.push(`opening_tag con formato inválido: ${t}`);
  if (draft.type === "apertura" && draft.opening_tags.length === 0) errors.push("lección de apertura sin opening_tags");
  if (draft.elo_min > draft.elo_max || draft.elo_min < GAME_CONFIG.ELO_MIN || draft.elo_max > GAME_CONFIG.ELO_MAX) {
    errors.push(`rango ELO inválido ${draft.elo_min}-${draft.elo_max}`);
  }

  if (errors.length > 0 || !position) return { ok: false, errors };
  return { ok: true, lesson: { draft, fen: position.fen, movesUci: position.movesUci } };
}
