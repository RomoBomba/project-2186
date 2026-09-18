import { expect, it, vi } from 'vitest';
import { canonicalKnowledge } from '../../generated/knowledge.ts';
import { characterProfiles } from '../character/profile.ts';
import { characterIds } from '../character/id.ts';
import { createCharacterRuntime } from '../character/runtime.ts';
import { ConversationEngine } from '../conversation/engine.ts';
import { initialWorkingMemory } from '../memory/working.ts';
import { BasicIntelligenceProvider } from '../intelligence/basic.ts';
import { GroundedIntelligenceProvider } from '../../application/grounded-provider.ts';
import { temporalPresence } from '../self/temporal.ts';
import { conversationScope } from './plan.ts';
import { presenceIntent } from './intent.ts';
import { validatePresence } from './surface.ts';
import { serializePresence } from '../../infrastructure/ollama/presence.ts';
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
it('uses a separate optional presence boundary, permits authored variations and rejects invented facts', async () => {
  let calls = 0;
  const factual = { realize: vi.fn() };
  const provider = new GroundedIntelligenceProvider(factual, 5000, {
    realize: async (request) => {
      calls++;
      expect(JSON.stringify(request)).not.toContain('France');
      const body = serializePresence(request);
      expect(body).toMatchObject({
        model: 'qwen3:4b-instruct',
        think: false,
        stream: false,
        options: { temperature: 0.35, num_ctx: 2048, num_predict: 96 },
        keep_alive: '2m',
      });
      const alternative = request.alternatives[1]!;
      expect(validatePresence(alternative, request)).toBe(true);
      expect(
        validatePresence(
          { ...alternative, text: 'Paris is the capital.' },
          request,
        ),
      ).toBe(false);
      expect(
        validatePresence(
          { ...alternative, topicIds: ['world.invented'] },
          request,
        ),
      ).toBe(false);
      return calls === 1
        ? alternative
        : { ...alternative, text: 'France no longer exists.' };
    },
  });
  const e = new ConversationEngine(canonicalKnowledge, provider);
  const args = [
    'What is the capital of France?',
    profile,
    disposition,
    'en',
    initialWorkingMemory(),
  ] as const;
  const basic = await engine.respond(...args);
  const accepted = await e.respond(...args);
  expect(accepted.response.presenceInspection?.provider).toBe('local');
  expect(accepted.response.text).not.toBe(basic.response.text);
  const rejected = await e.respond(...args);
  expect(rejected.response.text).toBe(basic.response.text);
  expect(rejected.response.presenceInspection?.validation).toBe('rejected');
  expect(factual.realize).not.toHaveBeenCalled();
  expect(rejected.nextMemory.recentTurns).toHaveLength(2);
});
it('presence failure and timeout fall back without a second exchange', async () => {
  vi.useFakeTimers();
  try {
    const p = new GroundedIntelligenceProvider(undefined, 5000, {
      realize: () => new Promise(() => {}),
    });
    const pending = new ConversationEngine(canonicalKnowledge, p).respond(
      'Какая сегодня погода?',
      profile,
      disposition,
      'ru',
      initialWorkingMemory(),
    );
    await vi.advanceTimersByTimeAsync(10001);
    const r = await pending;
    expect(r.response.presenceInspection?.validation).toBe('timeout');
    expect(r.nextMemory.recentTurns).toHaveLength(2);
  } finally {
    vi.useRealTimers();
  }
});
