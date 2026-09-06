// Presentation only. These chunks are not a domain ResponsePlan.
export type TransmissionChunk = { text: string; pauseAfter: number };
const sentenceEnd = /[.!?…][»”"')\]]*\s*$/u;
const phraseEnd = /[,;:—][»”"')\]]*\s*$/u;

// Optional presentation hints; never domain policy or raw provider tokens.
export type TransmissionHints = {
  formingDelay?: number;
  pauseAfter?: Readonly<Partial<Record<number, number>>>;
};

export function segmentTransmission(text: string): TransmissionChunk[] {
  const tokens = text.match(/\s*\S+/gu) ?? [];
  const chunks: TransmissionChunk[] = [];
  const clause: string[] = [];
  for (const [index, token] of tokens.entries()) {
    clause.push(token);
    const sentence = sentenceEnd.test(token);
    const punctuation = phraseEnd.test(token) && clause.length >= 4;
    if (!sentence && !punctuation && index !== tokens.length - 1) continue;
    // Keep short clauses whole. Balance long clauses to avoid tiny leftover chunks.
    while (clause.length) {
      const groups = Math.ceil(clause.length / 10);
      const size = Math.ceil(clause.length / groups);
      const words = clause.splice(0, size);
      const phrase = words.join('');
      chunks.push({
        text: phrase,
        pauseAfter: sentenceEnd.test(phrase)
          ? 300 + size * 16
          : phraseEnd.test(phrase)
            ? 180 + size * 9
            : 120 + size * 8,
      });
    }
  }
  const trailing = text.match(/\s+$/u)?.[0] ?? '';
  if (chunks.length) chunks[chunks.length - 1]!.text += trailing;
  else if (text) chunks.push({ text, pauseAfter: 0 });
  return chunks;
}

function validPause(hint: number | undefined, fallback: number): number {
  return hint !== undefined && Number.isFinite(hint) && hint >= 0
    ? hint
    : fallback;
}

export function startSemanticTransmission(
  chunks: readonly TransmissionChunk[],
  onChunk: (text: string) => void,
  onComplete: () => void,
  reducedMotion = false,
  hints: TransmissionHints = {},
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  let index = 0;
  let reduced = reducedMotion;
  function advance() {
    if (stopped) return;
    const chunk = chunks[index++];
    if (!chunk) {
      stopped = true;
      onComplete();
      return;
    }
    onChunk(chunk.text);
    if (stopped) return;
    if (index === chunks.length) {
      stopped = true;
      onComplete();
    } else
      timer = setTimeout(
        advance,
        reduced
          ? 12
          : validPause(hints.pauseAfter?.[index - 1], chunk.pauseAfter),
      );
  }
  timer = setTimeout(
    advance,
    reduced ? 12 : validPause(hints.formingDelay, 450),
  );
  return {
    cancel() {
      stopped = true;
      clearTimeout(timer);
    },
    reduceMotion() {
      reduced = true;
      if (!stopped) {
        clearTimeout(timer);
        timer = setTimeout(advance, 12);
      }
    },
  };
}
