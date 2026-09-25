import { LESSON_PIPELINE } from "@/config/lessons";

export interface Chapter {
  title: string;
  /** Páginas 1-indexadas, inclusivas. */
  startPage: number;
  endPage: number;
}

export type CitationUnit = "página" | "sección";

export interface ExtractedBook {
  numPages: number;
  pages: Map<number, string>;
  chapters: Chapter[];
  chapterSource: "outline" | "headings" | "chunks";
  /** Cómo se citan los números de `pages`: página real del libro o sección del texto digital. */
  citationUnit: CitationUnit;
  /** Diagramas ASCII parseados (solo en textos que los traen). */
  diagrams: import("./ascii-diagram").AsciiDiagram[];
}

type PdfDoc = import("pdfjs-dist/legacy/build/pdf.mjs").PDFDocumentProxy;

async function loadPdf(data: Uint8Array) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // pdf.js puede transferir el buffer: pasamos una copia para no invalidar el del llamador.
  const task = pdfjs.getDocument({ data: data.slice(), useSystemFonts: true });
  return { task, doc: await task.promise };
}

async function pageText(doc: PdfDoc, n: number): Promise<string> {
  const page = await doc.getPage(n);
  const content = await page.getTextContent();
  let out = "";
  for (const item of content.items) {
    if (!("str" in item)) continue;
    out += item.str;
    out += item.hasEOL ? "\n" : " ";
  }
  return out.replace(/[ \t]+/g, " ").trim();
}

async function outlineChapters(doc: PdfDoc, numPages: number): Promise<Chapter[]> {
  const outline = await doc.getOutline();
  if (!outline?.length) return [];
  const starts: { title: string; page: number }[] = [];
  for (const item of outline) {
    try {
      const dest = typeof item.dest === "string" ? await doc.getDestination(item.dest) : item.dest;
      if (!dest?.[0]) continue;
      const ref = dest[0];
      const idx = typeof ref === "number" ? ref : await doc.getPageIndex(ref);
      starts.push({ title: item.title.trim(), page: idx + 1 });
    } catch {
      // Entrada del índice sin destino resoluble: se ignora.
    }
  }
  return toRanges(starts, numPages);
}

export function toRanges(starts: { title: string; page: number }[], numPages: number): Chapter[] {
  const sorted = [...starts].sort((a, b) => a.page - b.page).filter((s, i, arr) => i === 0 || s.page !== arr[i - 1].page);
  return sorted.map((s, i) => ({
    title: s.title,
    startPage: s.page,
    endPage: i + 1 < sorted.length ? sorted[i + 1].page - 1 : numPages,
  }));
}

export function headingChapters(pages: Map<number, string>, numPages: number): Chapter[] {
  const starts: { title: string; page: number }[] = [];
  for (const [n, text] of pages) {
    const m = LESSON_PIPELINE.CHAPTER_HEADING_RE.exec(text.slice(0, 300));
    if (m) starts.push({ title: m[0].trim(), page: n });
  }
  return toRanges(starts, numPages);
}

export function chunkChapters(numPages: number, size: number = LESSON_PIPELINE.FALLBACK_PAGES_PER_CHUNK, label = "Páginas"): Chapter[] {
  const out: Chapter[] = [];
  for (let p = 1; p <= numPages; p += size) {
    out.push({ title: `${label} ${p}-${Math.min(p + size - 1, numPages)}`, startPage: p, endPage: Math.min(p + size - 1, numPages) });
  }
  return out;
}

export async function extractBook(data: Uint8Array): Promise<ExtractedBook> {
  const { task, doc } = await loadPdf(data);
  const numPages = doc.numPages;
  const pages = new Map<number, string>();
  for (let n = 1; n <= numPages; n++) pages.set(n, await pageText(doc, n));

  let chapters = await outlineChapters(doc, numPages);
  let chapterSource: ExtractedBook["chapterSource"] = "outline";
  if (chapters.length === 0) {
    chapters = headingChapters(pages, numPages);
    chapterSource = "headings";
  }
  if (chapters.length === 0) {
    chapters = chunkChapters(numPages);
    chapterSource = "chunks";
  }
  await task.destroy();
  return { numPages, pages, chapters, chapterSource, citationUnit: "página", diagrams: [] };
}

export function chapterPages(book: ExtractedBook, ch: Chapter): Map<number, string> {
  const m = new Map<number, string>();
  for (let p = ch.startPage; p <= ch.endPage; p++) m.set(p, book.pages.get(p) ?? "");
  return m;
}
