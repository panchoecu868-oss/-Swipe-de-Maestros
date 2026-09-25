/**
 * Modelo de puzzle de Lichess.
 * Formato oficial (https://database.lichess.org/#puzzles, fuente: github.com/lichess-org/database web/index.html.tpl):
 *  - "FEN is the position before the opponent makes their move."
 *  - "The position to present to the player is after applying the first move to that FEN.
 *     The second move is the beginning of the solution."
 *  - "Moves are in UCI format."
 *  - "All player moves of the solution are 'only moves'. An exception is made for mates in one:
 *     there can be several. Any move that checkmates should win the puzzle."
 */
import { Chess } from "chess.js";
import { parseUci, toUci } from "./uci";

export interface Puzzle {
  id: string;
  fen: string;
  moves: string[];
  rating: number;
  themes: string[];
}

export type PuzzleColor = "white" | "black";

export interface PreparedPuzzle {
  id: string;
  /** Posición antes de la jugada del rival (tal cual viene de Lichess). */
  initialFen: string;
  /** Jugada del rival que se anima antes de ceder el turno. */
  opponentMove: string;
  /** Posición que ve el usuario: después de la jugada del rival. */
  startFen: string;
  /** Jugadas de la solución, alternando usuario / respuesta automática. */
  solution: string[];
  playerColor: PuzzleColor;
}

/** Aplica una jugada UCI; lanza si es ilegal. */
function applyUci(chess: Chess, uci: string) {
  try {
    return chess.move(parseUci(uci));
  } catch {
    throw new Error(`Jugada ilegal ${uci} en ${chess.fen()}`);
  }
}

export function preparePuzzle(p: Pick<Puzzle, "id" | "fen" | "moves">): PreparedPuzzle {
  if (p.moves.length < 2) throw new Error(`Puzzle ${p.id}: se esperan al menos 2 jugadas`);
  const chess = new Chess(p.fen);
  applyUci(chess, p.moves[0]);
  const startFen = chess.fen();
  return {
    id: p.id,
    initialFen: p.fen,
    opponentMove: p.moves[0],
    startFen,
    solution: p.moves.slice(1),
    playerColor: chess.turn() === "w" ? "white" : "black",
  };
}

/** Verifica que el FEN cargue y que TODAS las jugadas sean legales en secuencia. */
export function isPuzzleLegal(p: Pick<Puzzle, "fen" | "moves">): boolean {
  try {
    const chess = new Chess(p.fen);
    for (const m of p.moves) applyUci(chess, m);
    return true;
  } catch {
    return false;
  }
}

export type MoveVerdict =
  | { kind: "correct"; reply: string | null; fen: string }
  | { kind: "solved"; fen: string }
  | { kind: "wrong"; expected: string };

/**
 * Máquina de estados de un puzzle. Pura y sin UI: la usan el checkpoint,
 * la ronda de descarte y el servidor (que re-verifica las jugadas enviadas).
 */
export class PuzzleSession {
  private chess: Chess;
  private index = 0;
  readonly prepared: PreparedPuzzle;
  private finished: "solved" | "failed" | null = null;

  constructor(puzzle: Pick<Puzzle, "id" | "fen" | "moves">) {
    this.prepared = preparePuzzle(puzzle);
    this.chess = new Chess(this.prepared.startFen);
  }

  get fen() {
    return this.chess.fen();
  }

  get status() {
    return this.finished ?? "playing";
  }

  /** Jugada del usuario en UCI. */
  play(uci: string): MoveVerdict {
    if (this.finished) throw new Error("El puzzle ya terminó");
    const expected = this.prepared.solution[this.index];
    let move;
    try {
      move = this.chess.move(parseUci(uci));
    } catch {
      this.finished = "failed";
      return { kind: "wrong", expected };
    }
    const isMate = this.chess.isCheckmate();
    if (toUci(move) !== expected && !isMate) {
      this.chess.undo();
      this.finished = "failed";
      return { kind: "wrong", expected };
    }
    // Cualquier mate gana (regla oficial para mates alternativos).
    if (isMate || this.index + 1 >= this.prepared.solution.length) {
      this.finished = "solved";
      return { kind: "solved", fen: this.chess.fen() };
    }
    const reply = this.prepared.solution[this.index + 1];
    applyUci(this.chess, reply);
    this.index += 2;
    if (this.index >= this.prepared.solution.length) {
      this.finished = "solved";
      return { kind: "solved", fen: this.chess.fen() };
    }
    return { kind: "correct", reply, fen: this.chess.fen() };
  }
}

/** Re-verifica en el servidor una secuencia de jugadas del usuario. */
export function verifySolution(puzzle: Pick<Puzzle, "id" | "fen" | "moves">, userMoves: string[]): boolean {
  const s = new PuzzleSession(puzzle);
  for (const m of userMoves) {
    const v = s.play(m);
    if (v.kind === "wrong") return false;
    if (v.kind === "solved") return true;
  }
  return false;
}
