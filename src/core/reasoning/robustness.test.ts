import { expect, it } from 'vitest';
import { conversationEngine } from '../../application/intelligence.ts';
import { initialWorkingMemory } from '../memory/working.ts';
import { characterProfiles } from '../character/profile.ts';
import { createCharacterRuntime } from '../character/runtime.ts';
import { inflectionEvidence } from './inflection.ts';
import { limitations } from '../../characters/limitations.ts';
import { sentenceCount } from '../conversation/material.ts';
import { resolveFollowUp } from './follow-up.ts';
import { ConceptMatcher } from '../knowledge/matcher.ts';
import { canonicalKnowledge } from '../../generated/knowledge.ts';
import type { Locale } from '../language/locale.ts';
const ask = (
  text: string,
  memory = initialWorkingMemory(),
  locale: Locale = 'ru',
) =>
  conversationEngine.respond(
    text,
    characterProfiles.aura,
    createCharacterRuntime('aura', 0).disposition,
    locale,
    memory,
  );
it.each([
  'причину',
  'причиной',
  'истину',
  'истиной',
  'знанием',
  'свободу',
  'памятью',
  'воспоминаниями',
])('matches the closed noun paradigm: %s', (word) =>
  expect(inflectionEvidence(word)).toHaveLength(1),
);
it.each([
  'причинить',
  'истинность',
  'истинный',
  'памятник',
  'памятный',
  'свободный',
  'архиватор',
  'знаниеведение',
  'телефон',
  'оригинальный',
])('does not blindly strip suffixes: %s', (word) =>
  expect(inflectionEvidence(word)).toEqual([]),
);
it('keeps exact alias authority and structural-token negatives unchanged', () => {
  const matcher = new ConceptMatcher(canonicalKnowledge);
  expect(matcher.match('what remains unchanged?', 'en')[0]?.score).toBe(100);
  expect(matcher.match('what remains then?', 'en')).toEqual([]);
  expect(matcher.match('I bought bread', 'en')).toEqual([]);
});
it.each([
  'Почему ты так считаешь?',
  'А если она атом в атом идентична?',
  'Для кого тогда?',
  'Но если снаружи разницу невозможно обнаружить?',
  "Why doesn't having a cause eliminate freedom?",
  'But if I physically could not choose otherwise?',
])('does not invent a referent with empty focus: %s', (text) => {
  expect(
    resolveFollowUp(text, /[а-я]/iu.test(text) ? 'ru' : 'en', undefined, 0, []),
  ).toEqual({ resolved: false });
});
it('retains the focus through two unrelated exchanges and expires on the third', async () => {
  let r = await ask('Может ли копия быть оригиналом?');
  const original = r.nextMemory.reasoningFocus!;
  expect(original.startedTurn).toBe(1);
  for (let i = 0; i < 2; i++) {
    r = await ask('Я купил хлеб.', r.nextMemory);
    expect(r.nextMemory.reasoningFocus).toEqual(original);
  }
  r = await ask('Я купил хлеб.', r.nextMemory);
  expect(r.nextMemory.reasoningFocus).toBeUndefined();
  expect(
    (await ask('А если она идентична?', r.nextMemory)).followUp.resolved,
  ).toBe(false);
});
it('bounds focus data, preserves it through partial answers, and never stores prose there', async () => {
  let r = await ask('Может ли копия быть оригиналом?');
  for (let i = 0; i < 12; i++)
    r = await ask('А если она атом в атом идентична?', r.nextMemory);
  expect(r.nextMemory.reasoningFocus).toMatchObject({
    scope: 'general',
    relationId: 'originality-aura',
    startedTurn: 1,
    lastUsedTurn: 13,
  });
  expect(r.nextMemory.reasoningFocus?.concepts).toHaveLength(2);
  expect(JSON.stringify(r.nextMemory.reasoningFocus)).not.toContain('атом');
  expect(JSON.parse(JSON.stringify(r.nextMemory))).toEqual(r.nextMemory);
  expect(r.nextMemory.recentTurns).toHaveLength(8);
  expect(r.nextMemory.history.materialKeys.length).toBeLessThanOrEqual(8);
  expect(initialWorkingMemory().reasoningFocus).toBeUndefined();
});
it('replaces a focus on an explicit new topic; unrelated factual questions stay unknown', async () => {
  const first = await ask('Может ли копия быть оригиналом?');
  const next = await ask('А что тогда такое истина?', first.nextMemory);
  expect(next.followUp.resolved).toBe(false);
  expect(next.plan.primaryConceptId).toBe('philosophy.truth');
  expect(next.nextMemory.reasoningFocus?.relationId).toBeUndefined();
  const unknown = await ask('Какая погода на Марсе?', first.nextMemory);
  expect(unknown.followUp.resolved).toBe(false);
  expect(unknown.plan.strategy).toBe('admit_uncertainty');
});
it('uses a known causal boundary before admitting the missing positive criterion', async () => {
  const first = await ask(
    'Почему последовательность событий ещё не доказывает причину?',
  );
  const next = await ask(
    'Что тогда считается доказательством причины?',
    first.nextMemory,
  );
  expect(next.plan.reasoning).toMatchObject({
    frame: 'criterion',
    partial: true,
    concepts: ['science.causality'],
  });
  expect(next.plan.selectedMaterial.length).toBeGreaterThan(0);
  expect(next.response.composition?.limitation).toBe('unresolved_criterion');
  const limit = next.response.composition!.units.find(
    (u) => u.role === 'limitation',
  )!;
  expect(limitations.ru.unresolved_criterion).toContain(limit.text);
  expect(next.response.text.indexOf(limit.text)).toBeGreaterThan(0);
  expect(next.response.text.length).toBeLessThanOrEqual(
    next.plan.desiredLength.maxCharacters,
  );
  expect(sentenceCount(next.response.text)).toBeLessThanOrEqual(
    next.plan.desiredLength.maxSentences,
  );
});
it('does not append copy/original association to archive reasoning', async () => {
  const r = await ask(
    'Мы потеряли архивы прошлого. Значит мы больше не можем знать правду о нём?',
  );
  expect(r.plan.reasoning?.relationId).toBe('archives-truth');
  expect(r.plan.reasoning?.optional).toEqual([]);
  expect(r.response.text).not.toMatch(/копи|оригинал/iu);
});
it('keeps human-comparison and consciousness follow-ups in the factual self model', async () => {
  let r = await ask('Ты мыслишь?');
  for (const t of [
    'Чем твоё рассуждение отличается от человеческого?',
    'Но если снаружи разницу невозможно обнаружить?',
    'Тогда почему ты не называешь себя сознательной?',
  ]) {
    r = await ask(t, r.nextMemory);
    expect(r.followUp.resolved).toBe(true);
    expect(r.plan.selfMaterial?.facts).toContain('experience_unestablished');
    expect(r.nextMemory.reasoningFocus?.scope).toBe('self');
    expect(r.plan.reasoning?.relationId).toBeUndefined();
  }
  expect(r.nextMemory.reasoningFocus?.selfKind).toBe('consciousness');
});
it.each([
  'Что такое памятник?',
  'Почему архиватор не работает?',
  'Если я причиню ущерб, что тогда?',
  'Если у машины сломалось колесо, что тогда?',
])(
  'does not turn noun-like fragments into a knowledge answer: %s',
  async (text) => {
    const r = await ask(text);
    expect(r.plan.reasoning).toBeUndefined();
    expect(r.plan.strategy).toBe('admit_uncertainty');
  },
);
it('does not attach a new factual why-question to a philosophical focus', async () => {
  const first = await ask(
    'Can a copy be an original?',
    initialWorkingMemory(),
    'en',
  );
  const r = await ask('Why does bread rise?', first.nextMemory, 'en');
  expect(r.followUp.resolved).toBe(false);
  expect(r.plan.reasoning).toBeUndefined();
  expect(r.plan.strategy).toBe('admit_uncertainty');
});
it('refines the archive thread through authored knowledge/truth when knowledge is explicitly requested', async () => {
  const first = await ask(
    'Мы потеряли архивы прошлого. Значит мы больше не можем знать правду о нём?',
  );
  const r = await ask('Что ты тогда считаешь знанием?', first.nextMemory);
  expect(r.followUp.resolved).toBe(true);
  expect(r.plan.reasoning?.relationId).toBe('knowledge-truth');
  expect(r.plan.reasoning?.concepts).toContain('philosophy.truth');
  expect(r.response.text).not.toContain('копи');
});
it.each([
  [
    'А если воспоминания изменятся?',
    'Если мои убеждения полностью изменятся, останусь ли я собой?',
    'identity.memory',
  ],
  [
    'А если личность изменится?',
    'Может ли сознание существовать без памяти?',
    'identity.self',
  ],
  [
    'Тогда это всё ещё буду я?',
    'Может ли сознание существовать без памяти?',
    'identity.self',
  ],
  [
    'Почему личность меняется?',
    'Может ли сознание существовать без памяти?',
    'identity.self',
  ],
] as const)('pivots actual material for %s', async (text, initial, target) => {
  const first = await ask(initial);
  const r = await ask(text, first.nextMemory);
  expect(r.focusTransition).toBe('pivoted');
  expect(r.plan.primaryConceptId).toBe(target);
  expect(r.plan.reasoning?.relationId).toBeUndefined();
  expect(r.response.usedMaterialKeys.length).toBeGreaterThan(0);
  expect(
    r.response.usedMaterialKeys.every((key) => key.startsWith(target + ':')),
  ).toBe(true);
  expect(r.response.text).not.toMatch(
    /Содержание убеждений|наличие сознательного опыта/u,
  );
  expect(await ask(text, first.nextMemory)).toEqual(r);
});
it('refines compatible explicit evidence without replacing the authored relation', async () => {
  const first = await ask('Может ли сознание существовать без памяти?');
  const r = await ask('А память?', first.nextMemory);
  expect(r.focusTransition).toBe('refined');
  expect(r.plan.reasoning?.relationId).toBe('consciousness-memory');
});
it('exposes clearing and explicit replacement in diagnostics', async () => {
  let r = await ask('Если всё имеет причину, свободы нет.');
  r = await ask('Что такое оригинальность?', r.nextMemory);
  expect(r.focusTransition).toBe('replaced');
  for (let i = 0; i < 3; i++) r = await ask('Я купил хлеб.', r.nextMemory);
  expect(r.focusTransition).toBe('cleared');
  expect(r.nextMemory.reasoningFocus).toBeUndefined();
});
it('reports compatible inflected operand emphasis as refinement', async () => {
  const first = await ask('Может ли сознание существовать без памяти?');
  const r = await ask('А если речь о памяти?', first.nextMemory);
  expect(r.focusTransition).toBe('refined');
  expect(r.plan.reasoning?.relationId).toBe('consciousness-memory');
});
