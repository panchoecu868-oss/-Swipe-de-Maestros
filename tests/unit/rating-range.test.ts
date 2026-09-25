import { describe, expect, it } from "vitest";
import { puzzleRatingRange } from "@/lib/puzzles/rating-range";

const table = [
  { elo: 1000, puzzleMin: 900, puzzleMax: 1300 },
  { elo: 2000, puzzleMin: 1900, puzzleMax: 2300 },
];

describe("puzzleRatingRange", () => {
  it("interpola linealmente", () => expect(puzzleRatingRange(1500, table)).toEqual({ min: 1400, max: 1800 }));
  it("usa la fila extrema fuera de rango", () => {
    expect(puzzleRatingRange(600, table)).toEqual({ min: 900, max: 1300 });
    expect(puzzleRatingRange(2600, table)).toEqual({ min: 1900, max: 2300 });
  });
  it("la tabla por defecto es monótona", () => {
    let prev = puzzleRatingRange(1000);
    for (let e = 1050; e <= 2200; e += 50) {
      const r = puzzleRatingRange(e);
      expect(r.min).toBeGreaterThanOrEqual(prev.min);
      expect(r.max).toBeGreaterThan(r.min);
      prev = r;
    }
  });
});
