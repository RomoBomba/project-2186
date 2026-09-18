import { expect, it } from 'vitest';
import { canonicalKnowledge } from '../../generated/knowledge.ts';
import { characterProfiles } from '../character/profile.ts';
import { characterIds } from '../character/id.ts';
import { createCharacterRuntime } from '../character/runtime.ts';
import { ConversationEngine } from '../conversation/engine.ts';
import { initialWorkingMemory } from '../memory/working.ts';
import { BasicIntelligenceProvider } from '../intelligence/basic.ts';
import { temporalPresence } from '../self/temporal.ts';
import { conversationScope } from './plan.ts';
import { presenceIntent } from './intent.ts';
import { runPresenceBenchmark } from '../../infrastructure/evaluation/presence.ts';
const profile = characterProfiles.aletheia;
const disposition = createCharacterRuntime('aletheia', 0).disposition;
const engine = new ConversationEngine(
  canonicalKnowledge,
  new BasicIntelligenceProvider(),
);
it('classifies the bilingual cohort, grounds offers and durations, without supplying trivia', async () => {
  const { metrics, rows } = await runPresenceBenchmark();
  for (const key of [
    'conversationScopeCoverage',
    'topicOfferGroundingRate',
    'topicOverviewCoverage',
    'knowledgeBoundaryClassificationAccuracy',
    'temporalSelfCoverage',
    'sessionDurationGroundingRate',
  ] as const)
    expect(metrics[key].rate, key).toBe(1);
  expect(metrics.genericUnknownRate.rate).toBe(0);
  expect(metrics.boundaryRepetitionRate.rate).toBe(0);
  expect(metrics.inventedWorldFactRate.rate).toBe(0);
  expect(rows.every((r) => r.text.length <= 600)).toBe(true);
  expect(
    rows
      .filter((r) => r.category === 'temporal_distance')
      .every((r) => !r.text.includes('Париж')),
  ).toBe(true);
});
it('scope uses actual localized cards, differs by affinity and rotates bounded topic history', async () => {
  const first = [];
  for (const id of characterIds) {
    const p = characterProfiles[id],
      d = createCharacterRuntime(id, 0).disposition;
    let memory = initialWorkingMemory();
    const suggestions = [];
    for (let n = 0; n < 9; n++) {
      const r = await engine.respond('Предложи тему.', p, d, 'ru', memory);
      memory = r.nextMemory;
      suggestions.push(r.plan.presence!.selectedTopicIds[0]);
      expect(memory.presenceHistory!.length).toBeLessThanOrEqual(4);
      expect(JSON.parse(JSON.stringify(memory))).toEqual(memory);
    }
    expect(new Set(suggestions.slice(0, 3)).size).toBe(3);
    first.push(suggestions[0]);
    const scope = conversationScope(canonicalKnowledge, p, 'ru', memory);
    expect(scope.domains.slice().sort()).toEqual([
      'art',
      'identity',
      'philosophy',
      'science',
      'world',
    ]);
  }
  expect(new Set(first).size).toBe(3);
  expect(
    conversationScope([], profile, 'ru', initialWorkingMemory()).discussable,
  ).toEqual([]);
});
it('retains ordinary known reasoning and rejects reported guidance as an intent', async () => {
  expect(presenceIntent('Она сказала: предложи тему.')).toBeUndefined();
  const r = await engine.respond(
    'Может ли сознание существовать без памяти?',
    profile,
    disposition,
    'ru',
    initialWorkingMemory(),
  );
  expect(r.plan.presence).toBeUndefined();
  expect(r.plan.reasoning?.relationId).toBe('consciousness-memory');
});
it('never invents a timestamp and distinguishes origin from measurable duration', () => {
  expect(temporalPresence().elapsedMinutes).toBeNull();
  expect(
    temporalPresence({ startedAt: 100, now: 99 }).elapsedMinutes,
  ).toBeNull();
  expect(
    temporalPresence({ startedAt: NaN, now: Infinity }).elapsedMinutes,
  ).toBeNull();
  expect(
    temporalPresence(
      { startedAt: 60000, now: 180000, previousInteractionAt: 0 },
      4,
    ),
  ).toMatchObject({
    elapsedMinutes: 2,
    intervalSincePreviousMinutes: 1,
    completedExchanges: 4,
    subjectiveTime: 'unestablished',
  });
});
