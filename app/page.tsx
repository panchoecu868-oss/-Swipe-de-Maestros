import Link from "next/link";
import { GestureDemo } from "@/components/landing/GestureDemo";
import { GAME_CONFIG } from "@/config/game";
import { GUARANTEE } from "@/config/guarantee";
import { PRICING } from "@/config/pricing";
import { guaranteeTerms } from "@/lib/guarantee/terms";

const VALUE = [
  { t: `Mazo diario de ${GAME_CONFIG.DAILY_DECK_SIZE} cartas`, d: "Personalizado con tu ELO, tu repertorio y tu autoevaluación. Sin importar tus partidas." },
  { t: "Lecciones de libros, con cita", d: "Resúmenes de ~1 minuto de libros de ajedrez, cada uno con libro, capítulo y página, revisados a mano." },
  { t: "Puzzles reales de Lichess", d: "De la base oficial de puzzles de Lichess, del mismo motivo que la lección y en tu rango." },
  { t: "Stockfish a tu medida", d: "Juega cada posición contra Stockfish con fuerza limitada a tu nivel y un objetivo claro." },
  { t: "Repetición espaciada", d: "Lo que recibes vuelve justo cuando lo estás por olvidar (SM-2)." },
  { t: "Garantía medible", d: `Seguimiento en vivo de tu rating público contra la meta de +${GUARANTEE.TARGET_DELTA}.` },
];

const FAQ = [
  { q: "¿Leen mis partidas?", a: "No. Solo leemos tu rating público y tu número de partidas en tu ritmo declarado, al activar la suscripción y durante el plazo de la garantía." },
  { q: "¿De dónde sale el contenido?", a: "De tres fuentes verificables: la base de puzzles de Lichess (licencia CC0), el motor Stockfish y resúmenes de libros con cita de libro, capítulo y página, aprobados uno por uno antes de publicarse." },
  { q: "¿Cuánto tiempo al día?", a: `${GAME_CONFIG.DAILY_DECK_SIZE} cartas: unos 10–15 minutos. Resolver las ${GAME_CONFIG.DAILY_DECK_SIZE} cuenta como día cumplido.` },
  { q: "¿Para qué nivel es?", a: `Trabajamos entre ${GAME_CONFIG.ELO_MIN} y ${GAME_CONFIG.ELO_MAX} de ELO FIDE (o su estimado en Chess.com/Lichess).` },
  { q: "¿Puedo probar antes?", a: `Sí: tienes ${GAME_CONFIG.DEMO_CARDS} cartas de demo sin pagar.` },
  { q: "¿Cómo cancelo?", a: "Desde tu cuenta de Whop, en cualquier momento. Ojo: para la garantía la suscripción debe mantenerse activa todo el plazo." },
];

export default function Home() {
  const terms = guaranteeTerms();
  const yearlySaving = Math.round((1 - PRICING.yearly.price / (PRICING.monthly.price * 12)) * 100);
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-16 px-4 py-10">
      <section className="flex flex-col items-center gap-5 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">Swipe de Maestros</p>
        <h1 className="text-4xl font-bold leading-tight sm:text-5xl">Entrena ajedrez como los maestros, una carta a la vez</h1>
        <p className="max-w-2xl text-lg text-muted">
          Lecciones de 1 minuto sacadas de los libros clásicos, puzzles de Lichess del mismo motivo y la posición lista para jugarla contra Stockfish. Desliza, aprende, repite.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/login?next=/onboarding" className="btn-primary">Probar {GAME_CONFIG.DEMO_CARDS} cartas gratis</Link>
          <a href="#precios" className="btn-secondary">Ver precios</a>
        </div>
        <p className="text-sm">
          <strong>{terms.title}.</strong>{" "}
          <Link href="/garantia/terminos" className="underline">Términos</Link>
        </p>
      </section>

      <section aria-labelledby="como" className="flex flex-col gap-6">
        <h2 id="como" className="text-center text-3xl font-bold">Cómo funciona: 3 gestos</h2>
        <GestureDemo />
      </section>

      <section aria-labelledby="valor" className="flex flex-col gap-6">
        <h2 id="valor" className="text-center text-3xl font-bold">Qué incluye</h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {VALUE.map((v) => (
            <li key={v.t} className="rounded-2xl border border-border bg-surface p-4">
              <h3 className="font-semibold">{v.t}</h3>
              <p className="text-sm text-muted">{v.d}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="precios" aria-labelledby="precios-t" className="flex flex-col gap-6">
        <h2 id="precios-t" className="text-center text-3xl font-bold">Precios</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {(["monthly", "yearly"] as const).map((k) => (
            <div key={k} className={`flex flex-col gap-3 rounded-2xl border p-6 ${k === "yearly" ? "border-accent" : "border-border"} bg-surface`}>
              <h3 className="text-xl font-semibold">{PRICING[k].label}</h3>
              <p>
                <span className="text-4xl font-bold">{PRICING[k].price} USD</span>
                <span className="text-muted"> / {PRICING[k].period}</span>
              </p>
              {k === "yearly" && <p className="text-sm text-accent">Ahorras {yearlySaving}% frente al plan mensual</p>}
              <Link href={`/suscribirse?plan=${k}`} className={k === "yearly" ? "btn-primary text-center" : "btn-secondary text-center"}>
                Suscribirme
              </Link>
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-muted">Pago seguro procesado por Whop.</p>
      </section>

      <section aria-labelledby="garantia" className="flex flex-col gap-3 rounded-2xl border border-accent p-6">
        <h2 id="garantia" className="text-2xl font-bold">Garantía</h2>
        <p>{terms.title}.</p>
        <p className="text-sm text-muted">
          Condiciones: {GUARANTEE.MIN_COMPLETED_DAYS} días cumplidos y {GUARANTEE.MIN_GAMES} partidas en tu ritmo dentro de los {GUARANTEE.WINDOW_DAYS} días.
        </p>
        <Link href="/garantia/terminos" className="underline">Leer los términos completos</Link>
      </section>

      <section aria-labelledby="faq" className="flex flex-col gap-4">
        <h2 id="faq" className="text-center text-3xl font-bold">Preguntas frecuentes</h2>
        {FAQ.map((f) => (
          <details key={f.q} className="rounded-xl border border-border bg-surface p-4">
            <summary className="cursor-pointer font-semibold">{f.q}</summary>
            <p className="mt-2 text-sm text-muted">{f.a}</p>
          </details>
        ))}
      </section>

      <footer className="flex flex-wrap justify-center gap-4 border-t border-border pt-6 text-sm text-muted">
        <Link href="/garantia/terminos">Términos de la garantía</Link>
        <Link href="/licencias">Licencias</Link>
        <Link href="/login">Entrar</Link>
      </footer>
    </main>
  );
}
