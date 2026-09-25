import { describe, expect, it } from "vitest";
import { TOPIC_IDS } from "@/config/self-assessment";
import { OnboardingSchema } from "@/lib/personalization/onboarding";

const base = {
  elo_source: "fide",
  fide_elo: "1650",
  white_first: "e4",
  black_vs_e4: "Sicilian_Defense",
  black_vs_d4: "Slav_Defense",
  scores: Object.fromEntries(TOPIC_IDS.map((t) => [t, "3"])),
  platform: "lichess",
  platform_username: "mi_usuario",
  time_control: "blitz",
  timezone: "America/Guayaquil",
};

describe("OnboardingSchema", () => {
  it("acepta un formulario completo", () => expect(OnboardingSchema.safeParse(base).success).toBe(true));
  it("exige ELO FIDE o rating declarado según la fuente", () => {
    expect(OnboardingSchema.safeParse({ ...base, fide_elo: undefined }).success).toBe(false);
    expect(OnboardingSchema.safeParse({ ...base, elo_source: "chesscom", fide_elo: undefined, declared_elo: "1400" }).success).toBe(true);
  });
  it("rechaza aperturas fuera de la lista cerrada y notas fuera de 1–5", () => {
    expect(OnboardingSchema.safeParse({ ...base, black_vs_e4: "Inventada" }).success).toBe(false);
    expect(OnboardingSchema.safeParse({ ...base, scores: { ...base.scores, defensa: "6" } }).success).toBe(false);
  });
  it("valida el usuario de la plataforma", () => {
    expect(OnboardingSchema.safeParse({ ...base, platform_username: "a b" }).success).toBe(false);
  });
});
