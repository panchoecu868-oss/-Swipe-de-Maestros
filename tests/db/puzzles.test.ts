import { createReadStream } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client } from "pg";
import { importPuzzleLines } from "@/lib/puzzles/importer";
import { connect, resetDatabase } from "./helpers";

let db: Client;
const fixture = path.join(__dirname, "../fixtures/lichess_puzzles_sample.csv");
const lines = () => createInterface({ input: createReadStream(fixture), crlfDelay: Infinity });
const baseOpts = {
  filters: { ratingMin: 0, ratingMax: 4000, minPopularity: -100, minPlays: 0, maxRatingDeviation: 500 },
  maxRows: 100,
  maxPerTheme: 100,
  nonMotifThemes: ["short", "long", "veryLong", "middlegame", "advantage", "mate", "master"],
  batchSize: 2,
};

beforeAll(async () => {
  db = await connect();
  await resetDatabase(db);
});
afterAll(async () => db?.end());

describe("import de puzzles", () => {
  it("importa las filas oficiales y es idempotente", async () => {
    const s1 = await importPuzzleLines(lines(), db, baseOpts);
    expect(s1.imported).toBe(4);
    await importPuzzleLines(lines(), db, baseOpts);
    const { rows } = await db.query("select count(*)::int as n from public.puzzles");
    expect(rows[0].n).toBe(4);
    const { rows: r2 } = await db.query("select moves, daily_date from public.puzzles where id = '00sJ9'");
    expect(r2[0].moves[0]).toBe("e3g3");
    expect(new Date(r2[0].daily_date).getTime()).toBe(1607774862751);
  });

  it("aplica filtros y cuota por tema", async () => {
    await db.query("delete from public.puzzles");
    const s = await importPuzzleLines(lines(), db, {
      ...baseOpts,
      filters: { ...baseOpts.filters, ratingMax: 2500, minPopularity: 90 },
      maxPerTheme: 1,
    });
    // 00sJ9 fuera por rating, 00sHx por popularidad → quedan 00sJb (fork) y 00sO1 (discoveredAttack)
    expect(s.rejected.rating).toBe(1);
    expect(s.rejected.popularity).toBe(1);
    expect(s.imported).toBe(2);
  });

  it("rechaza un archivo con header distinto al oficial", async () => {
    async function* bad() {
      yield "PuzzleId,FEN,Moves,Rating";
    }
    await expect(importPuzzleLines(bad(), db, baseOpts)).rejects.toThrow(/formato oficial/);
  });

  it("pick_puzzles filtra por tema, rango, exclusión y ensancha el rango", async () => {
    await db.query("delete from public.puzzles");
    await importPuzzleLines(lines(), db, baseOpts);
    const pick = async (themes: string[], lo: number, hi: number, n: number, ex: string[] = [], steps = 0) =>
      (await db.query("select id from public.pick_puzzles($1, $2, $3, $4, $5, 150, $6)", [themes, lo, hi, n, ex, steps]))
        .rows.map((r) => r.id)
        .sort();
    expect(await pick(["fork"], 2000, 2800, 5)).toEqual(["00sJ9", "00sJb"]);
    expect(await pick(["fork"], 2000, 2800, 5, ["00sJb"])).toEqual(["00sJ9"]);
    expect(await pick(["advantage"], 900, 1100, 3)).toEqual(["00sO1"]);
    // Sin ensanche solo 00sHx (1760) cae en 1700–1800; ensanchando 4×150 entra otro.
    expect(await pick([], 1700, 1800, 2, [], 0)).toEqual(["00sHx"]);
    expect((await pick([], 1700, 1800, 2, [], 4)).length).toBe(2);
  });
});
