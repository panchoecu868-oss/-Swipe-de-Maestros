import {
  DECLARED_ELO_OFFSET, DISCARD_LOSS_FACTOR, DISCARD_WIN_FACTOR, OPENING_TOPIC_WEIGHT,
  WEIGHT_BY_SCORE, WEIGHT_MAX, WEIGHT_MIN,
} from "@/config/personalization";
import { GAME_CONFIG } from "@/config/game";
import { OPENING_TOPIC, TOPIC_IDS, type TopicId } from "@/config/self-assessment";

export type Scores = Record<TopicId, 1 | 2 | 3 | 4 | 5>;
export type Weights = Record<string, number>;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Autoevaluación → pesos normalizados (media 1.0) + peso fijo de aperturas. */
export function computeThemeWeights(scores: Scores): Weights {
  const raw = TOPIC_IDS.map((t) => WEIGHT_BY_SCORE[scores[t]]);
  const mean = raw.reduce((a, b) => a + b, 0) / raw.length;
  const w: Weights = {};
  TOPIC_IDS.forEach((t, i) => (w[t] = clamp(raw[i] / mean, WEIGHT_MIN, WEIGHT_MAX)));
  w[OPENING_TOPIC] = OPENING_TOPIC_WEIGHT;
  return w;
}

export function adjustAfterDiscard(weights: Weights, topics: string[], won: boolean): Weights {
  const f = won ? DISCARD_WIN_FACTOR : DISCARD_LOSS_FACTOR;
  const next = { ...weights };
  for (const t of topics) next[t] = clamp((next[t] ?? 1) * f, WEIGHT_MIN, WEIGHT_MAX);
  return next;
}

/** Peso de una lección = máximo de los pesos de sus temas (1.0 si no tiene temas). */
export function lessonWeight(weights: Weights, topics: string[]): number {
  if (topics.length === 0) return 1;
  return Math.max(...topics.map((t) => weights[t] ?? 1));
}

export type EloInput =
  | { source: "fide"; fide: number }
  | { source: "chesscom" | "lichess"; declared: number };

/** ELO de trabajo en el rango del producto (1000–2200). */
export function workingElo(input: EloInput): number {
  const base = input.source === "fide" ? input.fide : input.declared + DECLARED_ELO_OFFSET[input.source];
  return Math.round(clamp(base, GAME_CONFIG.ELO_MIN, GAME_CONFIG.ELO_MAX));
}
