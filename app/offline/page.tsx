export const metadata = { title: "Sin conexión · Swipe de Maestros" };

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-2xl font-bold">Sin conexión</h1>
      <p className="text-muted">Tu progreso se guarda en el servidor: vuelve a intentarlo cuando tengas internet.</p>
    </main>
  );
}
