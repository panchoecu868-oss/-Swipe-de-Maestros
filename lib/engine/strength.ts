import { ENGINE_STRENGTH } from "@/config/engine";

export type EngineMode =
  | { kind: "elo"; uciElo: number; movetimeMs: number }
  | { kind: "skill"; skill: number; depth: number; movetimeMs: number };

type Cfg = { ELO_OFFSET: number; UCI_ELO_MIN: number; UCI_ELO_MAX: number; MOVETIME_MS: number; SKILL_TABLE: readonly { elo: number; skill: number; depth: number; movetimeMs: number }[] };

/** ELO del usuario → configuración del motor. ≥ mínimo de UCI_Elo: LimitStrength; debajo: Skill Level. */
export function engineModeFor(userElo: number, cfg: Cfg = ENGINE_STRENGTH): EngineMode {
  const target = userElo + cfg.ELO_OFFSET;
  if (target >= cfg.UCI_ELO_MIN) {
    return { kind: "elo", uciElo: Math.round(Math.min(cfg.UCI_ELO_MAX, target)), movetimeMs: cfg.MOVETIME_MS };
  }
  const rows = [...cfg.SKILL_TABLE].sort((a, b) => a.elo - b.elo);
  if (target <= rows[0].elo) return { kind: "skill", skill: rows[0].skill, depth: rows[0].depth, movetimeMs: rows[0].movetimeMs };
  const last = rows[rows.length - 1];
  if (target >= last.elo) return { kind: "skill", skill: last.skill, depth: last.depth, movetimeMs: last.movetimeMs };
  const i = rows.findIndex((r) => r.elo > target);
  const a = rows[i - 1];
  const b = rows[i];
  const t = (target - a.elo) / (b.elo - a.elo);
  const lerp = (x: number, y: number) => Math.round(x + t * (y - x));
  return { kind: "skill", skill: lerp(a.skill, b.skill), depth: lerp(a.depth, b.depth), movetimeMs: lerp(a.movetimeMs, b.movetimeMs) };
}

/** Comandos UCI para aplicar el modo. */
export function strengthCommands(mode: EngineMode): string[] {
  return mode.kind === "elo"
    ? ["setoption name Skill Level value 20", "setoption name UCI_LimitStrength value true", `setoption name UCI_Elo value ${mode.uciElo}`]
    : ["setoption name UCI_LimitStrength value false", `setoption name Skill Level value ${mode.skill}`];
}

export function goCommand(mode: EngineMode): string {
  return mode.kind === "elo" ? `go movetime ${mode.movetimeMs}` : `go depth ${mode.depth} movetime ${mode.movetimeMs}`;
}
