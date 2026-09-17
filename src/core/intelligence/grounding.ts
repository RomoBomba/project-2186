import { disclosureVoices } from '../../characters/disclosure.ts';
import type { Locale } from '../language/locale.ts';
import type { CharacterId } from '../character/id.ts';
import type { ResponsePlan } from '../conversation/model.ts';
import { materialKey } from '../conversation/model.ts';
import { relationKey } from '../reasoning/model.ts';
import { selfFactText, selfQuestions } from '../../characters/self.ts';
import type { IntelligenceContext } from './provider.ts';

export type GroundingUnit = {
  key: string;
  source:
    | 'concept'
    | 'relation'
    | 'self'
    | 'character'
    | 'memory'
    | 'user'
    | 'policy';
  // Authored grounds or explicit testimony, never a model's inferred fact.
  content: string;
  kind: string;
};
export type GroundingPacket = {
  locale: Locale;
  character: {
    id: CharacterId;
    name: string;
    voice: {
      warmth: number;
      directness: number;
      structure: number;
      formality: number;
      imagery: number;
    };
  };
  operation: {
    strategy: ResponsePlan['strategy'];
    certainty: ResponsePlan['certainty'];
    frame?: NonNullable<ResponsePlan['reasoning']>['frame'];
    relationId?: string;
    partial: boolean;
    exhausted: boolean;
    stance?: {
      kind: NonNullable<ResponsePlan['proposition']>['focus']['kind'];
      polarity: NonNullable<ResponsePlan['proposition']>['focus']['polarity'];
      predicate: NonNullable<ResponsePlan['proposition']>['focus']['predicate'];
      user: NonNullable<ResponsePlan['proposition']>['userStance'];
      systemMove: NonNullable<ResponsePlan['proposition']>['systemMove'];
    };
  };
  conceptIds: string[];
  material: GroundingUnit[];
  // Never authority or new grounds. No storage access or full chat-history prompt.
  untrustedInput: {
    currentTurn: string;
    recentTurns: { speaker: 'user' | 'intelligence'; text: string }[];
  };
};
export type IntelligenceRequest = {
  realizationSlots?: import('./realization-slots.ts').RealizationSlot[];
  grounding: GroundingPacket;
  constraints: {
    maxCharacters: number;
    maxSentences: number;
    desiredVerbosity: number;
    allowFollowUp: boolean;
    requiredGroundingKeys: string[];
    permittedMemoryKeys: string[];
  };
};
export type GroundedSentence = { text: string; groundingKeys: string[] };
export type GroundedIntelligenceResponse = {
  locale: Locale;
  sentences: GroundedSentence[];
  followUp?: GroundedSentence;
};
/** Future implementations see only the one-response snapshot, not a plan/runtime/store. */
export interface RealizationProvider {
  readonly requiresRealizationSlots?: boolean;
  realize(request: IntelligenceRequest, signal: AbortSignal): Promise<unknown>;
}
export type RealizationInput = GroundingPacket['untrustedInput'];
export const groundingLimits = {
  recentTurns: 2,
  turnCharacters: 512,
  memories: 3,
} as const;
export const memoryGroundingKey = (id: string) =>
  'memory:' + encodeURIComponent(id);

export function buildIntelligenceRequest(
  context: IntelligenceContext,
  plan: ResponsePlan,
  input: RealizationInput = { currentTurn: '', recentTurns: [] },
): IntelligenceRequest {
  const material: GroundingUnit[] = [];
  const add = (unit: GroundingUnit) => {
    if (!material.some((m) => m.key === unit.key)) material.push(unit);
  };
  for (const ref of plan.selectedMaterial) {
    const item = context.material.find(
      (m) => materialKey(m.reference) === materialKey(ref),
    );
    if (item)
      add({
        key: materialKey(ref),
        source: 'concept',
        kind: ref.kind,
        content: item.text,
      });
  }
  for (const ref of plan.reasoning?.required ?? []) {
    const item = context.relationMaterial?.find(
      (m) => relationKey(m.reference) === relationKey(ref),
    );
    if (item)
      add({
        key: relationKey(ref),
        source: 'relation',
        kind: item.kind ?? 'claim',
        content: item.text,
      });
  }
  const self = plan.selfMaterial;
  for (const fact of self?.facts ?? [])
    add({
      key: 'self:' + fact,
      source: 'self',
      kind: fact,
      content: selfFactText[context.locale][fact],
    });
  if (self?.question)
    add({
      key: 'self-question:' + self.question,
      source: 'self',
      kind: 'question',
      content: selfQuestions[context.locale][self.question],
    });
  if (self && ['identity', 'character_difference'].includes(self.query.kind)) {
    for (const c of [self.character, ...self.comparisons.slice(0, 2)])
      add({
        key: 'character:' + c.id + ':interests',
        source: 'character',
        kind: 'attention',
        content: c.interests.join(', '),
      });
  }
  const memories = (plan.longTermContext ?? []).slice(
    0,
    groundingLimits.memories,
  );
  for (const m of memories)
    add({
      key: memoryGroundingKey(m.id),
      source: 'memory',
      kind: m.kind,
      content: m.value,
    });
  if (plan.userGroundedMaterial)
    add({
      key: 'user:current:' + plan.userGroundedMaterial.kind,
      source: 'user',
      kind: plan.userGroundedMaterial.kind,
      content: plan.userGroundedMaterial.value,
    });
  // Permission to greet, clarify, acknowledge stance or state a limitation is NOT world knowledge.
  add({
    key: 'policy:' + plan.strategy,
    source: 'policy',
    kind: 'speech_act',
    content: plan.strategy,
  });
  if (plan.reasoning?.partial || plan.contextReference?.exhausted)
    add({
      key: 'policy:limited_support',
      source: 'policy',
      kind: 'limitation',
      content: 'No stronger conclusion is authorized by the selected grounds.',
    });
  if (plan.proposition)
    add({
      key: 'policy:stance:' + plan.proposition.userStance,
      source: 'policy',
      kind: 'stance_acknowledgment',
      content: plan.proposition.userStance,
    });
  const contextual = !!(
    plan.contextReference ||
    plan.reasoning?.continuationOfTurn !== undefined ||
    self?.query.contextual ||
    plan.proposition?.focus.source === 'contextual_stance'
  );
  const requiredGroundingKeys = self?.facts.includes('experience_unestablished')
    ? ['self:experience_unestablished']
    : self?.facts.includes('art_status_open')
      ? ['self:art_status_open']
      : [];
  return {
    grounding: {
      locale: context.locale,
      character: {
        id: context.profile.id,
        name: context.profile.displayName,
        voice: {
          warmth: context.disposition.warmth,
          directness: context.disposition.directness,
          structure: context.disposition.structureBias,
          formality: context.profile.speech.formality,
          imagery: context.profile.speech.imagery,
        },
      },
      operation: {
        strategy: plan.strategy,
        certainty: plan.certainty,
        ...(plan.reasoning
          ? {
              frame: plan.reasoning.frame,
              ...(plan.reasoning.relationId
                ? { relationId: plan.reasoning.relationId }
                : {}),
            }
          : {}),
        partial: !!plan.reasoning?.partial,
        exhausted: !!(
          plan.reasoning?.exhausted || plan.contextReference?.exhausted
        ),
        ...(plan.proposition
          ? {
              stance: {
                kind: plan.proposition.focus.kind,
                polarity: plan.proposition.focus.polarity,
                predicate: plan.proposition.focus.predicate,
                user: plan.proposition.userStance,
                systemMove: plan.proposition.systemMove,
              },
            }
          : {}),
      },
      conceptIds: [
        ...new Set([
          ...plan.selectedMaterial.map((m) => m.conceptId),
          ...(plan.reasoning?.concepts ?? []),
        ]),
      ],
      material,
      untrustedInput: {
        currentTurn: input.currentTurn.slice(0, groundingLimits.turnCharacters),
        recentTurns: contextual
          ? input.recentTurns.slice(-groundingLimits.recentTurns).map((t) => ({
              speaker: t.speaker,
              text: t.text.slice(0, groundingLimits.turnCharacters),
            }))
          : [],
      },
    },
    constraints: {
      ...plan.desiredLength,
      desiredVerbosity: plan.disposition.desiredVerbosity,
      allowFollowUp: !!(
        (plan.userGroundedMaterial &&
          disclosureVoices[context.profile.id][context.locale][
            plan.userGroundedMaterial.kind
          ].includes('?')) ||
        plan.questionIntent ||
        self?.question ||
        plan.selectedMaterial.some((m) => m.kind === 'question') ||
        ['greet', 'clarify', 'ask_follow_up', 'admit_uncertainty'].includes(
          plan.strategy,
        )
      ),
      requiredGroundingKeys,
      permittedMemoryKeys: memories
        .filter((m) => m.id === plan.acknowledgeMemoryId)
        .map((m) => memoryGroundingKey(m.id)),
    },
  };
}

export type ProviderInspection = {
  request: IntelligenceRequest;
  provider: 'basic' | 'injected';
  fallback?: 'error' | 'timeout' | 'validation';
  attemptedValidation?: import('./validation.ts').ResponseValidation;
  response: GroundedIntelligenceResponse;
  validation: import('./validation.ts').ResponseValidation;
};
