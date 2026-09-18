import type { ConceptId } from '../knowledge/model.ts';
import type { Locale } from '../language/locale.ts';
import type { BoundaryKind, WorldFrame, TemporalIntent } from './model.ts';
import type { TemporalPresence } from '../self/temporal.ts';
import type { WorkingMemory } from '../memory/working.ts';
import type { Perception } from '../conversation/perception.ts';
import type { ResponsePlan } from '../conversation/model.ts';
import { discourseLens } from './discourse.ts';
import { presenceIntent } from './intent.ts';
export type ChoiceGround =
  'profile_interest' | 'affinity' | 'recent_context' | 'available';
export type ConversationMoveFocus = {
  lastSystemMove:
    | 'offered_topic'
    | 'explained_topic_choice'
    | 'rejected_topic'
    | 'gave_topic_overview'
    | 'stated_boundary'
    | 'explained_boundary'
    | 'gave_temporal_self_answer'
    | 'other';
  locale: Locale;
  originTurn: number;
  lastReferencedTurn: number;
  primaryTopicId?: ConceptId;
  alternativeTopicIds?: ConceptId[];
  choiceGround?: ChoiceGround;
  rejectedTopics: { id: ConceptId; turn: number }[];
  boundaryKind?: BoundaryKind;
  boundaryTopicIds?: ConceptId[];
  allowedWorldFrames?: WorldFrame[];
  temporal?: { intent: TemporalIntent; facts: TemporalPresence };
};
export type MoveFollowUp = {
  kind:
    | 'explain_topic_choice'
    | 'reject_topic'
    | 'alternative_topic'
    | 'explain_boundary'
    | 'subjective_interval';
  focus: ConversationMoveFocus;
};
export const moveFocusLifetime = 3;
export const rejectionLifetime = 6;
export function currentMoveFocus(
  memory: WorkingMemory,
  locale: Locale,
): ConversationMoveFocus | undefined {
  const f = memory.conversationMoveFocus;
  return f &&
    f.locale === locale &&
    memory.history.turn - f.lastReferencedTurn < moveFocusLifetime &&
    f.lastSystemMove !== 'other'
    ? f
    : undefined;
}
export function rejectedTopics(memory: WorkingMemory): ConceptId[] {
  return (memory.conversationMoveFocus?.rejectedTopics ?? [])
    .filter((r) => memory.history.turn - r.turn < rejectionLifetime)
    .map((r) => r.id);
}
/** Closed deictic reactions only. Explicit semantics remain with the existing planners. */
export function resolveConversationMove(
  text: string,
  memory: WorkingMemory,
  perception: Perception,
  locale: Locale,
): MoveFollowUp | undefined {
  const focus = currentMoveFocus(memory, locale);
  if (!focus || presenceIntent(text)) return undefined;
  const t = discourseLens(text).body;
  if (perception.matches.some((m) => m.score >= 85)) return undefined;
  const topic =
    ['offered_topic', 'explained_topic_choice', 'rejected_topic'].includes(
      focus.lastSystemMove,
    ) && focus.primaryTopicId;
  if (topic) {
    if (
      /^(?:почему(?: именно)?(?: об этом| это| ее| эту тему)?|why(?: that| this topic| did you choose that)?)$/u.test(
        t,
      ) &&
      focus.lastSystemMove !== 'rejected_topic'
    )
      return { kind: 'explain_topic_choice', focus };
    if (
      /^(?:если я не хочу|не хочу об этом|давай не это|неинтересно|let's not talk about that|i don't want that topic)$/u.test(
        t,
      )
    )
      return { kind: 'reject_topic', focus };
    if (
      /^(?:(?:предложи|выбери) (?:что-нибудь )?другое|предложи другую тему|давай другую тему|что-нибудь еще|something else|pick another topic|suggest something else)$/u.test(
        t,
      )
    )
      return { kind: 'alternative_topic', focus };
  }
  if (
    ['stated_boundary', 'explained_boundary'].includes(focus.lastSystemMove) &&
    focus.boundaryKind &&
    /^(?:почему(?: ты (?:этого не знаешь|не можешь ответить))?|why(?: don't you know| can't you answer)?)$/u.test(
      t,
    )
  )
    return { kind: 'explain_boundary', focus };
  if (
    focus.lastSystemMove === 'gave_temporal_self_answer' &&
    focus.temporal &&
    ['session_duration', 'ambiguous_duration'].includes(
      focus.temporal.intent,
    ) &&
    /^(?:ты чувствуешь что прошло столько времени|do you feel that much time passed)$/u.test(
      t,
    )
  )
    return { kind: 'subjective_interval', focus };
  return undefined;
}
/** Called once for a completed exchange; never written to persistent snapshots. */
export function advanceConversationMove(
  previous: ConversationMoveFocus | undefined,
  plan: ResponsePlan,
  turn: number,
  locale: Locale,
): ConversationMoveFocus | undefined {
  const p = plan.presence;
  const rejected = (previous?.rejectedTopics ?? []).filter(
    (r) => turn - r.turn < rejectionLifetime,
  );
  const reject = p?.rejectedTopicId;
  if (reject) {
    const index = rejected.findIndex((r) => r.id === reject);
    if (index >= 0) rejected.splice(index, 1);
    rejected.push({ id: reject, turn });
  }
  const base = {
    locale,
    originTurn: turn,
    lastReferencedTurn: turn,
    rejectedTopics: rejected.slice(-4),
  };
  if (p) {
    if (p.move === 'reject_topic')
      return {
        ...base,
        lastSystemMove: 'rejected_topic',
        primaryTopicId: reject!,
        alternativeTopicIds: previous?.alternativeTopicIds ?? [],
      };
    if (p.move === 'offer_topic' || p.move === 'explain_topic_choice')
      return {
        ...base,
        lastSystemMove:
          p.move === 'offer_topic' ? 'offered_topic' : 'explained_topic_choice',
        ...(p.selectedTopicIds[0]
          ? { primaryTopicId: p.selectedTopicIds[0] }
          : {}),
        alternativeTopicIds: p.selectedTopicIds.slice(1),
        ...(p.choiceGround ? { choiceGround: p.choiceGround } : {}),
        ...(p.move === 'explain_topic_choice'
          ? { originTurn: previous?.originTurn ?? turn }
          : {}),
      };
    if (p.move === 'topic_overview')
      return {
        ...base,
        lastSystemMove: 'gave_topic_overview',
        ...(p.selectedTopicIds[0]
          ? { primaryTopicId: p.selectedTopicIds[0] }
          : {}),
      };
    if (p.boundary)
      return {
        ...base,
        lastSystemMove:
          p.move === 'explain_boundary'
            ? 'explained_boundary'
            : 'stated_boundary',
        boundaryKind: p.boundary.kind,
        boundaryTopicIds: [...p.selectedTopicIds],
        allowedWorldFrames: [...p.allowedWorldFrames],
      };
    if (p.temporal)
      return {
        ...base,
        lastSystemMove: 'gave_temporal_self_answer',
        temporal: structuredClone(p.temporal),
      };
  }
  const answered =
    !!plan.reasoning ||
    !!plan.proposition ||
    !!plan.selfMaterial ||
    !!plan.selectedMaterial.length ||
    ['greet', 'identify_self'].includes(plan.strategy);
  if (
    !answered &&
    previous &&
    turn - previous.lastReferencedTurn < moveFocusLifetime
  )
    return { ...previous, rejectedTopics: base.rejectedTopics };
  return rejected.length ? { ...base, lastSystemMove: 'other' } : undefined;
}
