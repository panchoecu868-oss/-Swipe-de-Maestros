import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { evaluateGuarantee, type Enrollment } from "@/lib/guarantee/evaluate";
import { lichessProvider, parseLichessUser } from "@/lib/guarantee/providers/lichess";
import { chesscomProvider } from "@/lib/guarantee/providers/chesscom";

const mary = JSON.parse(readFileSync(path.join(__dirname, "../fixtures/lichess-user-mary.json"), "utf8"));

describe("proveedor Lichess (formato de la doc oficial)", () => {
  it("lee rating y partidas del ritmo declarado", () => {
    expect(parseLichessUser(mary, "blitz", "Mary")).toEqual({ rating: 931, games: 118, provisional: false, sourceUrl: "https://lichess.org/api/user/Mary" });
    expect(parseLichessUser(mary, "rapid", "Mary").rating).toBe(1062);
    expect(parseLichessUser({ perfs: {} }, "rapid", "x")).toMatchObject({ rating: null, games: 0 });
  });
  it("mapea 404 y 429 a errores tipados", async () => {
    const f404 = vi.fn(async () => new Response("", { status: 404 })) as unknown as typeof fetch;
    await expect(lichessProvider(f404).fetchRating("nadie", "blitz")).rejects.toMatchObject({ code: "not_found" });
    const f429 = vi.fn(async () => new Response("", { status: 429 })) as unknown as typeof fetch;
    await expect(lichessProvider(f429).fetchRating("x", "blitz")).rejects.toMatchObject({ code: "rate_limited" });
    const ok = vi.fn(async () => Response.json(mary)) as unknown as typeof fetch;
    await expect(lichessProvider(ok).fetchRating("Mary", "blitz")).resolves.toMatchObject({ rating: 931 });
  });
  it("Chess.com falla explícitamente hasta verificar su documentación", async () => {
    const p = chesscomProvider();
    expect(p.verified).toBe(false);
    await expect(p.fetchRating("x", "blitz")).rejects.toMatchObject({ code: "not_verified" });
  });
});

describe("evaluación de la garantía", () => {
  const e: Enrollment = { start_rating: 1500, start_games: 100, started_on: "2026-01-01", ends_on: "2026-03-31", target_delta: 300 };
  const base = { enrollment: e, continuousSubscription: true, completedDaysInWindow: 80 };

  it("en curso antes del cierre", () => {
    const r = evaluateGuarantee({ ...base, current: { rating: 1600, games: 150 }, today: "2026-02-01" });
    expect(r).toMatchObject({ status: "in_progress", delta: 100, targetRating: 1800, gamesPlayed: 50, daysLeft: 59 });
  });
  it("meta alcanzada en cualquier momento", () => {
    expect(evaluateGuarantee({ ...base, current: { rating: 1810, games: 150 }, today: "2026-02-01" }).status).toBe("goal_reached");
  });
  it("califica para reembolso si cumplió todo y no llegó", () => {
    const r = evaluateGuarantee({ ...base, current: { rating: 1650, games: 170 }, today: "2026-04-02" });
    expect(r.status).toBe("refund_eligible");
  });
  it("no califica si faltan días cumplidos, partidas o continuidad", () => {
    expect(evaluateGuarantee({ ...base, completedDaysInWindow: 74, current: { rating: 1650, games: 170 }, today: "2026-04-02" }).status).toBe("refund_not_eligible");
    expect(evaluateGuarantee({ ...base, current: { rating: 1650, games: 159 }, today: "2026-04-02" }).status).toBe("refund_not_eligible");
    expect(evaluateGuarantee({ ...base, continuousSubscription: false, current: { rating: 1650, games: 170 }, today: "2026-04-02" }).status).toBe("refund_not_eligible");
  });
  it("vence el plazo para reclamar", () => {
    expect(evaluateGuarantee({ ...base, current: { rating: 1650, games: 170 }, today: "2026-04-20" }).status).toBe("claim_expired");
  });
});
