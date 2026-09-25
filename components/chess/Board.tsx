"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";
import { Chess, type Square } from "chess.js";

export interface BoardProps {
  fen: string;
  orientation?: "white" | "black";
  /** Si se define, el tablero es interactivo. Devuelve true si la jugada se acepta. */
  onMove?: (uci: string) => boolean;
  /** Casillas a resaltar (última jugada, error, etc.). */
  highlight?: Partial<Record<string, "last" | "wrong" | "hint">>;
  id?: string;
  label?: string;
}

const COLORS = {
  last: "rgba(255, 213, 79, 0.55)",
  wrong: "rgba(229, 57, 53, 0.55)",
  hint: "rgba(76, 175, 80, 0.5)",
  selected: "rgba(33, 150, 243, 0.45)",
};

const PIECE_NAMES: Record<string, [string, "m" | "f"]> = {
  K: ["Rey", "m"], Q: ["Dama", "f"], R: ["Torre", "f"], B: ["Alfil", "m"], N: ["Caballo", "m"], P: ["Peón", "m"],
};

/** "bQ" + "a8" → "Dama negra en a8" (nombre accesible para las piezas arrastrables). */
export function pieceLabel(code: string, square: string): string {
  const [name, g] = PIECE_NAMES[code[1]] ?? ["Pieza", "f"];
  const color = code[0] === "w" ? (g === "f" ? "blanca" : "blanco") : g === "f" ? "negra" : "negro";
  return `${name} ${color} en ${square}`;
}

/** Promoción automática a dama (el caso común); el resto de promociones llega con la jugada UCI completa. */
function toUci(fen: string, from: string, to: string): string | null {
  const chess = new Chess(fen);
  const piece = chess.get(from as Square);
  if (!piece) return null;
  const isPromotion = piece.type === "p" && (to[1] === "8" || to[1] === "1");
  const uci = `${from}${to}${isPromotion ? "q" : ""}`;
  const legal = chess.moves({ verbose: true }).some((m) => `${m.from}${m.to}${m.promotion ?? ""}` === uci);
  return legal ? uci : null;
}

export function Board({ fen, orientation = "white", onMove, highlight, id = "board", label }: BoardProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const interactive = Boolean(onMove);
  const ref = useRef<HTMLDivElement>(null);

  // react-chessboard (dnd-kit) envuelve cada pieza en role="button" sin nombre: se lo damos,
  // y en tableros de solo lectura las sacamos del orden de tabulación.
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const label = () => {
      root.querySelectorAll<HTMLElement>('[role="button"]').forEach((el) => {
        const piece = el.querySelector<HTMLElement>("[data-piece]");
        const sq = piece?.id.split("-").pop();
        if (piece && sq) el.setAttribute("aria-label", pieceLabel(piece.dataset.piece ?? "", sq));
        if (!interactive) {
          el.setAttribute("tabindex", "-1");
          el.setAttribute("aria-disabled", "true");
        }
      });
    };
    label();
    const mo = new MutationObserver(label);
    mo.observe(root, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [interactive, fen]);

  const squareStyles = useMemo(() => {
    const s: Record<string, React.CSSProperties> = {};
    for (const [sq, kind] of Object.entries(highlight ?? {})) if (kind) s[sq] = { background: COLORS[kind] };
    if (selected) s[selected] = { background: COLORS.selected };
    return s;
  }, [highlight, selected]);

  function tryMove(from: string, to: string): boolean {
    if (!onMove) return false;
    const uci = toUci(fen, from, to);
    setSelected(null);
    return uci ? onMove(uci) : false;
  }

  return (
    <div
      ref={ref}
      role="group"
      aria-label={label ?? `Tablero de ajedrez. Posición: ${fen}`}
      data-board-id={id}
      data-fen={fen}
      className="aspect-square w-full max-w-[min(92vw,480px)]"
    >
      <Chessboard
        options={{
          id,
          position: fen,
          boardOrientation: orientation,
          allowDragging: interactive,
          squareStyles,
          animationDurationInMs: 200,
          onPieceDrop: ({ sourceSquare, targetSquare }) => (targetSquare ? tryMove(sourceSquare, targetSquare) : false),
          // Tocar-tocar: más fiable que arrastrar en móvil.
          onSquareClick: ({ square, piece }) => {
            if (!interactive) return;
            if (selected && selected !== square) {
              if (!tryMove(selected, square) && piece) setSelected(square);
              return;
            }
            setSelected(piece ? square : null);
          },
        }}
      />
    </div>
  );
}
