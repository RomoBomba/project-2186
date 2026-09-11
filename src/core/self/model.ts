import type { CharacterProfile } from '../character/profile.ts';
import type { SemanticMemory } from '../memory/long-term.ts';
import { safeMemoryValue } from '../memory/long-term.ts';
export type SelfFact =
  | 'artificial_identity'
  | 'compare_context'
  | 'connect_alternatives'
  | 'select_response'
  | 'experience_unestablished'
  | 'bounded_context'
  | 'selective_retention'
  | 'no_full_transcript'
  | 'retained_user'
  | 'no_retained_user'
  | 'reuses_parts'
  | 'compose_material'
  | 'art_status_open'
  | 'no_biological_body'
  | 'portrait_representation'
  | 'configuration_difference'
  | 'unknown_limit';
// Shared factual architecture, not responses or ConceptCards.
export type SystemSelfModel = {
  artificialIdentity: 'personal_intelligence_configuration';
  reasoning: readonly [
    'compare_context',
    'connect_alternatives',
    'select_response',
  ];
  memory: {
    context: 'bounded';
    retention: 'selective';
    fullTranscript: false;
    retainedUserInformation: boolean;
  };
  consciousness: 'subjective_equivalence_unestablished';
  creativity: 'compositional';
  continuity: 'character_scoped_state_between_sessions';
  embodiment: 'representation_without_biological_body';
  characterIdentity: {
    id: CharacterProfile['id'];
    interests: readonly string[];
  };
};
export function createSystemSelfModel(
  profile: CharacterProfile,
  memories: readonly SemanticMemory[] = [],
): SystemSelfModel {
  return {
    artificialIdentity: 'personal_intelligence_configuration',
    reasoning: ['compare_context', 'connect_alternatives', 'select_response'],
    memory: {
      context: 'bounded',
      retention: 'selective',
      fullTranscript: false,
      retainedUserInformation: memories.some(
        (m) =>
          m.status === 'current' &&
          m.confidence >= 0.9 &&
          safeMemoryValue(m.value),
      ),
    },
    consciousness: 'subjective_equivalence_unestablished',
    creativity: 'compositional',
    continuity: 'character_scoped_state_between_sessions',
    embodiment: 'representation_without_biological_body',
    characterIdentity: { id: profile.id, interests: [...profile.interests] },
  };
}
export function availableSelfFacts(model: SystemSelfModel): SelfFact[] {
  return [
    'artificial_identity',
    ...model.reasoning,
    'experience_unestablished',
    'bounded_context',
    'selective_retention',
    'no_full_transcript',
    model.memory.retainedUserInformation ? 'retained_user' : 'no_retained_user',
    'reuses_parts',
    'compose_material',
    'art_status_open',
    'no_biological_body',
    'portrait_representation',
    'configuration_difference',
    'unknown_limit',
  ];
}
