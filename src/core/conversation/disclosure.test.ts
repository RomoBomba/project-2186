import { expect, it } from 'vitest';
import { conversationEngine } from '../../application/intelligence';
import { characterIds } from '../character/id';
import { characterProfiles } from '../character/profile';
import { createCharacterRuntime } from '../character/runtime';
import { initialWorkingMemory } from '../memory/working';
import {
  emptyLongTermMemory,
  extractMemoryCandidates,
  retainCandidates,
} from '../memory/long-term';
import { disclosureVoices } from '../../characters/disclosure';
import type { Locale } from '../language/locale';

const inputs: [Locale, string][] = [
  ['ru', 'Привет, я люблю смотреть на звёзды.'],
  ['ru', 'Я люблю звёзды.'],
  ['ru', 'Меня зовут Роман.'],
  ['ru', 'Также я интересуюсь философией.'],
  ['ru', 'Я работаю над PROJECT 2186.'],
  ['ru', 'Я не люблю шум.'],
  ['ru', 'Для меня важна свобода.'],
  ['en', 'Hello, I like watching stars.'],
  ['en', 'I like stars.'],
  ['en', 'My name is Roman.'],
  ['en', "I'm also interested in philosophy."],
  ['en', "I'm working on PROJECT 2186."],
  ['en', "I don't like noise."],
  ['en', 'Freedom is important to me.'],
];
it.each(characterIds)(
  '%s acknowledges only supplied personal material in both languages',
  async (id) => {
    const runtime = createCharacterRuntime(id, 0);
    for (const [locale, text] of inputs) {
      const result = await conversationEngine.respond(
        text,
        characterProfiles[id],
        runtime.disposition,
        locale,
        initialWorkingMemory(),
      );
      const candidate = extractMemoryCandidates(text, locale)[0]!;
      expect(result.plan.userGroundedMaterial).toEqual({
        kind: candidate.kind,
        value: candidate.value,
        confidence: candidate.confidence,
        source: 'current_turn',
      });
      expect(result.plan.strategy).toBe('reflect');
      expect(result.plan.selectedMaterial).toEqual([]);
      expect(result.response.usedMaterialKeys).toEqual([]);
      expect(result.response.usedMemoryIds).toBeUndefined();
      expect(result.response.text).toBe(
        disclosureVoices[id][locale][candidate.kind].replace(
          '{value}',
          candidate.value,
        ),
      );
      expect(result.response.text.length).toBeLessThanOrEqual(
        result.plan.desiredLength.maxCharacters,
      );
      const repeated = await conversationEngine.respond(
        text,
        characterProfiles[id],
        runtime.disposition,
        locale,
        initialWorkingMemory(),
      );
      expect(repeated.response).toEqual(result.response);
    }
  },
);

it('preserves greetings/questions and does not borrow previous user material', async () => {
  const runtime = createCharacterRuntime('aura', 0);
  const respond = (text: string) =>
    conversationEngine.respond(
      text,
      characterProfiles.aura,
      runtime.disposition,
      'ru',
      initialWorkingMemory(),
    );
  expect((await respond('Привет')).plan.strategy).toBe('greet');
  expect((await respond('Привет, кто ты?')).plan.strategy).toBe(
    'identify_self',
  );
  for (const text of [
    'Я люблю звёзды. Что такое истина?',
    'Что такое истина?',
    'Наверное, я люблю джаз.',
    'Запомни это.',
  ]) {
    expect((await respond(text)).plan.userGroundedMaterial).toBeUndefined();
  }
});

it('allows a strong .70+ old memory but preserves silence, suppression and unrelated knowledge', async () => {
  const runtime = createCharacterRuntime('aura', 0);
  const memory = retainCandidates(
    emptyLongTermMemory(),
    extractMemoryCandidates('Я люблю смотреть на звёзды ночью.', 'ru'),
    1,
  );
  // A valid reinforced memory; two of three tokens yield .7133, below the old .95.
  memory.semantic[0]!.salience = 0.9;
  const context = {
    semantic: memory.semantic,
    referencedIds: [] as string[],
    lastReferenceTurn: -4,
  };
  const respond = (text: string) =>
    conversationEngine.respond(
      text,
      characterProfiles.aura,
      runtime.disposition,
      'ru',
      initialWorkingMemory(),
      context,
    );
  const result = await respond('Снова хочется смотреть на звёзды.');
  expect(result.plan.longTermContext?.[0]?.score).toBeCloseTo(0.7133333333);
  expect(result.response.usedMemoryIds).toEqual([memory.semantic[0]!.id]);
  expect(result.plan.userGroundedMaterial).toBeUndefined();
  expect(
    (await respond('Хочется смотреть на звёзды.')).response.usedMemoryIds,
  ).toBeUndefined();
  context.referencedIds = [memory.semantic[0]!.id];
  expect(
    (await respond('Снова хочется смотреть на звёзды.')).response.usedMemoryIds,
  ).toBeUndefined();
  const truth = await respond('Что такое истина?');
  expect(truth.plan.primaryConceptId).toBe('philosophy.truth');
  expect(truth.response.usedMemoryIds).toBeUndefined();
  expect(truth.plan.longTermContext).toBeUndefined();
});
