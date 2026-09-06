import type { BehaviourDisposition } from '../character/behaviour-policy.ts';
import type { ConceptId } from '../knowledge/model.ts';
export const responseStrategies = [
  'greet',
  'identify_self',
  'reflect',
  'clarify',
  'connect',
  'gentle_challenge',
  'contrast',
  'ask_follow_up',
  'admit_uncertainty',
] as const;
export type ResponseStrategy = (typeof responseStrategies)[number];
export type MaterialRef = {
  conceptId: ConceptId;
  kind: 'summary' | 'claim' | 'tension' | 'question';
  index: number;
};
export function materialKey(ref: MaterialRef): string {
  return `${ref.conceptId}:${ref.kind}:${ref.index}`;
}
export type ResponseHistory = {
  turn: number;
  strategies: ResponseStrategy[];
  materialKeys: string[];
};
export function initialResponseHistory(): ResponseHistory {
  return { turn: 0, strategies: [], materialKeys: [] };
}
export function recordResponse(
  history: ResponseHistory,
  strategy: ResponseStrategy,
  usedKeys: readonly string[],
): ResponseHistory {
  return {
    turn: history.turn + 1,
    strategies: [...history.strategies, strategy].slice(-6),
    materialKeys: [...history.materialKeys, ...usedKeys].slice(-8),
  };
}
export type ResponsePlan = {
  strategy: ResponseStrategy;
  primaryConceptId?: ConceptId;
  associatedConceptId?: ConceptId;
  knowledgeConfidence: number; // Match strength, never a truth probability.
  disposition: BehaviourDisposition;
  desiredLength: { maxCharacters: number; maxSentences: number };
  selectedMaterial: MaterialRef[];
  questionIntent?: 'examine_concept';
  certainty: 'authored_view' | 'limited' | 'system_identity';
};
