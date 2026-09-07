import { expect, it } from 'vitest';
import { canonicalKnowledge } from '../../generated/knowledge';
import { ConceptMatcher } from '../knowledge/matcher';
import { ConversationEngine } from './engine';
import { BasicIntelligenceProvider } from '../intelligence/basic';
import { characterProfiles } from '../character/profile';
import { createCharacterRuntime } from '../character/runtime';
import { initialWorkingMemory } from '../memory/working';
import type { Locale } from '../language/locale';

const matcher = new ConceptMatcher(canonicalKnowledge);
const engine = new ConversationEngine(
  canonicalKnowledge,
  new BasicIntelligenceProvider(),
);
const runtime = createCharacterRuntime('aletheia', 0);
const respond = (
  text: string,
  locale: Locale = 'ru',
  memory = initialWorkingMemory(),
) =>
  engine.respond(
    text,
    characterProfiles.aletheia,
    runtime.disposition,
    locale,
    memory,
  );

it('excludes structural tokens only from partial multi-token evidence', () => {
  const partial = matcher
    .match('remains what unchanged', 'en')
    .find((m) => m.conceptId === 'identity.continuity')!;
  expect(partial.score).toBe(70);
  expect(partial.evidence.matchedTokens).toEqual(['remains', 'unchanged']);
  const exact = matcher
    .match('what remains unchanged?', 'en')
    .find((m) => m.conceptId === 'identity.continuity')!;
  expect(exact.score).toBe(100);
  expect(exact.evidence.matchedTokens).toEqual([
    'what',
    'remains',
    'unchanged',
  ]);
  expect(matcher.match('what remains then?', 'en')).toEqual([]);
  const ru = matcher
    .match('почему человек неизменным когда остаётся', 'ru')
    .find((m) => m.conceptId === 'identity.continuity')!;
  expect(ru.evidence.matchedTokens).toEqual(['остается', 'неизменным']);
});

it('keeps moderate candidates without awarding the strong multi-concept bonus', async () => {
  const result = await respond('Память делает человека тем же человеком?');
  expect(result.perception.matches.map((m) => m.score)).toEqual([100, 67, 67]);
  expect(result.attention.strongMultiConcept).toBe(false);
  expect(result.attention.associationReason).toBe('matched_related');
  expect(result.plan.strategy).toBe('ask_follow_up');
  expect(result.nextMemory.pendingQuestion).toBeDefined();
  const strong = await respond('истина и утраченные архивы');
  expect(strong.perception.matches.map((m) => m.score)).toEqual([100, 100]);
  expect(strong.attention.strongMultiConcept).toBe(true);
  expect(strong.plan.strategy).toBe('connect');
});

it.each([
  ['ru', 'что тогда остаётся неизменным?'],
  ['en', 'what remains unchanged then?'],
  ['en', 'what remains then?'],
] as const)(
  '%s %s preserves the current thread and exposes refinements',
  async (locale, text) => {
    const first = await respond(
      locale === 'ru' ? 'Что делает меня мной?' : 'what is the self?',
      locale,
    );
    const result = await respond(text, locale, first.nextMemory);
    expect(result.context.kind).toBe('consequence');
    expect(result.plan.primaryConceptId).toBe('identity.self');
    expect(result.nextMemory.currentThread?.startedTurn).toBe(1);
    if (text !== 'what remains then?')
      expect(result.context.refinementConceptIds).toContain(
        'identity.continuity',
      );
    const fresh = await respond(text, locale);
    expect(fresh.context.inheritedConceptIds).toEqual([]);
    expect(fresh.plan.primaryConceptId).toBeUndefined();
    const changed = await respond(
      locale === 'ru' ? 'А что тогда такое истина?' : 'Then what is truth?',
      locale,
      first.nextMemory,
    );
    expect(changed.plan.primaryConceptId).toBe('philosophy.truth');
    expect(changed.context.inheritedConceptIds).toEqual([]);
  },
);

it('recognizes only the two newly authorized remain aliases and keeps ordinary queries empty', () => {
  for (const text of [
    'останусь тем же человеком',
    'останусь ли я тем же человеком',
  ]) {
    expect(matcher.match(text, 'ru')[0]).toMatchObject({
      conceptId: 'identity.continuity',
      score: 100,
    });
  }
  for (const [locale, text] of [
    ['ru', 'я купил хлеб'],
    ['en', 'I bought bread'],
    ['en', 'I opened a zip archive'],
    ['ru', 'мне нужно сделать копию файла'],
  ] as const) {
    expect(matcher.match(text, locale)).toEqual([]);
  }
});
