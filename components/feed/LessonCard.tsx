import { Board } from "@/components/chess/Board";

export interface CardLesson {
  id: string;
  type: "apertura" | "estrategia" | "final";
  title: string;
  summary: string;
  body: string;
  fen: string;
  lichess_themes: string[];
  topics: string[];
  elo_min: number;
  elo_max: number;
  chapter: string;
  page_start: number;
  page_end: number;
  books: { title: string; author: string; year: number | null } | null;
}

const TYPE_LABEL = { apertura: "Apertura", estrategia: "Estrategia", final: "Final" } as const;

export function Citation({ lesson }: { lesson: CardLesson }) {
  const pages = lesson.page_start === lesson.page_end ? `p. ${lesson.page_start}` : `pp. ${lesson.page_start}–${lesson.page_end}`;
  return (
    <p className="text-xs text-muted">
      Fuente: {lesson.books?.author}, <cite>{lesson.books?.title}</cite>
      {lesson.books?.year ? ` (${lesson.books.year})` : ""}, {lesson.chapter}, {pages}
    </p>
  );
}

export function LessonCard({ lesson, forced }: { lesson: CardLesson; forced?: boolean }) {
  return (
    <article aria-label={lesson.title} className="flex h-full flex-col gap-3 rounded-3xl border border-border bg-surface p-4 shadow-lg">
      <header className="flex items-center justify-between gap-2 text-xs">
        <span className="rounded-full bg-accent px-2 py-1 font-semibold text-accent-contrast">{TYPE_LABEL[lesson.type]}</span>
        {forced && <span className="rounded-full border border-danger px-2 py-1 text-danger">Vuelta forzada</span>}
        <span className="text-muted">ELO {lesson.elo_min}–{lesson.elo_max}</span>
      </header>
      <h2 className="text-xl font-bold leading-tight">{lesson.title}</h2>
      <div className="pointer-events-none mx-auto w-full max-w-[300px]">
        <Board fen={lesson.fen} id={`card-${lesson.id}`} label={`Posición de ejemplo de ${lesson.title}`} />
      </div>
      <p className="text-sm">{lesson.summary}</p>
      <div className="mt-auto">
        <Citation lesson={lesson} />
      </div>
    </article>
  );
}
