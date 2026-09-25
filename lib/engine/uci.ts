/** Parser de salida UCI (protocolo: https://backscattering.de/chess/uci/). */
export type Score = { kind: "cp"; value: number } | { kind: "mate"; value: number };

export interface InfoLine {
  depth?: number;
  score?: Score;
  pv?: string[];
}

export function parseInfo(line: string): InfoLine | null {
  if (!line.startsWith("info ")) return null;
  const t = line.split(/\s+/);
  const out: InfoLine = {};
  for (let i = 1; i < t.length; i++) {
    if (t[i] === "depth") out.depth = Number(t[++i]);
    else if (t[i] === "score" && (t[i + 1] === "cp" || t[i + 1] === "mate")) {
      out.score = { kind: t[i + 1] as "cp" | "mate", value: Number(t[i + 2]) };
      i += 2;
    } else if (t[i] === "pv") {
      out.pv = t.slice(i + 1);
      break;
    }
  }
  return out;
}

export function parseBestMove(line: string): string | null {
  const m = /^bestmove\s+(\S+)/.exec(line);
  return m && m[1] !== "(none)" ? m[1] : null;
}

/** Score (desde el lado que mueve) → centipeones con mates saturados. */
export function scoreToCp(s: Score): number {
  if (s.kind === "cp") return s.value;
  return s.value > 0 ? 100_000 - s.value : -100_000 - s.value;
}
