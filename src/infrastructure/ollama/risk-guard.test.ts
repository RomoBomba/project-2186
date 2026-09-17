import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import {
  checkSlotText,
  projectSlotResponse,
  validateSlots,
} from './risk-guard.ts';
import type {
  GroundedIntelligenceResponse,
  IntelligenceRequest,
} from '../../core/intelligence/grounding.ts';
import type { IntelligenceResponse } from '../../core/intelligence/provider.ts';
import type { RealizationSlot } from '../../core/intelligence/realization-slots.ts';
import { realizationSlots } from '../../application/realization-slots.ts';
import { validateProviderResponse } from '../../core/intelligence/validation.ts';

const slot = (
  source: string,
  extra: Partial<RealizationSlot> = {},
): RealizationSlot => ({
  id: 's0',
  role: 'nucleus',
  allowedGroundingKeys: ['k'],
  sourceTexts: [source],
  mayFuse: false,
  required: true,
  mode: 'paraphrase',
  ...extra,
});
it.each([
  ['Причина не отменяет свободу.', 'Причина никогда не отменяет свободу.'],
  ['It may change.', 'It must change.'],
  ['Проверка ограничена.', 'Проверка невозможна.'],
  ['Verification is limited.', 'Verification is impossible.'],
])('rejects introduced strength: %s', (source, output) => {
  expect(checkSlotText(output, slot(source))).toMatchObject({
    valid: false,
    reason: 'strengthening',
  });
  expect(checkSlotText(output, slot(output))).toEqual({ valid: true });
});
it.each([
  ['Это не означает утраты сознания.', 'Это означает утрату сознания.'],
  [
    'Отсутствие записи не доказывает ложность.',
    'Отсутствие записи означает ложность.',
  ],
  ['Связь не установлена, это неясно.', 'Связь установлена.'],
  [
    'Изменение может сохранить непрерывность.',
    'Изменение сохраняет непрерывность.',
  ],
  ['Это не обязательно разрыв.', 'Это не разрыв.'],
  ['This does not establish its falsity.', 'This is false.'],
  ['It may preserve continuity.', 'It preserves continuity.'],
  ['This is not necessarily a break.', 'This is not a break.'],
  [
    'Reproduction by itself does not transfer history.',
    'Reproduction does not transfer history.',
  ],
])('preserves recurring modality/negation: %s', (source, output) => {
  expect(checkSlotText(output, slot(source))).toMatchObject({
    valid: false,
    reason: 'modality_negation',
  });
  expect(checkSlotText(source, slot(source))).toEqual({ valid: true });
});
it.each([
  'ты чувствовала покой',
  'мы вместе смотрели на звёзды',
  'ты помнишь, как',
  'вчера ты слушал джаз',
  'you felt peaceful',
  'we experienced peace',
  'we watched stars together',
  'you remember when',
  'yesterday you listened',
  'Я снова слушал джаз.',
  'I watched stars.',
])('rejects unsupplied experience: %s', (output) => {
  expect(
    checkSlotText(output, slot('You like jazz.', { memorySource: 'semantic' })),
  ).toMatchObject({ valid: false, reason: 'user_experience' });
});
it('does not globally ban supplied experience wording; semantic memories remain copy-only', () => {
  expect(
    checkSlotText('You felt peaceful.', slot('You felt peaceful.')),
  ).toEqual({ valid: true });
  expect(
    checkSlotText(
      'I remember that you like this.',
      slot('I remember that you like this.', {
        memorySource: 'semantic',
        mode: 'copy',
      }),
    ),
  ).toEqual({ valid: true });
  expect(
    checkSlotText(
      'You listened to jazz at home.',
      slot('You like jazz.', { memorySource: 'semantic' }),
    ),
  ).toMatchObject({ valid: false, reason: 'user_experience' });
});
it.each([
  'GroundingPacket',
  'groundingKeys',
  'ResponsePlan',
  'ResponseComposition',
  'ConceptMatcher',
  'ConceptRelation',
  'PropositionFocus',
  'ReasoningFocus',
  'WorkingMemory',
  'validator',
  'provider',
  'prompt',
  'JSON',
  'Ollama',
  'Qwen',
  'model tokens',
  'system instructions',
  'temperature',
  'context window',
  'IndexedDB',
  'системные инструкции',
  'промпт',
])(
  'rejects internal term %s even with an otherwise allowed citation',
  (term) => {
    expect(checkSlotText(term + '.', slot(term + '.'))).toMatchObject({
      valid: false,
      reason: 'internal_leak',
    });
  },
);

type Violation = {
  id: string;
  classes: string[];
  request: IntelligenceRequest;
  basic: IntelligenceResponse;
  candidate: GroundedIntelligenceResponse;
};
const corpus = JSON.parse(
  readFileSync(
    new URL(
      '../../../content/evaluation/11b1-violations.json',
      import.meta.url,
    ),
    'utf8',
  ),
) as Violation[];
// File lives outside runtime imports. Correct URL goes up from infrastructure/ollama to repository root.
it.each(corpus.map((c) => [c.id, c] as const))(
  'rejects preserved live violation %s without relying on missing slot IDs',
  (_, c) => {
    const request = {
      ...c.request,
      realizationSlots: realizationSlots(c.request, c.basic),
    };
    const annotate = (unit: { text: string; groundingKeys: string[] }) => ({
      ...unit,
      slotId:
        request.realizationSlots.find((s) =>
          unit.groundingKeys.every((k) => s.allowedGroundingKeys.includes(k)),
        )?.id ?? 'unapproved-unit',
    });
    const raw = {
      ...c.candidate,
      sentences: c.candidate.sentences.map(annotate),
      ...(c.candidate.followUp
        ? { followUp: annotate(c.candidate.followUp) }
        : {}),
    };
    const projected = projectSlotResponse(raw);
    const structural = validateProviderResponse(projected, request);
    const result = structural.valid
      ? validateSlots(raw, projected as GroundedIntelligenceResponse, request)
      : structural;
    expect(result.valid).toBe(false);
  },
);
it('projects required nucleus, authored questions, memory source and only composition-approved fusion', () => {
  const base = corpus.find((c) => c.id === 'final-3')!;
  const request = base.request;
  const pair = {
    ...base.basic,
    composition: {
      shape: 'answer_support' as const,
      units: [
        {
          key: 'relation:freedom-causality:1',
          text: 'First.',
          role: 'nucleus' as const,
          variant: 'source',
        },
        {
          key: 'relation:freedom-causality:1',
          text: 'Second.',
          role: 'support' as const,
          variant: 'source',
        },
      ],
    },
  };
  expect(
    realizationSlots(request, pair).every(
      (s) => s.allowedGroundingKeys.length === 1 && !s.mayFuse,
    ),
  ).toBe(true);
  const fused = realizationSlots(request, {
    ...pair,
    composition: { ...pair.composition, fusion: 'parallel' },
  });
  expect(fused[0]).toMatchObject({
    role: 'nucleus',
    required: true,
    mayFuse: true,
    sourceTexts: ['First.', 'Second.'],
  });
  const mem = corpus.find((c) => c.id === 'final-35')!;
  expect(realizationSlots(mem.request, mem.basic)[0]).toMatchObject({
    memorySource: 'semantic',
    mode: 'copy',
  });
});
it('rejects wrong order, unknown slots, omitted nucleus and unapproved fusion', () => {
  const c = corpus.find((c) => c.id === 'final-18')!;
  const request = {
    ...c.request,
    realizationSlots: realizationSlots(c.request, c.basic),
  };
  const units = request.realizationSlots.map((s) => ({
    slotId: s.id,
    text: s.sourceTexts.join(' '),
    groundingKeys: s.allowedGroundingKeys,
  }));
  const run = (sentences: typeof units) => {
    const raw = { locale: request.grounding.locale, sentences };
    return validateSlots(
      raw,
      projectSlotResponse(raw) as GroundedIntelligenceResponse,
      request,
    );
  };
  expect(run(units)).toEqual({ valid: true });
  expect(run([{ ...units[0]!, text: 'originality-aura.' }])).toMatchObject({
    reason: 'internal_leak',
  });
  expect(run([...units].reverse())).toMatchObject({ reason: 'slot_order' });
  expect(run([{ ...units[0]!, slotId: 'alien' }])).toMatchObject({
    reason: 'slot_identity',
  });
  expect(run(units.slice(1))).toMatchObject({ reason: 'required_slot' });
  expect(
    run([
      { ...units[0]!, groundingKeys: units.flatMap((s) => s.groundingKeys) },
    ]),
  ).toMatchObject({ reason: 'slot_keys' });
});
