import type { Platform } from "@/config/guarantee";
import { chesscomProvider } from "./chesscom";
import { lichessProvider } from "./lichess";
import type { RatingProvider } from "./types";

export function providerFor(p: Platform): RatingProvider {
  return p === "lichess" ? lichessProvider() : chesscomProvider();
}
