import { describe, expect, it } from "vitest";
import { GUARANTEE } from "@/config/guarantee";
import { guaranteeTerms } from "@/lib/guarantee/terms";

describe("términos generados desde la config", () => {
  it("reflejan los números de config/guarantee.ts", () => {
    const t = guaranteeTerms();
    const text = [t.title, ...t.clauses].join(" ");
    expect(text).toContain(`${GUARANTEE.TARGET_DELTA} puntos`);
    expect(text).toContain(`${GUARANTEE.MIN_COMPLETED_DAYS} días cumplidos`);
    expect(text).toContain(`${GUARANTEE.MIN_GAMES} partidas`);
  });
  it("cambian si cambia la config", () => {
    const t = guaranteeTerms({ ...GUARANTEE, TARGET_DELTA: 200, REQUIRE_CONTINUOUS_SUBSCRIPTION: false });
    expect(t.title).toContain("200 puntos");
    expect(t.clauses.join(" ")).not.toContain("sin interrupciones");
  });
});
