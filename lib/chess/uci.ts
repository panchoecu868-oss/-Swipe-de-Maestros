import type { Square } from "chess.js";

export interface UciMove {
  from: Square;
  to: Square;
  promotion?: "q" | "r" | "b" | "n";
}

const UCI_RE = /^([a-h][1-8])([a-h][1-8])([qrbn])?$/;

export function parseUci(uci: string): UciMove {
  const m = UCI_RE.exec(uci);
  if (!m) throw new Error(`Jugada UCI inválida: ${uci}`);
  return {
    from: m[1] as Square,
    to: m[2] as Square,
    ...(m[3] ? { promotion: m[3] as UciMove["promotion"] } : {}),
  };
}

export function toUci(move: { from: string; to: string; promotion?: string }): string {
  return `${move.from}${move.to}${move.promotion ?? ""}`;
}
