import { expect, it } from 'vitest';
import { ConceptMatcher } from '../../core/knowledge/matcher';
import type { ConceptCard } from '../../core/knowledge/model';
const card: ConceptCard = {
  id: 'science.causality',
  domain: 'science',
  content: {
    ru: {
      title: 'Причинность',
      aliases: ['причинная связь'],
      summary: 'Краткое изложение.',
      claims: ['Утверждение.'],
      tensions: [],
      questions: ['Как отличить причину от совпадения?'],
    },
    en: {
      title: 'Causality',
      aliases: ['causal relation'],
      summary: 'Summary.',
      claims: ['A claim.'],
      tensions: [],
      questions: [
        'How can a cause be distinguished from coincidence?',
        'What remains unchanged?',
      ],
    },
  },
  related: [],
  characterAffinity: { aletheia: 0.8, aura: 0.5, themis: 1 },
  sources: [],
};
it('keeps alias/title authority and gives exact authored questions separate evidence', () => {
  const m = new ConceptMatcher([card]);
  expect(m.match('причинная связь', 'ru')[0]?.score).toBe(100);
  expect(m.match('Причинность', 'ru')[0]?.score).toBe(90);
  for (const locale of ['ru', 'en'] as const) {
    const question = card.content[locale]!.questions[0]!;
    expect(m.match(question.toUpperCase(), locale)[0]).toMatchObject({
      score: 88,
      evidence: { source: 'question', kind: 'phrase', term: question },
    });
  }
});
it('requires three significant tokens and bilateral coverage for question overlap', () => {
  const m = new ConceptMatcher([card]);
  expect(
    m.match('Как отличить причину от совпадения сегодня?', 'ru')[0],
  ).toMatchObject({
    score: 69,
    evidence: { source: 'question', kind: 'overlap' },
  });
  expect(
    m.match('How is a cause distinguished from coincidence?', 'en')[0]?.evidence
      .source,
  ).toBe('question');
  expect(m.match('Совпадения', 'ru', { minScore: 0 })).toEqual([]);
  expect(m.match('what remains then?', 'en', { minScore: 0 })).toEqual([]);
  expect(m.match('what remains unchanged?', 'en')[0]?.score).toBe(88);
  expect(
    m.match(
      'хлеб улица погода отличить причину совпадения работа магазин',
      'ru',
    ),
  ).toEqual([]);
});
it('is deterministic, locale-separated and never indexes claims or summaries', () => {
  const m = new ConceptMatcher([card]);
  expect(m.match('Краткое изложение утверждение', 'ru')).toEqual([]);
  expect(m.match(card.content.ru!.questions[0]!, 'en')).toEqual([]);
  expect(m.match('Как отличить причину от совпадения?', 'ru')).toEqual(
    m.match('Как отличить причину от совпадения?', 'ru'),
  );
});
