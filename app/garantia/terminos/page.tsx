import Link from "next/link";
import { guaranteeTerms } from "@/lib/guarantee/terms";

export const metadata = { title: "Términos de la garantía · Swipe de Maestros" };

export default function TermsPage() {
  const t = guaranteeTerms();
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-8">
      <Link href="/" className="text-sm underline-offset-2 hover:underline">← Inicio</Link>
      <h1 className="text-2xl font-bold">Términos de la garantía</h1>
      <p className="text-lg">{t.title}.</p>
      <ol className="list-decimal space-y-3 pl-5">
        {t.clauses.map((c) => <li key={c}>{c}</li>)}
      </ol>
    </main>
  );
}
