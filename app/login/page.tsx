import { isSupabaseConfigured } from "@/lib/env";
import { LoginForm } from "./login-form";

export const metadata = { title: "Entrar · Swipe de Maestros" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "/feed";
  const error = params.error === "auth";
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-4">
      <h1 className="text-2xl font-bold">Entrar</h1>
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">No pudimos validar el enlace. Pide uno nuevo.</p>}
      {isSupabaseConfigured() ? (
        <LoginForm next={next} />
      ) : (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Supabase no está configurado. Copia <code>.env.example</code> a <code>.env.local</code> y completa las claves.
        </p>
      )}
    </main>
  );
}
