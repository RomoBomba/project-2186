import { expect, it } from 'vitest';
import { runPresencePolish } from '../../infrastructure/evaluation/presence-polish.ts';
import { canonicalKnowledge } from '../../generated/knowledge.ts';
import { ConversationEngine } from '../conversation/engine.ts';
import { BasicIntelligenceProvider } from '../intelligence/basic.ts';
import { characterProfiles } from '../character/profile.ts';
import { createCharacterRuntime } from '../character/runtime.ts';
import { initialWorkingMemory } from '../memory/working.ts';
import { presenceIntent } from './intent.ts';
import { recognizeSelfQuery } from '../self/query.ts';
import { extractMemoryCandidates } from '../memory/long-term.ts';
import type { Locale } from '../language/locale.ts';
const engine = new ConversationEngine(
  canonicalKnowledge,
  new BasicIntelligenceProvider(),
);
const ask = (
  input: string,
  memory = initialWorkingMemory(),
  locale: Locale = 'ru',
) =>
  engine.respond(
    input,
    characterProfiles.aletheia,
    createCharacterRuntime('aletheia', 0).disposition,
    locale,
    memory,
  );
it('runs the continuous bilingual nine-turn regression for all characters with actual grounded output', async () => {
  const result = await runPresencePolish();
  expect(result.rows).toHaveLength(54);
  for (const row of result.rows)
    expect(row.success, `${row.character}/${row.input}: ${row.text}`).toBe(
      true,
    );
  for (const [key, value] of Object.entries(result.metrics))
    if (
      ![
        'questionEndingRate',
        'briefResponseCoverage',
        'openingRepeatRate',
      ].includes(key)
    )
      expect(value.rate, key).toBe(1);
  expect(result.metrics.briefResponseCoverage.rate).toBeGreaterThan(0);
  expect(result.metrics.questionEndingRate.rate).toBeLessThan(0.5);
  expect(result.metrics.openingRepeatRate.rate).toBe(0);
  for (const row of result.rows.filter((r) => r.kind === 'human')) {
    expect(row.rhythm).toBe('brief');
    expect(row.brief).toBe(true);
  }
  for (const row of result.rows.filter((r) => r.kind === 'interest'))
    expect(row.rhythm).toBe('statement_only');
});
it.each([
  ['Что такое личность?', 'ru'],
  ['Что такое сознание?', 'ru'],
  ['Почему человек меняется?', 'ru'],
  ['What is self?', 'en'],
  ['What is consciousness?', 'en'],
  ['Why do people change?', 'en'],
] as const)(
  'keeps general concepts out of the self path: %s',
  async (text, locale) => {
    const r = await ask(text, initialWorkingMemory(), locale);
    expect(r.plan.selfMaterial).toBeUndefined();
    expect(recognizeSelfQuery(text, locale, 'personhood')).toBeUndefined();
  },
);
it.each([
  'Что мы знаем о памяти?',
  'Почему мы меняемся?',
  'What do we know about memory?',
  'Why do we change?',
])('does not confuse we with a scope request: %s', (text) => {
  expect(presenceIntent(text)).toBeUndefined();
});
it.each([
  ['Я про тебя.', 'ru'],
  ['Нет, я именно тебя спрашиваю.', 'ru'],
  ['Я о тебе говорю.', 'ru'],
  ['Тебя, не человека вообще.', 'ru'],
  ['Я спрашиваю именно о тебе.', 'ru'],
  ['I mean you.', 'en'],
  ['I am talking about you.', 'en'],
] as const)(
  'resolves only an immediately preceding self answer: %s',
  async (text, locale) => {
    const fresh = await ask(text, initialWorkingMemory(), locale);
    expect(fresh.plan.selfMaterial).toBeUndefined();
    const self = await ask(
      locale === 'ru' ? 'Ты личность?' : 'Are you a person?',
      initialWorkingMemory(),
      locale,
    );
    const continued = await ask(text, self.nextMemory, locale);
    expect(continued.plan.selfMaterial?.query).toMatchObject({
      kind: 'personhood',
      contextual: true,
    });
    const newTopic = await ask(
      locale === 'ru' ? 'Что такое истина?' : 'What is truth?',
      self.nextMemory,
      locale,
    );
    expect(newTopic.plan.selfMaterial).toBeUndefined();
    const expired = await ask(text, newTopic.nextMemory, locale);
    expect(expired.plan.selfMaterial).toBeUndefined();
  },
);
it('keeps new safe self facts distinct from consciousness assertions', async () => {
  for (const [input, kind] of [
    ['Ты считаешь себя личностью?', 'personhood'],
    ['У тебя есть Я?', 'personhood'],
    ['Что делает тебя тобой?', 'personhood'],
    ['Ты живая?', 'human_identity'],
    ['Ты существуешь?', 'existence'],
    ['Почему ты меняешься?', 'self_continuity'],
  ] as const) {
    const r = await ask(input);
    expect(r.plan.selfMaterial?.query.kind).toBe(kind);
    expect(r.plan.presence).toBeUndefined();
  }
});
it('expires and replaces the explicit year anchor without persisting context or guessing a birthday', async () => {
  let r = await ask('Что ты знаешь про 2026 год');
  expect(r.nextMemory.temporalAnchor).toMatchObject({
    userReferencedYear: 2026,
    systemReferenceYear: 2186,
    originTurn: 1,
    lastReferencedTurn: 1,
  });
  r = await ask('Что ты знаешь про 2000 год', r.nextMemory);
  expect(r.nextMemory.temporalAnchor?.originTurn).toBe(2);
  r = await ask('И сколько это лет?', r.nextMemory);
  expect(r.plan.presence?.yearReference?.interval).toBe(186);
  expect(r.nextMemory.temporalAnchor?.originTurn).toBe(2);
  for (let i = 0; i < 3; i++) r = await ask('Привет', r.nextMemory);
  expect(r.nextMemory.temporalAnchor).toBeUndefined();
  const expired = await ask('Сколько лет между нами?', r.nextMemory);
  expect(expired.plan.presence?.missingYear).toBe(true);
  expect(expired.response.text).not.toMatch(/160|186/);
  expect(initialWorkingMemory().temporalAnchor).toBeUndefined();
  for (const text of [
    'Я родился в 2000 году.',
    '2026',
    'Что ты знаешь про 2026 и 2100?',
  ]) {
    const r = await ask(text);
    expect(r.nextMemory.temporalAnchor).toBeUndefined();
  }
});
it.each([
  'Сколько лет между моим временем и твоим?',
  'Нас сколько лет разделяет?',
  'Как далеко моё время от твоего?',
  'И сколько это лет?',
])('computes anchored interval, not literal 160: %s', async (text) => {
  const first = await ask('Что ты знаешь про 2100 год');
  const r = await ask(text, first.nextMemory);
  expect(r.plan.presence?.yearReference?.interval).toBe(86);
  expect(r.response.text.startsWith('86')).toBe(true);
});
it('topic interest stays conversational, uses fresh authored material, and does not become a speculative persistent preference', async () => {
  const first = await ask('О чем мы можем поговорить?');
  const r = await ask(
    'Вероятно мне интересна природа личности',
    first.nextMemory,
  );
  expect(r.nextMemory.currentThread?.primaryConceptId).toBe('identity.self');
  expect(r.response.usedMaterialKeys).not.toEqual(
    first.response.usedMaterialKeys,
  );
  expect(
    extractMemoryCandidates('Вероятно мне интересна природа личности', 'ru'),
  ).toEqual([]);
  expect(r.response.text.endsWith('?')).toBe(false);
  expect(r).toEqual(
    await ask('Вероятно мне интересна природа личности', first.nextMemory),
  );
});
it('offers use bounded fresh openings without changing their authored grounding', async () => {
  let memory = initialWorkingMemory();
  const starts = [];
  for (let i = 0; i < 3; i++) {
    const r = await ask('Предложи тему сама.', memory);
    memory = r.nextMemory;
    starts.push(r.response.text.split(' ').slice(0, 3).join(' '));
    expect(r.response.usedMaterialKeys.length).toBeGreaterThan(0);
  }
  expect(new Set(starts).size).toBe(3);
});
it('realizes arbitrary year distances with correct singular/plural and no historical event claims', async () => {
  for (const [year, expected] of [
    [2185, '1 год'],
    [2184, '2 года'],
    [2175, '11 лет'],
    [2200, '14 лет'],
  ] as const) {
    const first = await ask(`Что ты знаешь про ${year} год`);
    const r = await ask('Сколько лет между нами?', first.nextMemory);
    expect(r.response.text.startsWith(expected)).toBe(true);
    expect(r.plan.presence?.yearReference?.interval).toBe(
      Math.abs(2186 - year),
    );
  }
});
