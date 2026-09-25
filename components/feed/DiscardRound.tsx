"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { PuzzlePlayer, type PuzzleOutcome } from "@/components/puzzle/PuzzlePlayer";
import type { ClientPuzzle } from "@/app/(app)/feed/actions";

export interface DiscardSubmission {
  submitted: { puzzleId: string; moves: string[]; ms: number }[];
}

interface Props {
  puzzles: ClientPuzzle[];
  limitMs: number;
  onFinish: (s: DiscardSubmission) => void;
}

/** Ronda de descarte: N puzzles seguidos con UN temporizador total. Un fallo o el fin del tiempo terminan la ronda. */
export function DiscardRound({ puzzles, limitMs, onFinish }: Props) {
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState(limitMs);
  const submitted = useRef<DiscardSubmission["submitted"]>([]);
  const finished = useRef(false);
  const start = useRef<number | null>(null);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    onFinish({ submitted: submitted.current });
  }, [onFinish]);

  useEffect(() => {
    start.current = performance.now();
    const t = setInterval(() => {
      const left = limitMs - (performance.now() - (start.current ?? 0));
      setRemaining(Math.max(0, left));
      if (left <= 0) {
        clearInterval(t);
        finish();
      }
    }, 100);
    return () => clearInterval(t);
  }, [limitMs, finish]);

  function onDone(o: PuzzleOutcome) {
    submitted.current.push({ puzzleId: puzzles[index].id, moves: o.moves, ms: o.ms });
    if (!o.solved || index + 1 >= puzzles.length) return finish();
    setIndex((i) => i + 1);
  }

  const secs = (remaining / 1000).toFixed(1);
  const pct = (remaining / limitMs) * 100;
  return (
    <section aria-label="Ronda de descarte" className="flex w-full max-w-md flex-col items-center gap-3">
      <div className="flex w-full items-center justify-between text-sm">
        <span>
          Puzzle {Math.min(index + 1, puzzles.length)} de {puzzles.length}
        </span>
        <span role="timer" aria-live="off" className={`font-mono text-lg font-bold ${remaining < 3000 ? "text-danger" : ""}`}>
          {secs}s
        </span>
      </div>
      <div className="h-2 w-full rounded bg-border" aria-hidden>
        <div className={`h-2 rounded ${remaining < 3000 ? "bg-danger" : "bg-accent"}`} style={{ width: `${pct}%` }} />
      </div>
      <PuzzlePlayer key={puzzles[index].id} puzzle={puzzles[index]} onDone={onDone} disabled={remaining <= 0} opponentDelayMs={250} />
    </section>
  );
}
