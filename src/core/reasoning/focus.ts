import type { Locale } from '../language/locale.ts';
import type { ConceptId } from '../knowledge/model.ts';
import type { SelfQueryKind } from '../self/query.ts';
import type { ResponsePlan } from '../conversation/model.ts';
import type { ReasoningFrame } from './model.ts';
export type ReasoningFocus = {
  scope: 'general' | 'self';
  frame: ReasoningFrame;
  concepts: ConceptId[];
  relationId?: string;
  selfKind?: SelfQueryKind;
  startedTurn: number;
  lastUsedTurn: number;
  locale: Locale;
};
export function advanceReasoningFocus(
  previous: ReasoningFocus | undefined,
  plan: ResponsePlan,
  turn: number,
  locale: Locale,
  explicit: readonly ConceptId[],
): ReasoningFocus | undefined {
  const r = plan.reasoning;
  const self = plan.selfMaterial?.query.kind;
  if (self || r) {
    const same =
      previous &&
      previous.locale === locale &&
      previous.relationId === r?.relationId &&
      previous.selfKind === self &&
      previous.concepts.join() === (r?.concepts ?? []).join();
    return {
      scope: self ? 'self' : 'general',
      frame: r?.frame ?? 'define',
      concepts: r?.concepts.slice(0, 2) ?? [],
      ...(r?.relationId ? { relationId: r.relationId } : {}),
      ...(self ? { selfKind: self } : {}),
      startedTurn: same ? previous.startedTurn : turn,
      lastUsedTurn: turn,
      locale,
    };
  }
  if (
    previous &&
    turn - previous.lastUsedTurn < 3 &&
    !explicit.some((id) => !previous.concepts.includes(id))
  )
    return previous;
  return undefined;
}

export type FocusTransition =
  'retained' | 'refined' | 'pivoted' | 'replaced' | 'cleared';
/** Diagnostic of the actual selected focus, never a substitute for material selection. */
export function classifyFocusTransition(
  before: ReasoningFocus | undefined,
  after: ReasoningFocus | undefined,
  contextual: boolean,
  explicit: readonly ConceptId[],
): FocusTransition {
  if (!after) return 'cleared';
  if (!before || before.scope !== after.scope || before.locale !== after.locale)
    return 'replaced';
  const same =
    before.relationId === after.relationId &&
    before.selfKind === after.selfKind &&
    before.concepts.join() === after.concepts.join();
  if (same)
    return explicit.some((id) => after.concepts.includes(id))
      ? 'refined'
      : 'retained';
  if (!contextual) return 'replaced';
  return after.relationId &&
    after.concepts.some((id) => before.concepts.includes(id))
    ? 'refined'
    : 'pivoted';
}
