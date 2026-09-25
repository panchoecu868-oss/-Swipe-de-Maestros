import { describe, expect, it } from "vitest";
import families from "@/config/data/opening-families.json";
import { BLACK_VS_D4, BLACK_VS_E4 } from "@/config/openings";
import { TOPIC_IDS } from "@/config/self-assessment";
import { THEME_MAP } from "@/config/theme-map";
import { isLichessTheme } from "@/config/lichess-themes";
import { repertoireFamilies, tagInRepertoire } from "@/lib/personalization/repertoire";
import { adjustAfterDiscard, computeThemeWeights, lessonWeight, workingElo, type Scores } from "@/lib/personalization/theme-weights";

const keys = new Set((families as { key: string }[]).map((f) => f.key));

describe("config de aperturas", () => {
  it("toda familia nombrada existe en la base oficial de Lichess", () => {
    for (const o of [...BLACK_VS_E4, ...BLACK_VS_D4]) {
      if (o.match !== "any") for (const f of o.match.families ?? []) expect(keys.has(f), f).toBe(true);
    }
  });
  it("THEME_MAP usa solo temas oficiales y cubre todos los temas", () => {
    for (const t of TOPIC_IDS) {
      expect(THEME_MAP[t]).toBeDefined();
      for (const th of THEME_MAP[t]) expect(isLichessTheme(th)).toBe(true);
    }
  });
});

describe("repertorio", () => {
  const fams = repertoireFamilies({ white_first: "d4", black_vs_e4: "e5", black_vs_d4: "Slav_Defense" });
  it("incluye familias por primera jugada y por clave", () => {
    expect(fams.has("Queens_Gambit_Declined")).toBe(true); // 1.d4 (blancas)
    expect(fams.has("Italian_Game")).toBe(true); // 1.e4 e5 (negras)
    expect(fams.has("Semi-Slav_Defense")).toBe(true);
    expect(fams.has("Sicilian_Defense")).toBe(false);
    expect(fams.has("English_Opening")).toBe(false);
  });
  it("acepta variantes con prefijo de familia", () => {
    expect(tagInRepertoire("Italian_Game_Classical_Variation", fams)).toBe(true);
    expect(tagInRepertoire("Sicilian_Defense_Dragon_Variation", fams)).toBe(false);
  });
});

describe("theme_weights", () => {
  const scores = Object.fromEntries(TOPIC_IDS.map((t) => [t, 3])) as Scores;
  scores.finales_torres = 1;
  scores.calculo_tactico = 5;
  const w = computeThemeWeights(scores);

  it("autoevaluación baja = peso alto, media ~1", () => {
    expect(w.finales_torres).toBeGreaterThan(w.estructuras_peones);
    expect(w.calculo_tactico).toBeLessThan(w.estructuras_peones);
    const mean = TOPIC_IDS.reduce((a, t) => a + w[t], 0) / TOPIC_IDS.length;
    expect(mean).toBeCloseTo(1, 5);
    expect(w.aperturas).toBe(1);
  });
  it("descarte ganado baja el peso, perdido lo sube, con límites", () => {
    expect(adjustAfterDiscard(w, ["defensa"], true).defensa).toBeCloseTo(w.defensa * 0.8);
    expect(adjustAfterDiscard(w, ["defensa"], false).defensa).toBeCloseTo(w.defensa * 1.25);
    let x = w;
    for (let i = 0; i < 50; i++) x = adjustAfterDiscard(x, ["defensa"], false);
    expect(x.defensa).toBe(5);
  });
  it("peso de lección = máximo de sus temas", () => {
    expect(lessonWeight(w, ["finales_torres", "calculo_tactico"])).toBe(w.finales_torres);
    expect(lessonWeight(w, [])).toBe(1);
  });
  it("ELO de trabajo se limita a 1000–2200", () => {
    expect(workingElo({ source: "fide", fide: 850 })).toBe(1000);
    expect(workingElo({ source: "fide", fide: 2400 })).toBe(2200);
    expect(workingElo({ source: "lichess", declared: 1700 })).toBe(1700);
  });
});
