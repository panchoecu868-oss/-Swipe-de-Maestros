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

import { milestoneCrossed, streakState } from "@/lib/deck/streak";
import { localHour } from "@/lib/time";

describe("estado de la racha", () => {
  const ms = [{ days: 3, label: "A" }, { days: 7, label: "B" }];
  const run = ["2026-01-04", "2026-01-05", "2026-01-06"];

  it("antes de cumplir hoy: base = racha hasta ayer, no en riesgo temprano", () => {
    const s = streakState(run, "2026-01-07", 10, ms, 20);
    expect(s).toMatchObject({ current: 3, base: 3, completedToday: false, atRisk: false });
    expect(s.next).toEqual({ days: 7, label: "B", remaining: 4 });
    expect(s.reached.map((m) => m.days)).toEqual([3]);
  });
  it("en riesgo desde la hora configurada", () => {
    expect(streakState(run, "2026-01-07", 21, ms, 20).atRisk).toBe(true);
  });
  it("al cumplir hoy la racha incluye hoy", () => {
    const s = streakState([...run, "2026-01-07"], "2026-01-07", 21, ms, 20);
    expect(s).toMatchObject({ current: 4, base: 3, completedToday: true, atRisk: false });
  });
  it("racha rota: sin riesgo porque no hay nada que perder", () => {
    expect(streakState(run, "2026-01-09", 23, ms, 20)).toMatchObject({ current: 0, base: 0, atRisk: false, longest: 3 });
  });
  it("detecta el hito que se cruza", () => {
    expect(milestoneCrossed(2, 3, ms)?.days).toBe(3);
    expect(milestoneCrossed(3, 4, ms)).toBeNull();
    expect(milestoneCrossed(6, 7, ms)?.label).toBe("B");
  });
  it("hora local por zona horaria", () => {
    const t = new Date("2026-03-01T03:30:00Z");
    expect(localHour("America/Guayaquil", t)).toBe(22);
    expect(localHour("UTC", t)).toBe(3);
  });
});
