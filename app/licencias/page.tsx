import Link from "next/link";

export const metadata = { title: "Licencias · Swipe de Maestros" };

export default function LicensesPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-8">
      <Link href="/" className="text-sm underline-offset-2 hover:underline">← Inicio</Link>
      <h1 className="text-2xl font-bold">Licencias</h1>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Stockfish — GPL-3.0</h2>
        <p className="text-sm">
          Esta app distribuye Stockfish 19 Lite WASM (stockfish.js 19.0.0) bajo la GNU General Public License v3. Corre en tu navegador como programa separado y se comunica por el protocolo UCI.
        </p>
        <ul className="list-disc pl-5 text-sm">
          <li><a className="underline" href="/stockfish/COPYING.txt">Texto de la licencia</a></li>
          <li><a className="underline" href="https://github.com/nmrugg/stockfish.js/tree/v19.0.0">Código fuente correspondiente (stockfish.js v19.0.0)</a></li>
          <li><a className="underline" href="https://github.com/official-stockfish/Stockfish">Stockfish</a></li>
        </ul>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Puzzles de Lichess — CC0</h2>
        <p className="text-sm">
          Los puzzles provienen de la <a className="underline" href="https://database.lichess.org/#puzzles">base de datos de Lichess</a>, publicada bajo Creative Commons CC0. Gracias a Lichess y a su comunidad.
        </p>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Nombres de aperturas — CC0</h2>
        <p className="text-sm">
          Taxonomía de aperturas de <a className="underline" href="https://github.com/lichess-org/chess-openings">lichess-org/chess-openings</a>.
        </p>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Software</h2>
        <p className="text-sm">Next.js, React, react-chessboard, framer-motion, Supabase (MIT); chess.js (BSD-2-Clause).</p>
      </section>
    </main>
  );
}
