import type { ConceptId, KnowledgeDomain } from '../knowledge/model.ts';
import type { Locale } from '../language/locale.ts';
import type { CharacterId } from '../character/id.ts';
import type { TemporalPresence } from '../self/temporal.ts';
export type GuideIntent =
  'conversation_scope' | 'offer_topic' | 'topic_overview';
export type TemporalIntent =
  'session_duration' | 'ambiguous_duration' | 'origin' | 'subjective_time';
export type BoundaryKind =
  | 'missing_knowledge'
  | 'temporal_distance'
  | 'archive_gap'
  | 'ambiguous_question'
  | 'current_external_fact'
  | 'unsupported_self_claim';
export type WorldFrame =
  | 'archive_incomplete'
  | 'temporal_distance'
  | 'historical_category_uncertain'
  | 'current_external_channel_unavailable'
  | 'relative_chronology';
export type PresenceMove =
  | 'offer_topic'
  | 'topic_overview'
  | 'boundary_and_redirect'
  | 'boundary_and_question'
  | 'temporal_distance'
  | 'clarify_ambiguity'
  | 'session_presence'
  | 'explain_topic_choice'
  | 'reject_topic'
  | 'explain_boundary'
  | 'state_boundary';
export type KnowledgeBoundaryPlan = { kind: BoundaryKind };
export type PresencePlan = {
  move: PresenceMove;
  yearReference?: { userYear: number; systemYear: number; interval?: number };
  missingYear?: boolean;
  discourseMarkers?: string[];
  referenceTurn?: number;
  rejectedTopicId?: ConceptId;
  choiceGround?: import('./move-focus.ts').ChoiceGround;
  referencedDurationMinutes?: number;
  boundary?: KnowledgeBoundaryPlan;
  selectedTopicIds: ConceptId[];
  allowedWorldFrames: WorldFrame[];
  temporal?: { intent: TemporalIntent; facts: TemporalPresence };
  questionAllowed: boolean;
  locale: Locale;
  characterVoice: CharacterId;
  style: number;
};
export type ConversationScopeModel = {
  discussable: ConceptId[];
  domains: KnowledgeDomain[];
  preferred: ConceptId[];
  recent: ConceptId[];
  unused: ConceptId[];
};
export type PresenceInspection = {
  provider: 'deterministic' | 'local';
  validation: string;
};
export type PresenceRealization = {
  move: PresenceMove;
  text: string;
  topicIds: ConceptId[];
  worldFrameIds: WorldFrame[];
};
/** Only already-authorized wording alternatives, no user prompt or transcript. */
export type PresenceRequest = {
  plan: PresencePlan;
  alternatives: PresenceRealization[];
};
export interface PresenceRealizer {
  realize(request: PresenceRequest, signal: AbortSignal): Promise<unknown>;
}
