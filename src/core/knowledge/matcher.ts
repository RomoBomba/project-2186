import type { Locale } from '../language/locale.ts';
import type { ConceptCard, ConceptId } from './model.ts';
import { resolveConcept } from './localization.ts';
import { compareIds, conceptTokens } from './normalization.ts';
import { validateConceptCards } from './validation.ts';

export type MatchEvidence = {
  source: 'alias' | 'title';
  kind: 'phrase' | 'overlap' | 'token';
  term: string;
  matchedTokens: string[];
};
export type ConceptMatch = {
  conceptId: ConceptId;
  score: number;
  requestedLocale: Locale;
  locale: Locale;
  fallbackUsed: boolean;
  evidence: MatchEvidence;
};
export const defaultMatchThreshold = 65;

function meaningful(token: string): boolean {
  return [...token].length >= 4;
}
function containsPhrase(input: string[], phrase: string[]): boolean {
  return input.some((_, i) =>
    phrase.every((token, j) => input[i + j] === token),
  );
}
export class ConceptMatcher {
  private readonly cards: ConceptCard[];
  constructor(cards: readonly ConceptCard[]) {
    this.cards = validateConceptCards(cards).sort((a, b) =>
      compareIds(a.id, b.id),
    );
  }
  match(
    text: string,
    locale: Locale,
    options: {
      allowFallback?: boolean;
      limit?: number;
      minScore?: number;
    } = {},
  ): ConceptMatch[] {
    const input = conceptTokens(text);
    if (!input.length) return [];
    const minScore =
      options.minScore === undefined || !Number.isFinite(options.minScore)
        ? defaultMatchThreshold
        : Math.max(0, Math.min(100, options.minScore));
    const tokens = new Set(input);
    const matches: ConceptMatch[] = [];
    const resolvedCards = this.cards
      .map((card) =>
        resolveConcept(card, locale, options.allowFallback ?? true),
      )
      .filter((card) => card !== undefined);
    const documentFrequency = new Map<string, number>();
    for (const resolved of resolvedCards) {
      const authoredTokens = new Set(
        [resolved.content.title, ...resolved.content.aliases].flatMap(
          conceptTokens,
        ),
      );
      for (const token of authoredTokens)
        documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
    }
    for (const resolved of resolvedCards) {
      let best: ConceptMatch | undefined;
      const terms = [
        ...resolved.content.aliases.map((term) => ({
          term,
          source: 'alias' as const,
        })),
        { term: resolved.content.title, source: 'title' as const },
      ];
      for (const { term, source } of terms) {
        const phrase = conceptTokens(term);
        const significant = [...new Set(phrase.filter(meaningful))];
        if (!significant.length) continue;
        const overlap = significant.filter((token) => tokens.has(token));
        let score = 0;
        let kind: MatchEvidence['kind'] = 'overlap';
        if (containsPhrase(input, phrase)) {
          score = source === 'alias' ? 100 : 90;
          kind = 'phrase';
        } else if (
          overlap.length >= 2 &&
          overlap.length / significant.length >= 2 / 3
        ) {
          score = 60 + Math.round((10 * overlap.length) / significant.length);
        } else if (
          source === 'alias' &&
          overlap.length === 1 &&
          [...overlap[0]!].length >= 6 &&
          documentFrequency.get(overlap[0]!) === 1
        ) {
          score = 40;
          kind = 'token';
        }
        if (score < 40 || (best && best.score >= score)) continue;
        best = {
          conceptId: resolved.conceptId,
          score,
          requestedLocale: locale,
          locale: resolved.locale,
          fallbackUsed: resolved.fallbackUsed,
          evidence: {
            source,
            kind,
            term,
            matchedTokens: kind === 'phrase' ? phrase : overlap,
          },
        };
      }
      if (best && best.score >= minScore) matches.push(best);
    }
    const count =
      options.limit === undefined || !Number.isFinite(options.limit)
        ? 5
        : Math.max(0, Math.min(20, Math.floor(options.limit)));
    return matches
      .sort((a, b) => b.score - a.score || compareIds(a.conceptId, b.conceptId))
      .slice(0, count);
  }
}
