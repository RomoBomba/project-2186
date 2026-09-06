import type { CharacterId } from './id.ts';
import { characterProfiles } from './profile.ts';
import {
  initialCharacterState,
  transitionCharacterState,
  type CharacterEvent,
  type CharacterState,
} from './state.ts';
import {
  initialRelationshipState,
  updateRelationship,
  type RelationshipState,
} from './relationship.ts';
import {
  initialUserStyleProfile,
  updateUserStyle,
  type SurfaceObservation,
  type UserStyleProfile,
} from './user-style.ts';
import {
  deriveBehaviourDisposition,
  type BehaviourDisposition,
} from './behaviour-policy.ts';
export type CharacterRuntime = {
  characterId: CharacterId;
  characterState: CharacterState;
  relationshipState: RelationshipState;
  userStyleProfile: UserStyleProfile;
  disposition: BehaviourDisposition;
};
export type CharacterRuntimeEvent =
  | {
      type: 'userMessageReceived';
      at: number;
      observation: SurfaceObservation | null;
    }
  | {
      type: Exclude<CharacterEvent['type'], 'userMessageReceived'>;
      at: number;
    };
export function createCharacterRuntime(
  characterId: CharacterId,
  at: number,
): CharacterRuntime {
  const profile = characterProfiles[characterId];
  const characterState = transitionCharacterState(
    initialCharacterState(profile),
    { type: 'sessionStarted', at },
  );
  const relationshipState = initialRelationshipState();
  const userStyleProfile = initialUserStyleProfile();
  return {
    characterId,
    characterState,
    relationshipState,
    userStyleProfile,
    disposition: deriveBehaviourDisposition(
      profile,
      characterState,
      relationshipState,
      userStyleProfile,
    ),
  };
}
export function transitionCharacterRuntime(
  previous: CharacterRuntime,
  event: CharacterRuntimeEvent,
): CharacterRuntime {
  const characterState = transitionCharacterState(
    previous.characterState,
    event,
  );
  const relationshipState = updateRelationship(previous.relationshipState, {
    successfulExchange: event.type === 'responseCompleted',
  });
  const userStyleProfile = updateUserStyle(
    previous.userStyleProfile,
    event.type === 'userMessageReceived' ? event.observation : null,
  );
  return {
    characterId: previous.characterId,
    characterState,
    relationshipState,
    userStyleProfile,
    disposition: deriveBehaviourDisposition(
      characterProfiles[previous.characterId],
      characterState,
      relationshipState,
      userStyleProfile,
    ),
  };
}
