import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client } from "pg";
import type { GenerationInput, LessonGenerator } from "@/lib/lessons/generator";
import { runPipeline, type PipelineLogEntry } from "@/lib/lessons/pipeline";
import { extractBook } from "@/lib/lessons/pdf";
import type { LessonDraft } from "@/lib/lessons/schema";
import { makePdf } from "../helpers/make-pdf";
import { asUser, connect, createUser, resetDatabase } from "./helpers";

// PDF 100% sintético: texto de relleno + una línea de jugadas estándar para ejercitar la reconstrucción.
const pdf = makePdf([
  ["CHAPTER I", "alfa beta gamma delta epsilon zeta eta theta iota kappa lambda mu", "Line: 1 e4 e5 2 Nf3 Nc6"],
  ["relleno de la segunda pagina del capitulo uno"],
  ["CHAPTER II", "White: Ke1, Ra1. Black: Ke8."],
]);

const valid = (page: number): LessonDraft => ({
  type: "apertura",
  title: "Lección sintética válida",
  summary: "Resumen propio.",
  body: "Cuerpo propio de prueba.",
  position: { source: "moves_from_start", quote: "1 e4 e5 2 Nf3 Nc6", start_fen: null, diagram_number: null, side_to_move: null, moves_san: ["e4", "e5", "Nf3", "Nc6"] },
  topics: ["aperturas"],
  lichess_themes: ["opening"],
  opening_tags: ["Test_Opening"],
  elo_min: 1000,
  elo_max: 1500,
  page_start: page,
  page_end: page,
});

class FakeGenerator implements LessonGenerator {
  calls: GenerationInput[] = [];
  async generate(input: GenerationInput) {
    this.calls.push(input);
    const first = [...input.pages.keys()][0];
    const lessons: LessonDraft[] =
      first === 1
        ? [
            valid(1),
            { ...valid(1), title: "Copia", body: "alfa beta gamma delta epsilon zeta eta theta iota kappa lambda" },
            { ...valid(1), title: "Inventada", position: { ...valid(1).position, quote: "1 d4 d5", moves_san: ["d4", "d5"] } },
          ]
        : [];
    return { lessons, model: "fake", stopReason: "end_turn", usage: { input: 0, output: 0 } };
  }
}

let db: Client;
const USER = "00000000-0000-4000-8000-0000000000c1";

beforeAll(async () => {
  db = await connect();
  await resetDatabase(db);
  await createUser(db, USER);
});
afterAll(async () => db?.end());

describe("pipeline de libros", () => {
  it("extrae páginas y detecta capítulos por encabezado", async () => {
    const book = await extractBook(pdf);
    expect(book.numPages).toBe(3);
    expect(book.pages.get(1)).toContain("1 e4 e5 2 Nf3 Nc6");
    expect(book.chapterSource).toBe("headings");
    expect(book.chapters.map((c) => [c.startPage, c.endPage])).toEqual([[1, 2], [3, 3]]);
  });

  it("inserta solo las válidas con reviewed=false, loguea rechazos y deduplica", async () => {
    const logs: PipelineLogEntry[] = [];
    const gen = new FakeGenerator();
    const meta = { title: "Libro sintético", author: "Test", license_note: "fixture" };
    const stats = await runPipeline({ source: { kind: "pdf", bytes: pdf }, meta, generator: gen, db, log: (e) => logs.push(e) });
    expect(stats).toMatchObject({ chapters: 2, generated: 3, inserted: 1, rejected: 2 });
    expect(logs.filter((l) => l.kind === "rejected").map((l) => l.title)).toEqual(["Copia", "Inventada"]);

    const { rows } = await db.query("select reviewed, fen, chapter from public.lessons");
    expect(rows).toEqual([
      { reviewed: false, fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3", chapter: "CHAPTER I" },
    ]);
    const src = await db.query("select position_quote, moves_uci from public.lesson_sources");
    expect(src.rows[0].moves_uci).toEqual(["e2e4", "e7e5", "g1f3", "b8c6"]);

    const again = await runPipeline({ source: { kind: "pdf", bytes: pdf }, meta, generator: new FakeGenerator(), db, log: () => {} });
    expect(again.duplicates).toBe(1);
    expect((await db.query("select count(*)::int n from public.lessons")).rows[0].n).toBe(1);
  });

  it("respeta --max y el filtro de capítulos", async () => {
    const gen = new FakeGenerator();
    await runPipeline({ source: { kind: "pdf", bytes: pdf }, meta: { title: "x", author: "y", license_note: "z" }, generator: gen, db: null, chapterIndexes: [2], log: () => {} });
    expect(gen.calls.map((c) => c.chapter)).toEqual(["CHAPTER II"]);
  });

  it("el texto fuente del libro no es legible por usuarios ni anónimos", async () => {
    const asAuth = await asUser(db, USER, async () => (await db.query("select * from public.lesson_sources")).rows);
    const asAnon = await asUser(db, null, async () => (await db.query("select * from public.lesson_sources")).rows);
    expect(asAuth).toEqual([]);
    expect(asAnon).toEqual([]);
  });
});
