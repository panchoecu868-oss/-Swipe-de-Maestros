/**
 * Aplica supabase/migrations/*.sql a la base indicada en SUPABASE_DB_URL
 * (Supabase → Project Settings → Database → Connection string, modo "Session").
 * Uso: npm run db:push
 */
import "dotenv/config";
import { Client } from "pg";
import { applyMigrations } from "../lib/db/migrations";

async function main() {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) throw new Error("Falta SUPABASE_DB_URL en .env.local / entorno");
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const applied = await applyMigrations(client);
    console.log(applied.length ? `Aplicadas: ${applied.join(", ")}` : "Sin migraciones pendientes");
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
