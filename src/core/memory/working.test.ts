import { describe, expect, it } from 'vitest';
import { canonicalKnowledge } from '../../generated/knowledge.ts';
import { ConversationEngine } from '../conversation/engine.ts';
import { BasicIntelligenceProvider } from '../intelligence/basic.ts';
import { characterProfiles } from '../character/profile.ts';
import { observeSurface } from '../character/user-style.ts';
import { transitionCharacterRuntime } from '../character/runtime.ts';
import { createCharacterRuntime } from '../character/runtime.ts';
import { characterIds } from '../character/id.ts';
import { initialWorkingMemory } from './working.ts';
import { contextLimit } from '../../characters/context.ts';
import { materialKey } from '../conversation/model.ts';
const engine = new ConversationEngine(
  canonicalKnowledge,
  new BasicIntelligenceProvider(),
);
const memoryPrompt = 'Память делает человека тем же человеком?';
function respond(
  text: string,
  memory = initialWorkingMemory(),
  locale: 'ru' | 'en' = 'ru',
  id: (typeof characterIds)[number] = 'aletheia',
) {
  return engine.respond(
    text,
    characterProfiles[id],
    createCharacterRuntime(id, 0).disposition,
    locale,
    memory,
  );
}
describe('bounded working memory', () => {
  it('owns eight raw turns, bounded active concepts and the existing repetition history', async () => {
    let memory = initialWorkingMemory();
    for (let n = 0; n < 12; n++) {
      const previous = JSON.stringify(memory);
      const result = await respond(memoryPrompt, memory);
      expect(await respond(memoryPrompt, memory)).toEqual(result);
      expect(JSON.stringify(memory)).toBe(previous);
      memory = result.nextMemory;
      expect(memory.recentTurns.length).toBeLessThanOrEqual(8);
      expect(memory.activeConceptIds.length).toBeLessThanOrEqual(2);
      expect(memory.history.strategies.length).toBeLessThanOrEqual(6);
      expect(memory.history.materialKeys.length).toBeLessThanOrEqual(8);
      expect(JSON.parse(JSON.stringify(memory))).toEqual(memory);
    }
    expect(memory.recentTurns[0]!.index).toBe(17);
  });
  it('expires a thread after three unused exchanges and never inherits across unrelated queries', async () => {
    let memory = (await respond(memoryPrompt)).nextMemory;
    for (let n = 0; n < 3; n++) {
      const result = await respond('Какая температура на Марсе?', memory);
      expect(result.context.inheritedConceptIds).toEqual([]);
      expect(result.plan.strategy).toBe('admit_uncertainty');
      memory = result.nextMemory;
    }
    expect(memory.currentThread).toBeUndefined();
    expect(memory.activeConceptIds).toEqual([]);
    expect(
      (await respond('Почему?', memory)).context.inheritedConceptIds,
    ).toEqual([]);
  });
  it('owns one actual authored question and consumes it conservatively', async () => {
    const first = await respond(memoryPrompt);
    expect(first.nextMemory.pendingQuestion).toBeDefined();
    const answer = await respond(
      'Я считаю, что это привычка.',
      first.nextMemory,
    );
    expect(answer.context.answersPendingQuestion).toBe(true);
    expect(answer.nextMemory.pendingQuestion).toBeUndefined();
    const newTopic = await respond('истина', first.nextMemory);
    expect(newTopic.context.answersPendingQuestion).toBe(false);
    expect(newTopic.nextMemory.pendingQuestion?.conceptIds ?? []).not.toContain(
      'identity.memory',
    );
    const unrelated = await respond('Я купил хлеб.', first.nextMemory);
    expect(unrelated.context.answersPendingQuestion).toBe(false);
  });
});
describe('conservative contextual interpretation', () => {
  it.each([
    ['ru', 'Почему?', 'reason'],
    ['ru', 'Почему ты так говоришь?', 'reason'],
    ['ru', 'Я с тобой не согласен.', 'disagreement'],
    ['ru', 'Что ты имеешь в виду?', 'clarification'],
    ['ru', 'Продолжай.', 'continuation'],
    ['ru', 'А если наоборот?', 'reversal'],
    ['ru', 'И что тогда?', 'consequence'],
    ['en', 'Why?', 'reason'],
    ['en', 'I disagree', 'disagreement'],
    ['en', 'What do you mean?', 'clarification'],
    ['en', 'Continue', 'continuation'],
    ['en', 'what if the opposite is true?', 'reversal'],
  ] as const)(
    '%s %s uses a grounded immediately previous response',
    async (locale, text, kind) => {
      const first = await respond(
        locale === 'ru' ? memoryPrompt : 'memory?',
        initialWorkingMemory(),
        locale,
      );
      const next = await respond(text, first.nextMemory, locale);
      expect(next.context.kind).toBe(kind);
      expect(next.context.refersToTurn).toBe(1);
      if (kind !== 'reversal') expect(next.perception.matches).toEqual([]);
      expect(next.plan.primaryConceptId).toBe('identity.memory');
      expect(next.response.usedMaterialKeys.length).toBeGreaterThan(0);
      for (const key of next.response.usedMaterialKeys)
        expect(first.response.usedMaterialKeys).not.toContain(key);
      expect(next.nextMemory.currentThread?.startedTurn).toBe(1);
      expect(
        (await respond(text, initialWorkingMemory(), locale)).context.kind,
      ).toBeUndefined();
    },
  );
  it('explicit concepts dominate inherited context while bare concept queries still match', async () => {
    const first = await respond(memoryPrompt);
    for (const text of ['А что такое истина?', 'истина']) {
      const next = await respond(text, first.nextMemory);
      expect(next.plan.primaryConceptId).toBe('philosophy.truth');
      expect(next.context.inheritedConceptIds).toEqual([]);
      expect(next.nextMemory.currentThread?.primaryConceptId).toBe(
        'philosophy.truth',
      );
    }
    expect(
      (await respond('память?', first.nextMemory)).perception.matches.length,
    ).toBeGreaterThan(0);
  });
  it('unknown followed by why never fabricates knowledge or revives an older topic', async () => {
    const first = await respond(memoryPrompt);
    const unknown = await respond('Какая погода на Марсе?', first.nextMemory);
    const why = await respond('Почему?', unknown.nextMemory);
    expect(why.context.kind).toBeUndefined();
    expect(why.plan.selectedMaterial).toEqual([]);
    expect(why.plan.strategy).toBe('admit_uncertainty');
  });
  it('exhaustion is honest, without repeating a claim under another key', async () => {
    const card = JSON.parse(
      JSON.stringify(
        canonicalKnowledge.find((card) => card.id === 'identity.memory')!,
      ),
    );
    card.related = [];
    for (const content of Object.values(card.content) as {
      summary: string;
      claims: string[];
      tensions: string[];
      questions: string[];
    }[]) {
      content.summary = 'Only one authored thought.';
      content.claims = ['Only one authored thought.'];
      content.tensions = [];
      content.questions = [];
    }
    const small = new ConversationEngine(
      [card],
      new BasicIntelligenceProvider(),
    );
    const first = await small.respond(
      'memory',
      characterProfiles.aletheia,
      createCharacterRuntime('aletheia', 0).disposition,
      'en',
      initialWorkingMemory(),
    );
    const next = await small.respond(
      'why?',
      characterProfiles.aletheia,
      createCharacterRuntime('aletheia', 0).disposition,
      'en',
      first.nextMemory,
    );
    expect(next.plan.contextReference?.exhausted).toBe(true);
    expect(next.response.text).toBe(contextLimit.en);
  });
  it.each(characterIds)(
    '%s sustains a follow-up without changing raw matching or expanding beyond one thought',
    async (id) => {
      const first = await respond(
        memoryPrompt,
        initialWorkingMemory(),
        'ru',
        id,
      );
      const next = await respond('Почему?', first.nextMemory, 'ru', id);
      expect(next.context.inheritedConceptIds[0]).toBe('identity.memory');
      expect(next.plan.selectedMaterial).toHaveLength(1);
      expect(next.response.usedMaterialKeys).toEqual(
        next.plan.selectedMaterial.map(materialKey),
      );
      expect(next.response.text.length).toBeLessThanOrEqual(
        next.plan.desiredLength.maxCharacters,
      );
    },
  );
});

describe('author follow-up regressions', () => {
  it.each([
    ['ru', 'А если наоборот?', 'reversal'],
    ['ru', 'А если посмотреть наоборот?', 'reversal'],
    ['ru', 'А если всё наоборот?', 'reversal'],
    ['ru', 'А с другой стороны?', 'reversal'],
    ['en', "What if it's the opposite?", 'reversal'],
    ['en', 'What if we look at it the other way?', 'reversal'],
    ['en', 'What about the opposite?', 'reversal'],
    ['en', 'On the other hand?', 'reversal'],
    ['ru', 'что тогда?', 'consequence'],
    ['ru', 'что тогда остаётся?', 'consequence'],
    ['ru', 'что тогда остаётся неизменным?', 'consequence'],
    ['ru', 'и что из этого следует?', 'consequence'],
    ['en', 'then what?', 'consequence'],
    ['en', 'what remains then?', 'consequence'],
    ['en', 'what remains unchanged then?', 'consequence'],
    ['en', 'what follows from that?', 'consequence'],
  ] as const)('%s %s requires grounded context', async (locale, text, kind) => {
    const fresh = await respond(text, initialWorkingMemory(), locale);
    expect(fresh.context.inheritedConceptIds).toEqual([]);
    expect(fresh.plan.primaryConceptId).toBeUndefined();
    const first = await respond(
      locale === 'ru' ? memoryPrompt : 'memory?',
      initialWorkingMemory(),
      locale,
    );
    const next = await respond(text, first.nextMemory, locale);
    expect(next.context.kind).toBe(kind);
    expect(next.plan.primaryConceptId).toBe('identity.memory');
    expect(next.response.usedMaterialKeys.length).toBeGreaterThan(0);
    expect(
      next.response.usedMaterialKeys.some((key) =>
        first.response.usedMaterialKeys.includes(key),
      ),
    ).toBe(false);
  });
  it.each(characterIds)(
    '%s retains the self thread across the exact six-turn dialogue',
    async (id) => {
      let memory = initialWorkingMemory();
      let runtime = createCharacterRuntime(id, 0);
      const messages = [
        'Что делает меня мной?',
        'Почему ты так говоришь?',
        'Я с тобой не согласен.',
        'Почему?',
        'А если посмотреть наоборот?',
        'Что тогда остаётся неизменным?',
      ];
      const kinds = [
        undefined,
        'reason',
        'disagreement',
        'reason',
        'reversal',
        'consequence',
      ];
      for (const [index, text] of messages.entries()) {
        runtime = transitionCharacterRuntime(runtime, {
          type: 'userMessageReceived',
          at: index * 3 + 1,
          observation: observeSurface(text),
        });
        const result = await engine.respond(
          text,
          characterProfiles[id],
          runtime.disposition,
          'ru',
          memory,
        );
        expect(result.context.kind).toBe(kinds[index]);
        expect(result.plan.primaryConceptId).toBe('identity.self');
        expect(result.nextMemory.currentThread?.startedTurn).toBe(1);
        expect(result.response.usedMaterialKeys.length).toBeGreaterThan(0);
        if (index > 0)
          expect(
            result.response.usedMaterialKeys.some((key) =>
              memory.history.materialKeys.includes(key),
            ),
          ).toBe(false);
        memory = result.nextMemory;
        runtime = transitionCharacterRuntime(runtime, {
          type: 'responseStarted',
          at: index * 3 + 2,
        });
        runtime = transitionCharacterRuntime(runtime, {
          type: 'responseCompleted',
          at: index * 3 + 3,
        });
      }
      expect(runtime.relationshipState.trust).toBe(0.4);
      const changed = await respond(
        'А что тогда такое истина?',
        memory,
        'ru',
        id,
      );
      expect(changed.context.inheritedConceptIds).toEqual([]);
      expect(changed.plan.primaryConceptId).toBe('philosophy.truth');
      const unknown = await respond('Какая погода на Марсе?', memory, 'ru', id);
      expect(unknown.context.inheritedConceptIds).toEqual([]);
      expect(unknown.plan.strategy).toBe('admit_uncertainty');
      expect(
        (
          await respond(
            'А если посмотреть наоборот?',
            unknown.nextMemory,
            'ru',
            id,
          )
        ).context.inheritedConceptIds,
      ).toEqual([]);
    },
  );
});
