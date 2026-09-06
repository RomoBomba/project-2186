import type { Locale } from '../language/locale.ts';
import type { ConceptCard, ConceptId, LocalizedConcept } from './model.ts';
export type ResolvedConcept = {
  conceptId: ConceptId;
  requestedLocale: Locale;
  locale: Locale;
  fallbackUsed: boolean;
  content: LocalizedConcept;
};
export function resolveConcept(
  card: ConceptCard,
  requestedLocale: Locale,
  allowFallback = true,
): ResolvedConcept | undefined {
  const locale = card.content[requestedLocale]
    ? requestedLocale
    : allowFallback
      ? requestedLocale === 'ru'
        ? 'en'
        : 'ru'
      : undefined;
  if (!locale) return undefined;
  const content = card.content[locale];
  return content
    ? {
        conceptId: card.id,
        requestedLocale,
        locale,
        fallbackUsed: locale !== requestedLocale,
        content,
      }
    : undefined;
}
