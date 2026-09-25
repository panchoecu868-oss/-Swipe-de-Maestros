/** Normaliza para comparar texto: minúsculas, sin tildes, sin puntuación. */
export function normalizeWords(text: string): string[] {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

/** Longitud de la racha más larga de palabras consecutivas que `text` copia de `source`. */
export function longestCopiedRun(text: string, source: string, maxCheck = 60): number {
  const t = normalizeWords(text);
  const s = normalizeWords(source);
  if (t.length === 0 || s.length === 0) return 0;
  // DP de substring común más largo sobre palabras, con memoria O(|s|).
  let best = 0;
  let prev = new Uint16Array(s.length + 1);
  for (let i = 1; i <= t.length; i++) {
    const cur = new Uint16Array(s.length + 1);
    for (let j = 1; j <= s.length; j++) {
      if (t[i - 1] === s[j - 1]) {
        cur[j] = Math.min(prev[j - 1] + 1, maxCheck);
        if (cur[j] > best) best = cur[j];
      }
    }
    prev = cur;
  }
  return best;
}

/** ¿Aparece `quote` en `source` ignorando espacios, mayúsculas y puntuación? */
export function containsQuote(source: string, quote: string): boolean {
  const q = normalizeWords(quote).join(" ");
  if (!q) return false;
  return ` ${normalizeWords(source).join(" ")} `.includes(` ${q} `);
}
