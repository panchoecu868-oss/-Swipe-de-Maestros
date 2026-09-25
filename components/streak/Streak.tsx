"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import type { Milestone } from "@/lib/deck/streak";

function Flame({ lit }: { lit: boolean }) {
  return (
    <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" className={lit ? "text-orange-500" : "text-muted"}>
      <path
        fill={lit ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        d="M12 2c1 3.5-1.5 5.5-1.5 8 0 1.4 1 2.5 2.3 2.5 1.7 0 2.7-1.6 2.2-3.8C17.6 10.5 19 13 19 15.5 19 19.1 15.9 22 12 22s-7-2.9-7-6.5C5 10 10 8 12 2z"
      />
    </svg>
  );
}

export interface StreakBadgeProps {
  current: number;
  completedToday: boolean;
  atRisk: boolean;
  href?: string;
}

/** Insignia de racha: encendida si hoy ya se cumplió, en rojo si está en riesgo. */
export function StreakBadge({ current, completedToday, atRisk, href = "/progreso" }: StreakBadgeProps) {
  const label = atRisk
    ? `Racha de ${current} días en riesgo: completa tu mazo hoy`
    : completedToday
      ? `Racha de ${current} días, hoy cumplido`
      : `Racha de ${current} días, hoy pendiente`;
  return (
    <Link
      href={href}
      aria-label={label}
      data-testid="streak-badge"
      data-state={atRisk ? "risk" : completedToday ? "done" : "pending"}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-sm font-semibold ${
        atRisk ? "border-danger text-danger" : completedToday ? "border-orange-500" : "border-border"
      }`}
    >
      <Flame lit={completedToday} />
      {current}
      {atRisk && <span className="text-xs font-normal">¡hoy!</span>}
    </Link>
  );
}

/** Aviso de racha en riesgo (se muestra en el feed por la noche). */
export function StreakRiskBanner({ current, remainingCards }: { current: number; remainingCards: number }) {
  return (
    <p role="status" className="w-full rounded-lg border border-danger p-2 text-center text-sm text-danger">
      Tu racha de {current} {current === 1 ? "día" : "días"} vence hoy: te faltan {remainingCards} {remainingCards === 1 ? "carta" : "cartas"}.
    </p>
  );
}

/** Celebración al completar el día (diálogo accesible, se cierra con Escape). */
export function StreakCelebration({ streak, milestone, onClose }: { streak: number; milestone: Milestone | null; onClose: () => void }) {
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    button.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="streak-title" className="flex w-full max-w-xs flex-col items-center gap-3 rounded-3xl bg-surface p-6 text-center shadow-xl">
        <div className="text-5xl" aria-hidden>🔥</div>
        <h2 id="streak-title" className="text-2xl font-bold">¡Día cumplido!</h2>
        <p className="text-lg">
          Racha: <strong>{streak}</strong> {streak === 1 ? "día" : "días"}
        </p>
        {milestone && (
          <p className="rounded-full bg-accent px-3 py-1 text-sm font-semibold text-accent-contrast">
            Hito: {milestone.days} días · {milestone.label}
          </p>
        )}
        <button ref={button} type="button" className="btn-primary w-full" onClick={onClose}>
          Seguir
        </button>
      </div>
    </div>
  );
}

/** Franja de hitos para /progreso. */
export function MilestoneStrip({ milestones, longest, current }: { milestones: Milestone[]; longest: number; current: number }) {
  const next = milestones.find((m) => m.days > current);
  return (
    <section aria-labelledby="hitos" className="flex flex-col gap-3">
      <h2 id="hitos" className="font-semibold">Hitos de racha</h2>
      <ol className="flex flex-wrap gap-2">
        {milestones.map((m) => {
          const got = longest >= m.days;
          return (
            <li
              key={m.days}
              aria-label={`${m.days} días, ${m.label}: ${got ? "conseguido" : "pendiente"}`}
              className={`flex flex-col items-center rounded-xl border px-3 py-2 text-xs ${got ? "border-orange-500 bg-surface" : "border-border text-muted"}`}
            >
              <span className="text-lg font-bold">{m.days}</span>
              <span>{m.label}</span>
            </li>
          );
        })}
      </ol>
      {next && (
        <div>
          <p className="text-sm">
            Próximo hito: <strong>{next.days} días</strong> — te faltan {next.days - current}.
          </p>
          <div className="mt-1 h-2 rounded bg-border" aria-hidden>
            <div className="h-2 rounded bg-orange-500" style={{ width: `${Math.min(100, (current / next.days) * 100)}%` }} />
          </div>
        </div>
      )}
    </section>
  );
}
