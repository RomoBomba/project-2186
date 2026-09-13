import { expect, it } from 'vitest';
import { conversationEngine as engine } from '../../application/intelligence.ts';
import { characterProfiles } from '../character/profile.ts';
import { createCharacterRuntime } from '../character/runtime.ts';
import { characterIds, type CharacterId } from '../character/id.ts';
import { initialWorkingMemory } from '../memory/working.ts';
import type { Locale } from '../language/locale.ts';
import { reasoningIntent } from '../reasoning/intent.ts';
import { inflectionEvidence } from '../reasoning/inflection.ts';
const ask = (
  text: string,
  memory = initialWorkingMemory(),
  locale: Locale = 'ru',
  id: CharacterId = 'aletheia',
) =>
  engine.respond(
    text,
    characterProfiles[id],
    createCharacterRuntime(id, 0).disposition,
    locale,
    memory,
  );
it.each(characterIds)(
  'independently grounds an explanation, but does not infer an assertion from its premise: %s',
  async (id) => {
    for (const [locale, text] of [
      ['ru', 'Почему наличие причины не отменяет свободу?'],
      ['en', 'Why does having a cause not eliminate freedom?'],
    ] as const) {
      const r = await ask(text, undefined, locale, id);
      expect(r.plan.reasoning).toMatchObject({
        frame: 'relate',
        relationId: 'freedom-causality',
        basis: 'relation',
      });
      expect(
        r.plan.reasoning!.evidence.every((e) => e.source !== 'working_focus'),
      ).toBe(true);
      expect(r.response.usedMaterialKeys.length).toBeGreaterThan(0);
      expect(
        r.response.usedMaterialKeys.every((k) =>
          k.startsWith('relation:freedom-causality:'),
        ),
      ).toBe(true);
      expect(r.plan.proposition).toBeUndefined();
      expect(await ask(text, undefined, locale, id)).toEqual(r);
    }
  },
);
it.each(characterIds)(
  'keeps the real freedom proposition through rejection and why: %s',
  async (id) => {
    const first = await ask(
      'Если всё имеет причину, свободы нет.',
      undefined,
      'ru',
      id,
    );
    let memory = first.nextMemory;
    for (const [text, stance] of [
      ['Я всё равно не согласен.', 'rejects'],
      ['Почему?', 'asks_about'],
    ]) {
      const r = await ask(text!, memory, 'ru', id);
      expect(r.plan.proposition?.userStance).toBe(stance);
      expect(r.nextMemory.propositionFocus?.originTurn).toBe(
        first.nextMemory.propositionFocus!.originTurn,
      );
      expect(r.nextMemory.reasoningFocus?.relationId).toBe('freedom-causality');
      expect(
        r.response.usedMaterialKeys.every((k) =>
          k.startsWith('relation:freedom-causality:'),
        ),
      ).toBe(true);
      expect(r.response.usedMaterialKeys.length).toBeGreaterThan(0);
      memory = r.nextMemory;
    }
  },
);
it.each(characterIds)(
  'supports memory doubt with card material, without inventing a relation: %s',
  async (id) => {
    let memory = initialWorkingMemory();
    for (const [text, stance] of [
      ['Память делает человека собой.', 'asserts'],
      ['Нет, я всё-таки не уверен.', 'doubts'],
      ['Почему ты считаешь память недостаточным основанием?', 'asks_about'],
    ]) {
      const r = await ask(text!, memory, 'ru', id);
      expect(r.plan.proposition?.userStance).toBe(stance);
      expect(r.nextMemory.reasoningFocus?.concepts).toContain(
        'identity.memory',
      );
      expect(r.plan.reasoning?.relationId).toBeUndefined();
      expect(r.response.usedMaterialKeys.length).toBeGreaterThan(0);
      expect(
        r.response.usedMaterialKeys.every((k) =>
          k.startsWith('identity.memory:'),
        ),
      ).toBe(true);
      memory = r.nextMemory;
    }
  },
);
it('separates rejection of a named proposition from a bare disagreement and keeps clause polarity', async () => {
  const first = await ask('Если всё имеет причину, свободы нет.');
  const r = await ask(
    'Я не согласен с тем, что память определяет личность.',
    first.nextMemory,
  );
  expect(r.propositionResolution.stanceOnly).not.toBe(true);
  expect(r.plan.proposition).toMatchObject({
    userStance: 'rejects',
    focus: {
      predicate: 'defines',
      polarity: 'positive',
      source: 'explicit_claim',
    },
  });
  expect(r.plan.reasoning?.concepts).toContain('identity.memory');
  expect(r.plan.reasoning?.relationId).not.toBe('freedom-causality');
});
it('keeps lexical evidence inspectable while interpreting a complete stance idiom', async () => {
  const fresh = await ask('I am not sure I agree.', undefined, 'en');
  expect(
    fresh.perception.matches.some(
      (m) => m.conceptId === 'philosophy.uncertainty',
    ),
  ).toBe(true);
  expect(fresh.propositionResolution.stanceOnly).toBe(true);
  expect(fresh.plan.reasoning).toBeUndefined();
  expect(fresh.plan.primaryConceptId).toBeUndefined();
  expect(fresh.nextMemory.propositionFocus).toBeUndefined();
  expect(fresh.response.usedMaterialKeys).toEqual([]);
  const first = await ask(
    'If everything has a cause, there is no freedom.',
    undefined,
    'en',
  );
  const r = await ask('I am not sure I agree.', first.nextMemory, 'en');
  expect(r.plan.proposition?.userStance).toBe('doubts');
  expect(r.plan.reasoning?.relationId).toBe('freedom-causality');
});
it('does not turn weather disagreement or factual why into old philosophy', async () => {
  const first = await ask('Если всё имеет причину, свободы нет.');
  for (const text of ['Почему сегодня дождь?', 'Я не согласен с погодой.']) {
    const r = await ask(text, first.nextMemory);
    expect(r.propositionResolution.resolved).toBe(false);
    expect(r.plan.reasoning).toBeUndefined();
    expect(r.response.usedMaterialKeys).toEqual([]);
  }
  expect(reasoningIntent('Почему?', 'ru')).toBeUndefined();
  const none = await ask('Я всё равно не согласен.');
  expect(none.nextMemory.propositionFocus).toBeUndefined();
  expect(none.nextMemory.reasoningFocus).toBeUndefined();
});
it('recognizes only the closed copy noun paradigm, leaving technical lookalikes alone', async () => {
  for (const text of ['копия', 'копию', 'копией'])
    expect(inflectionEvidence(text)).toContainEqual({
      conceptId: 'art.aura',
      source: 'inflection',
      term: text,
    });
  for (const text of ['копировать', 'скопировал', 'копилка', 'копир'])
    expect(inflectionEvidence(text)).toEqual([]);
  for (const text of [
    'Я купил хлеб.',
    'Открой архив zip.',
    'Мне нужно сделать копию файла.',
  ]) {
    const r = await ask(text);
    expect(r.plan.reasoning).toBeUndefined();
    expect(r.response.usedMaterialKeys).toEqual([]);
  }
});

it.each(characterIds)(
  'keeps the original/copy thread across disagreement and a criterion follow-up: %s',
  async (id) => {
    let memory = initialWorkingMemory();
    for (const text of [
      'Идеальная копия ничем не отличается от оригинала.',
      'Я с тобой не согласен.',
      'Что тогда делает оригинал оригиналом?',
    ]) {
      const r = await ask(text, memory, 'ru', id);
      expect(r.nextMemory.reasoningFocus?.relationId).toBe('originality-aura');
      expect(r.response.usedMaterialKeys.length).toBeGreaterThan(0);
      expect(
        r.response.usedMaterialKeys.every((k) =>
          k.startsWith('relation:originality-aura:'),
        ),
      ).toBe(true);
      memory = r.nextMemory;
    }
  },
);

it.each(characterIds)(
  'keeps the complete deictic freedom sequence grounded without inventing a user proposition: %s',
  async (id) => {
    let memory = initialWorkingMemory();
    for (const text of [
      'Почему наличие причины не отменяет свободу?',
      'А если у выбора вообще не было альтернатив?',
      'Почему это важно?',
      'Я всё равно не согласен.',
      'Тогда что именно ты оспариваешь в моей позиции?',
    ]) {
      const r = await ask(text, memory, 'ru', id);
      expect(r.plan.reasoning?.relationId).toBe('freedom-causality');
      expect(r.nextMemory.propositionFocus).toBeUndefined();
      expect(r.response.usedMaterialKeys.length).toBeGreaterThan(0);
      expect(
        r.response.usedMaterialKeys.every((k) =>
          k.startsWith('relation:freedom-causality:'),
        ),
      ).toBe(true);
      if (text === 'Почему это важно?') {
        expect(r.perception.matches).toContainEqual(
          expect.objectContaining({
            conceptId: 'philosophy.meaning',
            score: 100,
          }),
        );
        expect(r.followUp.resolved).toBe(true);
      }
      memory = r.nextMemory;
    }
  },
);

it('gives deictic idioms precedence only with a live grounded referent', async () => {
  const fresh = await ask('Почему это важно?');
  expect(fresh.followUp.resolved).toBe(false);
  expect(fresh.plan.primaryConceptId).toBe('philosophy.meaning');
  const first = await ask('Если всё имеет причину, свободы нет.');
  const follow = await ask('Почему это важно?', first.nextMemory);
  expect(follow.plan.reasoning?.relationId).toBe('freedom-causality');
  expect(follow.plan.proposition?.userStance).toBe('asks_about');
  const explicit = await ask('Почему истина важна?', first.nextMemory);
  expect(explicit.plan.reasoning?.relationId).not.toBe('freedom-causality');
  let stale = first.nextMemory;
  for (let i = 0; i < 4; i++)
    stale = (await ask('Я купил хлеб.', stale)).nextMemory;
  expect((await ask('Почему это важно?', stale)).followUp.resolved).toBe(false);
});

it.each(characterIds)(
  'preserves the copy proposition through evaluation, criterion, doubt and agreement: %s',
  async (id) => {
    let memory = initialWorkingMemory();
    const sequence = [
      ['Идеальная копия ничем не отличается от оригинала.', 'asserts'],
      ['Я с тобой не согласен.', 'rejects'],
      ['Для меня история объекта вообще не важна.', 'rejects'],
      ['Что тогда делает оригинал оригиналом?', undefined],
      ['Я всё равно не согласен.', 'rejects'],
      ['Не уверен что согласен.', 'doubts'],
      ['Я подумал и решил что ты права.', 'supports'],
    ] as const;
    for (const [text, stance] of sequence) {
      const r = await ask(text, memory, 'ru', id);
      expect(r.plan.reasoning?.relationId).toBe('originality-aura');
      expect(r.nextMemory.propositionFocus?.originTurn).toBe(1);
      if (stance) expect(r.plan.proposition?.userStance).toBe(stance);
      expect(r.response.usedMaterialKeys.length).toBeGreaterThan(0);
      expect(
        r.response.usedMaterialKeys.every((k) =>
          k.startsWith('relation:originality-aura:'),
        ),
      ).toBe(true);
      memory = r.nextMemory;
    }
  },
);

it('requires a matching active proposition for evaluation and rejects unrelated additions', async () => {
  const freedom = await ask('Если всё имеет причину, свободы нет.');
  const copy = await ask('Идеальная копия ничем не отличается от оригинала.');
  const evaluation = 'Для меня история объекта вообще не важна.';
  for (const memory of [initialWorkingMemory(), freedom.nextMemory]) {
    const r = await ask(evaluation, memory);
    expect(r.propositionResolution.resolved).toBe(false);
    expect(r.plan.proposition).toBeUndefined();
    expect(r.plan.reasoning).toBeUndefined();
  }
  for (const text of [
    'История.',
    'Это важно.',
    'Я не согласен с прогнозом погоды.',
    'Для меня история объекта не важна, речь о прогнозе погоды.',
  ]) {
    const r = await ask(text, copy.nextMemory);
    expect(r.propositionResolution.resolved).toBe(false);
    expect(r.plan.proposition).toBeUndefined();
    expect(r.plan.reasoning?.relationId).not.toBe('originality-aura');
  }
});

it.each([
  ['Почему причины не обязательно уничтожают свободу?', 'freedom-causality'],
  [
    'Почему из утраты памяти не следует утрата сознания?',
    'consciousness-memory',
  ],
  ['Почему потеря архивов не уничтожает истину?', 'archives-truth'],
  ['Почему копию нельзя автоматически считать оригиналом?', 'originality-aura'],
])(
  'uses existing restricted operands for a fresh explanation: %s',
  async (text, relation) => {
    const r = await ask(text);
    expect(r.plan.reasoning).toMatchObject({
      frame: 'relate',
      relationId: relation,
      basis: 'relation',
    });
    expect(r.followUp.resolved).toBe(false);
    expect(
      r.plan.reasoning!.evidence.every((e) => e.source !== 'working_focus'),
    ).toBe(true);
    expect(r.response.usedMaterialKeys.length).toBeGreaterThan(0);
    expect(
      r.response.usedMaterialKeys.every((k) =>
        k.startsWith(`relation:${relation}:`),
      ),
    ).toBe(true);
  },
);

it.each([
  'Привет, я здесь впервые, кто ты?',
  'Привет, а ты кто?',
  'Я здесь впервые. Кто ты?',
])(
  'recognizes a bounded identity clause after a conversational preamble: %s',
  async (text) => {
    const r = await ask(text);
    expect(r.perception.act).toBe('system_identity_question');
    expect(r.plan.strategy).toBe('identify_self');
    expect(r.response.text).toContain('ALETHEIA');
  },
);

it('does not search arbitrary reported speech for an identity clause', async () => {
  for (const text of [
    'Он спросил: кто ты?',
    'Привет, он спросил кто ты.',
    'Привет, я сказал ему: кто ты?',
  ]) {
    const r = await ask(text);
    expect(r.perception.act).not.toBe('system_identity_question');
    expect(r.plan.strategy).not.toBe('identify_self');
  }
});
