import { temporalWorld } from '../../world/temporal.ts';
import { ConceptMatcher } from '../knowledge/matcher.ts';
import { discourseLens } from './discourse.ts';
import {
  resolveConversationMove,
  rejectedTopics,
  type ChoiceGround,
} from './move-focus.ts';
import type { ConceptCard, ConceptId } from '../knowledge/model.ts';
import type { CharacterProfile } from '../character/profile.ts';
import type { Locale } from '../language/locale.ts';
import type { WorkingMemory } from '../memory/working.ts';
import type { ResponsePlan } from '../conversation/model.ts';
import type { Perception } from '../conversation/perception.ts';
import type { TemporalPresence } from '../self/temporal.ts';
import { presenceIntent, boundaryKind } from './intent.ts';
import type {
  ConversationScopeModel,
  PresencePlan,
  BoundaryKind,
} from './model.ts';

export function conversationScope(
  cards: readonly ConceptCard[],
  profile: CharacterProfile,
  locale: Locale,
  memory: WorkingMemory,
): ConversationScopeModel {
  const excluded = rejectedTopics(memory);
  const available = cards.filter(
    (c) => c.content[locale]?.summary && !excluded.includes(c.id),
  );
  const recent = [
    ...new Set([
      ...memory.recentTurns.flatMap((t) => t.conceptIds),
      ...(memory.presenceHistory ?? []).flatMap((p) => p.topics.slice(0, 1)),
    ]),
  ];
  const focus = [
    ...(memory.reasoningFocus?.concepts ?? []),
    ...(memory.propositionFocus?.concepts ?? []),
  ];
  const score = (c: ConceptCard) =>
    c.characterAffinity[profile.id] +
    (profile.interests.some((i) => i === c.domain || i === c.id.split('.')[1])
      ? 0.15
      : 0) +
    (focus.includes(c.id) ? 0.08 : 0) -
    (recent.includes(c.id) ? 0.65 : 0) -
    (memory.presenceHistory?.at(-1)?.topics[0] === c.id ? 0.2 : 0);
  const ranked = available
    .slice()
    .sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id));
  return {
    discussable: available.map((c) => c.id),
    domains: [...new Set(available.map((c) => c.domain))],
    preferred: ranked.map((c) => c.id),
    recent,
    unused: ranked.filter((c) => !recent.includes(c.id)).map((c) => c.id),
  };
}
// Restricted overview operands: only used after an explicit broad-topic invitation.
const overviewForms: Partial<Record<ConceptId, readonly string[]>> = {
  'philosophy.knowledge': ['знания', 'знании', 'знаниях'],
  'identity.memory': ['памяти'],
  'identity.self': [
    'личности',
    'природа личности',
    'nature of identity',
    'nature of self',
  ],
  'philosophy.consciousness': ['сознании'],
  'philosophy.freedom': ['свободе', 'свободу'],
  'philosophy.time': ['времени', 'время', 'time'],
};
export function planPresence(
  text: string,
  base: ResponsePlan,
  perception: Perception,
  cards: readonly ConceptCard[],
  profile: CharacterProfile,
  locale: Locale,
  memory: WorkingMemory,
  temporal: TemporalPresence,
): ResponsePlan {
  const intent = presenceIntent(text);
  const reaction = resolveConversationMove(text, memory, perception, locale);
  const externalBoundary =
    !base.selfMaterial &&
    !base.userGroundedMaterial &&
    !base.acknowledgeMemoryId
      ? boundaryKind(text)
      : undefined;
  const empty =
    !base.acknowledgeMemoryId &&
    !base.selfMaterial &&
    !base.userGroundedMaterial &&
    !base.reasoning &&
    !base.proposition &&
    !base.contextReference &&
    !base.selectedMaterial.length &&
    !['greet', 'identify_self'].includes(base.strategy);
  if (
    !intent &&
    !reaction &&
    !externalBoundary &&
    !empty &&
    base.selfMaterial?.query.kind !== 'unknown_self'
  )
    return base;
  const scope = conversationScope(cards, profile, locale, memory);
  const previous = memory.presenceHistory ?? [];
  const style = ((previous.at(-1)?.style ?? -1) + 1) % 9;
  let presence: PresencePlan = {
    move: 'boundary_and_redirect',
    selectedTopicIds: [],
    allowedWorldFrames: [],
    questionAllowed: false,
    locale,
    characterVoice: profile.id,
    style,
    discourseMarkers: discourseLens(text).markers,
  };
  let selectedMaterial: ResponsePlan['selectedMaterial'] = [];
  const coreMaterial = (
    id: ConceptId,
    preferUnused = false,
  ): ResponsePlan['selectedMaterial'] => {
    const content = cards.find((c) => c.id === id)?.content[locale];
    return content
      ? [
          {
            conceptId: id,
            kind: content.claims.length ? 'claim' : 'summary',
            index:
              preferUnused && content.claims.length
                ? Math.max(
                    0,
                    content.claims.findIndex(
                      (_, i) =>
                        !memory.history.materialKeys.includes(
                          `${id}:claim:${i}`,
                        ),
                    ),
                  )
                : 0,
          },
        ]
      : [];
  };
  const choiceGround = (id: ConceptId): ChoiceGround => {
    const card = cards.find((c) => c.id === id)!;
    if (
      [
        ...(memory.reasoningFocus?.concepts ?? []),
        ...(memory.propositionFocus?.concepts ?? []),
      ].includes(id)
    )
      return 'recent_context';
    if (
      profile.interests.some((i) => i === card.domain || i === id.split('.')[1])
    )
      return 'profile_interest';
    return card.characterAffinity[profile.id] >= 0.7 ? 'affinity' : 'available';
  };
  if (intent && ('year' in intent || 'interval' in intent)) {
    const anchor = memory.temporalAnchor;
    const userYear =
      'year' in intent
        ? intent.year
        : anchor && memory.history.turn - anchor.lastReferencedTurn < 3
          ? anchor.userReferencedYear
          : undefined;
    presence = {
      ...presence,
      move: 'temporal_distance',
      ...(userYear !== undefined
        ? {
            yearReference: {
              userYear,
              systemYear: temporalWorld.temporal_distance.systemEra,
              ...('interval' in intent
                ? {
                    interval: Math.abs(
                      temporalWorld.temporal_distance.systemEra - userYear,
                    ),
                  }
                : {}),
            },
          }
        : { missingYear: true }),
      allowedWorldFrames: ['archive_incomplete', 'temporal_distance'],
    };
  } else if (reaction) {
    const f = reaction.focus;
    presence.referenceTurn = f.lastReferencedTurn;
    if (reaction.kind === 'reject_topic')
      presence = {
        ...presence,
        move: 'reject_topic',
        rejectedTopicId: f.primaryTopicId!,
      };
    else if (reaction.kind === 'alternative_topic') {
      const topics = scope.preferred
        .filter((id) => id !== f.primaryTopicId)
        .slice(0, 3);
      presence = {
        ...presence,
        move: 'offer_topic',
        selectedTopicIds: topics,
        rejectedTopicId: f.primaryTopicId!,
        ...(topics[0] ? { choiceGround: choiceGround(topics[0]) } : {}),
      };
      if (topics[0]) selectedMaterial = coreMaterial(topics[0]);
    } else if (reaction.kind === 'explain_topic_choice') {
      presence = {
        ...presence,
        move: 'explain_topic_choice',
        selectedTopicIds: [f.primaryTopicId!],
        choiceGround: f.choiceGround ?? 'available',
      };
      selectedMaterial = coreMaterial(f.primaryTopicId!, true);
    } else if (reaction.kind === 'explain_boundary') {
      presence = {
        ...presence,
        move: 'explain_boundary',
        boundary: { kind: f.boundaryKind! },
        allowedWorldFrames: f.allowedWorldFrames ?? [],
      };
    } else {
      presence = {
        ...presence,
        move: 'session_presence',
        temporal: { intent: 'subjective_time', facts: temporal },
        ...(f.temporal?.facts.elapsedMinutes !== null &&
        f.temporal?.facts.elapsedMinutes !== undefined
          ? { referencedDurationMinutes: f.temporal.facts.elapsedMinutes }
          : {}),
      };
    }
  } else if (intent && 'temporal' in intent)
    presence = {
      ...presence,
      move: 'session_presence',
      temporal: { intent: intent.temporal, facts: temporal },
      allowedWorldFrames:
        intent.temporal === 'subjective_time' ? ['relative_chronology'] : [],
    };
  else if (intent && 'guide' in intent) {
    if (intent.guide === 'topic_overview') {
      // Same exact/overlap matcher, applied to the explicit topic operand, not a global alias expansion.
      const topic = intent.topic ?? '';
      const operand =
        cards.find((c) => overviewForms[c.id]?.includes(topic))?.content[locale]
          ?.title ?? topic;
      const id =
        new ConceptMatcher(cards).match(operand, locale, {
          allowFallback: false,
        })[0]?.conceptId ??
        perception.matches[0]?.conceptId ??
        cards.find(
          (c) =>
            overviewForms[c.id]?.includes(intent.topic ?? '') ||
            c.content[locale]?.title.toLowerCase() === intent.topic,
        )?.id;
      const card = cards.find((c) => c.id === id);
      if (card?.content[locale]) {
        presence = {
          ...presence,
          move: 'topic_overview',
          selectedTopicIds: [card.id],
          questionAllowed: !intent.statement,
        };
        selectedMaterial = intent.statement
          ? coreMaterial(card.id, true)
          : [
              {
                conceptId: card.id,
                kind: card.content[locale]!.claims.length ? 'claim' : 'summary',
                index: 0,
              },
            ];
        if (!intent.statement && card.content[locale]!.questions[0])
          selectedMaterial.push({
            conceptId: card.id,
            kind: 'question',
            index: 0,
          });
      } else
        presence = {
          ...presence,
          move: 'clarify_ambiguity',
          boundary: { kind: 'missing_knowledge' },
        };
    } else {
      presence = {
        ...presence,
        move: 'offer_topic',
        selectedTopicIds: scope.preferred.slice(0, 3),
        questionAllowed: true,
      };
      const primary = presence.selectedTopicIds[0];
      if (primary) {
        presence.choiceGround = choiceGround(primary);
        selectedMaterial = coreMaterial(primary);
      }
    }
  } else {
    const kind: BoundaryKind =
      externalBoundary ??
      (base.selfMaterial?.query.kind === 'unknown_self'
        ? 'unsupported_self_claim'
        : perception.act === 'other'
          ? 'ambiguous_question'
          : 'missing_knowledge');
    const temporalFrame =
      kind === 'temporal_distance' || kind === 'archive_gap';
    const ask =
      kind !== 'current_external_fact' &&
      profile.tendencies.inquiry > 0.75 &&
      style % 2 === 0;
    presence = {
      ...presence,
      boundary: { kind },
      move: temporalFrame
        ? 'temporal_distance'
        : kind === 'ambiguous_question'
          ? 'clarify_ambiguity'
          : ask
            ? 'boundary_and_question'
            : 'boundary_and_redirect',
      questionAllowed: ask,
      allowedWorldFrames: temporalFrame
        ? [
            'archive_incomplete',
            ...(kind === 'temporal_distance'
              ? ['temporal_distance' as const]
              : []),
          ]
        : kind === 'current_external_fact'
          ? ['current_external_channel_unavailable']
          : [],
      selectedTopicIds:
        !ask && kind !== 'unsupported_self_claim'
          ? temporalFrame
            ? scope.preferred
                .filter((id) =>
                  ['world.archives', 'philosophy.truth'].includes(id),
                )
                .slice(0, 1)
            : kind === 'current_external_fact'
              ? []
              : scope.preferred
                  .filter(
                    (id) =>
                      memory.reasoningFocus?.concepts.includes(id) ||
                      memory.currentThread?.primaryConceptId === id,
                  )
                  .slice(0, 1)
          : [],
    };
  }
  if (
    presence.boundary &&
    !presence.questionAllowed &&
    !presence.selectedTopicIds.length &&
    presence.move === 'boundary_and_redirect'
  )
    presence.move = 'state_boundary';
  return {
    ...(base.selfMaterial ? { selfMaterial: base.selfMaterial } : {}),
    ...(base.longTermContext ? { longTermContext: base.longTermContext } : {}),
    rhythm:
      presence.yearReference?.interval !== undefined ||
      presence.missingYear ||
      presence.move === 'reject_topic' ||
      presence.temporal?.intent === 'session_duration'
        ? 'brief'
        : intent && 'guide' in intent && intent.statement
          ? 'statement_only'
          : 'standard',
    strategy: base.strategy,
    disposition: base.disposition,
    knowledgeConfidence: selectedMaterial.length ? 1 : 0,
    certainty: presence.temporal
      ? 'system_identity'
      : presence.boundary
        ? 'limited'
        : 'authored_view',
    desiredLength: { maxCharacters: 600, maxSentences: 2 },
    selectedMaterial,
    ...(selectedMaterial[0]
      ? { primaryConceptId: selectedMaterial[0].conceptId }
      : {}),
    presence,
  };
}
