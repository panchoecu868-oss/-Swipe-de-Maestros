import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client } from "pg";
import { asUser, connect, createUser, resetDatabase } from "./helpers";

const U = "00000000-0000-4000-8000-0000000000e1";
let db: Client;
const lessons: string[] = [];

const call = (lesson: string, extra: { card?: object; topics?: string[]; factor?: number; discard?: object } = {}, day = "2026-01-01") =>
  db.query(
    `select * from public.apply_gesture($1, $2, 'receive', 'pass', $3::date, 3, $4::jsonb, $5::text[], $6::real, 0.1, 5, $7::jsonb)`,
    [U, lesson, day, extra.card ? JSON.stringify(extra.card) : null, extra.topics ?? [], extra.factor ?? 1, extra.discard ? JSON.stringify(extra.discard) : null],
  );

beforeAll(async () => {
  db = await connect();
  await resetDatabase(db);
  await createUser(db, U);
  const { rows: b } = await db.query(`insert into public.books (title, author, license_note, file_hash) values ('b','a','l','h') returning id`);
  for (let i = 0; i < 4; i++) {
    const { rows } = await db.query(
      `insert into public.lessons (type, title, summary, body, fen, book_id, chapter, page_start, page_end, reviewed)
       values ('final', $1, 's', 'b', '4k3/8/8/8/8/8/8/R3K3 w - - 0 1', $2, 'c', 1, 1, true) returning id`,
      [`l${i}`, b[0].id],
    );
    lessons.push(rows[0].id);
  }
});
afterAll(async () => db?.end());

describe("apply_gesture", () => {
  it("cuenta cartas DISTINTAS por día y marca el día cumplido al llegar a la meta", async () => {
    expect((await call(lessons[0])).rows[0]).toEqual({ cards_resolved: 1, day_completed: false });
    expect((await call(lessons[0])).rows[0]).toEqual({ cards_resolved: 1, day_completed: false }); // repetida no suma
    await call(lessons[1]);
    expect((await call(lessons[2])).rows[0]).toEqual({ cards_resolved: 3, day_completed: true });
  });

  it("escribe el estado de la carta y ajusta pesos con límites", async () => {
    await db.query("insert into public.theme_weights (user_id, theme, weight) values ($1, 'defensa', 4.5)", [U]);
    await call(lessons[3], {
      card: { status: "forced", ef: 2.5, interval_days: 0, repetitions: 0, due_on: "2026-01-01", forced_until_seen: true },
      topics: ["defensa", "nuevo_tema"],
      factor: 1.25,
    });
    const cs = await db.query("select status, forced_until_seen from public.card_states where lesson_id = $1", [lessons[3]]);
    expect(cs.rows[0]).toEqual({ status: "forced", forced_until_seen: true });
    const w = await db.query("select theme, weight from public.theme_weights where user_id = $1 order by theme", [U]);
    expect(w.rows).toEqual([{ theme: "defensa", weight: 5 }, { theme: "nuevo_tema", weight: 1.25 }]);
  });

  it("cierra una ronda de descarte una sola vez", async () => {
    const { rows } = await db.query(
      `insert into public.discard_rounds (user_id, lesson_id, theme, puzzle_ids, time_limit_ms) values ($1, $2, 'fork', '{a,b,c}', 10000) returning id`,
      [U, lessons[1]],
    );
    const discard = { round_id: rows[0].id, won: true, elapsed_ms: 8000, per_puzzle_ms: [2000, 3000, 3000], results: [] };
    await call(lessons[1], { discard });
    const r = await db.query("select won, elapsed_ms, per_puzzle_ms from public.discard_rounds where id = $1", [rows[0].id]);
    expect(r.rows[0]).toEqual({ won: true, elapsed_ms: 8000, per_puzzle_ms: [2000, 3000, 3000] });
    await expect(call(lessons[1], { discard })).rejects.toThrow(/ya cerrada/);
  });

  it("un usuario autenticado NO puede llamar apply_gesture", async () => {
    await expect(asUser(db, U, () => call(lessons[0]))).rejects.toThrow(/permission denied/);
  });
});
