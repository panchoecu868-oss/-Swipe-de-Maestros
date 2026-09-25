import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { canDiscard, cardAfterDiscard, cardAfterReview, evaluateDiscard, NEW_CARD } from "@/lib/cards/rules";
import { sm2, INITIAL_SM2 } from "@/lib/deck/sm2";
import { parsePuzzleLine } from "@/lib/puzzles/csv";
import { addDays, daysBetween, localDay } from "@/lib/time";

const rows = readFileSync(path.join(__dirname, "../fixtures/lichess_puzzles_sample.csv"), "utf8").trim().split("\n").slice(1).map(parsePuzzleLine);
const [hx, j9, jb] = rows; // 00sHx, 00sJ9, 00sJb

describe("SM-2", () => {
  it("intervalos 1 → 6 → 6·EF con calidad ≥3", () => {
    const a = sm2(INITIAL_SM2, 4, "2026-01-01");
    expect(a).toMatchObject({ interval_days: 1, repetitions: 1, due_on: "2026-01-02" });
    const b = sm2(a, 4, "2026-01-02");
    expect(b).toMatchObject({ interval_days: 6, repetitions: 2, due_on: "2026-01-08" });
    const c = sm2(b, 5, "2026-01-08");
    expect(c.interval_days).toBe(Math.round(6 * b.ef));
  });
  it("calidad <3 reinicia y el EF nunca baja de 1.3", () => {
    let s = sm2(INITIAL_SM2, 4, "2026-01-01");
    for (let i = 0; i < 20; i++) s = sm2(s, 0, "2026-01-01");
    expect(s.repetitions).toBe(0);
    expect(s.interval_days).toBe(1);
    expect(s.ef).toBe(1.3);
  });
});

describe("ronda de descarte", () => {
  const puzzles = [hx, j9, jb];
  const allGood = [
    { puzzleId: "00sHx", moves: ["a2e6", "f7f8"], ms: 2000 },
    { puzzleId: "00sJ9", moves: ["e8e1", "e1c1", "f4h6", "h6c1"], ms: 3000 },
    { puzzleId: "00sJb", moves: ["a5e1", "e1e3", "e3b6"], ms: 2500 },
  ];
  const start = new Date("2026-01-01T00:00:00Z");
  const at = (ms: number) => new Date(start.getTime() + ms);

  it("gana si resuelve los 3 dentro del tiempo (reloj de servidor)", () => {
    const r = evaluateDiscard({ puzzles, submitted: allGood, startedAt: start, now: at(9000), limitMs: 10000, graceMs: 1500 });
    expect(r).toMatchObject({ won: true, timedOut: false, elapsedMs: 9000 });
  });
  it("pierde por tiempo aunque las jugadas sean correctas", () => {
    const r = evaluateDiscard({ puzzles, submitted: allGood, startedAt: start, now: at(11600), limitMs: 10000, graceMs: 1500 });
    expect(r).toMatchObject({ won: false, timedOut: true });
  });
  it("pierde si falla uno o manda menos puzzles", () => {
    const bad = [...allGood.slice(0, 2), { puzzleId: "00sJb", moves: ["h2h3"], ms: 100 }];
    expect(evaluateDiscard({ puzzles, submitted: bad, startedAt: start, now: at(5000), limitMs: 10000, graceMs: 0 }).won).toBe(false);
    expect(evaluateDiscard({ puzzles, submitted: allGood.slice(0, 2), startedAt: start, now: at(5000), limitMs: 10000, graceMs: 0 }).won).toBe(false);
  });
  it("carta perdida queda forzada y no se puede volver a descartar hasta verla", () => {
    const lost = cardAfterDiscard(null, false, "2026-01-01");
    expect(lost).toMatchObject({ status: "forced", forced_until_seen: true, due_on: "2026-01-01" });
    expect(canDiscard(lost)).toBe(false);
    const seen = cardAfterReview(lost, 4, "2026-01-01");
    expect(canDiscard(seen)).toBe(true);
    expect(cardAfterDiscard(NEW_CARD, true, "2026-01-01").status).toBe("discarded");
  });
});

describe("fechas locales", () => {
  it("calcula el día en la zona del usuario", () => {
    const t = new Date("2026-03-01T03:00:00Z");
    expect(localDay("America/Guayaquil", t)).toBe("2026-02-28");
    expect(localDay("Europe/Madrid", t)).toBe("2026-03-01");
    expect(localDay("zona/invalida", t)).toBe("2026-03-01");
  });
  it("suma y resta días", () => {
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(daysBetween("2026-01-01", "2026-03-31")).toBe(89);
  });
});
