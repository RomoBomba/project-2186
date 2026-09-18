import { createIntelligenceProvider } from '../../application/provider-selection.ts';
import { expect, it, vi } from 'vitest';
import { ConversationEngine } from '../conversation/engine.ts';
import { BasicIntelligenceProvider } from '../intelligence/basic.ts';
import { canonicalKnowledge } from '../../generated/knowledge.ts';
import { characterProfiles } from '../character/profile.ts';
import { createCharacterRuntime } from '../character/runtime.ts';
import { initialWorkingMemory, type WorkingMemory } from '../memory/working.ts';
import { extractMemoryCandidates } from '../memory/long-term.ts';
import { presenceIntent } from './intent.ts';
import { discourseLens } from './discourse.ts';
import { advanceConversationMove, rejectedTopics } from './move-focus.ts';
import { conversationScope } from './plan.ts';
import {
  runPresenceContinuity,
  continuityOutcome,
} from '../../infrastructure/evaluation/presence-continuity.ts';
import type { Locale } from '../language/locale.ts';
const engine = new ConversationEngine(
  canonicalKnowledge,
  new BasicIntelligenceProvider(),
);
const profile = characterProfiles.themis,
  d = createCharacterRuntime('themis', 0).disposition;
const ask = (
  text: string,
  memory = initialWorkingMemory(),
  locale: Locale = 'ru',
) =>
  engine.respond(text, profile, d, locale, memory, undefined, {
    startedAt: 0,
    now: 420000,
  });
it('completes the actual 17-turn RU/EN dialogue for all characters, including referents, grounding and controls', async () => {
  const result = await runPresenceContinuity();
  expect(result.rows).toHaveLength(102);
  for (const row of result.rows)
    expect(
      continuityOutcome(row),
      `${row.character}/${row.locale}/${row.turn}`,
    ).toBe(true);
  for (const [key, value] of Object.entries(result.metrics))
    expect(value.rate, key).toBe(key.endsWith('Rate') ? 0 : 1);
  expect(result.controls).toHaveLength(30);
  expect(result.controls.every((c) => !c.failed)).toBe(true);
});
const reactions = [
  ['Почему именно об этом?', 'ru', 'explain_topic_choice'],
  ['Почему именно это?', 'ru', 'explain_topic_choice'],
  ['Почему именно её?', 'ru', 'explain_topic_choice'],
  ['Почему эту тему?', 'ru', 'explain_topic_choice'],
  ['Why that?', 'en', 'explain_topic_choice'],
  ['Why this topic?', 'en', 'explain_topic_choice'],
  ['Why did you choose that?', 'en', 'explain_topic_choice'],
  ['А если я не хочу?', 'ru', 'reject_topic'],
  ['Не хочу об этом.', 'ru', 'reject_topic'],
  ['Давай не это.', 'ru', 'reject_topic'],
  ['Неинтересно.', 'ru', 'reject_topic'],
  ["Let's not talk about that.", 'en', 'reject_topic'],
  ["I don't want that topic.", 'en', 'reject_topic'],
  ['Тогда предложи что-нибудь другое.', 'ru', 'offer_topic'],
  ['Давай другую тему.', 'ru', 'offer_topic'],
  ['Что-нибудь ещё.', 'ru', 'offer_topic'],
  ['Выбери другое.', 'ru', 'offer_topic'],
  ['Тогда предложи другую тему.', 'ru', 'offer_topic'],
  ['Something else.', 'en', 'offer_topic'],
  ['Pick another topic.', 'en', 'offer_topic'],
] as const;
it.each(reactions)(
  'resolves %s against an actual offer',
  async (text, locale, move) => {
    const first = await ask(
      locale === 'ru' ? 'Предложи тему.' : 'Suggest a topic.',
      undefined,
      locale,
    );
    const original = structuredClone(first.nextMemory);
    const r = await ask(text, first.nextMemory, locale);
    expect(r.plan.presence?.move).toBe(move);
    expect(r.plan.presence?.referenceTurn).toBe(1);
    expect(first.nextMemory).toEqual(original);
    if (move === 'offer_topic')
      expect(r.plan.presence?.selectedTopicIds).not.toContain(
        first.plan.presence!.selectedTopicIds[0],
      );
    if (move === 'reject_topic')
      expect(extractMemoryCandidates(text, locale)).toEqual([]);
  },
);
it.each([
  [
    'Какая столица у Франции?',
    'Почему ты этого не знаешь?',
    'ru',
    'temporal_distance',
  ],
  ['Как звали основателя реконструкции?', 'Почему?', 'ru', 'archive_gap'],
  [
    'Какая сегодня погода?',
    'Почему ты не можешь ответить?',
    'ru',
    'current_external_fact',
  ],
  [
    'What is the capital of France?',
    "Why don't you know?",
    'en',
    'temporal_distance',
  ],
  [
    'What is the weather today?',
    "Why can't you answer?",
    'en',
    'current_external_fact',
  ],
  ['Какая сегодня погода?', 'Ну почему?', 'ru', 'current_external_fact'],
] as const)(
  'explains the boundary of %s',
  async (first, next, locale, kind) => {
    const r = await ask(
      next,
      (await ask(first, undefined, locale)).nextMemory,
      locale,
    );
    expect(r.plan.presence).toMatchObject({
      move: 'explain_boundary',
      boundary: { kind },
      referenceTurn: 1,
    });
    expect(r.response.text).not.toMatch(/Париж|Paris|Qwen|Ollama/u);
  },
);
it.each([
  'Почему именно это?',
  'Неинтересно.',
  'Что-нибудь ещё.',
  'Ты чувствуешь, что прошло столько времени?',
])('does not invent a move referent for %s', async (text) => {
  const r = await ask(text);
  expect(r.plan.presence?.referenceTurn).toBeUndefined();
  expect(r.plan.presence?.referencedDurationMinutes).toBeUndefined();
  expect([
    'explain_topic_choice',
    'reject_topic',
    'explain_boundary',
  ]).not.toContain(r.plan.presence?.move);
});
it.each([
  'Что тебе самой здесь интересно?',
  'А что выбрала бы ты?',
  'О чем тебе хочется поговорить?',
  'What would you choose?',
])('recognizes designed interest: %s', async (text) => {
  const r = await ask(text, undefined, text.startsWith('What') ? 'en' : 'ru');
  expect(r.plan.presence?.move).toBe('offer_topic');
  expect(r.plan.presence?.choiceGround).toBe('profile_interest');
});
it.each([
  'Расскажи о времени.',
  'Расскажи мне что-нибудь о времени.',
  'Ладно, расскажи мне что-нибудь о времени.',
  'Ну, поговорим о времени.',
  'Хорошо. Что можешь сказать про время?',
])('keeps the time overview through %s', async (text) => {
  const r = await ask(text);
  expect(r.plan.presence?.move).toBe('topic_overview');
  expect(r.plan.primaryConceptId).toBe('philosophy.time');
});
it('keeps discourse separately and recognizes explicit new definitions without altering the raw utterance', async () => {
  const text = 'Хорошо, а что такое время?';
  expect(discourseLens(text)).toEqual({
    body: 'что такое время',
    markers: ['хорошо', 'а'],
  });
  const r = await ask(text);
  expect(r.plan.primaryConceptId).toBe('philosophy.time');
  expect(r.plan.reasoning?.frame).toBe('define');
  expect(r.nextMemory.recentTurns[0]?.text).toBe(text);
  expect(presenceIntent('Он сказал: расскажи о времени.')).toBeUndefined();
});
it('retains the reasoning path for prefixed why without creating a conversation-move referent', async () => {
  const first = await ask(
    'Если каждое решение имеет причину, свободен ли человек?',
  );
  const r = await ask('Ну почему?', first.nextMemory);
  expect(r.plan.reasoning?.relationId).toBe('freedom-causality');
  expect(r.plan.presence).toBeUndefined();
});
it('expires the move after three unused exchanges, clears it on explicit content and resets per session', async () => {
  const offered = await ask('Предложи тему.');
  const focus = offered.nextMemory.conversationMoveFocus!;
  const neutral = { ...offered.plan, selectedMaterial: [] };
  delete neutral.presence;
  delete neutral.primaryConceptId;
  expect(
    advanceConversationMove(focus, neutral, focus.lastReferencedTurn + 2, 'ru')
      ?.primaryTopicId,
  ).toBe(focus.primaryTopicId);
  expect(
    advanceConversationMove(focus, neutral, focus.lastReferencedTurn + 3, 'ru'),
  ).toBeUndefined();
  const changed = await ask('Что такое сознание?', offered.nextMemory);
  expect(changed.nextMemory.conversationMoveFocus).toBeUndefined();
  expect(initialWorkingMemory().conversationMoveFocus).toBeUndefined();
  const fresh = await ask('Почему именно это?');
  expect(fresh.plan.presence?.referenceTurn).toBeUndefined();
});
it('bounds rejection to four topics/six exchanges without modifying character identity', async () => {
  const original = JSON.stringify(profile);
  let memory: WorkingMemory = (await ask('Предложи тему.')).nextMemory;
  const rejected = memory.conversationMoveFocus!.primaryTopicId!;
  memory = (await ask('Неинтересно.', memory)).nextMemory;
  expect(rejectedTopics(memory)).toContain(rejected);
  expect(
    conversationScope(canonicalKnowledge, profile, 'ru', memory).preferred,
  ).not.toContain(rejected);
  expect(JSON.parse(JSON.stringify(memory))).toEqual(memory);
  for (let n = 0; n < 6; n++)
    memory = (await ask('Сколько длится наш разговор?', memory)).nextMemory;
  expect(rejectedTopics(memory)).not.toContain(rejected);
  expect(
    conversationScope(canonicalKnowledge, profile, 'ru', memory).discussable,
  ).toContain(rejected);
  memory = (await ask('Предложи тему.', memory)).nextMemory;
  for (let n = 0; n < 8; n++) {
    memory = (await ask('Выбери другое.', memory)).nextMemory;
    expect(
      memory.conversationMoveFocus!.rejectedTopics.length,
    ).toBeLessThanOrEqual(4);
  }
  expect(JSON.stringify(profile)).toBe(original);
});
it('first presence HTTP request supplies the model without a CLI pre-load and cannot alter move ownership', async () => {
  const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => {
    const body = JSON.parse(init!.body as string) as {
      model: string;
      keep_alive: string;
      messages: { content: string }[];
    };
    expect(body.model).toBe('qwen3:4b-instruct');
    expect(body.keep_alive).toBe('2m');
    const request = JSON.parse(body.messages[1]!.content) as {
      alternatives: unknown[];
    };
    return new Response(
      JSON.stringify({
        done: true,
        message: {
          role: 'assistant',
          content: JSON.stringify(request.alternatives.at(-1)),
        },
      }),
      { status: 200 },
    );
  });
  const local = new ConversationEngine(
    canonicalKnowledge,
    createIntelligenceProvider('basic', { presence: 'local', fetcher }),
  );
  let a = initialWorkingMemory(),
    b = initialWorkingMemory();
  for (const input of [
    'Предложи тему.',
    'Почему именно её?',
    'Неинтересно.',
    'Тогда предложи другое.',
  ]) {
    const deterministic = await ask(input, a);
    const optional = await local.respond(
      input,
      profile,
      d,
      'ru',
      b,
      undefined,
      { startedAt: 0, now: 420000 },
    );
    expect(optional.plan).toEqual(deterministic.plan);
    expect(optional.nextMemory.conversationMoveFocus).toEqual(
      deterministic.nextMemory.conversationMoveFocus,
    );
    expect(optional.response.presenceInspection?.provider).toBe('local');
    a = deterministic.nextMemory;
    b = optional.nextMemory;
  }
  expect(fetcher).toHaveBeenCalledTimes(4);
});
