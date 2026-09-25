"use client";
import { motion, useReducedMotion } from "framer-motion";

interface Gesture {
  key: string;
  arrow: string;
  title: string;
  text: string;
  anim: { x?: number[]; y?: number[]; rotate?: number[]; opacity: number[] };
}

const GESTURES: Gesture[] = [
  { key: "receive", arrow: "→", title: "Recibir", text: "Lees la lección completa (≈1 minuto) y cierras con un puzzle del mismo motivo. La carta entra a repetición espaciada.", anim: { x: [0, 0, 140], rotate: [0, 0, 12], opacity: [1, 1, 0] } },
  { key: "discard", arrow: "←", title: "Descartar", text: "¿Ya lo dominas? Demuéstralo: 3 puzzles del tema en 10 segundos. Si fallas, la carta vuelve forzada.", anim: { x: [0, 0, -140], rotate: [0, 0, -12], opacity: [1, 1, 0] } },
  { key: "play", arrow: "↑", title: "Jugarlo", text: "Llévalo al tablero: juega la posición contra Stockfish ajustado a tu nivel, con un objetivo concreto.", anim: { y: [0, 0, -120], opacity: [1, 1, 0] } },
];

export function GestureDemo() {
  const reduce = useReducedMotion();
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {GESTURES.map((g) => (
        <div key={g.key} className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-4 text-center">
          <div className="relative flex h-32 w-24 items-center justify-center" aria-hidden>
            <div className="absolute inset-0 rounded-xl border border-dashed border-border" />
            <motion.div
              className="absolute inset-0 flex items-center justify-center rounded-xl bg-accent text-3xl font-bold text-accent-contrast shadow"
              animate={reduce ? undefined : g.anim}
              transition={{ duration: 2.4, times: [0, 0.45, 1], repeat: Infinity, repeatDelay: 0.6, ease: "easeInOut" }}
            >
              {g.arrow}
            </motion.div>
          </div>
          <h3 className="text-lg font-semibold">
            {g.arrow} {g.title}
          </h3>
          <p className="text-sm text-muted">{g.text}</p>
        </div>
      ))}
    </div>
  );
}
