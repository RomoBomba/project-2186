import { approach, unit } from './numbers.ts';
export type RelationshipState = {
  familiarity: number;
  trust: number;
  intellectualAffinity: number;
  openness: number;
};
export function initialRelationshipState(): RelationshipState {
  return {
    familiarity: 0.05,
    trust: 0.4,
    intellectualAffinity: 0.5,
    openness: 0.1,
  };
}
export function updateRelationship(
  previous: RelationshipState,
  observation: { successfulExchange: boolean },
): RelationshipState {
  const state = {
    familiarity: unit(previous.familiarity, 0.05),
    trust: unit(previous.trust, 0.4),
    intellectualAffinity: unit(previous.intellectualAffinity),
    openness: unit(previous.openness, 0.1),
  };
  if (!observation.successfulExchange) return state;
  return {
    familiarity: approach(state.familiarity, 1, 0.004),
    // Neutral completion provides no semantic evidence for changing trust.
    trust: state.trust,
    intellectualAffinity: state.intellectualAffinity,
    openness:
      state.openness < 0.35
        ? approach(state.openness, 0.35, 0.001)
        : state.openness,
  };
}
