import { expect, it, describe } from 'vitest';
import { canonicalKnowledge } from '../../generated/knowledge.ts';
import { characterProfiles } from '../character/profile.ts';
import { createCharacterRuntime } from '../character/runtime.ts';
import { characterIds } from '../character/id.ts';
import { ConceptGraph } from '../knowledge/graph.ts';
import { ConceptMatcher } from '../knowledge/matcher.ts';
import { perceive } from './perception.ts';
import { selectAttention } from './attention.ts';
import { initialResponseHistory, materialKey } from './model.ts';
import { planResponse } from './policy.ts';
import { readMaterial, sentenceCount } from './material.ts';
import { BasicIntelligenceProvider } from '../intelligence/basic.ts';
import { ConversationEngine } from './engine.ts';
import { characterVoices } from '../../characters/voices.ts';
const graph = new ConceptGraph(canonicalKnowledge);
const matcher = new ConceptMatcher(canonicalKnowledge);
const engine = new ConversationEngine(
  canonicalKnowledge,
  new BasicIntelligenceProvider(),
);
const initial = createCharacterRuntime('aletheia', 0);
const history = initialResponseHistory();

describe('conservative perception', () => {
  it.each([
    ['ru', 'Привет, кто ты?', 'привет', 'кто ты?'],
    ['en', 'Hello, who are you?', 'hello', 'who are you?'],
  ] as const)(
    '%s identity question takes precedence over a greeting',
    async (locale, combined, greeting, identity) => {
      expect(perceive(combined, locale)).toMatchObject({
        act: 'system_identity_question',
        isQuestion: true,
        evidence: [greeting, identity.slice(0, -1)],
      });
      for (const id of characterIds) {
        for (const [text, strategy] of [
          [combined, 'identify_self'],
          [greeting, 'greet'],
          [identity, 'identify_self'],
        ] as const) {
          const result = await engine.respond(
            text,
            characterProfiles[id],
            createCharacterRuntime(id, 0).disposition,
            locale,
            history,
          );
          expect(result.plan.strategy).toBe(strategy);
          const voice = characterVoices[id][locale];
          expect(result.response.text).toBe(
            strategy === 'greet' ? voice.greeting[0] : voice.identity[0],
          );
        }
      }
    },
  );
  it.each([
    ['ru', 'привет', 'greeting'],
    ['en', 'hello', 'greeting'],
    ['ru', 'кто ты?', 'system_identity_question'],
    ['en', 'who are you?', 'system_identity_question'],
    ['ru', 'объясни память', 'explanation_request'],
    ['en', 'what does memory mean', 'explanation_request'],
    ['ru', 'можно ли это проверить?', 'question'],
    ['en', 'why?', 'question'],
    ['ru', 'я не согласна', 'disagreement'],
    ['en', 'I disagree', 'disagreement'],
    ['ru', 'я не уверен, что память неизменна', 'uncertainty'],
    ['en', "I'm not sure", 'uncertainty'],
    ['ru', 'мне нравится музыка', 'personal_disclosure'],
    ['en', 'I like music', 'personal_disclosure'],
    ['ru', 'я считаю это верным', 'claim_or_opinion'],
    ['en', 'I believe this', 'claim_or_opinion'],
    ['ru', 'я сегодня купил хлеб и пошел домой', 'other'],
    ['en', 'I bought some bread today', 'other'],
    ['en', 'this is history', 'other'],
  ] as const)('%s: %s → %s', (locale, text, act) => {
    const result = perceive(text, locale);
    expect(result.act).toBe(act);
    expect(Object.keys(result).sort()).toEqual([
      'act',
      'evidence',
      'isQuestion',
      'matches',
    ]);
  });
  it('keeps surface evidence and concept evidence separate', () => {
    const matches = matcher.match('память', 'ru');
    expect(perceive('привет', 'ru', matches)).toMatchObject({
      act: 'greeting',
      matches,
    });
    expect(matcher.match('я сегодня купил хлеб и пошел домой', 'ru')).toEqual(
      [],
    );
  });
});

describe('concept attention', () => {
  it('uses affinity for equal relevance and never rewrites matching scores', () => {
    const matches = matcher.match('истина и утраченные архивы', 'ru');
    const before = JSON.stringify(matches);
    expect(selectAttention(matches, graph, 'aura', 'ru', history).primary).toBe(
      'world.archives',
    );
    expect(
      selectAttention(matches, graph, 'aletheia', 'ru', history).primary,
    ).toBe('philosophy.truth');
    expect(JSON.stringify(matches)).toBe(before);
  });
  it('keeps an exact strong match over maximum lower-class affinity', () => {
    const cards = canonicalKnowledge.map((card) => ({
      ...card,
      characterAffinity: {
        aletheia: card.id === 'identity.memory' ? 0 : 1,
        aura: 0.5,
        themis: 0.5,
      },
    }));
    const candidates = matcher.match('memory truth', 'en').map((match) => ({
      ...match,
      score: match.conceptId === 'identity.memory' ? 100 : 90,
    }));
    expect(
      selectAttention(
        candidates,
        new ConceptGraph(cards),
        'aletheia',
        'en',
        history,
      ).primary,
    ).toBe('identity.memory');
  });
  it('takes at most one localized direct association, deterministically', () => {
    const matches = matcher.match('memory', 'en');
    const result = selectAttention(matches, graph, 'aura', 'en', history);
    expect(result.primary).toBe('identity.memory');
    expect(graph.related(result.primary!).map((card) => card.id)).toContain(
      result.associated,
    );
    expect(typeof result.associated).toBe('string');
    expect(selectAttention(matches, graph, 'aura', 'en', history)).toEqual(
      result,
    );
  });
});

describe('response policy and plan', () => {
  it.each([
    ['hello', 'greet'],
    ['who are you?', 'identify_self'],
    ['What is the weather on Mars?', 'admit_uncertainty'],
    ['I bought some bread today', 'clarify'],
  ] as const)('%s selects %s', async (text, strategy) => {
    const result = await engine.respond(
      text,
      characterProfiles.aletheia,
      initial.disposition,
      'en',
      history,
    );
    expect(result.plan.strategy).toBe(strategy);
    expect(result.plan.selectedMaterial).toEqual([]);
  });
  it('uses disposition instead of character-id strategy branching', async () => {
    const results = await Promise.all(
      characterIds.map((id) =>
        engine.respond(
          'память делает человека тем же человеком?',
          characterProfiles[id],
          createCharacterRuntime(id, 0).disposition,
          'ru',
          history,
        ),
      ),
    );
    expect(results.map((result) => result.plan.strategy)).toEqual([
      'ask_follow_up',
      'connect',
      'contrast',
    ]);
    expect(new Set(results.map((result) => result.response.text)).size).toBe(3);
    const matches = matcher.match('память', 'ru');
    const attention = selectAttention(
      matches,
      graph,
      'aletheia',
      'ru',
      history,
    );
    const perception = perceive(
      'я считаю, что память неизменна',
      'ru',
      matches,
    );
    const challenge = planResponse(
      perception,
      attention,
      { ...initial.disposition, challengeBias: 1, questionBias: 0, warmth: 0 },
      graph,
      'ru',
      history,
    );
    expect(challenge.plan.strategy).toBe('gentle_challenge');
  });
  it('can connect multiple explicitly related concepts and penalizes recent strategies', () => {
    const matches = matcher.match('memory and personal continuity', 'en');
    const attention = selectAttention(matches, graph, 'aura', 'en', history);
    const p = perceive('memory and personal continuity', 'en', matches);
    const d = createCharacterRuntime('aura', 0).disposition;
    const first = planResponse(p, attention, d, graph, 'en', history);
    expect(first.plan.strategy).toBe('connect');
    const next = planResponse(p, attention, d, graph, 'en', {
      ...history,
      strategies: ['connect'],
    });
    expect(
      next.candidates.find((c) => c.strategy === 'connect')!.weight,
    ).toBeLessThan(first.candidates[0]!.weight);
    expect(next.plan.strategy).not.toBe('connect');
  });
  it('serializes material identities, without transcript, timing or model prompts', async () => {
    const result = await engine.respond(
      'память?',
      characterProfiles.aletheia,
      initial.disposition,
      'ru',
      history,
    );
    const plan = result.plan;
    expect(JSON.parse(JSON.stringify(plan))).toEqual(plan);
    expect(JSON.stringify(plan)).not.toMatch(
      /prompt|milliseconds|memoryReference|transcript/,
    );
    for (const ref of plan.selectedMaterial)
      expect(readMaterial(graph, ref, 'ru')).toBeDefined();
    expect(plan.selectedMaterial.length).toBeLessThanOrEqual(2);
    expect(plan.desiredLength.maxCharacters).toBeLessThanOrEqual(480);
    expect(plan.desiredLength.maxSentences).toBeLessThanOrEqual(3);
  });
});

describe('Basic Intelligence realization', () => {
  it.each(characterIds)(
    'realizes %s RU and EN with no cross-locale fallback',
    async (id) => {
      const d = createCharacterRuntime(id, 0).disposition;
      for (const locale of ['ru', 'en'] as const) {
        const result = await engine.respond(
          locale === 'ru' ? 'память?' : 'memory?',
          characterProfiles[id],
          d,
          locale,
          history,
        );
        expect(result.response.text.length).toBeLessThanOrEqual(
          result.plan.desiredLength.maxCharacters,
        );
        expect(sentenceCount(result.response.text)).toBeLessThanOrEqual(
          result.plan.desiredLength.maxSentences,
        );
        for (const key of result.response.usedMaterialKeys) {
          const ref = result.plan.selectedMaterial.find(
            (ref) => materialKey(ref) === key,
          )!;
          expect(result.response.text).toContain(
            readMaterial(graph, ref, locale)!.text,
          );
        }
        if (locale === 'en')
          expect(result.response.text).not.toMatch(/[а-яё]/iu);
      }
      const ruOnly = canonicalKnowledge.map((card) => ({
        ...card,
        content: { ru: card.content.ru! },
      }));
      const withoutEnglish = await new ConversationEngine(
        ruOnly,
        new BasicIntelligenceProvider(),
      ).respond('memory?', characterProfiles[id], d, 'en', history);
      expect(withoutEnglish.plan.strategy).toBe('admit_uncertainty');
      expect(withoutEnglish.response.text).not.toMatch(/[а-яё]/iu);
    },
  );
  it('uses selected plan references only; omits oversized material without slicing sentences', async () => {
    const result = await engine.respond(
      'memory?',
      characterProfiles.aletheia,
      initial.disposition,
      'en',
      history,
    );
    const ref = result.plan.selectedMaterial[0]!;
    const context = {
      profile: characterProfiles.aletheia,
      disposition: initial.disposition,
      locale: 'en' as const,
      turnIndex: 0,
      material: [
        {
          reference: ref,
          title: 'Memory',
          text: 'An entire authored sentence.',
        },
      ],
    };
    const provider = new BasicIntelligenceProvider();
    const response = await provider.respond(context, result.plan);
    expect(response.text).toContain('An entire authored sentence.');
    expect(response.usedMaterialKeys).toEqual([materialKey(ref)]);
    const oversized = await provider.respond(
      {
        ...context,
        material: [
          { ...context.material[0]!, text: 'word '.repeat(500) + '.' },
        ],
      },
      result.plan,
    );
    expect(oversized.usedMaterialKeys).toEqual([]);
    expect(oversized.text).toBe(characterVoices.aletheia.en.uncertainty[0]);
  });
  it('keeps voice resource parity and artificial identity without assistant clichés', () => {
    for (const voice of Object.values(characterVoices)) {
      expect(Object.keys(voice.ru).sort()).toEqual(
        Object.keys(voice.en).sort(),
      );
      expect(voice.ru.identity.join(' ')).toContain('искусственный интеллект');
      expect(voice.en.identity.join(' ')).toContain('artificial intelligence');
      expect(JSON.stringify(voice)).not.toMatch(
        /AI language model|training data|терап|диагноз/iu,
      );
    }
  });
  it('rotates strategies/material in a bounded session without inventing memory', async () => {
    let recent = initialResponseHistory();
    const strategies = new Set<string>(),
      used = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const result = await engine.respond(
        'память?',
        characterProfiles.aletheia,
        initial.disposition,
        'ru',
        recent,
      );
      expect(
        await engine.respond(
          'память?',
          characterProfiles.aletheia,
          initial.disposition,
          'ru',
          recent,
        ),
      ).toEqual(result);
      strategies.add(result.plan.strategy);
      for (const key of result.response.usedMaterialKeys) used.add(key);
      recent = result.nextHistory;
      expect(recent.strategies.length).toBeLessThanOrEqual(6);
      expect(recent.materialKeys.length).toBeLessThanOrEqual(8);
    }
    expect(strategies.size).toBeGreaterThan(2);
    expect(used.size).toBeGreaterThan(3);
    expect(Object.keys(recent).sort()).toEqual([
      'materialKeys',
      'strategies',
      'turn',
    ]);
  });
  it('does not manufacture weather or infer identity from first-person language', async () => {
    const weather = await engine.respond(
      'какая погода на Марсе?',
      characterProfiles.aletheia,
      initial.disposition,
      'ru',
      history,
    );
    expect(weather.response.text).toBe(
      characterVoices.aletheia.ru.uncertainty[0],
    );
    const ordinary = await engine.respond(
      'я сегодня купил хлеб и пошел домой',
      characterProfiles.aletheia,
      initial.disposition,
      'ru',
      history,
    );
    expect(ordinary.perception.matches).toEqual([]);
    expect(ordinary.plan.selectedMaterial).toEqual([]);
    expect(ordinary.response.text).toBe(
      characterVoices.aletheia.ru.clarification[0],
    );
  });
});
