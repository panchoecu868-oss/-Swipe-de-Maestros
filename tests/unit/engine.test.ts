import { describe, expect, it } from "vitest";
import { chooseObjective, judge } from "@/lib/engine/objective";
import { engineModeFor, goCommand, strengthCommands } from "@/lib/engine/strength";
import { parseBestMove, parseInfo, scoreToCp } from "@/lib/engine/uci";

describe("fuerza del motor", () => {
  it("≥1320 usa UCI_LimitStrength + UCI_Elo (con tope configurable)", () => {
    expect(engineModeFor(1500)).toEqual({ kind: "elo", uciElo: 1500, movetimeMs: 400 });
    expect(engineModeFor(2200)).toMatchObject({ kind: "elo", uciElo: 2200 });
    expect(strengthCommands(engineModeFor(1500))).toContain("setoption name UCI_Elo value 1500");
  });
  it("<1320 usa Skill Level interpolado (nunca UCI_Elo inválido)", () => {
    expect(engineModeFor(1000)).toMatchObject({ kind: "skill", skill: 0, depth: 1 });
    expect(engineModeFor(1150)).toMatchObject({ kind: "skill", skill: 3 });
    const cmds = strengthCommands(engineModeFor(1100));
    expect(cmds).toContain("setoption name UCI_LimitStrength value false");
    expect(cmds.join()).not.toContain("UCI_Elo");
    expect(goCommand(engineModeFor(1000))).toBe("go depth 1 movetime 100");
  });
});

describe("parser UCI", () => {
  it("lee score cp/mate y pv", () => {
    expect(parseInfo("info depth 12 seldepth 18 multipv 1 score cp -34 nodes 1 pv e7e5 g1f3")).toEqual({ depth: 12, score: { kind: "cp", value: -34 }, pv: ["e7e5", "g1f3"] });
    expect(parseInfo("info depth 5 score mate 3 pv h5f7")?.score).toEqual({ kind: "mate", value: 3 });
    expect(parseBestMove("bestmove e2e4 ponder e7e5")).toBe("e2e4");
    expect(parseBestMove("bestmove (none)")).toBeNull();
    expect(scoreToCp({ kind: "mate", value: 2 })).toBeGreaterThan(90_000);
    expect(scoreToCp({ kind: "mate", value: -2 })).toBeLessThan(-90_000);
  });
});

describe("objetivos", () => {
  it("elige por tipo y evaluación inicial", () => {
    expect(chooseObjective("final", 300).objective).toBe("convert");
    expect(chooseObjective("final", 0).objective).toBe("draw");
    expect(chooseObjective("estrategia", 400).objective).toBe("convert");
    expect(chooseObjective("estrategia", 0).objective).toBe("survive");
    expect(chooseObjective("apertura", 900)).toEqual({ objective: "survive", targetMoves: 10 });
  });
  it("convertir: mate o abandono cumple; tablas falla", () => {
    expect(judge({ objective: "convert", targetMoves: 40, playerMoves: 5, gameOver: { kind: "checkmate", winner: "player" }, evals: [] }).status).toBe("met");
    expect(judge({ objective: "convert", targetMoves: 40, playerMoves: 5, gameOver: null, evals: [950, 1000, 1200] }).status).toBe("met");
    expect(judge({ objective: "convert", targetMoves: 40, playerMoves: 5, gameOver: { kind: "draw", reason: "ahogado" }, evals: [] }).status).toBe("failed");
    expect(judge({ objective: "convert", targetMoves: 40, playerMoves: 40, gameOver: null, evals: [200] }).status).toBe("failed");
  });
  it("entablar: tablas o aguantar el límite cumple; posición perdida falla", () => {
    expect(judge({ objective: "draw", targetMoves: 40, playerMoves: 10, gameOver: { kind: "draw", reason: "repetición" }, evals: [] }).status).toBe("met");
    expect(judge({ objective: "draw", targetMoves: 40, playerMoves: 40, gameOver: null, evals: [-50] }).status).toBe("met");
    expect(judge({ objective: "draw", targetMoves: 40, playerMoves: 12, gameOver: null, evals: [-800, -900, -1000] }).status).toBe("failed");
  });
  it("sobrevivir: N jugadas sin caer bajo el umbral", () => {
    expect(judge({ objective: "survive", targetMoves: 10, playerMoves: 10, gameOver: null, evals: [-150] }).status).toBe("met");
    expect(judge({ objective: "survive", targetMoves: 10, playerMoves: 4, gameOver: null, evals: [-250] }).status).toBe("failed");
    expect(judge({ objective: "survive", targetMoves: 10, playerMoves: 4, gameOver: null, evals: [0] }).status).toBe("ongoing");
  });
});

import { pieceLabel } from "@/components/chess/Board";
describe("nombres accesibles de piezas", () => {
  it("concuerda género y color", () => {
    expect(pieceLabel("bQ", "a8")).toBe("Dama negra en a8");
    expect(pieceLabel("wN", "f3")).toBe("Caballo blanco en f3");
    expect(pieceLabel("wR", "a1")).toBe("Torre blanca en a1");
  });
});
