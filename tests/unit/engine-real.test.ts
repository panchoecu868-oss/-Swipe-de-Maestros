/**
 * Contra el Stockfish real (el mismo build lite que se sirve al navegador), como proceso UCI por stdin/stdout.
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { createInterface } from "node:readline";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { Engine, type UciTransport } from "@/lib/engine/engine-client";
import { engineModeFor } from "@/lib/engine/strength";

async function nodeTransport(): Promise<UciTransport> {
  const proc = spawn(process.execPath, [path.resolve("node_modules/stockfish/bin/stockfish-19-lite-single.js")], { stdio: ["pipe", "pipe", "inherit"] });
  let cb: (l: string) => void = () => {};
  createInterface({ input: proc.stdout }).on("line", (l) => cb(l));
  return { send: (c) => proc.stdin.write(`${c}\n`), onLine: (f) => (cb = f), terminate: () => proc.kill() };
}

let player: Engine;
let analysis: Engine;

beforeAll(async () => {
  player = new Engine(await nodeTransport());
  analysis = new Engine(await nodeTransport());
  await player.init();
  await analysis.init();
}, 60_000);
afterAll(() => {
  player?.quit();
  analysis?.quit();
});

describe("Stockfish WASM real", () => {
  it("juega jugadas legales con fuerza limitada por UCI_Elo y por Skill Level", async () => {
    for (const elo of [1500, 1000]) {
      const mode = engineModeFor(elo);
      await player.configure(mode);
      const fen = new Chess().fen();
      const mv = await player.bestMove(fen, mode);
      expect(mv).toMatch(/^[a-h][1-8][a-h][1-8][qrbn]?$/);
      const c = new Chess(fen);
      expect(() => c.move({ from: mv!.slice(0, 2), to: mv!.slice(2, 4), promotion: mv![4] })).not.toThrow();
    }
  }, 30_000);

  it("el motor de análisis ve el mate en 1", async () => {
    // Mate de pasillo trivial construido para el test (no es contenido de una lección).
    const r = await analysis.evaluate("6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1", 8);
    expect(r.score).toEqual({ kind: "mate", value: 1 });
  }, 30_000);
});
