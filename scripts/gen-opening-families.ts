/**
 * Genera config/data/opening-families.json desde la base oficial de aperturas de Lichess (CC0):
 * https://github.com/lichess-org/chess-openings (a.tsv … e.tsv: eco, name, pgn).
 * Clave = misma regla que Lichess usa para OpeningTags (scalachess Opening.nameToKey):
 * quitar tildes (NFD), espacios → "_", eliminar todo lo que no sea [\w-].
 * Uso: npm run gen:openings
 */
import { writeFileSync } from "node:fs";

const BASE = "https://raw.githubusercontent.com/lichess-org/chess-openings/master";

export function nameToKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^\w-]+/g, "");
}

/** "1. e4 e5 2. Nf3" → ["e4","e5","Nf3"] */
export function pgnMoves(pgn: string): string[] {
  return pgn.split(/\s+/).filter((t) => t && !/^\d+\.+$/.test(t));
}

export interface OpeningFamily {
  key: string;
  name: string;
  /** Jugadas de la línea más corta de la familia (define dónde "empieza"). */
  firstMoves: string[];
  lines: number;
}

async function main() {
  const families = new Map<string, OpeningFamily>();
  for (const f of ["a", "b", "c", "d", "e"]) {
    const res = await fetch(`${BASE}/${f}.tsv`);
    if (!res.ok) throw new Error(`HTTP ${res.status} en ${f}.tsv`);
    const rows = (await res.text()).trim().split("\n").slice(1);
    for (const row of rows) {
      const [, name, pgn] = row.split("\t");
      const familyName = name.split(":")[0].trim();
      const key = nameToKey(familyName);
      const moves = pgnMoves(pgn);
      const prev = families.get(key);
      if (!prev) families.set(key, { key, name: familyName, firstMoves: moves, lines: 1 });
      else {
        prev.lines++;
        if (moves.length < prev.firstMoves.length) prev.firstMoves = moves;
      }
    }
  }
  const out = [...families.values()].sort((a, b) => a.key.localeCompare(b.key));
  writeFileSync("config/data/opening-families.json", `${JSON.stringify(out, null, 1)}\n`);
  console.log(`${out.length} familias`);
}

if (process.argv[1]?.endsWith("gen-opening-families.ts")) main().catch((e) => { console.error(e); process.exit(1); });
