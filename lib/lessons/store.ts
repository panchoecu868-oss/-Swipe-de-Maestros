import { createHash } from "node:crypto";
import type { Client } from "pg";
import type { ValidatedLesson } from "./validate";

export interface BookMeta {
  title: string;
  author: string;
  year?: number | null;
  license_note: string;
}

export const sha256 = (data: Uint8Array | string) => createHash("sha256").update(data).digest("hex");

export async function upsertBook(db: Client, meta: BookMeta, fileHash: string): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `insert into public.books (title, author, year, license_note, file_hash) values ($1, $2, $3, $4, $5)
     on conflict (file_hash) do update set title = excluded.title, author = excluded.author,
       year = excluded.year, license_note = excluded.license_note
     returning id`,
    [meta.title, meta.author, meta.year ?? null, meta.license_note, fileHash],
  );
  return rows[0].id;
}

export interface InsertLessonInput {
  bookId: string;
  bookHash: string;
  chapter: string;
  lesson: ValidatedLesson;
  sourcePagesText: string;
  model: string;
  generation: Record<string, unknown>;
}

/** Inserta con reviewed=false. Devuelve null si ya existía (misma clave de deduplicación). */
export async function insertLesson(db: Client, i: InsertLessonInput): Promise<string | null> {
  const d = i.lesson.draft;
  const dedupeKey = sha256(`${i.bookHash}|${i.chapter}|${d.title.trim().toLowerCase()}`);
  await db.query("begin");
  try {
    const { rows } = await db.query<{ id: string }>(
      `insert into public.lessons (type, title, summary, body, fen, lichess_themes, opening_tags, topics, elo_min, elo_max,
         book_id, chapter, page_start, page_end, reviewed, dedupe_key)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,false,$15)
       on conflict (dedupe_key) do nothing returning id`,
      [d.type, d.title, d.summary, d.body, i.lesson.fen, d.lichess_themes, d.opening_tags, d.topics, d.elo_min, d.elo_max,
        i.bookId, i.chapter, d.page_start, d.page_end, dedupeKey],
    );
    if (rows.length === 0) {
      await db.query("rollback");
      return null;
    }
    await db.query(
      `insert into public.lesson_sources (lesson_id, model, position_source, position_quote, moves_san, moves_uci, start_fen, source_pages_text, generation)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [rows[0].id, i.model, d.position.source, d.position.quote, d.position.moves_san, i.lesson.movesUci,
        d.position.start_fen, i.sourcePagesText, i.generation],
    );
    await db.query("commit");
    return rows[0].id;
  } catch (e) {
    await db.query("rollback");
    throw e;
  }
}
