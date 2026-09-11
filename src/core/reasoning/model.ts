import type { ConceptId } from '../knowledge/model.ts';
import type { Locale } from '../language/locale.ts';
export const reasoningFrames = [
  'define',
  'distinguish',
  'relate',
  'consequence',
  'criterion',
  'counterpressure',
] as const;
export type ReasoningFrame = (typeof reasoningFrames)[number];
export type ReasoningIntent = {
  frame: ReasoningFrame;
  evidence: string;
  contextual: boolean;
};
export type RelationUnit = {
  kind: 'claim' | 'distinction' | 'boundary';
  text: Record<Locale, string>;
};
export type ConceptRelation = {
  id: string;
  concepts: readonly [ConceptId, ConceptId];
  direction: 'symmetric' | 'directed';
  material: readonly RelationUnit[];
};
export type RelationRef = { relationId: string; index: number };
export type ConceptEvidence = {
  conceptId: ConceptId;
  source: 'matcher' | 'relation_term' | 'inflection' | 'working_focus';
  term?: string;
};
export type ReasoningPlan = {
  frame: ReasoningFrame;
  concepts: ConceptId[];
  evidence: ConceptEvidence[];
  relationId?: string;
  required: RelationRef[];
  optional: RelationRef[];
  continuationOfTurn?: number;
  exhausted?: boolean;
  partial?: boolean;
  basis: 'relation' | 'concept' | 'self';
};
export function relationKey(ref: RelationRef): string {
  return `relation:${ref.relationId}:${ref.index}`;
}
