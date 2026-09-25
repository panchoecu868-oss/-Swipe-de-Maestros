/** Lee la cabecera de un texto de Project Gutenberg (Title:, Author:, EBook #). */
export function readGutenbergHeader(raw: string): { title: string | null; author: string | null; ebook: number | null } {
  const head = raw.replace(/\r/g, "").slice(0, 5000);
  const title = /^Title:\s*(.+)$/m.exec(head)?.[1].trim() ?? null;
  const author = /^Author:\s*(.+)$/m.exec(head)?.[1].trim() ?? null;
  const ebook = /\[E(?:Book|book) #(\d+)\]/.exec(head)?.[1];
  return { title, author, ebook: ebook ? Number(ebook) : null };
}

export function verifyGutenbergText(raw: string, expected: { headerTitle: string; headerAuthor: string; gutenbergId: number }): string[] {
  const h = readGutenbergHeader(raw);
  const errors: string[] = [];
  if (h.title !== expected.headerTitle) errors.push(`título "${h.title}" ≠ "${expected.headerTitle}"`);
  if (h.author !== expected.headerAuthor) errors.push(`autor "${h.author}" ≠ "${expected.headerAuthor}"`);
  if (h.ebook !== null && h.ebook !== expected.gutenbergId) errors.push(`EBook #${h.ebook} ≠ #${expected.gutenbergId}`);
  if (!/\*\*\* ?START OF (THIS|THE) PROJECT GUTENBERG EBOOK/i.test(raw)) errors.push("no tiene el marcador START de Project Gutenberg");
  return errors;
}
