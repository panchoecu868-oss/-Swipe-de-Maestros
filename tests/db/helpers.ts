import { readFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";
import { applyMigrations } from "@/lib/db/migrations";

export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

export async function connect(): Promise<Client> {
  if (!TEST_DATABASE_URL) {
    throw new Error("TEST_DATABASE_URL no definido. Ver README → Tests de base de datos.");
  }
  const client = new Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  return client;
}

/** Borra todo y recrea: stub de Supabase + migraciones. */
export async function resetDatabase(client: Client): Promise<void> {
  await client.query(`
    drop schema if exists public cascade;
    drop schema if exists auth cascade;
    drop schema if exists app_private cascade;
    create schema public;
  `);
  const stub = await readFile(path.join(__dirname, "supabase-stub.sql"), "utf8");
  await client.query(stub);
  await applyMigrations(client);
}

export async function createUser(client: Client, id: string, email = `${id.slice(0, 8)}@test.dev`) {
  await client.query("insert into auth.users (id, email) values ($1, $2)", [id, email]);
}

/** Ejecuta fn como un usuario autenticado bajo RLS, dentro de una transacción revertida. */
export async function asUser<T>(client: Client, userId: string | null, fn: () => Promise<T>): Promise<T> {
  await client.query("begin");
  try {
    await client.query(`set local role ${userId ? "authenticated" : "anon"}`);
    if (userId) {
      await client.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: userId })]);
    }
    return await fn();
  } finally {
    await client.query("rollback");
  }
}
