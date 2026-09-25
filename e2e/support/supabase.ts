/**
 * Soporte del E2E completo contra un proyecto Supabase de TEST (nunca producción).
 * Requiere: E2E_SUPABASE_URL, E2E_SUPABASE_ANON_KEY, E2E_SUPABASE_SERVICE_ROLE_KEY,
 * migraciones aplicadas (npm run db:push) y puzzles importados (npm run import:puzzles).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import type { BrowserContext } from "@playwright/test";

export const E2E = {
  url: process.env.E2E_SUPABASE_URL ?? "",
  anon: process.env.E2E_SUPABASE_ANON_KEY ?? "",
  service: process.env.E2E_SUPABASE_SERVICE_ROLE_KEY ?? "",
};
export const e2eEnabled = Boolean(E2E.url && E2E.anon && E2E.service);

export const admin = (): SupabaseClient => createClient(E2E.url, E2E.service, { auth: { persistSession: false, autoRefreshToken: false } });

/** FEN legal estándar (tras 1.e4 e5 2.Cf3 Cc6): solo estructura de prueba, sin contenido de lección. */
const FIXTURE_FEN = "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3";

export async function seedLessons(db: SupabaseClient, n = 12): Promise<{ bookId: string; lessonIds: string[] }> {
  const { data: book, error } = await db
    .from("books")
    .upsert({ title: "[E2E] Libro fixture", author: "E2E", license_note: "fixture de pruebas", file_hash: "e2e-fixture" }, { onConflict: "file_hash" })
    .select("id")
    .single();
  if (error || !book) throw new Error(`seed book: ${error?.message}`);
  const rows = Array.from({ length: n }, (_, i) => ({
    type: i % 2 ? "final" : "estrategia",
    title: `[E2E] Carta ${i + 1}`,
    summary: "Texto de relleno para pruebas automáticas.",
    body: "Texto de relleno para pruebas automáticas. No es una lección real.",
    fen: FIXTURE_FEN,
    topics: ["calculo_tactico"],
    // Temas amplios para que haya puzzles de sobra en el import de la beta.
    lichess_themes: ["middlegame", "advantage", "crushing", "fork", "mate"],
    elo_min: 1000,
    elo_max: 2200,
    book_id: book.id,
    chapter: "E2E",
    page_start: 1,
    page_end: 1,
    reviewed: true,
    dedupe_key: `e2e-${i}`,
  }));
  const { data, error: e2 } = await db.from("lessons").upsert(rows, { onConflict: "dedupe_key" }).select("id");
  if (e2 || !data) throw new Error(`seed lessons: ${e2?.message}`);
  return { bookId: book.id, lessonIds: data.map((r) => r.id) };
}

export async function createTestUser(db: SupabaseClient) {
  const email = `e2e+${Date.now()}@swipe-e2e.test`;
  const password = `E2e-${Math.random().toString(36).slice(2)}-Aa1`;
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error(`createUser: ${error?.message}`);
  return { id: data.user.id, email, password };
}

/** Inicia sesión y escribe las cookies EXACTAS que @supabase/ssr espera (las genera la propia librería). */
export async function loginContext(context: BrowserContext, baseURL: string, email: string, password: string) {
  const anon = createClient(E2E.url, E2E.anon, { auth: { persistSession: false } });
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(`signIn: ${error?.message}`);
  const jar: { name: string; value: string }[] = [];
  const ssr = createServerClient(E2E.url, E2E.anon, {
    cookies: {
      getAll: () => [],
      setAll: (cs) => {
        jar.push(...cs.map(({ name, value }) => ({ name, value })));
      },
    },
  });
  await ssr.auth.setSession({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
  const host = new URL(baseURL).hostname;
  await context.addCookies(jar.map((c) => ({ ...c, domain: host, path: "/", sameSite: "Lax" as const })));
}

export async function puzzleMoves(db: SupabaseClient, id: string): Promise<string[]> {
  const { data } = await db.from("puzzles").select("moves").eq("id", id).single();
  if (!data) throw new Error(`puzzle ${id} no encontrado`);
  return data.moves as string[];
}
