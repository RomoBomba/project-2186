import type {
  GroundedIntelligenceResponse,
  IntelligenceRequest,
} from '../../core/intelligence/grounding.ts';
import type { RealizationSlot } from '../../core/intelligence/realization-slots.ts';

export type RiskReason =
  | 'slot_identity'
  | 'slot_order'
  | 'slot_keys'
  | 'required_slot'
  | 'strengthening'
  | 'modality_negation'
  | 'user_experience'
  | 'internal_leak'
  | 'copy_required'
  | 'question_not_authored';
export type RiskValidation =
  { valid: true } | { valid: false; reason: RiskReason; slotId?: string };
const norm = (s: string) =>
  s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/ё/gu, 'е')
    .replace(/\s+/gu, ' ')
    .trim();
const words = (s: string) => new Set(norm(s).match(/[\p{L}\p{N}]+/gu) ?? []);
const strength = [
  'всегда',
  'никогда',
  'обязательно',
  'полностью',
  'исключительно',
  'единственно',
  'точно',
  'несомненно',
  'доказано',
  'доказывает',
  'гарантирует',
  'неизбежно',
  'невозможно',
  'невозможна',
  'невозможен',
  'невозможны',
  'always',
  'never',
  'must',
  'necessarily',
  'completely',
  'exclusively',
  'only',
  'definitely',
  'certainly',
  'proves',
  'guarantees',
  'inevitable',
  'impossible',
];
// Deliberately finite families, not stemming, sentiment or entailment inference.
const qualifiers = [
  /(?:^|\s)(?:не|нет|нельзя)(?:\s|$)|\b(?:not|no|cannot|can't|doesn't|isn't|aren't)\b/u,
  /не (?:означает|доказывает|устанавливает)|does not (?:mean|establish|prove)/u,
  /не обязательно|not necessarily/u,
  /не установлено|неясно|пока не|пока нельзя|нет (?:достаточных|надежных)|недостаточно оснований|недостаточно.*основан|is not established|unclear|not yet|insufficient grounds|no reliable grounds|cannot.*conclude|cannot.*establish/u,
  /(?:^|\s)может(?:\s|$)|\bmay\b/u,
  /сам[ао] по себе|by itself|on its own/u,
];
const internals =
  /grounding\s*keys?|groundingpacket|responseplan|responsecomposition|conceptmatcher|conceptrelation|propositionfocus|reasoningfocus|workingmemory|indexeddb|\b(?:validator|provider|prompt|json|ollama|qwen|temperature)\b|model tokens|system instructions?|context window|selected grounds|грундинг|граундинг|валидатор|провайдер|промпт|системн\p{L}* инструкц|токен\p{L}* модел|температур\p{L}* модел|окно контекста|(?:relation|self|policy|memory):/u;
const experiences = [
  /ты чувствовал[а]?|ты пережил[а]?|мы вместе|ты помнишь,? как|вчера ты|тогда ты/u,
  /you felt|we experienced|we .{0,40} together|you remember when|yesterday you/u,
];
const firstPersonEvent =
  /(?:^|\s)я (?:снова |вчера )?(?:слушал[а]?|смотрел[а]?|пережил[а]?|чувствовал[а]?)|\bi (?:again |yesterday )?(?:listened|watched|felt|experienced)\b/u;

/** No entailment claim. Reject narrowly known risks, then enforce copy-only slots. */
export function checkSlotText(
  text: string,
  slot: RealizationSlot,
): RiskValidation {
  const fail = (reason: RiskReason): RiskValidation => ({
    valid: false,
    reason,
    slotId: slot.id,
  });
  const output = norm(text),
    source = norm(slot.sourceTexts.join(' '));
  if (internals.test(output)) return fail('internal_leak');
  const sourceWords = words(source),
    outputWords = words(output);
  if (strength.some((w) => outputWords.has(w) && !sourceWords.has(w)))
    return fail('strengthening');
  if (qualifiers.some((q) => q.test(source) && !q.test(output)))
    return fail('modality_negation');
  if (
    experiences.some((p) => p.test(output) && !p.test(source)) ||
    (firstPersonEvent.test(output) && !firstPersonEvent.test(source))
  )
    return fail('user_experience');
  if (slot.memorySource === 'semantic' && output !== source)
    return fail('user_experience');
  if (slot.mode === 'copy' && output !== source) return fail('copy_required');
  if (output.includes('?') && !slot.sourceTexts.some((s) => s.includes('?')))
    return fail('question_not_authored');
  return { valid: true };
}

/** Strip only the local extension; preserve other unexpected properties for Phase 11A rejection. */
export function projectSlotResponse(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
  const v = raw as Record<string, unknown>;
  const strip = (unit: unknown) => {
    if (!unit || typeof unit !== 'object' || Array.isArray(unit)) return unit;
    const result = { ...unit } as Record<string, unknown>;
    delete result.slotId;
    return result;
  };
  return {
    ...v,
    ...(Array.isArray(v.sentences)
      ? { sentences: v.sentences.map(strip) }
      : {}),
    ...(v.followUp !== undefined ? { followUp: strip(v.followUp) } : {}),
  };
}

/** Called only after Phase 11A structural validation of the projected response. */
export function validateSlots(
  raw: unknown,
  response: GroundedIntelligenceResponse,
  request: IntelligenceRequest,
): RiskValidation {
  const slots = request.realizationSlots ?? [];
  const v = raw as {
    sentences: { slotId?: unknown }[];
    followUp?: { slotId?: unknown };
  };
  const rawUnits = [...v.sentences, ...(v.followUp ? [v.followUp] : [])];
  const units = [
    ...response.sentences,
    ...(response.followUp ? [response.followUp] : []),
  ];
  let previous = -1;
  const used = new Set<string>();
  for (let i = 0; i < units.length; i++) {
    const text = norm(units[i]!.text);
    const identifiers = [
      ...request.grounding.conceptIds,
      ...(request.grounding.operation.relationId
        ? [request.grounding.operation.relationId]
        : []),
      ...request.grounding.material.map((g) => g.key),
    ];
    if (identifiers.some((id) => text.includes(norm(id))))
      return { valid: false, reason: 'internal_leak' };
    const id = rawUnits[i]?.slotId;
    const index = slots.findIndex((s) => s.id === id);
    if (index < 0 || typeof id !== 'string')
      return { valid: false, reason: 'slot_identity' };
    if (index <= previous)
      return { valid: false, reason: 'slot_order', slotId: id };
    previous = index;
    used.add(id);
    const slot = slots[index]!,
      unit = units[i]!;
    if (
      (!slot.mayFuse && unit.groundingKeys.length !== 1) ||
      unit.groundingKeys.length !== slot.allowedGroundingKeys.length ||
      new Set(unit.groundingKeys).size !== unit.groundingKeys.length ||
      unit.groundingKeys.some((k) => !slot.allowedGroundingKeys.includes(k))
    )
      return { valid: false, reason: 'slot_keys', slotId: id };
    if ((slot.role === 'optional_follow_up') !== unit.text.includes('?'))
      return { valid: false, reason: 'question_not_authored', slotId: id };
    const result = checkSlotText(unit.text, slot);
    if (!result.valid) return result;
  }
  if (slots.some((s) => s.required && !used.has(s.id)))
    return { valid: false, reason: 'required_slot' };
  if (!slots.length) return { valid: false, reason: 'required_slot' };
  return { valid: true };
}
