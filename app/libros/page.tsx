import Link from "next/link";
import { gutenbergPage, PUBLIC_DOMAIN_BOOKS } from "@/config/public-domain-books";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Libros · Swipe de Maestros" };
export const dynamic = "force-dynamic";

interface CatalogRow {
  title: string;
  author: string;
  year: number | null;
  license_note: string;
  public_domain: boolean;
  source_url: string | null;
  approved_lessons: number;
}

async function loadCatalog(): Promise<CatalogRow[]> {
  if (!isSupabaseConfigured()) return [];
  const { data } = await (await createClient()).rpc("book_catalog");
  return (data ?? []) as CatalogRow[];
}

export default async function BooksPage() {
  const rows = await loadCatalog();
  const count = (sourceUrl: string) => rows.find((r) => r.source_url === sourceUrl)?.approved_lessons ?? 0;
  const others = rows.filter((r) => !r.public_domain);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <Link href="/" className="text-sm underline-offset-2 hover:underline">← Inicio</Link>
      <header>
        <h1 className="text-3xl font-bold">Biblioteca</h1>
        <p className="mt-2 text-muted">
          Cada lección es un resumen propio de un libro, con cita de capítulo y página, revisado a mano antes de publicarse. Estos son los clásicos de dominio público de los que salen.
        </p>
      </header>

      <section aria-labelledby="pd" className="flex flex-col gap-3">
        <h2 id="pd" className="text-xl font-semibold">Dominio público</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {PUBLIC_DOMAIN_BOOKS.map((b) => {
            const url = gutenbergPage(b.gutenbergId);
            const n = count(url);
            return (
              <li key={b.slug} className="flex flex-col gap-1 rounded-2xl border border-border bg-surface p-4">
                <h3 className="font-semibold">{b.title}</h3>
                <p className="text-sm">{b.author} · {b.year}</p>
                <p className="text-xs text-muted">Notación {b.notation} · {n > 0 ? `${n} lecciones publicadas` : "lecciones en preparación"}</p>
                <a href={url} target="_blank" rel="noreferrer" className="mt-auto text-sm underline">Leer en Project Gutenberg (#{b.gutenbergId})</a>
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-muted">
          Dominio público en EE. UU. según Project Gutenberg. Las lecciones son resúmenes en palabras propias; las posiciones se verifican con chess.js y, cuando el libro trae el diagrama dibujado, se leen del propio diagrama.
        </p>
      </section>

      {others.length > 0 && (
        <section aria-labelledby="otros" className="flex flex-col gap-3">
          <h2 id="otros" className="text-xl font-semibold">Otras obras citadas</h2>
          <ul className="flex flex-col gap-2 text-sm">
            {others.map((b) => (
              <li key={`${b.title}-${b.author}`}>
                <cite>{b.title}</cite> — {b.author}{b.year ? ` (${b.year})` : ""} · {b.approved_lessons} lecciones
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
