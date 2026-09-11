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
