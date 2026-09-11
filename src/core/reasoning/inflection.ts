import { conceptTokens } from '../knowledge/normalization.ts';
import type { ConceptEvidence } from './model.ts';
import type { ConceptId } from '../knowledge/model.ts';
// Closed noun paradigms, not suffix stripping. Never authoritative alias evidence.
const paradigms: readonly [ConceptId, string, readonly string[]][] = [
  [
    'philosophy.knowledge',
    'знани',
    ['е', 'я', 'ю', 'ем', 'и', 'й', 'ями', 'ях'],
  ],
  ['philosophy.truth', 'истин', ['а', 'ы', 'у', 'е', 'ой', 'ою']],
  ['philosophy.truth', 'правд', ['а', 'ы', 'у', 'е', 'ой']],
  ['philosophy.freedom', 'свобод', ['а', 'ы', 'у', 'е', 'ой', 'ою']],
  ['science.causality', 'причин', ['а', 'ы', 'у', 'е', 'ой', 'ами', 'ах']],
  ['identity.memory', 'памят', ['ь', 'и', 'ью']],
  ['identity.memory', 'воспоминан', ['ие', 'ия', 'ий', 'иями', 'иях']],
  ['identity.belief', 'убеждени', ['е', 'я', 'ю', 'ем', 'и', 'й', 'ями', 'ях']],
  ['identity.self', 'личност', ['ь', 'и', 'ью']],
  ['world.archives', 'архив', ['а', 'ы', 'у', 'е', 'ом', 'ов', 'ами', 'ах']],
  [
    'art.originality',
    'оригинал',
    ['а', 'ы', 'у', 'е', 'ом', 'ов', 'ами', 'ах'],
  ],
  ['philosophy.consciousness', 'сознани', ['е', 'я', 'ю', 'ем', 'и']],
];
export function inflectionEvidence(text: string): ConceptEvidence[] {
  const tokens = conceptTokens(text);
  return paradigms.flatMap(([conceptId, stem, endings]) => {
    const term = tokens.find(
      (t) =>
        stem.length >= 4 &&
        t.startsWith(stem) &&
        endings.includes(t.slice(stem.length)),
    );
    return term ? [{ conceptId, source: 'inflection' as const, term }] : [];
  });
}
