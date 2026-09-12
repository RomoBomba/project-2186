import { describe, expect, it } from 'vitest';
import { conversationEngine } from '../../application/intelligence.ts';
import { initialWorkingMemory } from '../memory/working.ts';
import { characterProfiles } from '../character/profile.ts';
import { createCharacterRuntime } from '../character/runtime.ts';
import { characterIds, type CharacterId } from '../character/id.ts';
import type { Locale } from '../language/locale.ts';
import { sentenceCount } from '../conversation/material.ts';
const ask = (
  text: string,
  memory = initialWorkingMemory(),
  locale: Locale = 'ru',
  character: CharacterId = 'aletheia',
) =>
  conversationEngine.respond(
    text,
    characterProfiles[character],
    createCharacterRuntime(character, 0).disposition,
    locale,
    memory,
  );
const initial = 'Если всё имеет причину, свободы нет.';
describe('bounded proposition and stance', () => {
  it.each(characterIds)(
    'grounds a debate without a fixed ideology: %s',
    async (character) => {
      const first = await ask(initial, undefined, 'ru', character);
      expect(first.nextMemory.propositionFocus).toMatchObject({
        kind: 'consequence',
        predicate: 'excludes',
        polarity: 'positive',
        userStance: 'asserts',
        systemMove: 'qualifies',
        relationId: 'freedom-causality',
        originTurn: 1,
      });
      const next = await ask(
        'Почему ты не согласна?',
        first.nextMemory,
        'ru',
        character,
      );
      expect(next.plan.proposition).toMatchObject({
        justification: true,
        userStance: 'asks_about',
        previousSystemMove: 'qualifies',
      });
      expect(next.nextMemory.propositionFocus?.stanceTarget).toBe(
        'system_move',
      );
      expect(next.response.usedMaterialKeys.length).toBeGreaterThan(0);
      expect(
        next.response.usedMaterialKeys.some(
          (k) => !first.response.usedMaterialKeys.includes(k),
        ),
      ).toBe(true);
      expect(next.response.text).not.toContain('Какой вопрос');
      const repeat = await ask(
        'Я всё равно считаю, что свободы нет.',
        next.nextMemory,
        'ru',
        character,
      );
      expect(repeat.nextMemory.propositionFocus).toMatchObject({
        originTurn: 1,
        userStance: 'asserts',
      });
      const revised = await ask(
        'Ладно. Возможно наличие причины ещё не означает отсутствие выбора.',
        repeat.nextMemory,
        'ru',
        character,
      );
      expect(revised.nextMemory.propositionFocus).toMatchObject({
        originTurn: 1,
        userStance: 'revises',
        polarity: 'negative',
      });
      for (const r of [first, next, repeat, revised]) {
        expect(r.response.text.length).toBeLessThanOrEqual(
          r.plan.desiredLength.maxCharacters,
        );
        expect(sentenceCount(r.response.text)).toBeLessThanOrEqual(
          r.plan.desiredLength.maxSentences,
        );
        expect(
          r.nextMemory.propositionFocus?.groundingKeys.length,
        ).toBeGreaterThan(0);
        expect(
          r.nextMemory.propositionFocus?.groundingKeys.length,
        ).toBeLessThanOrEqual(3);
      }
      expect(
        await ask('Почему ты не согласна?', first.nextMemory, 'ru', character),
      ).toEqual(next);
    },
  );
  it.each([
    ['Согласен.', 'supports'],
    ['Да, именно.', 'supports'],
    ['Я не согласна.', 'rejects'],
    ['Возможно.', 'doubts'],
    ['Я передумал.', 'revises'],
    ['Я всё равно так думаю.', 'asserts'],
    ['Что именно ты оспариваешь?', 'asks_about'],
  ] as const)(
    'resolves %s only against a grounded position',
    async (text, stance) => {
      const empty = await ask(text);
      expect(empty.plan.proposition).toBeUndefined();
      const first = await ask(initial);
      const r = await ask(text, first.nextMemory);
      expect(r.plan.proposition?.userStance).toBe(stance);
      expect(r.nextMemory.propositionFocus?.originTurn).toBe(1);
    },
  );
  it.each([
    'Я люблю звёзды.',
    'Мне нравится музыка.',
    'Сегодня я устал.',
    'Я купил хлеб.',
    'Не согласен с погодой.',
    'Возможно завтра будет дождь.',
  ])('does not manufacture debate from %s', async (text) => {
    expect((await ask(text)).plan.proposition).toBeUndefined();
    const first = await ask(initial);
    const r = await ask(text, first.nextMemory);
    expect(r.plan.proposition).toBeUndefined();
    expect(r.propositionResolution.resolved).toBe(false);
    expect(r.nextMemory.propositionFocus?.lastReferencedTurn).toBe(1);
  });
  it('preserves personal disclosure instead of debating it', async () => {
    const r = await ask('Я люблю звёзды.');
    expect(r.plan.userGroundedMaterial).toMatchObject({ kind: 'preference' });
    expect(r.plan.proposition).toBeUndefined();
  });
  it('keeps only one earlier formulation and diagnoses explicit local opposition', async () => {
    const first = await ask('Память полностью определяет личность.');
    const r = await ask(
      'Память вообще не имеет отношения к личности.',
      first.nextMemory,
    );
    expect(r.plan.proposition?.contradiction).toBe('explicit_opposition');
    expect(r.nextMemory.propositionFocus?.previousForm).toMatchObject({
      predicate: 'defines',
      polarity: 'positive',
      turn: 1,
    });
    expect(r.response.text).not.toMatch(/противоречишь|непоследовател/u);
    expect(JSON.parse(JSON.stringify(r.nextMemory))).toEqual(r.nextMemory);
  });
  it('does not invent contradiction from bare rejection', async () => {
    const first = await ask(initial);
    const r = await ask('Нет, наоборот.', first.nextMemory);
    expect(r.plan.proposition?.contradiction).toBeUndefined();
    expect(r.nextMemory.propositionFocus?.polarity).toBe(
      first.nextMemory.propositionFocus?.polarity,
    );
  });
  it('expires after three unrelated exchanges and resets with the session', async () => {
    let r = await ask(initial);
    for (let i = 0; i < 2; i++) {
      r = await ask('Я купил хлеб.', r.nextMemory);
      expect(r.nextMemory.propositionFocus?.lastReferencedTurn).toBe(1);
    }
    r = await ask('Я купил хлеб.', r.nextMemory);
    expect(r.nextMemory.propositionFocus).toBeUndefined();
    expect(
      (await ask('Почему?', r.nextMemory)).plan.proposition,
    ).toBeUndefined();
    expect(initialWorkingMemory().propositionFocus).toBeUndefined();
  });
  it('does not carry a position into an unrelated explicit topic', async () => {
    const first = await ask(initial);
    const r = await ask('Что такое оригинальность?', first.nextMemory);
    expect(r.nextMemory.propositionFocus).toBeUndefined();
    expect(
      (await ask('Я не согласен.', r.nextMemory)).plan.proposition,
    ).toBeUndefined();
  });
  it.each(characterIds)(
    'does not adopt subjective experience from user assertion: %s',
    async (character) => {
      let r = await ask(
        'Мне кажется, ты сознательная.',
        undefined,
        'ru',
        character,
      );
      for (const text of [
        'Почему ты не согласна?',
        'Нет, я уверен, что ты чувствуешь.',
      ]) {
        r = await ask(text, r.nextMemory, 'ru', character);
        expect(r.plan.selfMaterial?.facts).toContain(
          'experience_unestablished',
        );
        expect(r.nextMemory.propositionFocus).toMatchObject({
          scope: 'self',
          systemMove: 'withholds',
          originTurn: 1,
        });
        expect(r.plan.reasoning?.relationId).toBeUndefined();
      }
    },
  );
  it('does not retain raw propositions or grow an ideology history', async () => {
    let r = await ask(initial);
    for (let i = 0; i < 15; i++)
      r = await ask('Я всё равно так думаю.', r.nextMemory);
    expect(r.nextMemory.recentTurns).toHaveLength(8);
    expect(r.nextMemory.propositionFocus?.concepts.length).toBeLessThanOrEqual(
      2,
    );
    expect(JSON.stringify(r.nextMemory.propositionFocus)).not.toContain('Если');
    expect(r.nextMemory.propositionFocus?.lastReferencedTurn).toBe(16);
    expect(r.nextMemory.propositionFocus?.originTurn).toBe(1);
  });
});

it('does not mistake uncertainty for logical negation or contradiction', async () => {
  const first = await ask('Память полностью определяет личность.');
  const r = await ask(
    'Я не уверен, что память определяет личность.',
    first.nextMemory,
  );
  expect(r.plan.proposition?.userStance).toBe('doubts');
  expect(r.nextMemory.propositionFocus?.polarity).toBe('unspecified');
  expect(r.plan.proposition?.contradiction).toBeUndefined();
});
it('recognizes a reversed clause order without inventing a different relation', async () => {
  const r = await ask('Свободы нет, если всё имеет причину.');
  expect(r.plan.proposition?.focus.predicate).toBe('excludes');
  expect(r.plan.proposition?.focus.polarity).toBe('positive');
  expect(r.plan.reasoning?.relationId).toBe('freedom-causality');
});

it('does not promote an inherited proposition operand into new explicit focus evidence', async () => {
  const first = await ask('Память и есть то, что делает человека собой.');
  const r = await ask('Но ведь воспоминания меняются.', first.nextMemory);
  expect(r.followUp.targets ?? []).not.toContain('identity.self');
  expect(r.plan.primaryConceptId).toBe('identity.memory');
  expect(r.nextMemory.propositionFocus?.originTurn).toBe(1);
});

it('keeps safely recognized direction without treating absence wording as denied dependence', async () => {
  const r = await ask('Сознание без памяти невозможно.');
  expect(r.plan.proposition?.focus).toMatchObject({
    predicate: 'requires',
    polarity: 'positive',
    direction: { from: 'philosophy.consciousness', to: 'identity.memory' },
  });
  const f = await ask(initial);
  expect(f.plan.proposition?.focus.direction).toEqual({
    from: 'science.causality',
    to: 'philosophy.freedom',
  });
});
