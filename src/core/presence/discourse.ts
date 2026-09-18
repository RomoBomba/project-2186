import { normalizeConceptText } from '../knowledge/normalization.ts';
/** An intent-recognition lens, NOT a replacement for the original message. */
export function discourseLens(text: string): {
  body: string;
  markers: string[];
} {
  let body = normalizeConceptText(text);
  const markers: string[] = [];
  for (let i = 0; i < 4; i++) {
    const m =
      /^(а|ну|ладно|хорошо|тогда|окей|допустим|понятно|нет|привет|здравствуй|здравствуйте|well|okay|then|so|alright|and|no|hi|hello)\s+(.+)$/u.exec(
        body,
      );
    if (!m) break;
    markers.push(m[1]!);
    body = m[2]!;
  }
  return { body, markers };
}
