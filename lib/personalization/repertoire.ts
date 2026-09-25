import families from "@/config/data/opening-families.json";
import { BLACK_VS_D4, BLACK_VS_E4, WHITE_FIRST_MOVE, type RepertoireOption } from "@/config/openings";

export interface Repertoire {
  white_first: string;
  black_vs_e4: string;
  black_vs_d4: string;
}

interface Family {
  key: string;
  firstMoves: string[];
}
const ALL: Family[] = families as Family[];

function familiesFor(opt: RepertoireOption | undefined): string[] {
  if (!opt) return [];
  if (opt.match === "any") return ALL.map((f) => f.key);
  const out = new Set<string>(opt.match.families ?? []);
  const prefix = opt.match.movesPrefix;
  if (prefix) for (const f of ALL) if (prefix.every((m, i) => f.firstMoves[i] === m)) out.add(f.key);
  return [...out];
}

/** Familias de apertura relevantes para el usuario según sus 3 respuestas. */
export function repertoireFamilies(r: Repertoire): Set<string> {
  const find = (list: RepertoireOption[], id: string) => list.find((o) => o.id === id);
  return new Set([
    ...familiesFor(find(WHITE_FIRST_MOVE, r.white_first)),
    ...familiesFor(find(BLACK_VS_E4, r.black_vs_e4)),
    ...familiesFor(find(BLACK_VS_D4, r.black_vs_d4)),
  ]);
}

/** Una etiqueta (familia o variante "Familia_Variante") pertenece al repertorio. */
export function tagInRepertoire(tag: string, fams: Set<string>): boolean {
  if (fams.has(tag)) return true;
  for (const f of fams) if (tag.startsWith(`${f}_`)) return true;
  return false;
}

export function isValidRepertoire(r: Repertoire): boolean {
  return (
    WHITE_FIRST_MOVE.some((o) => o.id === r.white_first) &&
    BLACK_VS_E4.some((o) => o.id === r.black_vs_e4) &&
    BLACK_VS_D4.some((o) => o.id === r.black_vs_d4)
  );
}
