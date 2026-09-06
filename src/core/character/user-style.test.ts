import { expect, it } from 'vitest';
import {
  initialUserStyleProfile,
  observeSurface,
  updateUserStyle,
} from './user-style';
it.each(['ru', 'en'])(
  'smooths surface statistics in %s without storing text or inferring topics',
  (locale) => {
    const short = locale === 'ru' ? 'Почему?' : 'Why?';
    const long =
      locale === 'ru'
        ? 'Я рассматриваю этот вопрос с другой стороны и хочу понять какие условия изменяют результат.'
        : 'I am considering this question from another perspective and want to understand which conditions change the outcome.';
    const initial = initialUserStyleProfile();
    const concise = updateUserStyle(initial, observeSurface(short));
    const verbose = updateUserStyle(initial, observeSurface(long));
    expect(concise.verbosity).toBeLessThan(verbose.verbosity);
    expect(Math.abs(concise.verbosity - initial.verbosity)).toBeLessThanOrEqual(
      0.025,
    );
    expect(concise.questionFrequency).toBeCloseTo(0.525);
    expect(verbose.questionFrequency).toBeCloseTo(0.475);
    expect(concise.averageSentenceLength).toBeGreaterThan(1);
    expect(concise.averageSentenceLength).toBeLessThan(
      initial.averageSentenceLength,
    );
    expect(concise.formality).toBe(0.5);
    expect(concise.preferredTopics).toEqual([]);
    expect(JSON.stringify(concise)).not.toContain(short);
    expect(Object.keys(concise).sort()).toEqual([
      'averageSentenceLength',
      'emotionalExpressiveness',
      'formality',
      'preferredTopics',
      'questionFrequency',
      'verbosity',
    ]);
    expect(initial.questionFrequency).toBe(0.5);
  },
);
it('counts surface words/sentences/questions without treating punctuation as sentiment', () => {
  expect(observeSurface('Один два. Три четыре?')).toMatchObject({
    wordCount: 4,
    sentenceCount: 2,
    hasQuestion: true,
  });
  expect(observeSurface("Don't re-write it! Why?")).toMatchObject({
    wordCount: 4,
    sentenceCount: 2,
    hasQuestion: true,
  });
  const state = updateUserStyle(
    initialUserStyleProfile(),
    observeSurface('Нет!!!'),
  );
  expect(state.emotionalExpressiveness).toBeGreaterThan(0.5);
  expect(state.emotionalExpressiveness).toBeLessThan(0.51);
});
it('empty or punctuation-only input does not corrupt style; invalid metrics recover safely', () => {
  for (const text of ['', '   ', '...!!!'])
    expect(
      updateUserStyle(initialUserStyleProfile(), observeSurface(text)),
    ).toEqual(initialUserStyleProfile());
  const bad = {
    ...initialUserStyleProfile(),
    verbosity: NaN,
    formality: Infinity,
    averageSentenceLength: NaN,
    questionFrequency: -1,
    emotionalExpressiveness: 2,
  };
  const next = updateUserStyle(bad, {
    wordCount: 20,
    sentenceCount: NaN,
    hasQuestion: false,
    exclamationDensity: Infinity,
  });
  for (const [key, value] of Object.entries(next))
    if (typeof value === 'number') {
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(
        key === 'averageSentenceLength' ? 100 : 1,
      );
    }
});
