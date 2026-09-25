import type { Client } from "pg";
import { LESSON_PIPELINE } from "@/config/lessons";
import type { LessonGenerator } from "./generator";
import { chapterPages, extractBook, type Chapter } from "./pdf";
import { insertLesson, sha256, upsertBook, type BookMeta } from "./store";
import { validateLesson } from "./validate";

export interface PipelineLogEntry {
  at: string;
  chapter: string;
  kind: "rejected" | "error" | "inserted" | "duplicate";
  title?: string;
  errors?: string[];
  lessonId?: string;
}

export interface PipelineOptions {
  pdf: Uint8Array;
  meta: BookMeta;
  generator: LessonGenerator;
  db: Client | null; // null = dry run
  maxLessons?: number;
  chapterIndexes?: number[]; // 1-indexados
  log: (e: PipelineLogEntry) => void;
}

export interface PipelineStats {
  chapters: number;
  chapterSource: string;
  generated: number;
  inserted: number;
  rejected: number;
  duplicates: number;
  errors: number;
}

export async function runPipeline(o: PipelineOptions): Promise<PipelineStats> {
  const book = await extractBook(o.pdf);
  const bookHash = sha256(o.pdf);
  const bookId = o.db ? await upsertBook(o.db, o.meta, bookHash) : "dry-run";
  const stats: PipelineStats = { chapters: 0, chapterSource: book.chapterSource, generated: 0, inserted: 0, rejected: 0, duplicates: 0, errors: 0 };
  const max = o.maxLessons ?? Infinity;

  const selected: Chapter[] = book.chapters.filter((_, i) => !o.chapterIndexes || o.chapterIndexes.includes(i + 1));
  for (const ch of selected) {
    if (stats.inserted >= max) break;
    stats.chapters++;
    const pages = chapterPages(book, ch);
    const now = () => new Date().toISOString();
    let out;
    try {
      out = await o.generator.generate({
        bookTitle: o.meta.title,
        bookAuthor: o.meta.author,
        chapter: ch.title,
        pages,
        maxLessons: Math.min(LESSON_PIPELINE.LESSONS_PER_CHAPTER, max - stats.inserted),
      });
    } catch (e) {
      stats.errors++;
      o.log({ at: now(), chapter: ch.title, kind: "error", errors: [(e as Error).message] });
      continue;
    }
    for (const draft of out.lessons) {
      if (stats.inserted >= max) break;
      stats.generated++;
      const v = validateLesson(draft, { chapter: ch.title, pages });
      if (!v.ok) {
        stats.rejected++;
        o.log({ at: now(), chapter: ch.title, kind: "rejected", title: draft.title, errors: v.errors });
        continue;
      }
      if (!o.db) {
        stats.inserted++;
        o.log({ at: now(), chapter: ch.title, kind: "inserted", title: draft.title });
        continue;
      }
      const cited = [...pages.entries()].filter(([p]) => p >= draft.page_start && p <= draft.page_end).map(([p, t]) => `[[PÁGINA ${p}]]\n${t}`).join("\n\n");
      const id = await insertLesson(o.db, {
        bookId,
        bookHash,
        chapter: ch.title,
        lesson: v.lesson,
        sourcePagesText: cited,
        model: out.model,
        generation: { stopReason: out.stopReason, usage: out.usage },
      });
      if (id) {
        stats.inserted++;
        o.log({ at: now(), chapter: ch.title, kind: "inserted", title: draft.title, lessonId: id });
      } else {
        stats.duplicates++;
        o.log({ at: now(), chapter: ch.title, kind: "duplicate", title: draft.title });
      }
    }
  }
  return stats;
}
