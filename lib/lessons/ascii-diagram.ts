/**
 * Parser determinista de diagramas ASCII de Project Gutenberg (formato de "Chess Strategy", #5614):
 *    8 | #R |    | ... |      ^X = pieza blanca, #X = pieza negra, Kt = caballo
 *   ...
 *    1 |    | ^K | ... |
 *        A    B    C ...
 *   Diag. 4.
 * Devuelve la colocación de piezas (primer campo del FEN). El lado que mueve NO está en el dibujo:
 * lo aporta la lección citando el texto, y chess.js valida la posición completa.
 */
export interface AsciiDiagram {
  number: number | null;
  placement: string;
  /** Línea (0-indexada) de la fila 8 en el texto analizado. */
  line: number;
}

const ROW_RE = /^\s*([1-8])\s*\|(.*)\|\s*$/;
const CAPTION_RE = /Diag(?:ram)?\.?\s*(\d+)/i;
const PIECE: Record<string, string> = { K: "k", Q: "q", R: "r", B: "b", Kt: "n", N: "n", P: "p" };

function parseCell(cell: string): string | null | undefined {
  const t = cell.trim();
  if (!t) return null; // casilla vacía
  const m = /^([#^])(Kt|[KQRBNP])$/.exec(t);
  if (!m) return undefined; // celda no reconocida → diagrama inválido
  const p = PIECE[m[2]];
  return m[1] === "^" ? p.toUpperCase() : p;
}

function rowToFen(cells: (string | null)[]): string {
  let out = "";
  let empty = 0;
  for (const c of cells) {
    if (c === null) empty++;
    else {
      if (empty) out += empty;
      empty = 0;
      out += c;
    }
  }
  return out + (empty ? String(empty) : "");
}

export function parseAsciiDiagrams(text: string): AsciiDiagram[] {
  const lines = text.replace(/\r/g, "").split("\n");
  const out: AsciiDiagram[] = [];
  for (let i = 0; i < lines.length; i++) {
    const first = ROW_RE.exec(lines[i]);
    if (!first || first[1] !== "8") continue;
    const ranks: string[] = [];
    let expected = 8;
    let j = i;
    let ok = true;
    for (; j < lines.length && expected >= 1; j++) {
      const m = ROW_RE.exec(lines[j]);
      if (!m) {
        if (/^\s*\|?-+\|?\s*$/.test(lines[j])) continue; // separador
        ok = false;
        break;
      }
      if (Number(m[1]) !== expected) {
        ok = false;
        break;
      }
      const cells = m[2].split("|").map(parseCell);
      if (cells.length !== 8 || cells.some((c) => c === undefined)) {
        ok = false;
        break;
      }
      ranks.push(rowToFen(cells as (string | null)[]));
      expected--;
    }
    if (!ok || ranks.length !== 8) continue;
    let number: number | null = null;
    for (let k = j; k < Math.min(lines.length, j + 6); k++) {
      const c = CAPTION_RE.exec(lines[k]);
      if (c) {
        number = Number(c[1]);
        break;
      }
    }
    out.push({ number, placement: ranks.join("/"), line: i });
    i = j;
  }
  return out;
}
