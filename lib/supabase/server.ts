import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, publicEnv, serverEnv } from "@/lib/env";

/** Cliente con la sesión del usuario (RLS aplica). */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Llamado desde un Server Component: proxy.ts ya refresca la sesión.
        }
      },
    },
  });
}

/**
 * Cliente service role: salta RLS. Usar SOLO en server actions / route handlers
 * después de validar la acción (descartes, días cumplidos, webhooks, garantía).
 */
export function createServiceClient() {
  return createPlainClient(publicEnv.supabaseUrl, serverEnv().serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** null si no hay sesión o si Supabase aún no está configurado (las páginas redirigen a /login). */
export async function getCurrentUser() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}
