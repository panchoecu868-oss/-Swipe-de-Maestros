import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { PuzzleSession, isPuzzleLegal, preparePuzzle, verifySolution } from "@/lib/chess/puzzle";
import { assertOfficialHeader, parsePuzzleLine, rejectReason } from "@/lib/puzzles/csv";

// Filas reales copiadas literal de la muestra oficial de database.lichess.org.
const lines = readFileSync(path.join(__dirname, "../fixtures/lichess_puzzles_sample.csv"), "utf8").trim().split("\n");
const rows = lines.slice(1).map(parsePuzzleLine);
const byId = Object.fromEntries(rows.map((r) => [r.id, r]));

describe("CSV oficial de Lichess", () => {
  it("valida el header de 11 columnas (incluye DailyDate)", () => {
    expect(() => assertOfficialHeader(lines[0])).not.toThrow();
    expect(() => assertOfficialHeader("PuzzleId,FEN,Moves,Rating")).toThrow(/formato oficial/);
  });

  it("parsea tipos, temas, openings y DailyDate", () => {
    const r = byId["00sJ9"];
    expect(r.rating).toBe(2671);
    expect(r.themes).toContain("fork");
    expect(r.openingTags).toEqual(["French_Defense", "French_Defense_Exchange_Variation"]);
    expect(r.dailyDate?.getTime()).toBe(1607774862751);
    expect(byId["00sO1"].openingTags).toEqual([]);
    expect(byId["00sO1"].dailyDate).toBeNull();
  });

  it("todas las filas de muestra son legales", () => {
    for (const r of rows) expect(isPuzzleLegal(r)).toBe(true);
  });

  it("filtra por rating, popularidad, jugadas y RD", () => {
    const f = { ratingMin: 800, ratingMax: 2500, minPopularity: 90, minPlays: 100, maxRatingDeviation: 90 };
    expect(rejectReason(byId["00sJ9"], f)).toBe("rating"); // 2671
    expect(rejectReason(byId["00sHx"], f)).toBe("popularity"); // 83
    expect(rejectReason(byId["00sO1"], f)).toBe(null);
    expect(rejectReason({ ...byId["00sO1"], moves: ["a1a8", "b1b2"] }, f)).toBe("illegal");
  });
});

describe("puzzle: el FEN es ANTES de la jugada del rival", () => {
  it("aplica moves[0] y el usuario juega con el color contrario al del FEN", () => {
    const r = byId["00sHx"]; // FEN con turno de negras; e8d7 es del rival
    const p = preparePuzzle(r);
    expect(p.opponentMove).toBe("e8d7");
    expect(p.playerColor).toBe("white");
    expect(new Chess(p.startFen).turn()).toBe("w");
    expect(p.solution).toEqual(["a2e6", "d7d8", "f7f8"]);
  });

  it("resuelve la línea completa con respuestas automáticas", () => {
    const s = new PuzzleSession(byId["00sHx"]);
    expect(s.play("a2e6")).toMatchObject({ kind: "correct", reply: "d7d8" });
    expect(s.play("f7f8").kind).toBe("solved");
    expect(s.status).toBe("solved");
  });

  it("una jugada distinta a la solución (sin mate) falla", () => {
    const s = new PuzzleSession(byId["00sJb"]);
    expect(s.play("h2h3")).toEqual({ kind: "wrong", expected: "a5e1" });
    expect(s.status).toBe("failed");
  });

  it("verifySolution re-verifica secuencias en servidor", () => {
    expect(verifySolution(byId["00sO1"], ["e1a5", "f1d1"])).toBe(true);
    expect(verifySolution(byId["00sO1"], ["e1a5"])).toBe(false);
    expect(verifySolution(byId["00sO1"], ["f1f2"])).toBe(false);
  });

  it("acepta un mate alternativo (regla oficial: cualquier mate gana)", () => {
    // Construimos un puzzle sintético de estructura (no contenido de ajedrez publicado):
    // dos mates en 1 posibles; la "solución" registrada es uno y jugamos el otro.
    const fen = "6k1/p4ppp/8/8/8/8/5PPP/R3R1K1 b - - 0 1";
    const s = new PuzzleSession({ id: "t", fen, moves: ["a7a6", "a1a8"] });
    expect(s.play("e1e8").kind).toBe("solved");
  });
});
