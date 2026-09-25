import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { gutenbergSources, licenseNote, PUBLIC_DOMAIN_BOOKS } from "@/config/public-domain-books";
import { parseAsciiDiagrams } from "@/lib/lessons/ascii-diagram";
import { readGutenbergHeader, verifyGutenbergText } from "@/lib/lessons/gutenberg-verify";
import { detectChapters, extractTextBook, splitByPageMarks, stripGutenberg } from "@/lib/lessons/text-source";
import { validateLesson } from "@/lib/lessons/validate";
import type { LessonDraft } from "@/lib/lessons/schema";

// Extracto LITERAL de "Chess Strategy" (Edward Lasker, 1915), Project Gutenberg #5614, dominio público en EE. UU.
const raw = readFileSync(path.join(__dirname, "../fixtures/gutenberg-5614-excerpt.txt"), "utf8");
const DIAG4 = "4r2k/ppqnr1p1/2nbp2p/8/5P2/1P1N1N2/PB1QR1PP/4R1K1";

describe("texto de Project Gutenberg", () => {
  it("lee y verifica la cabecera", () => {
    expect(readGutenbergHeader(raw)).toMatchObject({ title: "Chess Strategy", author: "Edward Lasker" });
    expect(verifyGutenbergText(raw, { headerTitle: "Chess Strategy", headerAuthor: "Edward Lasker", gutenbergId: 5614 })).toEqual([]);
    expect(verifyGutenbergText(raw, { headerTitle: "Otro", headerAuthor: "Edward Lasker", gutenbergId: 5614 })[0]).toMatch(/título/);
  });
  it("quita la licencia de Gutenberg y deja solo el libro", () => {
    const body = stripGutenberg(raw);
    expect(body).not.toMatch(/START OF THIS PROJECT GUTENBERG/);
    expect(body).not.toMatch(/END OF THIS PROJECT GUTENBERG/);
    expect(body).toMatch(/Diagram 4 may serve as an example/);
  });
  it("usa la paginación original {n} cuando existe", () => {
    const pages = splitByPageMarks("{1} uno {2} dos {3} tres {4} cuatro {5} cinco");
    expect(pages?.get(2)?.trim()).toBe("dos");
    expect(splitByPageMarks("sin marcas")).toBeNull();
  });
  it("detecta capítulos ignorando el índice", () => {
    const filler = (n: number) => Array.from({ length: n }, (_, i) => `línea ${i}`).join("\n");
    const text = ["CONTENTS", "CHAPTER I", "CHAPTER II", "CHAPTER III", filler(5), "CHAPTER I", filler(60), "CHAPTER II", filler(60), "CHAPTER III", filler(60)].join("\n");
    const pages = new Map(text.split("\n").reduce<[number, string][]>((acc, l, i) => {
      const n = Math.floor(i / 20) + 1;
      const last = acc.at(-1);
      if (last && last[0] === n) last[1] += `\n${l}`;
      else acc.push([n, l]);
      return acc;
    }, []));
    const ch = detectChapters(pages, pages.size, 40, 50);
    expect(ch.map((c) => c.title)).toEqual(["CHAPTER I", "CHAPTER II", "CHAPTER III"]);
    expect(ch[0].startPage).toBe(1);
  });
});

describe("diagramas ASCII → FEN (sin modelo)", () => {
  it("convierte el Diagrama 4 real a una posición legal", () => {
    const d = parseAsciiDiagrams(stripGutenberg(raw));
    expect(d).toHaveLength(1);
    expect(d[0]).toMatchObject({ number: 4, placement: DIAG4 });
    expect(() => new Chess(`${DIAG4} b - - 0 1`)).not.toThrow();
  });
  it("ignora dibujos incompletos o con piezas desconocidas", () => {
    expect(parseAsciiDiagrams("     8 | #R |    |\n     7 | ?? |")).toEqual([]);
  });
  it("extractTextBook: cita por sección cuando no hay paginación y trae los diagramas", () => {
    const b = extractTextBook(raw);
    expect(b.citationUnit).toBe("sección");
    expect(b.diagrams[0].number).toBe(4);
  });

  const draft: LessonDraft = {
    type: "estrategia",
    title: "Título propio",
    summary: "Resumen propio.",
    body: "Cuerpo propio.",
    position: { source: "diagram", quote: "It is Black's move, and we will suppose he wishes to play P-K4", start_fen: null, diagram_number: 4, side_to_move: "b", moves_san: ["e5"] },
    topics: ["calculo_tactico"],
    lichess_themes: [],
    opening_tags: [],
    elo_min: 1000,
    elo_max: 1600,
    page_start: 1,
    page_end: 1,
  };

  it("valida una lección que parte del diagrama citado", () => {
    const b = extractTextBook(raw);
    const r = validateLesson(draft, { chapter: "CHAPTER II", pages: b.pages, diagrams: b.diagrams });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.lesson.fen.startsWith("4r2k/ppqnr1p1/2nb3p/4p3/")).toBe(true);
  });
  it("rechaza un diagrama inexistente o sin lado al mover", () => {
    const b = extractTextBook(raw);
    const bad = validateLesson({ ...draft, position: { ...draft.position, diagram_number: 9 } }, { chapter: "x", pages: b.pages, diagrams: b.diagrams });
    expect(bad.ok).toBe(false);
    const noSide = validateLesson({ ...draft, position: { ...draft.position, side_to_move: null } }, { chapter: "x", pages: b.pages, diagrams: b.diagrams });
    expect(noSide.ok).toBe(false);
  });
});

describe("catálogo de dominio público", () => {
  it("cada libro tiene fuentes, espejo verificado y nota de licencia", () => {
    for (const b of PUBLIC_DOMAIN_BOOKS) {
      const src = gutenbergSources(b);
      expect(src[0]).toContain(`/${b.gutenbergId}/`);
      expect(src.some((u) => u.includes("GITenberg"))).toBe(true);
      expect(licenseNote(b)).toMatch(/Dominio público en EE\. UU\./);
      expect(b.year).toBeLessThan(1930);
    }
  });
});

import { citationRange } from "@/components/feed/LessonCard";
describe("cita según la unidad del libro", () => {
  it("páginas reales o secciones del texto digital", () => {
    expect(citationRange("página", 51, 51)).toBe("p. 51");
    expect(citationRange("página", 51, 53)).toBe("pp. 51–53");
    expect(citationRange("sección", 12, 12)).toBe("secc. 12");
    expect(citationRange(undefined, 3, 4)).toBe("pp. 3–4");
  });
});
