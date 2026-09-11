import { inflectionEvidence } from './inflection.ts';
import type { ConceptId } from '../knowledge/model.ts';
import type { Locale } from '../language/locale.ts';
import { normalizeConceptText } from '../knowledge/normalization.ts';
import type { ConceptGraph } from '../knowledge/graph.ts';
import type { ConceptRelation, RelationRef, ConceptEvidence } from './model.ts';
export class RelationIndex {
  private readonly relations: ConceptRelation[];
  constructor(relations: readonly ConceptRelation[], graph: ConceptGraph) {
    const seen = new Set<string>();
    this.relations = relations
      .map((r) => {
        if (
          !r.id ||
          seen.has(r.id) ||
          r.concepts.length !== 2 ||
          r.concepts[0] === r.concepts[1] ||
          !['symmetric', 'directed'].includes(r.direction) ||
          !r.material.length ||
          r.material.some(
            (m) =>
              !['claim', 'distinction', 'boundary'].includes(m.kind) ||
              !['ru', 'en'].every(
                (l) =>
                  typeof m.text[l as Locale] === 'string' &&
                  m.text[l as Locale].trim().length > 0 &&
                  m.text[l as Locale].length <= 420,
              ),
          )
        )
          throw Error('Invalid relation: ' + r.id);
        seen.add(r.id);
        return structuredClone(r);
      })
      .filter((r) => r.concepts.every((id) => !!graph.get(id)))
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  }
  lookup(first: ConceptId, second: ConceptId): ConceptRelation | undefined {
    return this.relations.find(
      (r) =>
        (r.concepts[0] === first && r.concepts[1] === second) ||
        (r.direction === 'symmetric' &&
          r.concepts[0] === second &&
          r.concepts[1] === first),
    );
  }
  get(id: string) {
    return this.relations.find((r) => r.id === id);
  }
  read(ref: RelationRef, locale: Locale) {
    return this.get(ref.relationId)?.material[ref.index]?.text[locale];
  }
}
export function operandEvidence(
  text: string,
  locale: Locale,
  vocabulary: Partial<Record<ConceptId, Record<Locale, readonly string[]>>>,
  graph: ConceptGraph,
): ConceptEvidence[] {
  const s = ' ' + normalizeConceptText(text) + ' ';
  const exact = Object.entries(vocabulary).flatMap(([key, terms]) => {
    const conceptId = key as ConceptId;
    const term = terms?.[locale].find((t) =>
      s.includes(' ' + normalizeConceptText(t) + ' '),
    );
    return term && graph.get(conceptId)
      ? [{ conceptId, source: 'relation_term' as const, term }]
      : [];
  });
  return [
    ...exact,
    ...(locale === 'ru'
      ? inflectionEvidence(text).filter(
          (e) =>
            graph.get(e.conceptId) &&
            !exact.some((x) => x.conceptId === e.conceptId),
        )
      : []),
  ];
}
