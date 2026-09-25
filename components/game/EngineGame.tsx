"use client";
import { useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import { Board } from "@/components/chess/Board";
import { ENGINE_FILE, ENGINE_OBJECTIVES } from "@/config/engine";
import { Engine, workerTransport } from "@/lib/engine/engine-client";
import { gameOverFor } from "@/lib/engine/game-state";
import { chooseObjective, judge, type Objective, type Verdict } from "@/lib/engine/objective";
import type { EngineMode } from "@/lib/engine/strength";

export interface GameResult {
  objective: Objective;
  targetMoves: number;
  movesUci: string[];
  objectiveMet: boolean;
  reason: string;
}

interface Props {
  startFen: string;
  lessonType: "apertura" | "estrategia" | "final";
  engineMode: EngineMode;
  onFinished: (r: GameResult) => Promise<void> | void;
}

const OBJECTIVE_TEXT: Record<Objective, (n: number) => string> = {
  convert: (n) => `Convierte la ventaja (mate o ventaja decisiva en ≤ ${n} jugadas)`,
  draw: (n) => `Entabla: aguanta ${n} jugadas sin quedar perdido`,
  survive: (n) => `Sobrevive ${n} jugadas sin caer por debajo de ${ENGINE_OBJECTIVES.SURVIVE_MIN_CP / 100}`,
};

export function EngineGame({ startFen, lessonType, engineMode, onFinished }: Props) {
  const playerColor = startFen.split(" ")[1] as "w" | "b";
  const [fen, setFen] = useState(startFen);
  const [status, setStatus] = useState<"loading" | "player" | "engine" | "done">("loading");
  const [objective, setObjective] = useState<{ objective: Objective; targetMoves: number } | null>(null);
  const [verdict, setVerdict] = useState<Verdict>({ status: "ongoing" });
  const [last, setLast] = useState<[string, string] | null>(null);
  const [evalCp, setEvalCp] = useState<number | null>(null);
  const [plies, setPlies] = useState(0);
  const engines = useRef<{ player: Engine; analysis: Engine } | null>(null);
  const game = useRef(new Chess(startFen));
  const moves = useRef<string[]>([]);
  const evals = useRef<number[]>([]);

  useEffect(() => {
    let cancelled = false;
    const player = new Engine(workerTransport(ENGINE_FILE));
    const analysis = new Engine(workerTransport(ENGINE_FILE));
    engines.current = { player, analysis };
    (async () => {
      await Promise.all([player.init(), analysis.init()]);
      await player.configure(engineMode);
      const initial = await analysis.evaluate(startFen, ENGINE_OBJECTIVES.ANALYSIS_DEPTH);
      if (cancelled) return;
      setEvalCp(initial.cp);
      setObjective(chooseObjective(lessonType, initial.cp));
      setStatus("player");
    })();
    return () => {
      cancelled = true;
      player.quit();
      analysis.quit();
    };
  }, [startFen, lessonType, engineMode]);

  async function finish(v: Exclude<Verdict, { status: "ongoing" }>) {
    setVerdict(v);
    setStatus("done");
    await onFinished({ objective: objective!.objective, targetMoves: objective!.targetMoves, movesUci: [...moves.current], objectiveMet: v.status === "met", reason: v.reason });
  }

  function check(): Verdict {
    return judge({
      objective: objective!.objective,
      targetMoves: objective!.targetMoves,
      playerMoves: Math.ceil(moves.current.length / 2),
      gameOver: gameOverFor(game.current, playerColor),
      evals: evals.current,
    });
  }

  function onMove(uci: string): boolean {
    if (status !== "player" || !engines.current || !objective) return false;
    game.current.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    moves.current.push(uci);
    setPlies(moves.current.length);
    setFen(game.current.fen());
    setLast([uci.slice(0, 2), uci.slice(2, 4)]);
    const afterPlayer = check();
    if (afterPlayer.status !== "ongoing") {
      void finish(afterPlayer);
      return true;
    }
    setStatus("engine");
    void (async () => {
      const { player, analysis } = engines.current!;
      const reply = await player.bestMove(game.current.fen(), engineMode);
      if (!reply) return void finish(check() as Exclude<Verdict, { status: "ongoing" }>);
      game.current.move({ from: reply.slice(0, 2), to: reply.slice(2, 4), promotion: reply[4] });
      moves.current.push(reply);
      setPlies(moves.current.length);
      setFen(game.current.fen());
      setLast([reply.slice(0, 2), reply.slice(2, 4)]);
      if (!gameOverFor(game.current, playerColor)) {
        const e = await analysis.evaluate(game.current.fen(), ENGINE_OBJECTIVES.ANALYSIS_DEPTH);
        evals.current.push(e.cp); // turno del usuario: cp ya está desde su lado
        setEvalCp(e.cp);
      }
      const v = check();
      if (v.status !== "ongoing") void finish(v);
      else setStatus("player");
    })();
    return true;
  }

  const highlight: Record<string, "last"> = {};
  if (last) for (const sq of last) highlight[sq] = "last";
  const playerMoves = Math.ceil(plies / 2);

  return (
    <section className="flex w-full flex-col items-center gap-3" data-game-status={status}>
      <p aria-live="polite" className="text-center text-sm font-medium">
        {status === "loading" && "Cargando Stockfish y evaluando la posición…"}
        {objective && status !== "done" && OBJECTIVE_TEXT[objective.objective](objective.targetMoves)}
      </p>
      {objective && (
        <p className="text-xs text-muted" data-testid="game-meta">
          Jugada {playerMoves}/{objective.targetMoves} · Motor: {engineMode.kind === "elo" ? `ELO ${engineMode.uciElo}` : `nivel ${engineMode.skill}`}
          {evalCp !== null && Math.abs(evalCp) < 50_000 && ` · Eval ${(evalCp / 100).toFixed(1)}`}
        </p>
      )}
      <Board fen={fen} orientation={playerColor === "w" ? "white" : "black"} onMove={status === "player" ? onMove : undefined} highlight={highlight} id="engine-game" />
      <p aria-live="polite" className="text-sm">{status === "engine" && "Stockfish piensa…"}</p>
      {verdict.status !== "ongoing" && (
        <div role="status" className="text-center">
          <p className={`text-lg font-bold ${verdict.status === "met" ? "text-accent" : "text-danger"}`}>{verdict.status === "met" ? "Objetivo cumplido" : "Objetivo no cumplido"}</p>
          <p className="text-sm text-muted">{verdict.reason}</p>
        </div>
      )}
    </section>
  );
}
