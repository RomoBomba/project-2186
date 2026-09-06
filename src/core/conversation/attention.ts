import type { CharacterId } from '../character/id.ts';
import type { Locale } from '../language/locale.ts';
import type { ConceptMatch } from '../knowledge/matcher.ts';
import type { ConceptId } from '../knowledge/model.ts';
import { affinityFor } from '../knowledge/model.ts';
import { ConceptGraph } from '../knowledge/graph.ts';
import { resolveConcept } from '../knowledge/localization.ts';
import { compareIds } from '../knowledge/normalization.ts';
import type { ResponseHistory } from './model.ts';
export type Attention = {
  ranked: {
    conceptId: ConceptId;
    matchScore: number;
    affinity: number;
    attentionScore: number;
  }[];
  primary?: ConceptId;
  associated?: ConceptId;
  associationReason?: 'matched_related' | 'authored_related';
};
export function selectAttention(
  matches: readonly ConceptMatch[],
  graph: ConceptGraph,
  character: CharacterId,
  locale: Locale,
  history: ResponseHistory,
): Attention {
  const ranked = matches
    .filter((match) => graph.get(match.conceptId)?.content[locale])
    .map((match) => {
      const affinity = affinityFor(graph.get(match.conceptId)!, character);
      return {
        conceptId: match.conceptId,
        matchScore: match.score,
        affinity,
        attentionScore: (0.85 * match.score) / 100 + 0.15 * affinity,
      };
    });
  // An exact alias cannot be displaced by a lower-relevance class, even at affinity 0.
  const tier = (score: number) => (score >= 100 ? 2 : score >= 90 ? 1 : 0);
  ranked.sort(
    (a, b) =>
      tier(b.matchScore) - tier(a.matchScore) ||
      b.attentionScore - a.attentionScore ||
      compareIds(a.conceptId, b.conceptId),
  );
  const primary = ranked[0]?.conceptId;
  if (!primary) return { ranked };
  const related = graph
    .expand([primary], { depth: 1, limit: 6 })
    .filter((card) => resolveConcept(card, locale, false));
  const relatedRank = (id: ConceptId) => {
    const card = graph.get(id)!;
    return (
      (matches.some((match) => match.conceptId === id) ? 1 : 0) +
      affinityFor(card, character) -
      (history.materialKeys.some((key) => key.startsWith(id + ':')) ? 0.2 : 0)
    );
  };
  related.sort(
    (a, b) => relatedRank(b.id) - relatedRank(a.id) || compareIds(a.id, b.id),
  );
  const associated = related[0]?.id;
  return {
    ranked,
    primary,
    ...(associated
      ? {
          associated,
          associationReason: matches.some(
            (match) => match.conceptId === associated,
          )
            ? ('matched_related' as const)
            : ('authored_related' as const),
        }
      : {}),
  };
}
