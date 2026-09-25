"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { Board } from "@/components/chess/Board";
import { PuzzleSession } from "@/lib/chess/puzzle";
import { parseUci } from "@/lib/chess/uci";

export interface PuzzleOutcome {
  solved: boolean;
  moves: string[];
  ms: number;
}

interface Props {
  puzzle: { id: string; fen: string; moves: string[] };
  onDone: (o: PuzzleOutcome) => void;
  /** Bloquea el tablero (p. ej. se acabó el tiempo). */
  disabled?: boolean;
  opponentDelayMs?: number;
}

function fenAfter(fen: string, uci: string) {
  const c = new Chess(fen);
  c.move(parseUci(uci));
  return c.fen();
}

/** Juega un puzzle de Lichess: anima la jugada del rival (moves[0]) y luego valida cada jugada. */
export function PuzzlePlayer({ puzzle, onDone, disabled, opponentDelayMs = 450 }: Props) {
  const session = useMemo(() => new PuzzleSession(puzzle), [puzzle]);
  const [fen, setFen] = useState(session.prepared.initialFen);
  const [phase, setPhase] = useState<"intro" | "playing" | "reply" | "solved" | "failed">("intro");
  const [last, setLast] = useState<[string, string] | null>(null);
  const [wrong, setWrong] = useState<string | null>(null);
  const moves = useRef<string[]>([]);
  const startedAt = useRef(0);
  const done = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => {
      const u = parseUci(session.prepared.opponentMove);
      setFen(session.prepared.startFen);
      setLast([u.from, u.to]);
      setPhase("playing");
      startedAt.current = performance.now();
    }, opponentDelayMs);
    return () => clearTimeout(t);
  }, [session, opponentDelayMs]);

  function finish(solved: boolean) {
    if (done.current) return;
    done.current = true;
    onDone({ solved, moves: [...moves.current], ms: performance.now() - startedAt.current });
  }

  function onMove(uci: string): boolean {
    if (phase !== "playing" || disabled) return false;
    moves.current.push(uci);
    const v = session.play(uci);
    if (v.kind === "wrong") {
      setWrong(uci.slice(2, 4));
      setPhase("failed");
      finish(false);
      return false;
    }
    const afterUser = fenAfter(fen, uci);
    setFen(afterUser);
    setLast([uci.slice(0, 2), uci.slice(2, 4)]);
    if (v.kind === "solved") {
      setPhase("solved");
      finish(true);
      return true;
    }
    setPhase("reply");
    setTimeout(() => {
      setFen(v.fen);
      if (v.reply) setLast([v.reply.slice(0, 2), v.reply.slice(2, 4)]);
      setPhase("playing");
    }, 300);
    return true;
  }

  const highlight: Record<string, "last" | "wrong"> = {};
  if (last) for (const sq of last) highlight[sq] = "last";
  if (wrong) highlight[wrong] = "wrong";
  const color = session.prepared.playerColor;

  return (
    <div className="flex flex-col items-center gap-2" data-puzzle-id={puzzle.id} data-phase={phase}>
      <p aria-live="polite" className="text-sm font-medium">
        {phase === "intro" && "Mira la jugada del rival…"}
        {phase === "playing" && `Juegan las ${color === "white" ? "blancas" : "negras"}: encuentra la mejor jugada`}
        {phase === "reply" && "Bien. Responde el rival…"}
        {phase === "solved" && "¡Resuelto!"}
        {phase === "failed" && "Jugada incorrecta"}
      </p>
      <Board fen={fen} orientation={color} onMove={phase === "playing" && !disabled ? onMove : undefined} highlight={highlight} id={`pz-${puzzle.id}`} />
    </div>
  );
}
