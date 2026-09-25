import Link from "next/link";

// Landing provisional: la versión completa (promesa, 3 gestos, precios, FAQ) llega en la Fase 9.
export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4">
      <h1 className="text-3xl font-bold">Swipe de Maestros</h1>
      <p className="text-muted">Entrenamiento de ajedrez en español, una carta a la vez.</p>
      <Link href="/login" className="btn-primary text-center">
        Entrar
      </Link>
    </main>
  );
}
