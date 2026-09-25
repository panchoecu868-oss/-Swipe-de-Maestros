/** Variables públicas. Si faltan, la app corre en "modo sin backend" (landing y demo). */
export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
};

export function isSupabaseConfigured(): boolean {
  return Boolean(publicEnv.supabaseUrl && publicEnv.supabaseAnonKey);
}

/** Solo servidor. Lanza si se usa sin configurar, para no fallar en silencio. */
export function serverEnv() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY");
  return {
    serviceRoleKey,
    adminEmail: (process.env.ADMIN_EMAIL ?? "").toLowerCase(),
  };
}
