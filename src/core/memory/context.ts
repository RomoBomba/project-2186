import type { Locale } from '../language/locale.ts';
import type { Perception } from '../conversation/perception.ts';
import { conceptTokens } from '../knowledge/normalization.ts';
import type { ConceptId } from '../knowledge/model.ts';
import type { WorkingMemory } from './working.ts';
export type ContextKind =
  | 'reason'
  | 'disagreement'
  | 'reversal'
  | 'consequence'
  | 'clarification'
  | 'continuation'
  | 'answer';
export type ContextHints = {
  kind?: ContextKind;
  refersToTurn?: number;
  inheritedConceptIds: ConceptId[];
  refersToPreviousResponse: boolean;
  answersPendingQuestion: boolean;
};
const forms: Record<
  Locale,
  Record<Exclude<ContextKind, 'answer'>, readonly string[]>
> = {
  ru: {
    reason: [
      'почему',
      'а почему',
      'почему ты так говоришь',
      'почему ты так думаешь',
    ],
    disagreement: [
      'я с тобой не согласен',
      'я с тобой не согласна',
      'я не согласен',
      'я не согласна',
      'не согласен',
      'не согласна',
    ],
    reversal: [
      'а если наоборот',
      'а если посмотреть наоборот',
      'а если все наоборот',
      'а с другой стороны',
    ],
    consequence: [
      'и что тогда',
      'что тогда',
      'что тогда остается',
      'что тогда остается неизменным',
      'и что из этого следует',
    ],
    clarification: ['что ты имеешь в виду', 'объясни'],
    continuation: ['продолжай'],
  },
  en: {
    reason: ['why', 'why do you say that', 'why do you think that'],
    disagreement: ['i disagree'],
    reversal: [
      'what if the opposite is true',
      "what if it's the opposite",
      'what if we look at it the other way',
      'what about the opposite',
      'on the other hand',
    ],
    consequence: [
      'then what',
      'what remains then',
      'what remains unchanged then',
      'what follows from that',
    ],
    clarification: ['what do you mean', 'explain'],
    continuation: ['continue'],
  },
};
export function resolveContext(
  text: string,
  perception: Perception,
  memory: WorkingMemory,
  locale: Locale,
): ContextHints {
  const empty: ContextHints = {
    inheritedConceptIds: [],
    refersToPreviousResponse: false,
    answersPendingQuestion: false,
  };
  // Explicit concepts retain their original scores and attention; no synthetic matches.
  const normalized = conceptTokens(text).join(' ');
  // Preserve only the existing idiom exception for the incidental "true" alias.
  const fixedReversal =
    locale === 'en' && normalized === 'what if the opposite is true';
  if (
    (perception.matches.length && !fixedReversal) ||
    perception.act === 'greeting' ||
    perception.act === 'system_identity_question'
  )
    return empty;
  const last = memory.lastResponse;
  if (
    !last ||
    last.locale !== locale ||
    last.turn !== memory.history.turn ||
    !last.materialKeys.length ||
    !memory.currentThread
  )
    return empty;
  const kind = (
    Object.keys(forms[locale]) as Exclude<ContextKind, 'answer'>[]
  ).find((key) => forms[locale][key].includes(normalized));
  const answer =
    !kind &&
    memory.pendingQuestion?.turn === last.turn &&
    !perception.isQuestion &&
    perception.act === 'claim_or_opinion';
  if (!kind && !answer) return empty;
  return {
    kind: kind ?? 'answer',
    refersToTurn: last.turn,
    inheritedConceptIds: [...memory.activeConceptIds],
    refersToPreviousResponse: true,
    answersPendingQuestion: !!answer,
  };
}
