import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client } from "pg";
import { asUser, connect, createUser, resetDatabase } from "./helpers";

const ALICE = "00000000-0000-4000-8000-00000000000a";
const BOB = "00000000-0000-4000-8000-00000000000b";
const ADMIN = "00000000-0000-4000-8000-0000000000ad";

let db: Client;
let bookId: string;

async function insertLesson(reviewed: boolean, body = "Texto corto de prueba.") {
  const { rows } = await db.query<{ id: string }>(
    `insert into public.lessons (type, title, summary, body, fen, book_id, chapter, page_start, page_end, reviewed)
     values ('final', 't', 's', $1, '8/8/8/8/8/8/8/K6k w - - 0 1', $2, 'I', 1, 1, $3) returning id`,
    [body, bookId, reviewed],
  );
  return rows[0].id;
}

beforeAll(async () => {
  db = await connect();
  await resetDatabase(db);
  await createUser(db, ALICE);
  await createUser(db, BOB);
  await createUser(db, ADMIN);
  await db.query("update public.profiles set is_admin = true where id = $1", [ADMIN]);
  const { rows } = await db.query<{ id: string }>(
    `insert into public.books (title, author, license_note, file_hash) values ('Libro test', 'Autor', 'test', 'h1') returning id`,
  );
  bookId = rows[0].id;
});

afterAll(async () => {
  await db?.end();
});

describe("esquema y RLS", () => {
  it("crea el perfil automáticamente al registrar un usuario", async () => {
    const { rows } = await db.query("select id from public.profiles order by id");
    expect(rows.map((r) => r.id)).toEqual([ALICE, BOB, ADMIN].sort());
  });

  it("cada usuario solo ve su propio perfil", async () => {
    const rows = await asUser(db, ALICE, async () => (await db.query("select id from public.profiles")).rows);
    expect(rows).toEqual([{ id: ALICE }]);
  });

  it("un usuario no puede auto-asignarse is_admin", async () => {
    await expect(
      asUser(db, ALICE, () => db.query("update public.profiles set is_admin = true where id = $1", [ALICE])),
    ).rejects.toThrow(/row-level security/);
  });

  it("un usuario puede editar sus datos de onboarding", async () => {
    const res = await asUser(db, ALICE, () =>
      db.query("update public.profiles set working_elo = 1500 where id = $1", [ALICE]),
    );
    expect(res.rowCount).toBe(1);
  });

  it("working_elo fuera de 1000–2200 se rechaza", async () => {
    await expect(db.query("update public.profiles set working_elo = 900 where id = $1", [ALICE])).rejects.toThrow(
      /check constraint/,
    );
  });

  it("el usuario NO puede escribir progreso (card_states, daily_log) desde el cliente", async () => {
    const lessonId = await insertLesson(true);
    await expect(
      asUser(db, ALICE, () =>
        db.query("insert into public.card_states (user_id, lesson_id, status) values ($1, $2, 'discarded')", [
          ALICE,
          lessonId,
        ]),
      ),
    ).rejects.toThrow(/row-level security/);
    await expect(
      asUser(db, ALICE, () =>
        db.query("insert into public.daily_log (user_id, local_day, cards_resolved) values ($1, current_date, 10)", [
          ALICE,
        ]),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("solo las lecciones reviewed=true son visibles para usuarios; el admin ve todas", async () => {
    await db.query("delete from public.lessons");
    const visible = await insertLesson(true);
    await insertLesson(false);
    const forAlice = await asUser(db, ALICE, async () => (await db.query("select id from public.lessons")).rows);
    expect(forAlice).toEqual([{ id: visible }]);
    const forAnon = await asUser(db, null, async () => (await db.query("select id from public.lessons")).rows);
    expect(forAnon).toEqual([{ id: visible }]);
    const forAdmin = await asUser(db, ADMIN, async () => (await db.query("select id from public.lessons")).rows);
    expect(forAdmin).toHaveLength(2);
  });

  it("rechaza lecciones de más de 150 palabras", async () => {
    const body = Array.from({ length: 151 }, (_, i) => `p${i}`).join(" ");
    await expect(insertLesson(false, body)).rejects.toThrow(/check constraint/);
  });

  it("has_active_subscription respeta estado y fecha de fin", async () => {
    await db.query(
      `insert into public.subscriptions (user_id, provider, provider_membership_id, status, current_period_end)
       values ($1, 'test', 'm1', 'active', now() + interval '1 day'),
              ($2, 'test', 'm2', 'active', now() - interval '1 day')`,
      [ALICE, BOB],
    );
    const { rows } = await db.query(
      "select public.has_active_subscription($1) as a, public.has_active_subscription($2) as b",
      [ALICE, BOB],
    );
    expect(rows[0]).toEqual({ a: true, b: false });
  });
});
