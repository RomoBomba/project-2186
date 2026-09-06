import { describe, expect, it } from 'vitest';
import { characterVoices } from '../../characters/voices.ts';
import { canonicalKnowledge } from '../../generated/knowledge.ts';
import { characterIds } from '../character/id.ts';
import { characterProfiles } from '../character/profile.ts';
import { createCharacterRuntime } from '../character/runtime.ts';
import { ConversationEngine } from '../conversation/engine.ts';
import { initialResponseHistory, materialKey } from '../conversation/model.ts';
import { readMaterial, sentenceCount } from '../conversation/material.ts';
import { ConceptGraph } from '../knowledge/graph.ts';
import { BasicIntelligenceProvider } from './basic.ts';

const graph = new ConceptGraph(canonicalKnowledge);
const engine = new ConversationEngine(
  canonicalKnowledge,
  new BasicIntelligenceProvider(),
);
const prompts = {
  ru: [
    'память делает человека тем же человеком?',
    'что значит быть собой?',
    'можно ли воспроизвести присутствие оригинала?',
    'истина и утраченные архивы связаны?',
  ],
  en: [
    'does memory make a person the same person?',
    'what does it mean to be oneself?',
    'can the presence of an original be reproduced?',
    'are truth and lost archives related?',
  ],
};

describe('direct authored surface composition', () => {
  it.each(characterIds)(
    '%s preserves only selected semantic material in both locales',
    async (id) => {
      for (const locale of ['ru', 'en'] as const) {
        for (const prompt of prompts[locale]) {
          let history = initialResponseHistory();
          for (let turn = 0; turn < 6; turn++) {
            const args = [
              prompt,
              characterProfiles[id],
              createCharacterRuntime(id, 0).disposition,
              locale,
              history,
            ] as const;
            const result = await engine.respond(...args);
            expect(await engine.respond(...args)).toEqual(result);
            const { text, usedMaterialKeys } = result.response;
            if (!usedMaterialKeys.length) {
              expect(result.plan.selectedMaterial).toEqual([]);
              const voice = characterVoices[id][locale];
              expect([...voice.uncertainty, ...voice.clarification]).toContain(
                text,
              );
              history = result.nextHistory;
              continue;
            }
            // Whitespace composition only: no hidden new facts, generic questions,
            // invented contrasts, therapeutic advice, or strategy-label prefixes.
            const authored = usedMaterialKeys
              .map(
                (key) =>
                  readMaterial(
                    graph,
                    result.plan.selectedMaterial.find(
                      (ref) => materialKey(ref) === key,
                    )!,
                    locale,
                  )!.text,
              )
              .join(' ');
            expect(text.replace(/\s+/gu, ' ')).toBe(
              authored.replace(/\s+/gu, ' '),
            );
            expect(text).not.toMatch(
              /Возьму одно положение|Попробую поставить|Нужно различить|I will (?:take|place|compare)|We need to distinguish/u,
            );
            expect(text.length).toBeLessThanOrEqual(
              result.plan.desiredLength.maxCharacters,
            );
            expect(sentenceCount(text)).toBeLessThanOrEqual(
              result.plan.desiredLength.maxSentences,
            );
            if (locale === 'en') expect(text).not.toMatch(/[а-яё]/iu);
            history = result.nextHistory;
          }
        }
      }
    },
  );

  it('connect juxtaposes whole related thoughts, while contrast states the tension directly', async () => {
    for (const id of ['aura', 'themis'] as const) {
      const result = await engine.respond(
        prompts.ru[0]!,
        characterProfiles[id],
        createCharacterRuntime(id, 0).disposition,
        'ru',
        initialResponseHistory(),
      );
      expect(result.plan.strategy).toBe(id === 'aura' ? 'connect' : 'contrast');
      expect(result.response.text).not.toContain(':');
      if (id === 'aura') expect(result.response.text).toContain('\n');
      else expect(sentenceCount(result.response.text)).toBe(1);
    }
  });

  it('expresses a challenge as observation and authored tension, without analysis announcements', async () => {
    const result = await engine.respond(
      'я считаю, что память неизменна',
      characterProfiles.aletheia,
      {
        ...createCharacterRuntime('aletheia', 0).disposition,
        challengeBias: 1,
        questionBias: 0,
        warmth: 0,
      },
      'ru',
      initialResponseHistory(),
    );
    expect(result.plan.strategy).toBe('gentle_challenge');
    expect(result.response.usedMaterialKeys).toHaveLength(2);
    expect(result.response.text).not.toContain(':');
    expect(result.response.text).not.toMatch(/Проверю|предпосылку/u);
  });

  it('leaves questions to policy: Aletheia also makes statements, without mandatory follow-ups', async () => {
    const counts: number[] = [];
    for (const id of characterIds) {
      let history = initialResponseHistory();
      let questions = 0;
      for (let turn = 0; turn < 12; turn++) {
        const result = await engine.respond(
          prompts.ru[0]!,
          characterProfiles[id],
          createCharacterRuntime(id, 0).disposition,
          'ru',
          history,
        );
        if (result.response.text.endsWith('?')) questions++;
        history = result.nextHistory;
      }
      counts.push(questions);
    }
    expect(counts[0]).toBeGreaterThan(0);
    expect(counts[0]).toBeLessThan(12);
    expect(counts[1]).toBeLessThanOrEqual(counts[0]!);
    expect(counts[2]).toBeLessThanOrEqual(counts[0]!);
  });
});
