import { describe, expect, it } from 'vitest';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseConceptYaml } from './yaml.ts';
import { loadRepositoryKnowledge } from './repository.ts';
import {
  validateConceptCard,
  validateConceptCards,
} from '../../core/knowledge/validation.ts';
import { resolveConcept } from '../../core/knowledge/localization.ts';
import { ConceptGraph } from '../../core/knowledge/graph.ts';
import { ConceptMatcher } from '../../core/knowledge/matcher.ts';
import { affinityFor, type ConceptCard } from '../../core/knowledge/model.ts';
import { conceptTokens } from '../../core/knowledge/normalization.ts';

const directory = fileURLToPath(new URL('./__fixtures__/', import.meta.url));
const cards = await loadRepositoryKnowledge(directory);
const memory = cards.find((card) => card.id === 'identity.memory')!;
const graph = new ConceptGraph(cards);
const matcher = new ConceptMatcher(cards);
const yaml = await readFile(
  new URL('./__fixtures__/identity/memory.yaml', import.meta.url),
  'utf8',
);

// Real files exercise exactly the same Node loader used by author/build checks.
describe('authoring and validation', () => {
  it('loads six noncanonical YAML cards and validates the repository separately', async () => {
    expect(cards).toHaveLength(6);
    expect(await loadRepositoryKnowledge()).toEqual(
      validateConceptCards(await loadRepositoryKnowledge()),
    );
    expect(validateConceptCard(memory)).toEqual(memory);
    expect(JSON.parse(JSON.stringify(cards))).toEqual(cards);
    expect(() => validateConceptCards(cards)).not.toThrow(); // cycles are valid
  });
  it('rejects duplicates and dangling references after graph assembly', () => {
    expect(() => validateConceptCards([...cards, memory])).toThrow(
      /duplicate concept id/,
    );
    expect(() => validateConceptCards([memory])).toThrow(/missing concept/);
    expect(() => new ConceptGraph([memory])).toThrow(/missing concept/);
  });
  it.each([
    [{ id: '' }, /id/],
    [{ id: 'memory' }, /domain.lowercase-slug/],
    [{ domain: 'religion' }, /domain/],
    [{ domain: 'art' }, /prefix/],
    [
      { characterAffinity: { aletheia: 2, aura: 0.9, themis: 0.5 } },
      /aletheia/,
    ],
    [
      { characterAffinity: { aletheia: NaN, aura: 0.9, themis: 0.5 } },
      /aletheia/,
    ],
    [{ characterAffinity: { aletheia: 0.8, aura: 0.9 } }, /themis/],
    [{ related: ['identity.memory', 'identity.memory'] }, /duplicate id/],
    [{ sources: [{ work: 42 }] }, /sources\[0\].work/],
    [{ sources: [{ url: 'unknown schema' }] }, /unknown field/],
    [{ sources: [{}] }, /empty source/],
  ])('rejects malformed metadata %j', (override, error) => {
    expect(() => validateConceptCard({ ...memory, ...override })).toThrow(
      error,
    );
  });
  it('rejects malformed localized content and normalized duplicate aliases', () => {
    for (const override of [
      { title: ' ' },
      { aliases: 'memory' },
      { claims: [42] },
      { questions: null },
      { aliases: ['объём', 'ОБЪЕМ!'] },
    ]) {
      expect(() =>
        validateConceptCard({
          ...memory,
          content: { ru: { ...memory.content.ru, ...override } },
        }),
      ).toThrow();
    }
  });
  it('reports filename plus parser or field errors, never silently accepts partial YAML', () => {
    expect(() => parseConceptYaml('id: [', 'bad.yaml')).toThrow(/bad.yaml/);
    expect(() =>
      parseConceptYaml('id: one\nid: two', 'duplicate.yaml'),
    ).toThrow(/duplicate.yaml/);
    expect(() =>
      parseConceptYaml(
        yaml.replace('character_affinity:', 'character_affinities:'),
        'typo.yaml',
      ),
    ).toThrow(/unknown field/);
    expect(() =>
      parseConceptYaml(yaml.replace('aura: 0.9', 'aura: 2'), 'affinity.yaml'),
    ).toThrow(/affinity.yaml.*aura/s);
    expect(() =>
      parseConceptYaml(yaml + '\nextra: !unknown value', 'tag.yaml'),
    ).toThrow(/tag.yaml/);
    expect(() =>
      parseConceptYaml(yaml + '\n---\nid: identity.second', 'multi.yaml'),
    ).toThrow();
    expect(() =>
      parseConceptYaml(
        yaml.replace('related:', 'related: &links'),
        'anchors.yaml',
      ),
    ).not.toThrow();
  });
  it('does not import host or YAML APIs in production core knowledge modules', async () => {
    const root = new URL('../../core/knowledge/', import.meta.url);
    for (const file of await readdir(root)) {
      const source = await readFile(new URL(file, root), 'utf8');
      expect(source).not.toMatch(/from\s+['"](?:svelte|yaml|node:|vite)/);
      expect(source).not.toMatch(
        /\b(?:window|document|indexedDB|localStorage)\b/,
      );
    }
  });
});

describe('whole-card knowledge localization', () => {
  it.each(['ru', 'en'] as const)(
    'resolves authored %s without fallback',
    (locale) => {
      expect(resolveConcept(memory, locale)).toMatchObject({
        locale,
        requestedLocale: locale,
        fallbackUsed: false,
        content: memory.content[locale],
      });
    },
  );
  it('falls back as one unit, reports the decision and allows opting out', () => {
    const aura = graph.get('art.aura')!;
    expect(resolveConcept(aura, 'en')).toMatchObject({
      locale: 'ru',
      requestedLocale: 'en',
      fallbackUsed: true,
      content: aura.content.ru,
    });
    expect(resolveConcept(aura, 'en', false)).toBeUndefined();
    const fallback = matcher.match('присутствие произведения', 'en')[0]!;
    expect(fallback).toMatchObject({
      conceptId: 'art.aura',
      locale: 'ru',
      fallbackUsed: true,
    });
    expect(
      matcher.match('присутствие произведения', 'en', { allowFallback: false }),
    ).toEqual([]);
  });
  it('treats wholly blank translations as absent but rejects partially authored variants', () => {
    const blank = yaml.replace(/en: .*/gu, (line) =>
      line.includes('[') ? 'en: []' : 'en: ""',
    );
    const parsed = parseConceptYaml(blank, 'blank.yaml');
    expect(Object.keys(parsed.content)).toEqual(['ru']);
    expect(resolveConcept(parsed, 'en')?.fallbackUsed).toBe(true);
    expect(() =>
      parseConceptYaml(blank.replace('en: ""', 'en: "Memory"'), 'partial.yaml'),
    ).toThrow(/content.en.summary/);
  });
});

describe('surface concept matching', () => {
  it.each([
    ['ЛИЧНАЯ ПАМЯТЬ!', 'ru', 'identity.memory', 100, 'alias'],
    ['Обсудим объём памяти.', 'ru', 'identity.memory', 100, 'alias'],
    ['Обсудим объем памяти.', 'ru', 'identity.memory', 100, 'alias'],
    ['What about personal memory?', 'en', 'identity.memory', 100, 'alias'],
    ['(Truth).', 'en', 'philosophy.truth', 90, 'title'],
    ['Истина.', 'ru', 'philosophy.truth', 90, 'title'],
    ['identity personal', 'en', 'identity.continuity', 67, 'alias'],
  ] as const)(
    'matches %s with inspectable evidence',
    (input, locale, id, score, source) => {
      expect(
        matcher.match(input, locale).find((match) => match.conceptId === id),
      ).toMatchObject({
        score,
        locale,
        requestedLocale: locale,
        fallbackUsed: false,
        evidence: { source },
      });
      expect(
        matcher.match(input, locale).find((match) => match.conceptId === id)
          ?.evidence.matchedTokens.length,
      ).toBeGreaterThan(0);
    },
  );
  it.each(['ru', 'en'] as const)(
    'keeps weak %s tokens diagnostic-only',
    (locale) => {
      const input = locale === 'ru' ? 'память' : 'memory record';
      expect(matcher.match(input, locale)).toEqual([]);
      for (const minScore of [0, 40]) {
        expect(matcher.match(input, locale, { minScore })).toMatchObject([
          {
            conceptId: 'identity.memory',
            score: 40,
            evidence: { source: 'alias', kind: 'token' },
          },
        ]);
      }
      for (const minScore of [41, 65, NaN, Infinity])
        expect(matcher.match(input, locale, { minScore })).toEqual([]);
      expect(
        matcher.match('unrelated weather', locale, { minScore: 0 }),
      ).toEqual([]);
    },
  );
  it('returns an explicitly authored one-word alias as a strong match', () => {
    const authored = {
      ...memory,
      related: [],
      content: {
        ru: { ...memory.content.ru!, aliases: ['память'] },
      },
    };
    const explicit = new ConceptMatcher([authored]);
    expect(explicit.match('память', 'ru')).toMatchObject([
      {
        conceptId: 'identity.memory',
        score: 100,
        evidence: { kind: 'phrase', term: 'память' },
      },
    ]);
  });
  it.each([
    ['ru', 'память', []],
    ['ru', 'память и непрерывность личности', [['identity.continuity', 90]]],
    ['ru', 'сегодня на улице хорошая погода', []],
    ['en', 'personal memory', [['identity.memory', 100]]],
    ['en', 'memory and continuity', [['identity.continuity', 90]]],
    ['en', 'I bought some bread today', []],
  ] as const)(
    'returns confident candidates for %s: %s',
    (locale, input, expected) => {
      expect(
        matcher
          .match(input, locale)
          .map((result) => [result.conceptId, result.score]),
      ).toEqual(expected);
    },
  );
  it('uses contiguous token boundaries, not substrings or summaries', () => {
    expect(matcher.match('untruthful', 'en')).toEqual([]);
    expect(matcher.match('personal reflection', 'en')).toEqual([]);
    expect(matcher.match('Test card not PROJECT canon', 'en')).toEqual([]);
    expect(matcher.match('the and of в и на', 'en')).toEqual([]);
    expect(matcher.match('A bicycle beside the river.', 'en')).toEqual([]);
    expect(matcher.match('Сегодня идёт дождь.', 'ru')).toEqual([]);
  });
  it('normalizes Unicode punctuation, ё and preserved hyphen/apostrophe forms', () => {
    expect(conceptTokens('  ЁЛКА, long‑term DON’T! ＭＥＭＯＲＹ ')).toEqual([
      'елка',
      'long-term',
      "don't",
      'memory',
    ]);
    expect(matcher.match('Long‑term memory', 'en')[0]?.score).toBe(100);
    expect(memory.content.ru?.aliases).toContain('объём памяти');
    const onlyYo = {
      ...memory,
      related: [],
      content: { ru: { ...memory.content.ru!, aliases: ['объём памяти'] } },
    };
    expect(
      new ConceptMatcher([onlyYo]).match('объем памяти', 'ru')[0]?.score,
    ).toBe(100);
  });
  it('ignores tiny aliases and preserves score hierarchy without accumulating repetitions', () => {
    const small: ConceptCard = {
      ...memory,
      id: 'identity.small',
      related: [],
      content: {
        en: { ...memory.content.en!, title: 'An', aliases: ['of', 'in'] },
      },
    };
    expect(new ConceptMatcher([small]).match('an in of', 'en')).toEqual([]);
    expect(matcher.match('personal memory personal memory', 'en')).toEqual(
      matcher.match('personal memory', 'en'),
    );
  });
  it('orders ties by stable id, independent of corpus order, and respects result limits', () => {
    const input = 'personal memory historical archive';
    const expected = matcher.match(input, 'en');
    expect(expected.map((item) => item.conceptId)).toEqual([
      'identity.memory',
      'world.archives',
    ]);
    expect(new ConceptMatcher([...cards].reverse()).match(input, 'en')).toEqual(
      expected,
    );
    expect(matcher.match(input, 'en')).toEqual(expected);
    expect(matcher.match(input, 'en', { limit: 1 })).toEqual(
      expected.slice(0, 1),
    );
    expect(matcher.match(input, 'en', { limit: 0 })).toEqual([]);
  });
  it('exposes all character affinities without altering matching or graph data', () => {
    expect(
      ['aletheia', 'aura', 'themis'].map((character) =>
        affinityFor(memory, character as 'aletheia' | 'aura' | 'themis'),
      ),
    ).toEqual([0.8, 0.9, 0.5]);
    const changed = cards.map((card) => ({
      ...card,
      characterAffinity: { aletheia: 0, aura: 0, themis: 1 },
    }));
    expect(new ConceptMatcher(changed).match('personal memory', 'en')).toEqual(
      matcher.match('personal memory', 'en'),
    );
  });
});

describe('bounded directed concept graph', () => {
  const ids = (values: ConceptCard[]) => values.map((value) => value.id);
  it('returns direct authored edges without inferring reverse or causal relations', () => {
    expect(ids(graph.related('identity.memory'))).toEqual([
      'identity.continuity',
      'world.archives',
    ]);
    expect(ids(graph.related('art.aura'))).toEqual(['identity.memory']);
    expect(ids(graph.related('identity.memory'))).not.toContain('art.aura');
    expect(graph.get('identity.unknown')).toBeUndefined();
    expect(graph.related('identity.unknown')).toEqual([]);
  });
  it('expands breadth-first, excludes seeds, deduplicates and handles cycles', () => {
    expect(ids(graph.expand(['identity.memory']))).toEqual([
      'identity.continuity',
      'world.archives',
    ]);
    expect(ids(graph.expand(['identity.memory'], { depth: 2 }))).toEqual([
      'identity.continuity',
      'world.archives',
      'philosophy.truth',
      'science.causality',
    ]);
    const expanded = ids(
      graph.expand(['identity.memory', 'identity.memory'], { depth: 100 }),
    );
    expect(new Set(expanded).size).toBe(expanded.length);
    expect(expanded).not.toContain('identity.memory');
    expect(ids(graph.expand(['identity.memory', 'art.aura']))).toEqual(
      ids(graph.expand(['art.aura', 'identity.memory'])),
    );
  });
  it('applies zero, small and invalid limits deterministically', () => {
    expect(graph.expand(['identity.memory'], { depth: 0 })).toEqual([]);
    expect(graph.expand(['identity.memory'], { limit: 0 })).toEqual([]);
    expect(ids(graph.expand(['identity.memory'], { limit: 1 }))).toEqual([
      'identity.continuity',
    ]);
    expect(
      graph.expand(['identity.memory'], { depth: NaN, limit: Infinity }),
    ).toEqual(graph.expand(['identity.memory']));
    expect(graph.expand(['identity.unknown'])).toEqual([]);
  });
  it('does not let consumers corrupt assembled relationships', () => {
    graph.get('identity.memory')!.related.length = 0;
    expect(graph.related('identity.memory')).toHaveLength(2);
  });
});
