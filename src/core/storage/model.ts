import type { CharacterId } from '../character/id.ts';
import type { CharacterState } from '../character/state.ts';
import type { RelationshipState } from '../character/relationship.ts';
import type { UserStyleProfile } from '../character/user-style.ts';
import type { LongTermMemory } from '../memory/long-term.ts';
import type { Locale } from '../language/locale.ts';
export type SystemConfiguration = {
  language: Locale;
  layout: 'A' | 'B' | 'C';
  displayStandard: 'civic' | 'phosphor' | 'amber';
  audioEnabled: boolean;
};
export type SavedConfiguration = SystemConfiguration & {
  character: CharacterId;
};
export type PersistentCharacter = {
  version: 1;
  characterId: CharacterId;
  characterState: CharacterState;
  relationshipState: RelationshipState;
  userStyleProfile: UserStyleProfile;
  memory: LongTermMemory;
};
// Incoming storage data is untrusted until explicitly decoded by application composition.
export interface StorageProvider {
  loadConfiguration(): Promise<unknown>;
  saveConfiguration(value: SavedConfiguration): Promise<void>;
  loadCharacter(id: CharacterId): Promise<unknown>;
  saveCharacter(value: PersistentCharacter): Promise<void>;
  deleteCharacter(id: CharacterId): Promise<void>;
  deleteConfiguration(): Promise<void>;
}
