import type { BehaviourDisposition } from '../character/behaviour-policy.ts';
import { characterProfiles } from '../character/profile.ts';
import type { ConceptId } from '../knowledge/model.ts';
import type { ResponsePlan } from '../conversation/model.ts';
import type { SelfQuery } from './query.ts';
import {
  availableSelfFacts,
  type SelfFact,
  type SystemSelfModel,
} from './model.ts';
export type SelfMaterial = {
  query: SelfQuery;
  facts: SelfFact[];
  character: SystemSelfModel['characterIdentity'];
  comparisons: SystemSelfModel['characterIdentity'][];
  qualification?: 'subjective_equivalence_unestablished' | 'art_status_open';
  question?: 'thought_criterion' | 'creation_criterion';
  supportingConcepts: ConceptId[];
};
export function planSelfResponse(
  query: SelfQuery,
  model: SystemSelfModel,
  d: BehaviourDisposition,
  turn: number,
): ResponsePlan {
  const retained: SelfFact = model.memory.retainedUserInformation
    ? 'retained_user'
    : 'no_retained_user';
  const table: Record<SelfQuery['kind'], SelfFact[]> = {
    identity: ['artificial_identity', 'configuration_difference'],
    reasoning: [
      d.structureBias > 0.75
        ? 'select_response'
        : d.warmth > 0.75
          ? 'connect_alternatives'
          : 'compare_context',
      'experience_unestablished',
    ],
    memory:
      query.focus === 'retained_user'
        ? [retained, 'no_full_transcript']
        : query.focus === 'full_transcript'
          ? ['no_full_transcript', 'selective_retention']
          : ['bounded_context', 'selective_retention', 'no_full_transcript'],
    consciousness: ['experience_unestablished', 'compare_context'],
    creativity: [
      query.contextual ? 'reuses_parts' : 'compose_material',
      'art_status_open',
    ],
    embodiment: ['no_biological_body', 'portrait_representation'],
    character_difference: ['configuration_difference', 'artificial_identity'],
    capability: ['compare_context', 'connect_alternatives', 'unknown_limit'],
    unknown_self: ['unknown_limit'],
  };
  const facts = table[query.kind].filter((f) =>
    availableSelfFacts(model).includes(f),
  );
  // One-turn self continuation selects another exposed process, never an invented explanation.
  if (query.contextual && query.kind === 'reasoning')
    facts[0] = model.reasoning[turn % model.reasoning.length]!;
  const support: Partial<Record<SelfQuery['kind'], ConceptId>> = {
    reasoning: 'science.intelligence',
    consciousness: 'philosophy.consciousness',
    creativity: 'art.creation',
    memory: 'identity.memory',
    embodiment: 'identity.body',
  };
  const question =
    d.questionBias > 0.7 && d.desiredVerbosity > 0.35 && turn % 3 === 0
      ? query.kind === 'reasoning'
        ? 'thought_criterion'
        : query.kind === 'creativity'
          ? 'creation_criterion'
          : undefined
      : undefined;
  const others =
    query.comparison === 'others'
      ? Object.values(characterProfiles).filter(
          (p) => p.id !== model.characterIdentity.id,
        )
      : query.comparison
        ? [characterProfiles[query.comparison]]
        : [];
  return {
    strategy:
      query.kind === 'identity'
        ? 'identify_self'
        : query.kind === 'unknown_self'
          ? 'admit_uncertainty'
          : 'reflect',
    selectedMaterial: [],
    knowledgeConfidence: 1,
    disposition: d,
    desiredLength: {
      maxCharacters:
        d.desiredVerbosity < 0.35 ? 300 : d.desiredVerbosity < 0.65 ? 420 : 480,
      maxSentences: 3,
    },
    certainty: query.kind === 'unknown_self' ? 'limited' : 'system_identity',
    selfMaterial: {
      query,
      facts,
      character: model.characterIdentity,
      comparisons: others.map((p) => ({
        id: p.id,
        interests: [...p.interests],
      })),
      ...(['reasoning', 'consciousness'].includes(query.kind)
        ? { qualification: 'subjective_equivalence_unestablished' as const }
        : query.kind === 'creativity'
          ? { qualification: 'art_status_open' as const }
          : {}),
      ...(question ? { question } : {}),
      supportingConcepts: support[query.kind] ? [support[query.kind]!] : [],
    },
  };
}
