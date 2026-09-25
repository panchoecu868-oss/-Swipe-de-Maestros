"use client";
import { useState } from "react";
import { DiscardRound } from "@/components/feed/DiscardRound";
import { LessonCard } from "@/components/feed/LessonCard";
import { SwipeCard } from "@/components/feed/SwipeCard";
import { PuzzlePlayer } from "@/components/puzzle/PuzzlePlayer";
import { HARNESS_LESSON, HARNESS_PUZZLES } from "./fixtures";

export function HarnessClient({ view, limitMs, forced }: { view: string; limitMs: number; forced: boolean }) {
  const [log, setLog] = useState<string[]>([]);
  const push = (s: string) => setLog((l) => [...l, s]);
  const [key, setKey] = useState(0);

  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-4 p-4">
      {view === "swipe" && (
        <SwipeCard
          key={key}
          canDiscard={!forced}
          onGesture={(g) => {
            push(g);
            setKey((k) => k + 1);
          }}
        >
          <LessonCard lesson={HARNESS_LESSON} forced={forced} />
        </SwipeCard>
      )}
      {view === "puzzle" && (
        <PuzzlePlayer puzzle={HARNESS_PUZZLES[0]} onDone={(o) => push(JSON.stringify({ solved: o.solved, moves: o.moves }))} />
      )}
      {view === "discard" && (
        <DiscardRound
          puzzles={HARNESS_PUZZLES.slice(0, 3)}
          limitMs={limitMs}
          onFinish={(s) => push(JSON.stringify(s.submitted.map((x) => ({ id: x.puzzleId, moves: x.moves }))))}
        />
      )}
      <output data-testid="log" className="w-full break-all font-mono text-xs">
        {log.join("\n")}
      </output>
    </main>
  );
}
