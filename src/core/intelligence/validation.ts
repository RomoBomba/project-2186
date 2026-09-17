import { sentenceCount } from '../conversation/material.ts';
import type {
  GroundedIntelligenceResponse,
  IntelligenceRequest,
} from './grounding.ts';
export type ResponseValidation =
  { valid: true } | { valid: false; reason: string };
const record = (v: unknown): v is Record<string, unknown> =>
  !!v &&
  typeof v === 'object' &&
  !Array.isArray(v) &&
  Object.getPrototypeOf(v) === Object.prototype;
const keys = (v: Record<string, unknown>, allowed: string[]) =>
  Object.keys(v).every((k) => allowed.includes(k));
export function responseText(response: GroundedIntelligenceResponse): string {
  return [
    ...response.sentences,
    ...(response.followUp ? [response.followUp] : []),
  ]
    .map((s) => s.text)
    .join(' ');
}
/** Contract checking only: citations do not prove that a paraphrase is true. */
export function validateProviderResponse(
  value: unknown,
  request: IntelligenceRequest,
): ResponseValidation {
  const fail = (reason: string): ResponseValidation => ({
    valid: false,
    reason,
  });
  if (!record(value) || !keys(value, ['locale', 'sentences', 'followUp']))
    return fail('response_shape');
  if (
    value.locale !== request.grounding.locale ||
    !['ru', 'en'].includes(String(value.locale))
  )
    return fail('locale');
  if (!Array.isArray(value.sentences) || !value.sentences.length)
    return fail('empty_response');
  if (value.sentences.length > request.constraints.maxSentences)
    return fail('sentence_limit');
  if (value.followUp !== undefined && !request.constraints.allowFollowUp)
    return fail('follow_up_not_allowed');
  const units = [
    ...value.sentences,
    ...(value.followUp === undefined ? [] : [value.followUp]),
  ];
  const approved = new Map(request.grounding.material.map((m) => [m.key, m]));
  const used = new Set<string>();
  for (const unit of units) {
    if (!record(unit) || !keys(unit, ['text', 'groundingKeys']))
      return fail('sentence_shape');
    if (
      typeof unit.text !== 'string' ||
      !unit.text.trim() ||
      !sentenceCount(unit.text)
    )
      return fail('empty_sentence');
    if (sentenceCount(unit.text) !== 1) return fail('sentence_shape');
    if (unit.text.includes('?') && !request.constraints.allowFollowUp)
      return fail('follow_up_not_allowed');
    if (
      !Array.isArray(unit.groundingKeys) ||
      !unit.groundingKeys.length ||
      unit.groundingKeys.length > approved.size
    )
      return fail('missing_grounding');
    for (const key of unit.groundingKeys) {
      if (typeof key !== 'string' || !approved.has(key))
        return fail('unknown_grounding_key');
      if (
        approved.get(key)!.source === 'memory' &&
        !request.constraints.permittedMemoryKeys.includes(key)
      )
        return fail('memory_reference_not_authorized');
      used.add(key);
    }
  }
  const text = responseText(value as GroundedIntelligenceResponse);
  if (text.length > request.constraints.maxCharacters)
    return fail('character_limit');
  if (sentenceCount(text) > request.constraints.maxSentences)
    return fail('sentence_limit');
  if (request.constraints.requiredGroundingKeys.some((k) => !used.has(k)))
    return fail('required_grounding_missing');
  return { valid: true };
}
