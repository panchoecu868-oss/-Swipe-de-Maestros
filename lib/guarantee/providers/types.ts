import type { Platform, TimeControl } from "@/config/guarantee";

export interface RatingReading {
  rating: number | null;
  /** Partidas en ese ritmo según la API (para medir cuántas jugó dentro del plazo). */
  games: number;
  provisional: boolean;
  sourceUrl: string;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly code: "not_found" | "rate_limited" | "unavailable" | "not_verified",
  ) {
    super(message);
  }
}

export interface RatingProvider {
  platform: Platform;
  /** false = la integración no se activó porque su documentación oficial no se pudo verificar. */
  verified: boolean;
  fetchRating(username: string, tc: TimeControl): Promise<RatingReading>;
}
