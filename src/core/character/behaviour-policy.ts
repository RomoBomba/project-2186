import { unit } from './numbers';
import type { CharacterProfile } from './profile';
import type { CharacterState } from './state';
import type { RelationshipState } from './relationship';
import type { UserStyleProfile } from './user-style';
export type BehaviourDisposition = {
  warmth: number;
  directness: number;
  challengeBias: number;
  questionBias: number;
  desiredVerbosity: number;
  personalDistance: number;
  uncertaintyTolerance: number;
  structureBias: number;
};
export const maximumStyleInfluence = 0.15;
export function deriveBehaviourDisposition(
  profile: CharacterProfile,
  state: CharacterState,
  relationship: RelationshipState,
  style: UserStyleProfile,
): BehaviourDisposition {
  const traits = profile.traits;
  const styleInfluence = Math.min(
    maximumStyleInfluence,
    0.05 + 0.1 * unit(relationship.familiarity),
  );
  return {
    warmth: unit(
      unit(traits.warmth) +
        unit(relationship.familiarity) * 0.05 +
        (unit(relationship.trust) - 0.4) * 0.04 +
        (unit(state.openness) - 0.5) * 0.04,
    ),
    directness: unit(
      unit(traits.directness) + (unit(state.energy) - 0.75) * 0.06,
    ),
    challengeBias: unit(
      unit(profile.tendencies.challenge) * 0.8 +
        unit(state.curiosity) * 0.1 +
        unit(relationship.intellectualAffinity) * 0.1,
    ),
    questionBias: unit(
      unit(profile.tendencies.inquiry) * 0.8 + unit(state.curiosity) * 0.2,
    ),
    desiredVerbosity: unit(
      unit(profile.speech.verbosity) * (1 - styleInfluence) +
        unit(style.verbosity) * styleInfluence +
        (unit(state.energy) - 0.75) * 0.05,
    ),
    personalDistance: unit(
      0.65 -
        unit(profile.tendencies.relational) * 0.2 -
        unit(relationship.familiarity) * 0.15 -
        unit(relationship.trust) * 0.1 -
        unit(relationship.openness) * 0.05 +
        (0.5 - unit(state.openness)) * 0.1,
    ),
    uncertaintyTolerance: unit(
      unit(traits.ambiguityTolerance) * 0.9 + unit(state.openness) * 0.1,
    ),
    structureBias: unit(
      unit(traits.structureNeed) * 0.9 + unit(state.energy) * 0.1,
    ),
  };
}
