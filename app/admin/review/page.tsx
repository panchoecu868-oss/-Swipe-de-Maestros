import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { ReviewForm, type ReviewLesson } from "./review-form";

export const metadata = { title: "Revisión de lecciones" };

export default async function ReviewPage({ searchParams }: PageProps<"/admin/review">) {
  await requireAdmin();
  const { id } = await searchParams;
  const db = createServiceClient();

  const pending = await db
    .from("lessons")
    .select("id, title", { count: "exact" })
    .eq("reviewed", false)
    .eq("rejected", false)
    .order("created_at")
    .limit(50);

  const targetId = typeof id === "string" ? id : pending.data?.[0]?.id;
  if (!targetId) {
    return (
      <main className="mx-auto max-w-3xl p-4">
        <h1 className="text-2xl font-bold">Revisión de lecciones</h1>
        <p className="mt-4 text-muted">No hay lecciones pendientes. Genera más con <code>npm run build:lessons</code>.</p>
      </main>
    );
  }

  const { data: lesson } = await db
    .from("lessons")
    .select("*, books(title, author, year, citation_unit, public_domain, source_url), lesson_sources(position_source, position_quote, moves_san, source_pages_text, model)")
    .eq("id", targetId)
    .single();

  return (
    <main className="mx-auto max-w-5xl p-4">
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold">Revisión de lecciones</h1>
        <p className="text-sm text-muted">{pending.count ?? 0} pendientes</p>
      </header>
      <nav aria-label="Pendientes" className="mb-4 flex gap-2 overflow-x-auto text-sm">
        {pending.data?.map((l, i) => (
          <Link
            key={l.id}
            href={`/admin/review?id=${l.id}`}
            aria-current={l.id === targetId ? "page" : undefined}
            className={`shrink-0 rounded-full border border-border px-3 py-1 ${l.id === targetId ? "bg-accent text-accent-contrast" : ""}`}
          >
            {i + 1}. {l.title}
          </Link>
        ))}
      </nav>
      {lesson ? <ReviewForm key={lesson.id} lesson={lesson as unknown as ReviewLesson} /> : <p>No encontrada.</p>}
    </main>
  );
}
