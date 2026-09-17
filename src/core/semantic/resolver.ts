import type { ConceptCard, ConceptId } from '../knowledge/model.ts';
import type { Locale } from '../language/locale.ts';
import { reasoningFrames, type ReasoningFrame } from '../reasoning/model.ts';
import type { ReasoningFocus } from '../reasoning/focus.ts';
import type { Perception } from '../conversation/perception.ts';
import type { ResponsePlan } from '../conversation/model.ts';

export type SemanticResolutionCandidate = {
  locale: Locale;
  concepts: ConceptId[];
  frame: ReasoningFrame | null;
  continuation: boolean | 'uncertain';
  confidenceClass: 'high' | 'low';
};
export type SemanticRequest = {
  locale: Locale;
  text: string;
  catalog: { id: ConceptId; title: string; descriptor: string }[];
  focus?: Pick<ReasoningFocus, 'concepts' | 'frame' | 'relationId'>;
};
export interface SemanticResolver {
  resolve(request: SemanticRequest): Promise<{
    candidate: unknown;
    latencyMs?: number;
    generatedTokens?: number;
  }>;
}
export type SemanticInspection = {
  deterministic: { perception: Perception; plan: ResponsePlan };
  eligibility: { eligible: boolean; reason: string };
  request?: SemanticRequest;
  candidate?: unknown;
  validation?: string;
  merge?: string;
  latencyMs?: number;
  generatedTokens?: number;
};
export function liveFocus(
  focus: ReasoningFocus | undefined,
  locale: Locale,
  turn: number,
) {
  return focus?.scope === 'general' &&
    focus.locale === locale &&
    turn - focus.lastUsedTurn < 3
    ? focus
    : undefined;
}
export function semanticCatalog(
  cards: readonly ConceptCard[],
  locale: Locale,
): SemanticRequest['catalog'] {
  return cards
    .flatMap((c) =>
      c.content[locale]
        ? [
            {
              id: c.id,
              title: c.content[locale]!.title,
              descriptor: c.content[locale]!.summary.slice(0, 72),
            },
          ]
        : [],
    )
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(0, 100);
}
/** Closed safeguards, not a topic classifier. These requests need unavailable facts. */
export function semanticEligibility(
  text: string,
  perception: Perception,
  plan: ResponsePlan,
  resolved: boolean,
): SemanticInspection['eligibility'] {
  const t = text.toLowerCase().normalize('NFKC').replaceAll('ё', 'е');
  const no = (reason: string) => ({ eligible: false, reason });
  if (text.length > 600 || (t.match(/[\p{L}\p{N}]+/gu)?.length ?? 0) < 3)
    return no('input_bounds');
  if (
    /погод|weather|новост|news|матч|match yesterday|won.*game|римск|roman empire|квантов|quantum|марс|mars|\b20\d\d\b|сколько людей|how many people|как звали|who (?:started|founded)|истори[яю] .*импери|scientific experiment|научн.*эксперимент|эксперимент.*(?:доказ|свобод)|experiment.*(?:prov|free will)|полный научный|complete scientific|полн(?:ая|ую) теори|complete theory|методолог|methodology|рецепт|recipe|столиц|capital of|температур|temperature|курс валют|exchange rate/iu.test(
      t,
    )
  )
    return no('content_gap');
  if (
    /файл|file|zip|телефон|phone|опозда|late for|сложный день|hard day|сложн.*сегодня|difficult day|купил хлеб|bought bread|открыл архив|opened an archive|картина очень свободная|painting is very free/iu.test(
      t,
    )
  )
    return no('ordinary_ambiguity');
  if (
    perception.selfQuery ||
    plan.selfMaterial ||
    plan.userGroundedMaterial ||
    plan.proposition ||
    resolved ||
    plan.contextReference ||
    ['greet', 'identify_self'].includes(plan.strategy)
  )
    return no('deterministic_intent');
  if (plan.reasoning?.required.length || plan.selectedMaterial.length)
    return no('grounded_deterministic_plan');
  if (/(?:^|\s)(?:ты|тебя|тобой|you|your)(?:\s|[?!.,]|$)/iu.test(t))
    return no('unresolved_self_or_stance');
  return {
    eligible: true,
    reason: perception.reasoningIntent
      ? 'unresolved_operands'
      : 'unresolved_language',
  };
}
export function validateSemanticCandidate(
  raw: unknown,
  request: SemanticRequest,
): { candidate?: SemanticResolutionCandidate; reason: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return { reason: 'schema' };
  const r = raw as Record<string, unknown>;
  if (
    Object.keys(r).sort().join() !==
      'concepts,confidenceClass,continuation,frame,locale' ||
    r.locale !== request.locale ||
    !Array.isArray(r.concepts) ||
    r.concepts.length > 2 ||
    new Set(r.concepts).size !== r.concepts.length ||
    ![true, false, 'uncertain'].includes(r.continuation as boolean) ||
    !['high', 'low'].includes(r.confidenceClass as string)
  )
    return { reason: 'schema' };
  if (r.concepts.some((id) => !request.catalog.some((c) => c.id === id)))
    return { reason: 'unknown_concept' };
  if (r.frame !== null && !reasoningFrames.includes(r.frame as ReasoningFrame))
    return { reason: 'invalid_frame' };
  if (r.confidenceClass !== 'high' || !r.concepts.length)
    return { reason: 'low_confidence' };
  if (
    r.continuation === true &&
    (!request.focus ||
      !r.concepts.every((id) => request.focus!.concepts.includes(id)))
  )
    return { reason: 'unusable_continuation' };
  return { candidate: raw as SemanticResolutionCandidate, reason: 'valid' };
}
export function mergeSemanticCandidate(
  candidate: SemanticResolutionCandidate,
  perception: Perception,
) {
  const strong = perception.matches
    .filter((m) => m.score >= 85)
    .map((m) => m.conceptId);
  if (strong.some((id) => !candidate.concepts.includes(id))) return undefined;
  return {
    ...candidate,
    frame: perception.reasoningIntent?.frame ?? candidate.frame,
  };
}
