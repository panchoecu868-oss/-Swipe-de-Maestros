import { tagInRepertoire } from "@/lib/personalization/repertoire";
import { lessonWeight, type Weights } from "@/lib/personalization/theme-weights";
import type { CardState } from "@/lib/cards/rules";

export interface DeckLesson {
  id: string;
  type: "apertura" | "estrategia" | "final";
  topics: string[];
  opening_tags: string[];
  elo_min: number;
  elo_max: number;
}

export interface DeckInput {
  lessons: DeckLesson[];
  states: Map<string, CardState>;
  weights: Weights;
  repertoire: Set<string>;
  elo: number;
  today: string;
  size: number;
  random?: () => number;
}

/** ¿La lección nueva es elegible para este usuario? (rango ELO y, si es de apertura, repertorio). */
export function isEligibleNew(l: DeckLesson, elo: number, repertoire: Set<string>): boolean {
  if (elo < l.elo_min || elo > l.elo_max) return false;
  if (l.type === "apertura") return l.opening_tags.some((t) => tagInRepertoire(t, repertoire));
  return true;
}

/** Muestreo ponderado sin reemplazo (Efraimidis–Spirakis). */
export function weightedSample<T>(items: T[], weight: (t: T) => number, k: number, random = Math.random): T[] {
  return items
    .map((it) => ({ it, key: Math.pow(random(), 1 / Math.max(weight(it), 1e-6)) }))
    .sort((a, b) => b.key - a.key)
    .slice(0, k)
    .map((x) => x.it);
}

/**
 * Orden del mazo: 1) forzadas (descarte perdido), 2) repasos SM-2 vencidos (más atrasado primero),
 * 3) nuevas por theme_weights, filtradas por ELO y repertorio. Nunca incluye descartadas.
 */
export function buildDailyDeck(input: DeckInput): string[] {
  const { lessons, states, today, size } = input;
  const forced: string[] = [];
  const due: { id: string; due: string }[] = [];
  const fresh: DeckLesson[] = [];
  for (const l of lessons) {
    const s = states.get(l.id);
    if (s?.status === "discarded") continue;
    if (s?.forced_until_seen) forced.push(l.id);
    else if (s?.status === "learning" && s.due_on && s.due_on <= today) due.push({ id: l.id, due: s.due_on });
    else if ((!s || s.status === "new") && isEligibleNew(l, input.elo, input.repertoire)) fresh.push(l);
  }
  due.sort((a, b) => a.due.localeCompare(b.due));
  const deck = [...forced, ...due.map((d) => d.id)].slice(0, size);
  const picked = weightedSample(fresh, (l) => lessonWeight(input.weights, l.topics), size - deck.length, input.random);
  return [...deck, ...picked.map((l) => l.id)];
}
