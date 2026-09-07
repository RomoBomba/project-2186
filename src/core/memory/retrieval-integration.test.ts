import { expect, it } from 'vitest';
import { conversationEngine } from '../../application/intelligence';
import { createCharacterRuntime } from '../character/runtime';
import { characterProfiles } from '../character/profile';
import { initialWorkingMemory } from './working';
import {
  extractMemoryCandidates,
  retainCandidates,
  emptyLongTermMemory,
} from './long-term';
import { characterIds } from '../character/id';
it.each(characterIds)(
  '%s receives structured relevant memory, uses it once, and does not alter unrelated answers',
  async (id) => {
    const runtime = createCharacterRuntime(id, 0);
    const m = retainCandidates(
      emptyLongTermMemory(),
      extractMemoryCandidates('Я люблю смотреть на звёзды.', 'ru'),
      1,
    );
    const memory = {
      semantic: m.semantic,
      referencedIds: [] as string[],
      lastReferenceTurn: -4,
    };
    const respond = (text: string, workspace = initialWorkingMemory()) =>
      conversationEngine.respond(
        text,
        characterProfiles[id],
        runtime.disposition,
        'ru',
        workspace,
        memory,
      );
    const result = await respond('Снова хочется смотреть на звёзды.');
    expect(result.plan.longTermContext).toHaveLength(1);
    expect(result.response.usedMemoryIds).toEqual([m.semantic[0]!.id]);
    memory.referencedIds = [m.semantic[0]!.id];
    const again = await respond(
      'Снова хочется смотреть на звёзды.',
      result.nextMemory,
    );
    expect(again.response.usedMemoryIds).toBeUndefined();
    const unrelated = await respond('Какая погода на Марсе?');
    expect(unrelated.plan.acknowledgeMemoryId).toBeUndefined();
    const ordinary = await conversationEngine.respond(
      'Какая погода на Марсе?',
      characterProfiles[id],
      runtime.disposition,
      'ru',
      initialWorkingMemory(),
    );
    expect(unrelated.response).toEqual(ordinary.response);
  },
);
it('leaves ambiguous, negated, questions and recent references silent, including English', async () => {
  const runtime = createCharacterRuntime('aura', 0);
  const memory = retainCandidates(
    emptyLongTermMemory(),
    extractMemoryCandidates('I like astronomy.', 'en'),
    1,
  );
  const params = {
    semantic: memory.semantic,
    referencedIds: [],
    lastReferenceTurn: -4,
  };
  for (const text of [
    'Astronomy.',
    'I do not like astronomy anymore.',
    'Again, what is astronomy?',
  ]) {
    const result = await conversationEngine.respond(
      text,
      characterProfiles.aura,
      runtime.disposition,
      'en',
      initialWorkingMemory(),
      params,
    );
    expect(result.response.usedMemoryIds).toBeUndefined();
  }
  const result = await conversationEngine.respond(
    'Back to astronomy.',
    characterProfiles.aura,
    runtime.disposition,
    'en',
    initialWorkingMemory(),
    params,
  );
  expect(result.response.usedMemoryIds).toHaveLength(1);
  const tooSoon = await conversationEngine.respond(
    'Back to astronomy.',
    characterProfiles.aura,
    runtime.disposition,
    'en',
    result.nextMemory,
    { ...params, lastReferenceTurn: 0 },
  );
  expect(tooSoon.response.usedMemoryIds).toBeUndefined();
});
it('distinguishes a rejected partial match from retrieval delivered to a silent plan', async () => {
  const runtime = createCharacterRuntime('aura', 0);
  const semantic = retainCandidates(
    emptyLongTermMemory(),
    extractMemoryCandidates('Я люблю смотреть на звёзды ночью.', 'ru'),
    1,
  ).semantic;
  const respond = (text: string) =>
    conversationEngine.respond(
      text,
      characterProfiles.aura,
      runtime.disposition,
      'ru',
      initialWorkingMemory(),
      { semantic, referencedIds: [], lastReferenceTurn: -4 },
    );
  const inflected = await respond('Я снова смотрел на звёзды.');
  expect(inflected.memoryInspection.retrieval[0]).toMatchObject({
    matchedTerms: ['звезды'],
    reason: 'insufficient_overlap',
  });
  expect(inflected.memoryInspection.retrieval[0]!.score).toBeCloseTo(
    0.4221666667,
  );
  expect(inflected.memoryInspection.deliveredToPlan).toEqual([]);
  const shorter = await respond('Я люблю смотреть на звёзды.');
  expect(shorter.memoryInspection.retrieval[0]).toMatchObject({
    matchedTerms: ['смотреть', 'звезды'],
    reason: 'eligible',
  });
  expect(shorter.plan.longTermContext?.[0]?.score).toBeCloseTo(0.6888333333);
  expect(shorter.memoryInspection.deliveredToPlan).toEqual([semantic[0]!.id]);
  expect(shorter.memoryInspection.referenceBlockers).toEqual(
    expect.arrayContaining([
      'no_revisit_marker',
      'new_explicit_fact',
      'no_unreferenced_supported_memory_at_0.70',
    ]),
  );
  expect(shorter.response.usedMemoryIds).toBeUndefined();
});
