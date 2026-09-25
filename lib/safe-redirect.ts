/** Evita open redirects: solo rutas internas absolutas ("/feed"), nunca "//evil.com" ni URLs completas. */
export function safeNextPath(next: string | null | undefined, fallback = "/feed"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
