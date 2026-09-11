import { expect, it } from 'vitest';
import { canonicalKnowledge } from '../../generated/knowledge';
import { ConversationEngine } from '../../core/conversation/engine';
import { BasicIntelligenceProvider } from '../../core/intelligence/basic';
import { characterProfiles } from '../../core/character/profile';
import { createCharacterRuntime } from '../../core/character/runtime';
import { initialWorkingMemory } from '../../core/memory/working';
import {
  availableSelfFacts,
  createSystemSelfModel,
} from '../../core/self/model';
import { recognizeSelfQuery } from '../../core/self/query';
import { selfFactText } from '../../characters/self';
import {
  extractMemoryCandidates,
  retainCandidates,
  emptyLongTermMemory,
} from '../../core/memory/long-term';
import { loadBenchmark, runBenchmark } from '../evaluation/benchmark';
const engine = new ConversationEngine(
  canonicalKnowledge,
  new BasicIntelligenceProvider(),
);
const ask = (
  message: string,
  character: 'aletheia' | 'aura' | 'themis' = 'aletheia',
  memory = initialWorkingMemory(),
  semantic = emptyLongTermMemory().semantic,
) =>
  engine.respond(
    message,
    characterProfiles[character],
    createCharacterRuntime(character, 0).disposition,
    'ru',
    memory,
    { semantic, referencedIds: [], lastReferenceTurn: -4 },
  );
it('shares factual capabilities, keeps profile identity and remains serializable', () => {
  const models = Object.values(characterProfiles).map((p) =>
    createSystemSelfModel(p),
  );
  for (const model of models) {
    expect(JSON.parse(JSON.stringify(model))).toEqual(model);
    expect(model.memory.fullTranscript).toBe(false);
    expect(model.consciousness).toBe('subjective_equivalence_unestablished');
  }
  expect(models.map((m) => availableSelfFacts(m))).toEqual([
    availableSelfFacts(models[0]!),
    availableSelfFacts(models[0]!),
    availableSelfFacts(models[0]!),
  ]);
  expect(models[0]!.characterIdentity.interests).not.toEqual(
    models[1]!.characterIdentity.interests,
  );
});
it.each([
  ['Может ли машина мыслить?', 'ru'],
  ['Что такое память?', 'ru'],
  ['Может ли машина иметь сознание?', 'ru'],
  ['Ты знаешь, кто написал эту книгу?', 'ru'],
  ['Ты можешь объяснить, что такое память?', 'ru'],
  ['У меня есть сознание', 'ru'],
  ['ты', 'ru'],
  ['память', 'ru'],
  ['Can a machine think?', 'en'],
  ['What is consciousness?', 'en'],
  ['Can a machine create art?', 'en'],
  ['Do you know what memory is?', 'en'],
] as const)('does not confuse a general topic with self: %s', (text, locale) =>
  expect(recognizeSelfQuery(text, locale)).toBeUndefined(),
);
it('grounds remembering in current persistent facts without exposing their values', async () => {
  const first = await ask('Ты меня помнишь?');
  expect(first.plan.selfMaterial!.facts).toContain('no_retained_user');
  expect(first.response.text).not.toContain(selfFactText.ru.retained_user);
  const personal = retainCandidates(
    emptyLongTermMemory(),
    extractMemoryCandidates('Меня зовут Роман.', 'ru'),
    1,
  );
  const memories = personal.semantic;
  expect(memories).toHaveLength(1);
  const second = await ask(
    'Ты меня помнишь?',
    'aletheia',
    initialWorkingMemory(),
    memories,
  );
  expect(second.plan.selfMaterial!.facts).toContain('retained_user');
  expect(second.response.text).not.toContain('Роман');
  const reloaded = await ask(
    'Ты помнишь весь наш прошлый разговор?',
    'aletheia',
    initialWorkingMemory(),
    JSON.parse(JSON.stringify(memories)),
  );
  expect(reloaded.response.text).toContain(selfFactText.ru.no_full_transcript);
  expect(reloaded.plan.selfMaterial!.facts).not.toContain('retained_user');
  expect(
    createSystemSelfModel(
      characterProfiles.aletheia,
      memories.map((m) => ({ ...m, status: 'superseded' as const })),
    ).memory.retainedUserInformation,
  ).toBe(false);
});
it('keeps epistemic limits, differentiates emphasis and follows a bounded self conversation', async () => {
  const texts = [];
  for (const character of ['aletheia', 'aura', 'themis'] as const) {
    let memory = initialWorkingMemory();
    for (const message of [
      'Кто ты?',
      'Ты мыслишь?',
      'А сознание у тебя есть?',
      'Чем мышление отличается для тебя от сознания?',
    ]) {
      const result = await ask(message, character, memory);
      memory = result.nextMemory;
      expect(result.plan.selfMaterial).toBeDefined();
      expect(result.plan.selectedMaterial).toEqual([]);
      if (message !== 'Кто ты?')
        expect(result.response.text).toContain(
          selfFactText.ru.experience_unestablished,
        );
      if (message === 'Ты мыслишь?') texts.push(result.response.text);
      expect(result.response.text.length).toBeLessThanOrEqual(
        result.plan.desiredLength.maxCharacters,
      );
      expect(result.response.text).not.toMatch(
        /WorkingMemory|IndexedDB|ResponsePlan|ConceptMatcher|TypeScript|я человек|точно нет сознания/iu,
      );
    }
  }
  expect(new Set(texts).size).toBe(3);
  const art = await ask('Ты создаёшь искусство?');
  const follow = await ask(
    'Тогда чем твоё создание отличается от копирования?',
    'aletheia',
    art.nextMemory,
  );
  expect(follow.plan.selfMaterial?.query.contextual).toBe(true);
  expect(follow.plan.selfMaterial?.facts).toContain('reuses_parts');
  const general = await ask('Что такое память?', 'aletheia', follow.nextMemory);
  expect(general.plan.selfMaterial).toBeUndefined();
  const why = await ask('Почему?', 'aletheia', general.nextMemory);
  expect(why.plan.selfMaterial).toBeUndefined();
});
it('does not invent biology or a biography and compares actual configurations', async () => {
  for (const character of ['aletheia', 'aura', 'themis'] as const) {
    const body = await ask('Это твоё лицо на экране?', character);
    expect(body.plan.selfMaterial!.facts).toEqual([
      'no_biological_body',
      'portrait_representation',
    ]);
    const difference = await ask('Чем ты отличаешься от AURA?', character);
    expect(difference.plan.selfMaterial!.comparisons[0]?.interests).toEqual(
      characterProfiles.aura.interests,
    );
    const unknown = await ask('Ты спишь?', character);
    expect(unknown.plan.selfMaterial!.facts).toEqual(['unknown_limit']);
  }
});
it('keeps RU/EN self resources complete and benchmark outcomes deterministic', async () => {
  expect(Object.keys(selfFactText.ru).sort()).toEqual(
    Object.keys(selfFactText.en).sort(),
  );
  const cases = (await loadBenchmark(canonicalKnowledge)).filter(
    (c) => c.category === 'self',
  );
  const report = await runBenchmark(canonicalKnowledge, cases);
  expect(report.selfMetrics.original.selfAnswerCoverage).toMatchObject({
    numerator: 8,
    denominator: 8,
  });
  expect(report.selfMetrics.expanded.selfQueryClassificationAccuracy.rate).toBe(
    1,
  );
  expect(report.selfMetrics.expanded.selfGroundingAccuracy.rate).toBe(1);
  expect(await runBenchmark(canonicalKnowledge, cases.slice(0, 2))).toEqual(
    await runBenchmark(canonicalKnowledge, cases.slice(0, 2)),
  );
  for (const row of report.rows)
    for (const plan of row.planning) {
      expect(plan.response).not.toMatch(
        /as an AI language model|я чувствую|я страдаю|I suffer|I feel/iu,
      );
      if (row.locale === 'en') expect(plan.response).not.toMatch(/[А-Яа-яЁё]/u);
    }
});
