import { expect, it } from 'vitest';
import { canonicalKnowledge } from '../../generated/knowledge.ts';
import { authoredRelations } from '../../relations/pack.ts';
import { realizationVariants } from '../../characters/realization.ts';
import { selfFactText } from '../../characters/self.ts';
import {
  limitations,
  stanceAcknowledgments,
} from '../../characters/limitations.ts';
import { characterIds, type CharacterId } from '../character/id.ts';
import { createCharacterRuntime } from '../character/runtime.ts';
import { characterProfiles } from '../character/profile.ts';
import { conversationEngine } from '../../application/intelligence.ts';
import { initialWorkingMemory } from '../memory/working.ts';
import { sentenceCount } from '../conversation/material.ts';
import {
  composeResponse,
  surfaceHistory,
  unitAlternatives,
} from './composition.ts';
import type { IntelligenceContext } from './provider.ts';
import type { Locale } from '../language/locale.ts';
const ask = (
  text: string,
  memory = initialWorkingMemory(),
  character: CharacterId = 'aletheia',
  locale: Locale = 'ru',
) =>
  conversationEngine.respond(
    text,
    characterProfiles[character],
    createCharacterRuntime(character, 0).disposition,
    locale,
    memory,
  );
const ctx = (id: CharacterId = 'themis'): IntelligenceContext => ({
  profile: characterProfiles[id],
  disposition: createCharacterRuntime(id, 0).disposition,
  locale: 'ru',
  turnIndex: 0,
  material: [],
});
it('binds each reviewed variant to the exact current source in both languages', () => {
  for (const [key, entry] of Object.entries(realizationVariants)) {
    const [a, b, i] = key.split(':');
    for (const locale of ['ru', 'en'] as const) {
      const source =
        a === 'self'
          ? selfFactText[locale][b as keyof typeof selfFactText.ru]
          : a === 'relation'
            ? authoredRelations.find((r) => r.id === b)!.material[Number(i)]!
                .text[locale]
            : canonicalKnowledge.find((c) => c.id === a)!.content[locale]![
                b === 'claim' ? 'claims' : 'tensions'
              ][Number(i)];
      expect(entry.source[locale], key).toBe(source);
      expect(entry[locale]).toHaveLength(3);
      for (const text of entry[locale]) {
        expect(text.trim()).toBe(text);
        expect(sentenceCount(text)).toBe(1);
        if (locale === 'en') expect(text).not.toMatch(/[а-яё]/iu);
        expect(text).not.toMatch(/therefore|because|поэтому|поскольку/iu);
      }
    }
  }
});
it('never reuses a paraphrase when a source changes or a key is unknown', () => {
  expect(
    unitAlternatives(
      'relation:freedom-causality:0',
      'A completely different statement.',
      ctx(),
    ),
  ).toEqual(['A completely different statement.']);
  expect(unitAlternatives('unreviewed', 'source', ctx())).toEqual(['source']);
});
it('fuses only the selected licensed pair and keeps both material keys', async () => {
  const r = await ask(
    'Если всё имеет причину, свободы нет.',
    undefined,
    'themis',
  );
  const relation = authoredRelations.find((r) => r.id === 'freedom-causality')!;
  const context = {
    ...ctx(),
    relationMaterial: relation.material.slice(0, 2).map((m, index) => ({
      reference: { relationId: relation.id, index },
      text: m.text.ru,
      kind: m.kind,
    })),
  };
  const plan = {
    ...r.plan,
    selectedMaterial: [],
    reasoning: {
      ...r.plan.reasoning!,
      partial: false,
      required: [
        { relationId: relation.id, index: 0 },
        { relationId: relation.id, index: 1 },
      ],
    },
  };
  const keys = ['relation:freedom-causality:0', 'relation:freedom-causality:1'];
  const result = composeResponse(context, plan, {
    text: '',
    usedMaterialKeys: keys,
  });
  expect(result.composition?.fusion).toBe('parallel');
  expect(result.composition?.shape).toBe('fused_pair');
  expect(result.usedMaterialKeys).toEqual(keys);
  expect(result.text).toContain(': ');
  expect(result.text).not.toMatch(/поэтому|поскольку|следовательно/u);
  const units = result.composition!.units;
  expect(result.text).toBe(
    units[0]!.text.replace(/[.]$/u, '') +
      ': ' +
      units[1]!.text[0]!.toLowerCase() +
      units[1]!.text.slice(1),
  );
});
it.each(characterIds)(
  'preserves grounding, limits and nucleus-first realization through a debate: %s',
  async (id) => {
    let memory = initialWorkingMemory();
    const texts = [
      'Если всё имеет причину, свободы нет.',
      'Почему ты не согласна?',
      'Я всё равно считаю, что свободы нет.',
      'Ладно. Возможно наличие причины ещё не означает отсутствие выбора.',
    ];
    for (const text of texts) {
      const r = await ask(text, memory, id);
      expect(await ask(text, memory, id)).toEqual(r);
      const composition = r.response.composition!;
      expect(composition.units[0]?.role).toBe('nucleus');
      expect(r.response.text.startsWith(composition.units[0]!.text)).toBe(true);
      expect(
        composition.units
          .filter((u) => r.response.usedMaterialKeys.includes(u.key))
          .map((u) => u.key)
          .sort(),
      ).toEqual([...r.response.usedMaterialKeys].sort());
      expect(r.response.text.length).toBeLessThanOrEqual(
        r.plan.desiredLength.maxCharacters,
      );
      expect(sentenceCount(r.response.text)).toBeLessThanOrEqual(
        r.plan.desiredLength.maxSentences,
      );
      expect(r.response.text).not.toMatch(
        /Я уточняю границу|Теперь ты формулируешь|Этого недостаточно для более сильного|Хороший вопрос|Давайте разберёмся/u,
      );
      memory = r.nextMemory;
    }
  },
);
it('keeps limitation meanings separate and reveals exhaustion honestly', async () => {
  let r = await ask('Если всё имеет причину, свободы нет.');
  r = await ask('Почему?', r.nextMemory);
  expect(r.response.composition?.limitation).toBe('insufficient_grounds');
  r = await ask('Почему?', r.nextMemory);
  expect(r.response.composition?.limitation).toBe('boundary_only');
  const unit = r.response.composition!.units.find(
    (u) => u.role === 'limitation',
  )!;
  expect(limitations.ru.boundary_only).toContain(unit.text);
  expect(r.response.text).toContain(unit.text);
});
it('makes revision acknowledgment subordinate and non-evaluative', async () => {
  const first = await ask('Если всё имеет причину, свободы нет.');
  const r = await ask('Я передумал.', first.nextMemory);
  expect(r.plan.proposition?.userStance).toBe('revises');
  const ack = r.response.composition!.units.find(
    (u) => u.role === 'stance_acknowledgment',
  )!;
  expect(stanceAcknowledgments.ru.revision).toContain(ack.text);
  expect(r.response.text.indexOf(ack.text)).toBeGreaterThan(0);
  expect(r.response.text).not.toMatch(/правильно|молодец|понял|отлично/iu);
});
it('derives bounded surface fingerprints without a second working or persistent store', async () => {
  const h = surfaceHistory(Array(12).fill('One authored response.'));
  expect(h.responses).toHaveLength(4);
  expect(h.openings).toHaveLength(4);
  expect(JSON.stringify(h.responses)).not.toContain('authored');
  const r = await ask('Ты мыслишь?');
  expect(r.nextMemory).not.toHaveProperty('surfaceHistory');
  expect(r.plan).not.toHaveProperty('composition');
  expect(r.response.composition).toBeDefined();
});
it.each(characterIds)(
  'keeps mandatory self limitations and actual memory status: %s',
  async (id) => {
    let r = await ask('Ты мыслишь?', undefined, id);
    expect(
      r.response.composition!.units.some(
        (u) => u.key === 'self:experience_unestablished',
      ),
    ).toBe(true);
    expect(r.response.composition!.units[0]?.key).not.toBe(
      'self:experience_unestablished',
    );
    r = await ask('Ты меня помнишь?', undefined, id);
    expect(
      r.response.composition!.units.some(
        (u) => u.key === 'self:no_retained_user',
      ),
    ).toBe(true);
    expect(
      r.response.composition!.units.some(
        (u) => u.key === 'self:no_full_transcript',
      ),
    ).toBe(true);
    expect(
      r.response.composition!.units.some((u) => u.key === 'self:retained_user'),
    ).toBe(false);
  },
);
it('never appends a self follow-up question not selected by the plan, or overuses it', async () => {
  const r = await ask('Ты мыслишь?');
  const context = {
    ...ctx('aletheia'),
    surfaceHistory: surfaceHistory(['An earlier question?']),
  };
  const result = composeResponse(context, r.plan, r.response);
  expect(
    result.composition?.units.some((u) => u.role === 'optional_follow_up'),
  ).toBe(false);
  expect(
    result.composition?.units.some(
      (u) => u.key === 'self:experience_unestablished',
    ),
  ).toBe(true);
});
