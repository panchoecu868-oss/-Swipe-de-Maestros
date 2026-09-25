"use client";
import { useEffect } from "react";
import { motion, useMotionValue, useReducedMotion, useTransform, animate, type PanInfo } from "framer-motion";

export type Gesture = "receive" | "discard" | "play";

const THRESHOLD = 110;

interface Props {
  children: React.ReactNode;
  onGesture: (g: Gesture) => void;
  canDiscard: boolean;
  disabled?: boolean;
}

/** Carta con los 3 gestos: → recibir, ← descartar, ↑ jugar contra Stockfish. También teclado y botones. */
export function SwipeCard({ children, onGesture, canDiscard, disabled }: Props) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-240, 240], [-14, 14]);
  const reduce = useReducedMotion();
  const receiveOpacity = useTransform(x, [20, THRESHOLD], [0, 1]);
  const discardOpacity = useTransform(x, [-THRESHOLD, -20], [1, 0]);
  const playOpacity = useTransform(y, [-THRESHOLD, -20], [1, 0]);

  async function fly(g: Gesture) {
    if (disabled) return;
    if (g === "discard" && !canDiscard) {
      await animate(x, 0, { type: "spring", stiffness: 500, damping: 30 });
      return;
    }
    if (!reduce) {
      const to = g === "receive" ? { x: 600, y: 0 } : g === "discard" ? { x: -600, y: 0 } : { x: 0, y: -800 };
      await Promise.all([animate(x, to.x, { duration: 0.25 }), animate(y, to.y, { duration: 0.25 })]);
    }
    onGesture(g);
  }

  function onDragEnd(_: unknown, info: PanInfo) {
    const { offset } = info;
    if (offset.y < -THRESHOLD && Math.abs(offset.y) > Math.abs(offset.x)) return void fly("play");
    if (offset.x > THRESHOLD) return void fly("receive");
    if (offset.x < -THRESHOLD) return void fly("discard");
    animate(x, 0, { type: "spring", stiffness: 500, damping: 30 });
    animate(y, 0, { type: "spring", stiffness: 500, damping: 30 });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowRight") fly("receive");
      else if (e.key === "ArrowLeft") fly("discard");
      else if (e.key === "ArrowUp") fly("play");
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <motion.div
        data-testid="swipe-card"
        className="relative w-full max-w-sm touch-none select-none"
        style={{ x, y, rotate }}
        drag={!disabled}
        dragSnapToOrigin={false}
        dragElastic={0.6}
        onDragEnd={onDragEnd}
      >
        <motion.span aria-hidden style={{ opacity: receiveOpacity }} className="absolute left-4 top-4 z-10 rounded-lg border-2 border-accent px-2 font-bold text-accent">RECIBIR</motion.span>
        <motion.span aria-hidden style={{ opacity: discardOpacity }} className="absolute right-4 top-4 z-10 rounded-lg border-2 border-danger px-2 font-bold text-danger">DESCARTAR</motion.span>
        <motion.span aria-hidden style={{ opacity: playOpacity }} className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-lg border-2 border-foreground px-2 font-bold">JUGAR</motion.span>
        {children}
      </motion.div>
      <div className="grid w-full max-w-sm grid-cols-3 gap-2" role="group" aria-label="Acciones de la carta">
        <button type="button" className="btn-secondary text-sm" onClick={() => fly("discard")} disabled={disabled || !canDiscard} title={canDiscard ? "Descartar (←)" : "Carta forzada: primero tienes que verla"}>
          ← Descartar
        </button>
        <button type="button" className="btn-secondary text-sm" onClick={() => fly("play")} disabled={disabled}>
          ↑ Jugar
        </button>
        <button type="button" className="btn-primary text-sm" onClick={() => fly("receive")} disabled={disabled}>
          Recibir →
        </button>
      </div>
    </div>
  );
}
