/**
 * Lichess — rating público.
 * Documentación oficial (OpenAPI): https://lichess.org/api#tag/Users/operation/apiUser
 * Fuente leída: https://github.com/lichess-org/api/blob/master/doc/specs/tags/users/api-user-username.yaml
 *   GET https://lichess.org/api/user/{username} → UserExtended.perfs.{blitz|rapid} = { games, rating, rd, prog, prov? }
 * Rate limit (misma doc): una petición a la vez; ante 429 esperar al menos un minuto.
 * No usamos OAuth ni leemos partidas: solo rating y número de partidas del ritmo declarado.
 */
import type { TimeControl } from "@/config/guarantee";
import { ProviderError, type RatingProvider, type RatingReading } from "./types";

export const LICHESS_API = "https://lichess.org";

interface LichessPerf {
  games: number;
  rating: number;
  rd: number;
  prog: number;
  prov?: boolean;
}

export function parseLichessUser(json: unknown, tc: TimeControl, username: string): RatingReading {
  const perf = (json as { perfs?: Record<string, LichessPerf | undefined> })?.perfs?.[tc];
  return {
    rating: perf ? perf.rating : null,
    games: perf?.games ?? 0,
    provisional: Boolean(perf?.prov),
    sourceUrl: `${LICHESS_API}/api/user/${encodeURIComponent(username)}`,
  };
}

export function lichessProvider(fetchImpl: typeof fetch = fetch): RatingProvider {
  return {
    platform: "lichess",
    verified: true,
    async fetchRating(username, tc) {
      const url = `${LICHESS_API}/api/user/${encodeURIComponent(username)}`;
      const res = await fetchImpl(url, { headers: { Accept: "application/json" }, cache: "no-store" });
      if (res.status === 404) throw new ProviderError(`Usuario de Lichess no encontrado: ${username}`, "not_found");
      if (res.status === 429) throw new ProviderError("Lichess limitó las peticiones (429); reintentar en ≥1 minuto", "rate_limited");
      if (!res.ok) throw new ProviderError(`Lichess respondió HTTP ${res.status}`, "unavailable");
      return parseLichessUser(await res.json(), tc, username);
    },
  };
}
