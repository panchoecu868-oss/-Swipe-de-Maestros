import { describe, expect, it } from "vitest";
import { buildDailyDeck, isEligibleNew, weightedSample, type DeckLesson } from "@/lib/deck/daily-deck";
import { NEW_CARD, type CardState } from "@/lib/cards/rules";
import { puzzleThemesForLesson } from "@/lib/cards/lesson-themes";

const L = (id: string, extra: Partial<DeckLesson> = {}): DeckLesson => ({
  id, type: "final", topics: ["finales_torres"], opening_tags: [], elo_min: 1000, elo_max: 2200, ...extra,
});
const st = (s: Partial<CardState>): CardState => ({ ...NEW_CARD, ...s });
let seed = 1;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

describe("mazo diario", () => {
  const lessons = [
    L("forced"), L("due-old"), L("due-new"), L("future"), L("discarded"),
    L("n1"), L("n2"), L("hard", { elo_min: 1900 }), L("sici", { type: "apertura", topics: ["aperturas"], opening_tags: ["Sicilian_Defense"] }),
    L("ital", { type: "apertura", topics: ["aperturas"], opening_tags: ["Italian_Game_Two_Knights_Defense"] }),
  ];
  const states = new Map<string, CardState>([
    ["forced", st({ status: "forced", forced_until_seen: true, due_on: "2026-01-10" })],
    ["due-old", st({ status: "learning", due_on: "2026-01-01" })],
    ["due-new", st({ status: "learning", due_on: "2026-01-09" })],
    ["future", st({ status: "learning", due_on: "2026-02-01" })],
    ["discarded", st({ status: "discarded" })],
  ]);
  const deck = buildDailyDeck({
    lessons, states, weights: { finales_torres: 2, aperturas: 1 }, repertoire: new Set(["Italian_Game"]),
    elo: 1500, today: "2026-01-10", size: 10, random: rnd,
  });

  it("forzadas primero, luego vencidas por antigüedad", () => expect(deck.slice(0, 3)).toEqual(["forced", "due-old", "due-new"]));
  it("excluye descartadas, no vencidas, fuera de ELO y aperturas fuera de repertorio", () => {
    for (const id of ["discarded", "future", "hard", "sici"]) expect(deck).not.toContain(id);
    expect(deck).toEqual(expect.arrayContaining(["n1", "n2", "ital"]));
  });
  it("respeta el tamaño", () => {
    expect(buildDailyDeck({ lessons, states, weights: {}, repertoire: new Set(), elo: 1500, today: "2026-01-10", size: 2 })).toEqual(["forced", "due-old"]);
  });
  it("elegibilidad por ELO", () => expect(isEligibleNew(L("x", { elo_min: 1600 }), 1500, new Set())).toBe(false));
  it("el muestreo favorece pesos altos", () => {
    let heavy = 0;
    for (let i = 0; i < 2000; i++) if (weightedSample(["a", "b"], (x) => (x === "a" ? 9 : 1), 1, rnd)[0] === "a") heavy++;
    expect(heavy / 2000).toBeGreaterThan(0.85);
  });
});

describe("temas de puzzles por lección", () => {
  it("usa lichess_themes, luego el mapeo, luego el fallback", () => {
    expect(puzzleThemesForLesson({ lichess_themes: ["fork"], topics: ["defensa"] })).toEqual(["fork"]);
    expect(puzzleThemesForLesson({ lichess_themes: [], topics: ["finales_peones"] })).toEqual(["pawnEndgame"]);
    expect(puzzleThemesForLesson({ lichess_themes: [], topics: ["profilaxis"] })).toEqual(["middlegame", "quietMove"]);
  });
});
