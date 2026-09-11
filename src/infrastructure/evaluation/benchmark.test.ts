import { expect, it } from 'vitest';
import { canonicalKnowledge } from '../../generated/knowledge';
import { loadBenchmark, runBenchmark } from './benchmark';
it('validates fixed bilingual benchmark coverage and reproduces metrics', async () => {
  const cases = await loadBenchmark(canonicalKnowledge);
  expect(cases.length).toBeGreaterThanOrEqual(50);
  for (const card of canonicalKnowledge)
    for (const locale of ['ru', 'en'])
      expect(
        cases.some(
          (c) => c.locale === locale && c.expectedPrimaryConcept === card.id,
        ),
      ).toBe(true);
  const subset = cases.filter((c) =>
    [
      'Может ли машина мыслить?',
      'Что делает человека свободным?',
      'Как отличить причину от совпадения?',
      'What remains then?',
    ].includes(c.input),
  );
  const result = await runBenchmark(canonicalKnowledge, subset);
  expect(result).toEqual(await runBenchmark(canonicalKnowledge, subset));
  const cause = result.rows.find(
    (r) => r.input === 'Как отличить причину от совпадения?',
  )!;
  expect(cause.matches[0]).toMatchObject({
    conceptId: 'science.causality',
    score: 88,
    evidence: { source: 'question' },
  });
  // Retrieval does not itself instruct the provider to echo its question.
  for (const p of cause.planning) expect(p.response).not.toBe(cause.input);
  expect(
    result.rows.find((r) => r.input === 'What remains then?')!.matches,
  ).toEqual([]);
  for (const r of result.rows)
    for (const p of r.planning)
      for (const ref of p.material)
        expect(ref.provenance === 'direct_input').toBe(
          r.matches.some((m) => m.conceptId === ref.conceptId),
        );
});
it('labels actual graph-only material separately from direct current evidence', async () => {
  const [c] = (await loadBenchmark(canonicalKnowledge)).filter(
    (c) => c.input === 'Интеллект',
  );
  const r = await runBenchmark(canonicalKnowledge, [c!]);
  const refs = r.rows[0]!.planning.flatMap((p) => p.material);
  expect(refs.some((m) => m.provenance === 'direct_input')).toBe(true);
  expect(refs.some((m) => m.provenance === 'graph_only')).toBe(true);
});

it('evaluates the bilingual reasoning cohort with all three characters and grounded answers', async () => {
  const cohort = (await loadBenchmark(canonicalKnowledge)).filter(
    (c) => c.reasoningCohort,
  );
  expect(cohort).toHaveLength(32);
  const report = await runBenchmark(canonicalKnowledge, cohort);
  expect(report.reasoningMetrics.reasoningFrameAccuracy).toMatchObject({
    numerator: 96,
    denominator: 96,
    rate: 1,
  });
  expect(report.reasoningMetrics.requiredConceptAvailability.rate).toBe(1);
  expect(report.reasoningMetrics.authoredRelationCoverage.rate).toBe(1);
  expect(report.reasoningMetrics.associationBeforeAnswerRate.numerator).toBe(0);
  for (const c of report.rows)
    for (const p of c.planning) {
      expect(p.reasoning?.frame).toBe(c.expectedReasoningFrame);
      if (c.expectedRelation) {
        expect(p.reasoning?.relationId).toBe(c.expectedRelation);
        expect(p.reasoning?.required.length).toBeGreaterThan(0);
      }
      expect(p.response).not.toMatch(/\?$/u);
      expect(p.material.every((m) => m.kind !== 'question')).toBe(true);
    }
});

it('runs conversational prefixes through the same engine and grades grounded focus rather than prose', async () => {
  const cases = (await loadBenchmark(canonicalKnowledge)).filter(
    (c) => c.conversationCohort,
  );
  expect(cases).toHaveLength(64);
  const report = await runBenchmark(canonicalKnowledge, cases);
  expect(report.conversationalMetrics.paraphraseFrameAccuracy.rate).toBe(1);
  expect(report.conversationalMetrics.followUpResolutionRate.rate).toBe(1);
  // Historical fixed-focus expectations include over-retention cases; retain their denominator for reporting.
  expect(
    report.conversationalMetrics.reasoningFocusRetentionRate.denominator,
  ).toBe(168);
  expect(report.conversationalMetrics.selfFocusRetentionRate.rate).toBe(1);
  expect(report.conversationalMetrics.groundedPartialAnswerRate.rate).toBe(1);
  expect(
    report.conversationalMetrics.irrelevantOptionalAssociationRate.numerator,
  ).toBe(0);
  for (const c of report.rows)
    for (const p of c.planning) {
      expect(p.response.trim()).not.toBe('');
      if (c.expectedPartial) expect(p.reasoning?.partial).toBe(true);
      if (c.expectedFollowUp && p.focus?.scope === 'general') {
        if (p.followUp.targets?.length)
          expect(p.focus.concepts).toContain(p.followUp.targets[0]);
        else expect(p.focus.concepts).toEqual(p.previousFocus?.concepts);
      }
    }
});

it('measures targeted retain, pivot and replace cases without rewarding stale material', async () => {
  const cases = (await loadBenchmark(canonicalKnowledge)).filter(
    (c) => c.transitionCohort,
  );
  expect(cases).toHaveLength(16);
  const report = await runBenchmark(canonicalKnowledge, cases);
  expect(report.focusMetrics.focusTransitionAccuracy).toMatchObject({
    numerator: 48,
    denominator: 48,
    rate: 1,
  });
  expect(report.focusMetrics.overRetainedFocusRate).toMatchObject({
    numerator: 0,
    denominator: 30,
    rate: 0,
  });
  for (const c of report.rows)
    for (const p of c.planning) {
      if (c.expectedTransition === 'retain')
        expect(p.focusTransition).toBe('retained');
      else {
        expect(p.focus?.concepts).toContain(c.expectedTarget);
        expect(p.focusTransition).toBe(
          c.expectedTransition === 'replace'
            ? 'replaced'
            : p.reasoning?.relationId
              ? 'refined'
              : 'pivoted',
        );
        if (!p.reasoning?.relationId) {
          expect(p.material.length).toBeGreaterThan(0);
          expect(
            p.material.every((m) => m.conceptId === c.expectedTarget),
          ).toBe(true);
        }
      }
    }
});
