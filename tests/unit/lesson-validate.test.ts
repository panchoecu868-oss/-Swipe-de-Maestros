import { describe, expect, it } from "vitest";
import { validateLesson, buildPosition, type ChapterSource } from "@/lib/lessons/validate";
import { longestCopiedRun, containsQuote } from "@/lib/lessons/text";
import type { LessonDraft } from "@/lib/lessons/schema";

// Texto de fuente SINTÉTICO (no es contenido de un libro): sirve solo para ejercitar los validadores.
const src: ChapterSource = {
  chapter: "Capítulo de prueba",
  pages: new Map([
    [10, "alfa beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron. The game went 1 e4 e5 2 Nf3 Nc6 and so on."],
    [11, "White: Ke1, Ra1. Black: Ke8. Otra página de prueba."],
  ]),
};

const base: LessonDraft = {
  type: "apertura",
  title: "Título propio",
  summary: "Resumen en palabras propias.",
  body: "Cuerpo breve escrito en palabras propias para la prueba.",
  position: { source: "moves_from_start", quote: "1 e4 e5 2 Nf3 Nc6", start_fen: null, diagram_number: null, side_to_move: null, moves_san: ["e4", "e5", "Nf3", "Nc6"] },
  topics: ["aperturas"],
  lichess_themes: ["opening"],
  opening_tags: ["Test_Opening"],
  elo_min: 1000,
  elo_max: 1600,
  page_start: 10,
  page_end: 10,
};

describe("texto", () => {
  it("mide la racha copiada ignorando tildes y puntuación", () => {
    expect(longestCopiedRun("x Alfa, béta gamma y", src.pages.get(10)!)).toBe(3);
  });
  it("encuentra citas normalizadas", () => {
    expect(containsQuote(src.pages.get(10)!, "1. e4 e5, 2. Nf3 Nc6")).toBe(true);
    expect(containsQuote(src.pages.get(10)!, "1 d4 d5")).toBe(false);
  });
});

describe("validateLesson", () => {
  it("acepta una lección válida y reconstruye el FEN jugando las jugadas", () => {
    const r = validateLesson(base, src);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.lesson.fen).toBe("r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3");
      expect(r.lesson.movesUci).toEqual(["e2e4", "e7e5", "g1f3", "b8c6"]);
    }
  });

  it("rechaza copiar más de 10 palabras seguidas", () => {
    const r = validateLesson({ ...base, body: "alfa beta gamma delta epsilon zeta eta theta iota kappa lambda" }, src);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toMatch(/copia 11 palabras/);
  });

  it("acepta exactamente 10 palabras copiadas", () => {
    const r = validateLesson({ ...base, body: "alfa beta gamma delta epsilon zeta eta theta iota kappa" }, src);
    expect(r.ok).toBe(true);
  });

  it("rechaza jugadas ilegales", () => {
    const r = validateLesson({ ...base, position: { ...base.position, moves_san: ["e4", "e4"] } }, src);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toMatch(/ilegal/);
  });

  it("rechaza posiciones cuya cita no está en el libro (inventadas)", () => {
    const r = validateLesson({ ...base, position: { ...base.position, quote: "1 d4 Nf6 2 c4" } }, src);
    expect(r.ok).toBe(false);
  });

  it("rechaza páginas fuera del capítulo y más de 150 palabras", () => {
    const long = Array.from({ length: 151 }, (_, i) => `w${i}`).join(" ");
    const r = validateLesson({ ...base, body: long, page_end: 30 }, src);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.join()).toMatch(/151 palabras/);
      expect(r.errors.join()).toMatch(/fuera del capítulo/);
    }
  });

  it("acepta piece_list con FEN legal y cita", () => {
    const r = validateLesson(
      {
        ...base,
        type: "final",
        opening_tags: [],
        topics: ["finales_torres"],
        lichess_themes: ["rookEndgame"],
        position: { source: "piece_list", quote: "White: Ke1, Ra1. Black: Ke8.", start_fen: "4k3/8/8/8/8/8/8/R3K3 w - - 0 1", diagram_number: null, side_to_move: null, moves_san: [] },
        page_start: 11,
        page_end: 11,
      },
      src,
    );
    expect(r.ok).toBe(true);
  });

  it("buildPosition rechaza FEN inválido", () => {
    expect(() =>
      buildPosition({ position: { source: "piece_list", quote: "q", start_fen: "no-es-fen", diagram_number: null, side_to_move: null, moves_san: [] } }),
    ).toThrow(/FEN inválido/);
  });
});
