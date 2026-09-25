"use client";
import { useActionState, useState } from "react";
import { Chess } from "chess.js";
import { Board } from "@/components/chess/Board";
import { approveLesson, rejectLesson } from "./actions";

export interface ReviewLesson {
  id: string;
  type: string;
  title: string;
  summary: string;
  body: string;
  fen: string;
  lichess_themes: string[];
  topics: string[];
  opening_tags: string[];
  elo_min: number;
  elo_max: number;
  chapter: string;
  page_start: number;
  page_end: number;
  reviewed: boolean;
  rejected: boolean;
  reviewer_notes: string | null;
  books: { title: string; author: string; year: number | null } | null;
  lesson_sources: { position_source: string; position_quote: string; moves_san: string[]; source_pages_text: string; model: string } | null;
}

function fenIsValid(fen: string) {
  try {
    new Chess(fen);
    return true;
  } catch {
    return false;
  }
}

export function ReviewForm({ lesson }: { lesson: ReviewLesson }) {
  const [fen, setFen] = useState(lesson.fen);
  const [body, setBody] = useState(lesson.body);
  const [approveState, approve, approving] = useActionState(approveLesson, null);
  const [rejectState, reject, rejecting] = useActionState(rejectLesson, null);
  const words = body.trim() ? body.trim().split(/\s+/).length : 0;
  const src = lesson.lesson_sources;
  const state = approveState ?? rejectState;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section aria-label="Posición y fuente" className="flex flex-col gap-4">
        <Board fen={fenIsValid(fen) ? fen : lesson.fen} id={`review-${lesson.id}`} />
        <div className="rounded-xl border border-border bg-surface p-3 text-sm">
          <p className="font-semibold">
            {lesson.books?.title} — {lesson.books?.author}
            {lesson.books?.year ? ` (${lesson.books.year})` : ""}
          </p>
          <p>
            {lesson.chapter} · pág. {lesson.page_start}
            {lesson.page_end !== lesson.page_start ? `–${lesson.page_end}` : ""}
          </p>
          {src && (
            <>
              <p className="mt-2 text-muted">Posición ({src.position_source}), cita literal:</p>
              <blockquote className="border-l-4 border-accent pl-2 italic">{src.position_quote}</blockquote>
              <p className="mt-1 font-mono text-xs">{src.moves_san.join(" ")}</p>
              <details className="mt-2">
                <summary className="cursor-pointer">Texto de las páginas citadas</summary>
                <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap text-xs">{src.source_pages_text}</pre>
              </details>
              <p className="mt-2 text-xs text-muted">Generada por {src.model}</p>
            </>
          )}
        </div>
      </section>

      <form className="flex flex-col gap-3" action={approve}>
        <input type="hidden" name="id" value={lesson.id} />
        <p className="text-sm text-muted">Tipo: {lesson.type}</p>
        <label className="flex flex-col gap-1 text-sm">Título<input name="title" defaultValue={lesson.title} className="input" required /></label>
        <label className="flex flex-col gap-1 text-sm">Resumen<textarea name="summary" defaultValue={lesson.summary} className="input" rows={2} required /></label>
        <label className="flex flex-col gap-1 text-sm">
          Lección <span className={words > 150 ? "text-danger" : "text-muted"}>({words}/150 palabras)</span>
          <textarea name="body" value={body} onChange={(e) => setBody(e.target.value)} className="input" rows={8} required />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          FEN {!fenIsValid(fen) && <span className="text-danger">inválido</span>}
          <input name="fen" value={fen} onChange={(e) => setFen(e.target.value)} className="input font-mono text-xs" required />
        </label>
        <label className="flex flex-col gap-1 text-sm">Temas (autoevaluación)<input name="topics" defaultValue={lesson.topics.join(", ")} className="input" /></label>
        <label className="flex flex-col gap-1 text-sm">Temas Lichess<input name="lichess_themes" defaultValue={lesson.lichess_themes.join(", ")} className="input" /></label>
        <label className="flex flex-col gap-1 text-sm">Opening tags<input name="opening_tags" defaultValue={lesson.opening_tags.join(", ")} className="input" /></label>
        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1 text-sm">ELO mín<input type="number" name="elo_min" defaultValue={lesson.elo_min} className="input" /></label>
          <label className="flex flex-1 flex-col gap-1 text-sm">ELO máx<input type="number" name="elo_max" defaultValue={lesson.elo_max} className="input" /></label>
        </div>
        <label className="flex flex-col gap-1 text-sm">Notas<textarea name="notes" defaultValue={lesson.reviewer_notes ?? ""} className="input" rows={2} /></label>
        <div className="flex gap-3">
          <button type="submit" disabled={approving} className="btn-primary flex-1">Aprobar (con ediciones)</button>
          <button type="submit" formAction={reject} disabled={rejecting} className="btn-secondary flex-1 text-danger">Rechazar</button>
        </div>
        <p aria-live="polite" className={`text-sm ${state?.error ? "text-danger" : "text-accent"}`}>{state?.error ?? state?.ok}</p>
      </form>
    </div>
  );
}
