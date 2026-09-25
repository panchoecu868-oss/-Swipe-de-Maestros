/**
 * Libros en texto plano de Project Gutenberg (dominio público en EE. UU.).
 * - Se descarta la cabecera y el pie de licencia de Project Gutenberg (entre "*** START OF" y "*** END OF").
 * - Unidad de cita: si el texto conserva la paginación original como "{n}", se cita por PÁGINA real;
 *   si no, por SECCIÓN (bloques de líneas numerados por nosotros) y así se indica en la cita.
 * - Capítulos por encabezados (CHAPTER/PART/SECTION o numerales romanos solos), ignorando el índice.
 */
import { LESSON_PIPELINE } from "@/config/lessons";
import { parseAsciiDiagrams } from "./ascii-diagram";
import { chunkChapters, toRanges, type Chapter, type ExtractedBook } from "./pdf";

export function stripGutenberg(raw: string): string {
  const text = raw.replace(/\r/g, "");
  const start = /^\*\*\* ?START OF (THIS|THE) PROJECT GUTENBERG EBOOK.*$/im.exec(text);
  const end = /^\*\*\* ?END OF (THIS|THE) PROJECT GUTENBERG EBOOK.*$/im.exec(text);
  const from = start ? start.index + start[0].length : 0;
  const to = end ? end.index : text.length;
  return text.slice(from, to).trim();
}

/** Corta el texto en la ÚLTIMA línea que cumple `re` (p. ej. la parte de damas de un libro mixto). */
export function cutAtLastLine(text: string, re: RegExp): string {
  const lines = text.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) if (re.test(lines[i])) return lines.slice(0, i).join("\n");
  return text;
}

const PAGE_MARK = /\{(\d+)\}/g;

/** Páginas originales marcadas como {n} (el marcador inicia la página n). */
export function splitByPageMarks(text: string): Map<number, string> | null {
  const marks = [...text.matchAll(PAGE_MARK)];
  if (marks.length < 5) return null;
  const pages = new Map<number, string>();
  for (let i = 0; i < marks.length; i++) {
    const n = Number(marks[i][1]);
    const from = marks[i].index! + marks[i][0].length;
    const to = i + 1 < marks.length ? marks[i + 1].index! : text.length;
    pages.set(n, (pages.get(n) ?? "") + text.slice(from, to));
  }
  return pages;
}

export function splitBySections(text: string, linesPerSection: number = LESSON_PIPELINE.TXT_SECTION_LINES): Map<number, string> {
  const lines = text.split("\n");
  const pages = new Map<number, string>();
  for (let i = 0, n = 1; i < lines.length; i += linesPerSection, n++) pages.set(n, lines.slice(i, i + linesPerSection).join("\n"));
  return pages;
}

const HEADING_RE = /^\s*((CHAPTER|PART|SECTION|BOOK)\s+([IVXLC\d]+|ONE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN)\b.*|[IVXL]{1,6}\.?)\s*$/;

const NAMED_HEADING_RE = /^\s*(CHAPTER|PART|SECTION|BOOK)\b/;

/**
 * Encabezados → capítulos. Reglas (probadas con los textos reales de Gutenberg #33870, #5614, #4913, #55278):
 *  1. Un título repetido conserva solo su ÚLTIMA aparición (la primera suele ser el índice).
 *  2. Encabezados separados por muy pocas líneas son entradas de índice y se descartan.
 *  3. Si hay ≥3 encabezados con nombre (CHAPTER/PART…), los numerales romanos sueltos son subtítulos y se ignoran.
 *  4. Capítulos más largos que el máximo se parten en tramos, y el texto no cubierto se reparte en bloques.
 */
export function detectChapters(
  pages: Map<number, string>,
  numPages: number,
  minGapLines: number = LESSON_PIPELINE.TXT_MIN_CHAPTER_LINES,
  maxPages: number = LESSON_PIPELINE.TXT_MAX_CHAPTER_UNITS,
): Chapter[] {
  let found: { title: string; page: number; lineNo: number }[] = [];
  let lineNo = 0;
  for (const [page, text] of [...pages.entries()].sort((a, b) => a[0] - b[0])) {
    for (const line of text.split("\n")) {
      if (HEADING_RE.test(line)) found.push({ title: line.trim().replace(/\s+/g, " "), page, lineNo });
      lineNo++;
    }
  }
  const named = found.filter((h) => NAMED_HEADING_RE.test(h.title));
  if (new Set(named.map((h) => h.title)).size >= 3) found = named;
  const lastIndexOf = new Map(found.map((h, i) => [h.title, i]));
  found = found.filter((h, i) => lastIndexOf.get(h.title) === i);
  found = found.filter((h, i) => i + 1 >= found.length || found[i + 1].lineNo - h.lineNo >= minGapLines);

  const first = Math.min(...pages.keys());
  const ranges = toRanges(found.map(({ title, page }) => ({ title, page })), numPages);
  const out: Chapter[] = [];
  // Texto previo al primer capítulo (si es largo) → bloques.
  if (ranges.length > 0 && ranges[0].startPage - first > maxPages / 2) {
    for (const c of chunkChapters(ranges[0].startPage - 1, maxPages, "Tramo")) if (c.endPage >= first) out.push({ ...c, startPage: Math.max(c.startPage, first) });
  }
  for (const r of ranges) {
    const len = r.endPage - r.startPage + 1;
    if (len <= maxPages) out.push(r);
    else {
      // Tramos parejos: nunca queda un resto de 1 página.
      const parts = Math.ceil(len / maxPages);
      const size = Math.ceil(len / parts);
      for (let k = 0; k < parts; k++) {
        const s = r.startPage + k * size;
        out.push({ title: `${r.title} (${k + 1}/${parts})`, startPage: s, endPage: Math.min(r.endPage, s + size - 1) });
      }
    }
  }
  return out;
}

export interface TextBookOptions {
  cutAtLastLine?: RegExp;
}

export function extractTextBook(raw: string, opts: TextBookOptions = {}): ExtractedBook {
  let body = stripGutenberg(raw);
  if (opts.cutAtLastLine) body = cutAtLastLine(body, opts.cutAtLastLine);
  const byMarks = splitByPageMarks(body);
  const pages = byMarks ?? splitBySections(body);
  const numbers = [...pages.keys()];
  const numPages = Math.max(...numbers);
  let chapters = detectChapters(pages, numPages).filter((c) => !opts.cutAtLastLine?.test(c.title));
  let chapterSource: ExtractedBook["chapterSource"] = "headings";
  if (chapters.length === 0) {
    chapters = chunkChapters(numPages, LESSON_PIPELINE.TXT_MAX_CHAPTER_UNITS, byMarks ? "Páginas" : "Secciones");
    chapterSource = "chunks";
  }
  // Los capítulos no pueden empezar antes de la primera página existente.
  const first = Math.min(...numbers);
  chapters = chapters.map((c) => ({ ...c, startPage: Math.max(c.startPage, first) }));
  return { numPages, pages, chapters, chapterSource, citationUnit: byMarks ? "página" : "sección", diagrams: parseAsciiDiagrams(body) };
}
