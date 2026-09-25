import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { Client } from "pg";

export const MIGRATIONS_DIR = path.join(process.cwd(), "supabase", "migrations");

export async function listMigrations(dir = MIGRATIONS_DIR): Promise<string[]> {
  const files = await readdir(dir);
  return files.filter((f) => f.endsWith(".sql")).sort();
}

/**
 * Aplica las migraciones pendientes en orden, cada una en su transacción.
 * El registro vive en un schema privado para que PostgREST (Supabase) no lo exponga.
 */
export async function applyMigrations(client: Client, dir = MIGRATIONS_DIR): Promise<string[]> {
  await client.query(`
    create schema if not exists app_private;
    create table if not exists app_private.schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    );
  `);
  const { rows } = await client.query<{ name: string }>("select name from app_private.schema_migrations");
  const done = new Set(rows.map((r) => r.name));
  const applied: string[] = [];
  for (const name of await listMigrations(dir)) {
    if (done.has(name)) continue;
    const sql = await readFile(path.join(dir, name), "utf8");
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query("insert into app_private.schema_migrations (name) values ($1)", [name]);
      await client.query("commit");
      applied.push(name);
    } catch (err) {
      await client.query("rollback");
      throw new Error(`Migración ${name} falló: ${(err as Error).message}`);
    }
  }
  return applied;
}
