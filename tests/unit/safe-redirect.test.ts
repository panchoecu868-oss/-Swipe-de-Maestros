import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/safe-redirect";
import { isProtectedPath } from "@/lib/supabase/proxy-session";

describe("safeNextPath", () => {
  it("acepta rutas internas", () => expect(safeNextPath("/progreso")).toBe("/progreso"));
  it.each(["https://evil.com", "//evil.com", "/\\evil.com", "", null, undefined])("rechaza %s", (v) =>
    expect(safeNextPath(v)).toBe("/feed"),
  );
});

describe("isProtectedPath", () => {
  it("protege la app y admin", () => {
    expect(isProtectedPath("/feed")).toBe(true);
    expect(isProtectedPath("/admin/review")).toBe(true);
  });
  it("deja pública la landing y los términos", () => {
    expect(isProtectedPath("/")).toBe(false);
    expect(isProtectedPath("/garantia/terminos")).toBe(false);
    expect(isProtectedPath("/feedback")).toBe(false);
  });
});
