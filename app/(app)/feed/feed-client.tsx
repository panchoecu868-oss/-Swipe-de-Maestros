"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Board } from "@/components/chess/Board";
import { DiscardRound, type DiscardSubmission } from "@/components/feed/DiscardRound";
import { Citation, LessonCard, type CardLesson } from "@/components/feed/LessonCard";
import { SwipeCard, type Gesture } from "@/components/feed/SwipeCard";
import { StreakBadge, StreakCelebration, StreakRiskBanner } from "@/components/streak/Streak";
import { milestoneCrossed } from "@/lib/deck/streak";
import { PuzzlePlayer, type PuzzleOutcome } from "@/components/puzzle/PuzzlePlayer";
import { completeReceive, finishDiscard, startDiscard, startReceive, type ClientPuzzle } from "./actions";

export interface FeedCard {
  lesson: CardLesson;
  forced: boolean;
}

type Mode =
  | { kind: "deck" }
  | { kind: "lesson"; checkpoint: ClientPuzzle | null }
  | { kind: "checkpoint"; checkpoint: ClientPuzzle }
  | { kind: "discard"; roundId: string; puzzles: ClientPuzzle[]; limitMs: number }
  | { kind: "result"; title: string; detail: string; tone: "good" | "bad" };

interface Props {
  initialCards: FeedCard[];
  resolvedToday: number;
  dailyTarget: number;
  dayCompleted: boolean;
  demoLeft: number | null;
  /** Racha acumulada hasta ayer (al cumplir hoy se suma 1). */
  streakBase: number;
  /** La racha está en riesgo (tarde y hoy sin cumplir), calculado en servidor con la hora local. */
  streakAtRiskHourReached: boolean;
}

export function FeedClient({ initialCards, resolvedToday, dailyTarget, dayCompleted, demoLeft, streakBase, streakAtRiskHourReached }: Props) {
  const router = useRouter();
  const [cards, setCards] = useState(initialCards);
  const [mode, setMode] = useState<Mode>({ kind: "deck" });
  const [progress, setProgress] = useState({ resolved: resolvedToday, completed: dayCompleted });
  const [error, setError] = useState<string | null>(null);
  const [paywall, setPaywall] = useState(demoLeft === 0);
  const [pending, startTransition] = useTransition();
  const [celebrate, setCelebrate] = useState(false);
  const streak = streakBase + (progress.completed ? 1 : 0);

  /** Actualiza el progreso y celebra si este gesto cumplió el día. */
  function updateProgress(r: { cardsResolved: number; dayCompleted: boolean }) {
    if (!progress.completed && r.dayCompleted) setCelebrate(true);
    setProgress({ resolved: r.cardsResolved, completed: r.dayCompleted });
  }
  const current = cards[0];

  function handleError(e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("PAYWALL")) setPaywall(true);
    else setError(msg);
    setMode({ kind: "deck" });
  }

  function nextCard(requeueForced = false) {
    setCards((cs) => {
      const [head, ...rest] = cs;
      // Descarte perdido: la carta vuelve forzada al final del mazo de hoy.
      return requeueForced && head ? [...rest, { ...head, forced: true }] : rest;
    });
  }

  function onGesture(g: Gesture) {
    if (!current) return;
    setError(null);
    const id = current.lesson.id;
    if (g === "play") return router.push(`/jugar/${id}`);
    startTransition(async () => {
      try {
        if (g === "receive") {
          const r = await startReceive(id);
          setMode({ kind: "lesson", checkpoint: r.checkpoint });
        } else {
          const r = await startDiscard(id);
          if ("error" in r) {
            setError(r.error);
            setMode({ kind: "deck" });
          } else setMode({ kind: "discard", ...r });
        }
      } catch (e) {
        handleError(e);
      }
    });
  }

  function onCheckpointDone(checkpoint: ClientPuzzle | null, o: PuzzleOutcome | null) {
    if (!current) return;
    startTransition(async () => {
      try {
        const r = await completeReceive({ lessonId: current.lesson.id, puzzleId: checkpoint?.id ?? null, moves: o?.moves ?? [], ms: o?.ms ?? 0 });
        updateProgress(r);
        setMode({
          kind: "result",
          tone: r.solved ? "good" : "bad",
          title: r.solved ? "Checkpoint superado" : "Checkpoint fallado",
          detail: "La carta entra a repetición espaciada.",
        });
        nextCard();
      } catch (e) {
        handleError(e);
      }
    });
  }

  function onDiscardFinish(roundId: string, s: DiscardSubmission) {
    startTransition(async () => {
      try {
        const r = await finishDiscard({ roundId, submitted: s.submitted });
        updateProgress(r);
        setMode({
          kind: "result",
          tone: r.won ? "good" : "bad",
          title: r.won ? "Carta descartada" : r.timedOut ? "Se acabó el tiempo" : "Ronda perdida",
          detail: r.won
            ? `Resolviste la ronda en ${(r.elapsedMs / 1000).toFixed(1)} s. Este tema aparecerá menos.`
            : "La carta vuelve forzada al mazo: tendrás que verla antes de poder descartarla. Este tema aparecerá más.",
        });
        nextCard(!r.won);
      } catch (e) {
        handleError(e);
      }
    });
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center gap-4 px-4 py-4">
      <header className="flex w-full items-center justify-between text-sm">
        <StreakBadge current={streak} completedToday={progress.completed} atRisk={streakAtRiskHourReached && !progress.completed} />
        <p aria-live="polite">
          Hoy: <strong>{Math.min(progress.resolved, dailyTarget)}</strong>/{dailyTarget}
          {progress.completed && " ✓ día cumplido"}
        </p>
      </header>
      {celebrate && <StreakCelebration streak={streak} milestone={milestoneCrossed(streakBase, streak)} onClose={() => setCelebrate(false)} />}
      {streakAtRiskHourReached && !progress.completed && <StreakRiskBanner current={streakBase} remainingCards={Math.max(0, dailyTarget - progress.resolved)} />}
      {demoLeft !== null && !paywall && <p className="text-xs text-muted">Modo demo: te quedan {demoLeft} cartas gratis.</p>}
      {error && <p role="alert" className="w-full rounded-lg border border-danger p-2 text-sm text-danger">{error}</p>}

      {paywall ? (
        <section className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-xl font-bold">Terminaste tus cartas de demo</h1>
          <p className="text-muted">Suscríbete para tu mazo diario de 10 cartas, repasos y la garantía.</p>
          <Link href="/#precios" className="btn-primary">Ver planes</Link>
        </section>
      ) : mode.kind === "discard" ? (
        <DiscardRound puzzles={mode.puzzles} limitMs={mode.limitMs} onFinish={(s) => onDiscardFinish(mode.roundId, s)} />
      ) : mode.kind === "lesson" && current ? (
        <section className="flex w-full flex-col gap-3">
          <h1 className="text-xl font-bold">{current.lesson.title}</h1>
          <Board fen={current.lesson.fen} id={`lesson-${current.lesson.id}`} />
          <p className="whitespace-pre-line">{current.lesson.body}</p>
          <Citation lesson={current.lesson} />
          <button
            type="button"
            className="btn-primary"
            disabled={pending}
            onClick={() => (mode.checkpoint ? setMode({ kind: "checkpoint", checkpoint: mode.checkpoint }) : onCheckpointDone(null, null))}
          >
            {mode.checkpoint ? "Ir al puzzle de control" : "Hecho"}
          </button>
        </section>
      ) : mode.kind === "checkpoint" ? (
        <section className="flex w-full flex-col items-center gap-2">
          <h1 className="text-lg font-semibold">Puzzle de control</h1>
          <PuzzlePlayer puzzle={mode.checkpoint} onDone={(o) => onCheckpointDone(mode.checkpoint, o)} />
        </section>
      ) : mode.kind === "result" ? (
        <section role="status" className="flex flex-col items-center gap-3 text-center">
          <h1 className={`text-xl font-bold ${mode.tone === "good" ? "text-accent" : "text-danger"}`}>{mode.title}</h1>
          <p className="text-muted">{mode.detail}</p>
          <button type="button" className="btn-primary" onClick={() => setMode({ kind: "deck" })} autoFocus>
            Siguiente carta
          </button>
        </section>
      ) : current ? (
        <SwipeCard key={`${current.lesson.id}-${cards.length}`} onGesture={onGesture} canDiscard={!current.forced} disabled={pending}>
          <LessonCard lesson={current.lesson} forced={current.forced} />
        </SwipeCard>
      ) : (
        <section className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-xl font-bold">{progress.completed ? "¡Día cumplido!" : "No hay más cartas por hoy"}</h1>
          <p className="text-muted">Vuelve mañana para tu próximo mazo.</p>
        </section>
      )}
    </main>
  );
}
