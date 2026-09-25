import { describe, expect, it } from "vitest";
import { calendar, completedInWindow, currentStreak, longestStreak } from "@/lib/deck/streak";

const days = ["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-05", "2026-01-06"];

describe("rachas", () => {
  it("cuenta hasta hoy o hasta ayer si hoy aún no se cumplió", () => {
    expect(currentStreak(days, "2026-01-06")).toBe(2);
    expect(currentStreak(days, "2026-01-07")).toBe(2);
    expect(currentStreak(days, "2026-01-08")).toBe(0);
  });
  it("racha más larga", () => expect(longestStreak(days)).toBe(3));
  it("días cumplidos en ventana inclusiva", () => expect(completedInWindow(days, "2026-01-02", "2026-01-05")).toBe(3));
  it("calendario de N días que termina hoy", () => {
    const c = calendar(days, "2026-01-06", 3);
    expect(c).toEqual([
      { day: "2026-01-04", completed: false },
      { day: "2026-01-05", completed: true },
      { day: "2026-01-06", completed: true },
    ]);
  });
});
