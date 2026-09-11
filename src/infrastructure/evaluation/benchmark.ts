import { selfQueryKinds, type SelfQueryKind } from '../../core/self/query.ts';
import {
  createSystemSelfModel,
  availableSelfFacts,
} from '../../core/self/model.ts';
import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';
import type { Locale } from '../../core/language/locale.ts';
import type { ConceptCard } from '../../core/knowledge/model.ts';
import { ConceptMatcher } from '../../core/knowledge/matcher.ts';
import { ConversationEngine } from '../../core/conversation/engine.ts';
import { BasicIntelligenceProvider } from '../../core/intelligence/basic.ts';
import { characterIds } from '../../core/character/id.ts';
import { characterProfiles } from '../../core/character/profile.ts';
import { createCharacterRuntime } from '../../core/character/runtime.ts';
import { initialWorkingMemory } from '../../core/memory/working.ts';
export type BenchmarkCase = {
  id: string;
  locale: Locale;
  input: string;
  category:
    | 'canonical'
    | 'paraphrase'
    | 'relation'
    | 'contextual'
    | 'self'
    | 'unknown'
    | 'false_positive';
  expectedPrimaryConcept?: string;
  expectedConcepts: string[];
  mustAnswer: boolean;
  mustNotMatch: string[];
  context?: string[];
  selfCohort?: 'original' | 'expanded';
  expectedSelfQuery?: SelfQueryKind;
};
export async function loadBenchmark(
  cards: readonly ConceptCard[],
): Promise<BenchmarkCase[]> {
  const data: unknown = parse(
    await readFile(
      new URL(
        '../../../content/evaluation/intelligence-benchmark.yaml',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  if (!Array.isArray(data)) throw Error('Benchmark must be a case array');
  const ids = new Set<string>();
  const concepts = new Set<string>(cards.map((c) => c.id));
  return data.map((value: unknown) => {
    if (!value || typeof value !== 'object')
      throw Error('Invalid benchmark case');
    const c = value as BenchmarkCase;
    if (
      typeof c.id !== 'string' ||
      !c.id ||
      ids.has(c.id) ||
      !['ru', 'en'].includes(c.locale) ||
      typeof c.input !== 'string' ||
      !c.input.trim() ||
      ![
        'canonical',
        'paraphrase',
        'relation',
        'contextual',
        'self',
        'unknown',
        'false_positive',
      ].includes(c.category) ||
      typeof c.mustAnswer !== 'boolean' ||
      (c.category === 'self' &&
        (!c.expectedSelfQuery ||
          !selfQueryKinds.includes(c.expectedSelfQuery) ||
          !['original', 'expanded'].includes(c.selfCohort ?? ''))) ||
      ![c.expectedConcepts, c.mustNotMatch].every(
        (a) => Array.isArray(a) && a.every((id) => concepts.has(id)),
      ) ||
      (c.expectedPrimaryConcept !== undefined &&
        !concepts.has(c.expectedPrimaryConcept)) ||
      (c.context !== undefined &&
        (!Array.isArray(c.context) ||
          !c.context.every((t) => typeof t === 'string' && t.trim())))
    )
      throw Error('Invalid benchmark case: ' + String(c.id));
    ids.add(c.id);
    return c;
  });
}
const ratio = (numerator: number, denominator: number) => ({
  numerator,
  denominator,
  rate: denominator ? numerator / denominator : null,
});
export async function runBenchmark(
  cards: readonly ConceptCard[],
  cases: readonly BenchmarkCase[],
) {
  const matcher = new ConceptMatcher(cards);
  const engine = new ConversationEngine(cards, new BasicIntelligenceProvider());
  const rows = [];
  for (const c of cases) {
    const matches = matcher.match(c.input, c.locale);
    const planning = [];
    for (const character of characterIds) {
      let memory = initialWorkingMemory();
      const disposition = createCharacterRuntime(character, 0).disposition;
      for (const turn of c.context ?? []) {
        const previous = await engine.respond(
          turn,
          characterProfiles[character],
          disposition,
          c.locale,
          memory,
        );
        memory = previous.nextMemory;
      }
      const result = await engine.respond(
        c.input,
        characterProfiles[character],
        disposition,
        c.locale,
        memory,
      );
      const self = result.plan.selfMaterial;
      const available = availableSelfFacts(
        createSystemSelfModel(characterProfiles[character]),
      );
      const selfGrounded =
        !!self &&
        self.facts.length > 0 &&
        self.facts.every((f) => available.includes(f)) &&
        (!['reasoning', 'consciousness'].includes(self.query.kind) ||
          self.facts.includes('experience_unestablished')) &&
        (self.query.kind !== 'memory' ||
          self.facts.includes('no_full_transcript')) &&
        !self.facts.includes('retained_user');
      planning.push({
        selfQuery: result.perception.selfQuery?.kind ?? null,
        selfMaterial: self ?? null,
        selfGrounded,
        character,
        strategy: result.plan.strategy,
        primary: result.plan.primaryConceptId ?? null,
        associated: result.plan.associatedConceptId ?? null,
        context: result.context,
        activeThread: result.nextMemory.currentThread ?? null,
        material: result.plan.selectedMaterial.map((ref) => ({
          ...ref,
          provenance: matches.some((m) => m.conceptId === ref.conceptId)
            ? 'direct_input'
            : result.plan.contextReference
              ? 'working_context'
              : 'graph_only',
        })),
        response: result.response.text,
      });
    }
    rows.push({
      ...c,
      matches,
      planning,
      forbiddenMatches: matches
        .filter((m) => c.mustNotMatch.includes(m.conceptId))
        .map((m) => m.conceptId),
    });
  }
  // Contextual and self cases are diagnostic cohorts, not isolated knowledge queries.
  const ordinary = rows.filter(
    (c) => c.category !== 'self' && c.category !== 'contextual',
  );
  const primary = ordinary.filter((c) => c.expectedPrimaryConcept);
  const known = ordinary.filter((c) => c.mustAnswer);
  const negatives = ordinary.filter((c) =>
    ['unknown', 'false_positive'].includes(c.category),
  );
  const expected = ordinary.flatMap((c) =>
    c.expectedConcepts.map((id) => c.matches.some((m) => m.conceptId === id)),
  );
  const relations = ordinary.filter((c) => c.category === 'relation');
  const selfRows = rows.filter((c) => c.category === 'self');
  const selfMetrics = (cohort: typeof selfRows) => ({
    selfQueryClassificationAccuracy: ratio(
      cohort.reduce(
        (n, c) =>
          n +
          c.planning.filter((p) => p.selfQuery === c.expectedSelfQuery).length,
        0,
      ),
      cohort.length * 3,
    ),
    selfAnswerCoverage: ratio(
      cohort.filter((c) =>
        c.planning.every(
          (p) =>
            p.selfQuery === c.expectedSelfQuery &&
            p.selfMaterial &&
            p.response.trim(),
        ),
      ).length,
      cohort.length,
    ),
    selfGroundingAccuracy: ratio(
      cohort.reduce(
        (n, c) => n + c.planning.filter((p) => p.selfGrounded).length,
        0,
      ),
      cohort.length * 3,
    ),
  });
  return {
    selfMetrics: {
      original: selfMetrics(
        selfRows.filter((c) => c.selfCohort === 'original'),
      ),
      expanded: selfMetrics(
        selfRows.filter((c) => c.selfCohort === 'expanded'),
      ),
      selfFalsePositiveRate: ratio(
        ordinary.reduce(
          (n, c) => n + c.planning.filter((p) => p.selfQuery !== null).length,
          0,
        ),
        ordinary.length * 3,
      ),
    },
    corpusCount: cards.length,
    caseCount: rows.length,
    localeCounts: {
      ru: rows.filter((c) => c.locale === 'ru').length,
      en: rows.filter((c) => c.locale === 'en').length,
    },
    metrics: {
      primaryConceptAccuracy: ratio(
        primary.filter(
          (c) => c.matches[0]?.conceptId === c.expectedPrimaryConcept,
        ).length,
        primary.length,
      ),
      expectedConceptRecall: ratio(
        expected.filter(Boolean).length,
        expected.length,
      ),
      knownToUnknownRate: ratio(
        known.filter((c) => !c.matches.length).length,
        known.length,
      ),
      falsePositiveRate: ratio(
        negatives.filter((c) => c.matches.length).length,
        negatives.length,
      ),
      relationCoverage: ratio(
        relations.reduce(
          (n, c) =>
            n +
            c.planning.filter((p) =>
              c.expectedConcepts.every(
                (id) =>
                  c.matches.some((m) => m.conceptId === id) ||
                  p.primary === id ||
                  p.associated === id,
              ),
            ).length,
          0,
        ),
        relations.length * characterIds.length,
      ),
    },
    selfCoverage: ratio(
      rows.filter(
        (c) =>
          c.category === 'self' &&
          c.selfCohort === 'original' &&
          c.matches.some((m) => c.expectedConcepts.includes(m.conceptId)),
      ).length,
      rows.filter((c) => c.category === 'self' && c.selfCohort === 'original')
        .length,
    ),
    contextualCoverage: ratio(
      rows
        .filter((c) => c.category === 'contextual')
        .reduce(
          (n, c) =>
            n +
            c.planning.filter((p) => p.primary === c.expectedPrimaryConcept)
              .length,
          0,
        ),
      rows.filter((c) => c.category === 'contextual').length *
        characterIds.length,
    ),
    rows,
  };
}
