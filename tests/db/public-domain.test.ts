import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client } from "pg";
import type { GenerationInput, LessonGenerator } from "@/lib/lessons/generator";
import { runPipeline } from "@/lib/lessons/pipeline";
import type { LessonDraft } from "@/lib/lessons/schema";
import { asUser, connect, resetDatabase } from "./helpers";

// Extracto literal de "Chess Strategy" (Gutenberg #5614, dominio público en EE. UU.).
const text = readFileSync(path.join(__dirname, "../fixtures/gutenberg-5614-excerpt.txt"), "utf8");

const draft: LessonDraft = {
  type: "estrategia",
  title: "Lección del diagrama",
  summary: "Resumen propio.",
  body: "Cuerpo propio.",
  position: { source: "diagram", quote: "It is Black's move", start_fen: null, diagram_number: 4, side_to_move: "b", moves_san: [] },
  topics: ["calculo_tactico"],
  lichess_themes: [],
  opening_tags: [],
  elo_min: 1000,
  elo_max: 1800,
  page_start: 1,
  page_end: 1,
};

class OneLesson implements LessonGenerator {
  async generate(input: GenerationInput) {
    void input;
    return { lessons: [draft], model: "fake", stopReason: "end_turn", usage: { input: 0, output: 0 } };
  }
}

let db: Client;
beforeAll(async () => {
  db = await connect();
  await resetDatabase(db);
});
afterAll(async () => db?.end());

describe("libros de dominio público", () => {
  it("el pipeline acepta texto de Gutenberg, cita por sección y toma el FEN del diagrama", async () => {
    const stats = await runPipeline({
      source: { kind: "text", text },
      meta: { title: "Chess Strategy", author: "Edward Lasker", year: 1915, license_note: "Dominio público en EE. UU.", source_format: "gutenberg_txt", source_url: "https://www.gutenberg.org/ebooks/5614", public_domain: true, gutenberg_id: 5614 },
      generator: new OneLesson(),
      db,
      log: () => {},
    });
    expect(stats.inserted).toBe(1);
    const { rows } = await db.query("select l.fen, b.citation_unit, b.public_domain, b.source_format from public.lessons l join public.books b on b.id = l.book_id");
    expect(rows[0]).toEqual({ fen: "4r2k/ppqnr1p1/2nbp2p/8/5P2/1P1N1N2/PB1QR1PP/4R1K1 b - - 0 1", citation_unit: "sección", public_domain: true, source_format: "gutenberg_txt" });
  });

  it("book_catalog lista libros públicos y cuenta solo lecciones aprobadas", async () => {
    const before = await asUser(db, null, async () => (await db.query("select title, approved_lessons::int from public.book_catalog()")).rows);
    expect(before).toEqual([{ title: "Chess Strategy", approved_lessons: 0 }]);
    await db.query("update public.lessons set reviewed = true");
    const after = await asUser(db, null, async () => (await db.query("select approved_lessons::int from public.book_catalog()")).rows);
    expect(after).toEqual([{ approved_lessons: 1 }]);
  });
});
