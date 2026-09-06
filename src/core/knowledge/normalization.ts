// Matching only: authored display strings are never rewritten.
export function conceptTokens(text: string): string[] {
  return (
    text
      .normalize('NFKC')
      .toLowerCase()
      .replace(/ё/gu, 'е')
      .replace(/[’‘]/gu, "'")
      .replace(/[‐‑]/gu, '-')
      .match(
        /[\p{L}\p{N}][\p{L}\p{N}\p{M}]*(?:['-][\p{L}\p{N}][\p{L}\p{N}\p{M}]*)*/gu,
      ) ?? []
  );
}
export function normalizeConceptText(text: string): string {
  return conceptTokens(text).join(' ');
}
export function compareIds(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
