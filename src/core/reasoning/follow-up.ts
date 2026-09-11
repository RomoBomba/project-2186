import type { ConceptId } from '../knowledge/model.ts';
import type { Locale } from '../language/locale.ts';
import { normalizeConceptText } from '../knowledge/normalization.ts';
import type { ConceptEvidence } from './model.ts';
import type { ReasoningFocus } from './focus.ts';
import type { SelfQuery } from '../self/query.ts';
export type FollowUpResolution = {
  resolved: boolean;
  targets?: ConceptId[];
  cue?:
    | 'reason'
    | 'conditional'
    | 'consequence'
    | 'operand'
    | 'reference'
    | 'stance';
  focus?: ReasoningFocus;
  selfQuery?: SelfQuery;
};
export function resolveFollowUp(
  text: string,
  locale: Locale,
  focus: ReasoningFocus | undefined,
  turn: number,
  evidence: readonly ConceptEvidence[],
): FollowUpResolution {
  if (!focus || focus.locale !== locale || turn - focus.lastUsedTurn >= 3)
    return { resolved: false };
  const s = normalizeConceptText(text);
  const strongOutside = evidence.some(
    (e) => e.source === 'matcher' && !focus.concepts.includes(e.conceptId),
  );
  const newTopic =
    locale === 'ru'
      ? /^(?:а )?(?:что (?:тогда )?такое|что значит|расскажи о) /u
      : /^(?:and |then )?(?:what is|what does .+ mean|tell me about) /u;
  if (strongOutside && newTopic.test(s)) return { resolved: false };
  // Reference words are admitted only after the grounded-focus guard above.
  const patterns: [FollowUpResolution['cue'], RegExp][] =
    locale === 'ru'
      ? [
          ['reason', /^почему(?:$| )/u],
          ['conditional', /^(?:а|но|и) если .+/u],
          [
            'consequence',
            /^(?:тогда |что тогда |что из этого следует|получается(?: |$)|значит(?: |$)|что ты тогда )/u,
          ],
          ['operand', /^а (?:тело|память|сознание)$/u],
          [
            'reference',
            /^(?:для кого тогда|это|так|она|этот|эта|такой|такое|продолжай)$/u,
          ],
          ['stance', /^а ты сама считаешь .+/u],
        ]
      : [
          ['reason', /^why(?:$| )/u],
          ['conditional', /^(?:but (?:what )?if|and if|what if) .+/u],
          [
            'consequence',
            /^(?:then |what then|so(?: |$)|does that mean |what follows from |what do you consider .+ then)/u,
          ],
          ['operand', /^what about (?:the body|memory|consciousness)$/u],
          ['reference', /^(?:who is it for then|it|that|this|continue)$/u],
        ];
  if (
    focus.scope === 'self' &&
    (locale === 'ru'
      ? /^чем твое (?:мышление|рассуждение) отличается /u
      : /^how (?:is|does) your (?:thinking|reasoning) /u
    ).test(s)
  )
    patterns.unshift(['reference', /.+/u]);
  const cue = patterns.find(([, p]) => p.test(s))?.[0];
  if (!cue) return { resolved: false };
  const reasonReference =
    locale === 'ru'
      ? /^(?:почему|почему это так|почему ты (?:так считаешь|так думаешь|так говоришь|не согласна|не согласен))$/u
      : /^(?:why|why is that|why do you (?:think that|say that|disagree))$/u;
  if (
    cue === 'reason' &&
    !reasonReference.test(s) &&
    !evidence.some((e) => focus.concepts.includes(e.conceptId)) &&
    !strongOutside
  )
    return { resolved: false };
  // A reason question with a clearly new subject is not a reference to the old answer.

  const selfKind =
    focus.scope === 'self'
      ? /(?:сознательн|сознани|conscious)/u.test(s)
        ? 'consciousness'
        : focus.selfKind
      : undefined;
  const outside = evidence.filter((e) => !focus.concepts.includes(e.conceptId));
  const direct = outside.filter((e) => e.source === 'matcher');
  const candidates = (direct.length ? direct : outside).slice().sort((a, b) => {
    const position = (e: ConceptEvidence) =>
      e.term
        ? s.indexOf(normalizeConceptText(e.term))
        : Number.MAX_SAFE_INTEGER;
    return position(a) - position(b);
  });
  const targets = [...new Set(candidates.map((e) => e.conceptId))];
  // An explicit first-person continuity question, not an isolated pronoun or a system-self query.
  const personalContinuity =
    locale === 'ru'
      ? /^(?:тогда )?(?:это )?(?:все еще )?буду (?:ли )?я$/u
      : /^then (?:would|will) (?:that|i) still be (?:me|myself)$/u;
  if (
    focus.scope === 'general' &&
    personalContinuity.test(s) &&
    !focus.concepts.includes('identity.self')
  )
    targets.unshift('identity.self');
  return {
    resolved: true,
    cue,
    ...(focus.scope === 'general' && targets.length ? { targets } : {}),
    focus,
    ...(selfKind
      ? { selfQuery: { kind: selfKind, evidence: s, contextual: true } }
      : {}),
  };
}
