import { describe, it, expect } from 'vitest';
import { canonicalKnowledge } from '../../generated/knowledge.ts';
import { authoredRelations, relationTerms } from '../../relations/pack.ts';
import { ConceptGraph } from '../knowledge/graph.ts';
import { RelationIndex, operandEvidence } from './relations.ts';
import { reasoningIntent } from './intent.ts';
import { relationKey } from './model.ts';
import { ConversationEngine } from '../conversation/engine.ts';
import { BasicIntelligenceProvider } from '../intelligence/basic.ts';
import { initialWorkingMemory } from '../memory/working.ts';
import { characterIds } from '../character/id.ts';
import { characterProfiles } from '../character/profile.ts';
import { createCharacterRuntime } from '../character/runtime.ts';
import type { Locale } from '../language/locale.ts';
const graph = new ConceptGraph(canonicalKnowledge);
const index = new RelationIndex(authoredRelations, graph);
const engine = new ConversationEngine(
  canonicalKnowledge,
  new BasicIntelligenceProvider(),
);
const ask = (
  text: string,
  id: (typeof characterIds)[number] = 'aletheia',
  memory = initialWorkingMemory(),
  locale: Locale = 'ru',
) =>
  engine.respond(
    text,
    characterProfiles[id],
    createCharacterRuntime(id, 0).disposition,
    locale,
    memory,
  );

describe('authored relations', () => {
  it('resolves symmetric pairs in either order, but never invents an edge meaning', () => {
    expect(
      index.lookup('identity.memory', 'philosophy.consciousness')?.id,
    ).toBe('consciousness-memory');
    expect(
      index.lookup('philosophy.consciousness', 'identity.memory')?.id,
    ).toBe('consciousness-memory');
    expect(index.lookup('identity.memory', 'world.archives')).toBeUndefined();
  });
  it('respects direction and rejects duplicate IDs and malformed material', () => {
    const r = { ...authoredRelations[0]!, direction: 'directed' as const };
    const directed = new RelationIndex([r], graph);
    expect(directed.lookup(r.concepts[1], r.concepts[0])).toBeUndefined();
    expect(directed.lookup(...r.concepts)?.id).toBe(r.id);
    expect(() => new RelationIndex([r, r], graph)).toThrow('Invalid relation');
    expect(
      () =>
        new RelationIndex(
          [{ ...r, material: [{ kind: 'claim', text: { ru: '', en: 'x' } }] }],
          graph,
        ),
    ).toThrow('Invalid relation');
  });
  it('keeps relation terms explicit and Unicode-aware without altering matcher aliases', () => {
    expect(
      operandEvidence('без памяти', 'ru', relationTerms, graph),
    ).toContainEqual({
      conceptId: 'identity.memory',
      source: 'relation_term',
      term: 'памяти',
    });
    expect(operandEvidence('memorial', 'en', relationTerms, graph)).toEqual([]);
  });
  it('is plain bilingual serializable data with existing concept endpoints', () => {
    expect(JSON.parse(JSON.stringify(authoredRelations))).toEqual(
      authoredRelations,
    );
    expect(authoredRelations).toHaveLength(13);
    for (const r of authoredRelations) {
      for (const id of r.concepts) expect(graph.get(id)).toBeDefined();
      for (const m of r.material) {
        expect(m.text.ru).toMatch(/[а-я]/iu);
        expect(m.text.en).not.toMatch(/[а-я]/iu);
      }
    }
  });
});
it.each([
  ['ru', 'Что такое знание?', 'define'],
  ['en', 'What is knowledge?', 'define'],
  ['ru', 'Чем знание отличается от истины?', 'distinguish'],
  ['en', 'How is knowledge different from truth?', 'distinguish'],
  ['ru', 'Может ли сознание существовать без памяти?', 'relate'],
  ['en', 'Can consciousness exist without memory?', 'relate'],
  ['ru', 'Если архив потерян, исчезает ли истина?', 'consequence'],
  ['en', 'If records are lost, then what?', 'consequence'],
  ['ru', 'Как отличить причину от совпадения?', 'criterion'],
  ['en', 'How can a cause be distinguished from coincidence?', 'criterion'],
  ['ru', 'Если всё имеет причину, свободы нет.', 'counterpressure'],
  ['en', 'If everything has a cause, there is no freedom.', 'counterpressure'],
] as const)('%s recognizes %s as %s', (locale, text, frame) =>
  expect(reasoningIntent(text, locale)?.frame).toBe(frame),
);
it.each(['что', 'тогда', 'if', 'why', 'what remains then?'])(
  'isolated structural language supplies no frame or invented topic: %s',
  async (text) => {
    const locale = /[а-я]/iu.test(text) ? 'ru' : 'en';
    expect(reasoningIntent(text, locale)).toBeUndefined();
    expect(
      (await ask(text, 'aura', initialWorkingMemory(), locale)).plan.reasoning,
    ).toBeUndefined();
  },
);
it.each(characterIds)(
  '%s answers before associations, retains a bounded relation focus, and exhausts honestly',
  async (id) => {
    const first = await ask('Может ли сознание существовать без памяти?', id);
    expect(first.plan.reasoning).toMatchObject({
      frame: 'relate',
      relationId: 'consciousness-memory',
      concepts: ['philosophy.consciousness', 'identity.memory'],
      optional: [],
    });
    expect(first.response.text).not.toMatch(/\?$/u);
    expect(first.response.usedMaterialKeys.length).toBeGreaterThan(0);
    const second = await ask('Почему?', id, first.nextMemory);
    expect(second.plan.reasoning?.relationId).toBe(
      first.plan.reasoning?.relationId,
    );
    expect(second.plan.reasoning?.continuationOfTurn).toBe(1);
    expect(
      second.response.usedMaterialKeys.every(
        (k) => !first.response.usedMaterialKeys.includes(k),
      ),
    ).toBe(true);
    const third = await ask(
      'А если память полностью исчезнет?',
      id,
      second.nextMemory,
    );
    expect(third.plan.reasoning?.relationId).toBe('consciousness-memory');
    expect(JSON.parse(JSON.stringify(third.nextMemory))).toEqual(
      third.nextMemory,
    );
    const changed = await ask('Что такое истина?', id, third.nextMemory);
    expect(changed.plan.primaryConceptId).toBe('philosophy.truth');
    expect(changed.plan.reasoning?.relationId).toBeUndefined();
    const empty = await ask('Почему?', id);
    expect(empty.plan.reasoning).toBeUndefined();
    const unknown = await ask('Какая погода на Марсе?', id, first.nextMemory);
    expect(unknown.plan.strategy).toBe('admit_uncertainty');
    expect(unknown.plan.reasoning).toBeUndefined();
  },
);
it('same frame is independent of character; disposition only affects emphasis', async () => {
  const answers = await Promise.all(
    characterIds.map((id) =>
      ask('Может ли сознание существовать без памяти?', id),
    ),
  );
  expect(new Set(answers.map((a) => a.plan.reasoning?.frame)).size).toBe(1);
  expect(new Set(answers.map((a) => a.response.text)).size).toBe(3);
});
it('all relation output is exactly selected authored material, never a fabricated negation', async () => {
  for (const locale of ['ru', 'en'] as const) {
    const text =
      locale === 'ru'
        ? 'Если всё имеет причину, свободы нет.'
        : 'If everything has a cause, there is no freedom.';
    const r = await ask(text, 'themis', initialWorkingMemory(), locale);
    expect(r.plan.reasoning?.relationId).toBe('freedom-causality');
    expect(r.response.text).toBe(
      r.plan
        .reasoning!.required.map((ref) => index.read(ref, locale))
        .join(' '),
    );
    expect(r.response.usedMaterialKeys).toEqual(
      r.plan.reasoning!.required.map(relationKey),
    );
    expect(await ask(text, 'themis', initialWorkingMemory(), locale)).toEqual(
      r,
    );
    expect(r.response.text.length).toBeLessThanOrEqual(
      r.plan.desiredLength.maxCharacters,
    );
  }
});
it('machine reasoning criterion cannot be replaced by graph-only art creation', async () => {
  const r = await ask('Может ли машина мыслить?');
  expect(r.plan.reasoning).toMatchObject({
    frame: 'criterion',
    basis: 'concept',
    concepts: ['science.intelligence'],
  });
  expect(
    r.plan.selectedMaterial.every(
      (ref) =>
        ref.conceptId === 'science.intelligence' && ref.kind !== 'question',
    ),
  ).toBe(true);
});
it('self facts remain authoritative during distinction', async () => {
  const r = await ask('Чем твоё мышление отличается от человеческого?');
  expect(r.plan.selfMaterial?.query.kind).toBe('reasoning');
  expect(r.plan.reasoning).toMatchObject({
    frame: 'distinguish',
    basis: 'self',
    required: [],
  });
  expect(r.plan.reasoning?.relationId).toBeUndefined();
});

it('expires reasoning focus after unrelated completed exchanges', async () => {
  let r = await ask('Может ли сознание существовать без памяти?');
  for (let i = 0; i < 5; i++)
    r = await ask('Я купил хлеб.', 'aletheia', r.nextMemory);
  expect(r.nextMemory.currentThread).toBeUndefined();
  expect(r.nextMemory.reasoningFocus).toBeUndefined();
  expect(r.plan.reasoning).toBeUndefined();
  expect(r.nextMemory.recentTurns.length).toBeLessThanOrEqual(8);
});
it('repeated explicit questions prefer unused relation material', async () => {
  const first = await ask('Может ли сознание существовать без памяти?');
  const again = await ask(
    'Может ли сознание существовать без памяти?',
    'aletheia',
    first.nextMemory,
  );
  expect(first.response.usedMaterialKeys).not.toContain(
    again.response.usedMaterialKeys[0],
  );
});
it('unknown pairs fall back to card material without manufacturing a relationship', async () => {
  const r = await ask('Как память связана с архивами?');
  expect(r.plan.reasoning?.relationId).toBeUndefined();
  expect(r.plan.reasoning?.required).toEqual([]);
  expect(r.plan.associatedConceptId).toBeUndefined();
  expect(
    r.plan.selectedMaterial.every(
      (ref) => ref.conceptId === r.plan.primaryConceptId,
    ),
  ).toBe(true);
});
