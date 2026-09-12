import {
  resolveProposition,
  planProposition,
} from '../discourse/proposition.ts';
import { classifyFocusTransition } from '../reasoning/focus.ts';
import { resolveFollowUp } from '../reasoning/follow-up.ts';
import { operandEvidence } from '../reasoning/relations.ts';
import { planReasoning } from '../reasoning/plan.ts';
import { RelationIndex } from '../reasoning/relations.ts';
import { authoredRelations, relationTerms } from '../../relations/pack.ts';
import { createSystemSelfModel } from '../self/model.ts';
import { planSelfResponse } from '../self/plan.ts';
import {
  retrieveMemories,
  inspectMemoryRetrieval,
  extractMemoryCandidates,
  type SemanticMemory,
} from '../memory/long-term.ts';
import {
  initialWorkingMemory,
  completeExchange,
  type WorkingMemory,
} from '../memory/working.ts';
import { resolveContext } from '../memory/context.ts';
import { contextualPlan } from './context-policy.ts';
import type { CharacterProfile } from '../character/profile.ts';
import type { BehaviourDisposition } from '../character/behaviour-policy.ts';
import type { Locale } from '../language/locale.ts';
import type { ConceptCard } from '../knowledge/model.ts';
import { ConceptMatcher } from '../knowledge/matcher.ts';
import { ConceptGraph } from '../knowledge/graph.ts';
import type { IntelligenceProvider } from '../intelligence/provider.ts';
import { perceive } from './perception.ts';
import { selectAttention } from './attention.ts';
import { planResponse } from './policy.ts';
import { readMaterial } from './material.ts';
import { type ResponseHistory } from './model.ts';
export class ConversationEngine {
  private readonly matcher: ConceptMatcher;
  private readonly graph: ConceptGraph;
  private readonly relations: RelationIndex;
  private readonly provider: IntelligenceProvider;
  constructor(cards: readonly ConceptCard[], provider: IntelligenceProvider) {
    this.matcher = new ConceptMatcher(cards);
    this.graph = new ConceptGraph(cards);
    this.provider = provider;
    this.relations = new RelationIndex(authoredRelations, this.graph);
  }
  async respond(
    message: string,
    profile: CharacterProfile,
    disposition: BehaviourDisposition,
    locale: Locale,
    workspace: ResponseHistory | WorkingMemory,
    longTerm?: {
      semantic: readonly SemanticMemory[];
      referencedIds: readonly string[];
      lastReferenceTurn: number;
    },
  ) {
    const memory =
      'history' in workspace
        ? workspace
        : { ...initialWorkingMemory(), history: workspace };
    const history = memory.history;
    const matches = this.matcher.match(message, locale, {
      allowFallback: false,
    });
    const previousSelf =
      memory.lastResponse?.locale === locale
        ? memory.lastResponse.plan.selfMaterial?.query.kind
        : undefined;
    const perception = perceive(message, locale, matches, previousSelf);
    const explicitEvidence = [
      ...matches
        .filter((m) => m.score >= 85)
        .map((m) => ({
          conceptId: m.conceptId,
          source: 'matcher' as const,
          term: m.evidence.term,
        })),
      ...operandEvidence(message, locale, relationTerms, this.graph),
    ];
    let followUp = resolveFollowUp(
      message,
      locale,
      memory.reasoningFocus,
      history.turn,
      explicitEvidence,
    );
    const proposition = resolveProposition(
      message,
      locale,
      history.turn,
      memory.propositionFocus,
      memory.reasoningFocus,
      explicitEvidence,
    );
    if (proposition.selfQuery) perception.selfQuery = proposition.selfQuery;
    if (
      proposition.candidate &&
      !perception.reasoningIntent &&
      !perception.selfQuery
    )
      perception.reasoningIntent = {
        frame: 'counterpressure',
        evidence: 'grounded_proposition',
        contextual: proposition.resolved,
      };
    // Stance references add a route only when an actual proposition and its usable focus exist.
    // Existing explicit-target priority in FollowUpResolver remains authoritative.
    if (proposition.resolved && !followUp.resolved && memory.reasoningFocus) {
      followUp = {
        resolved: true,
        cue: 'stance',
        focus: memory.reasoningFocus,
        ...(proposition.candidate?.scope === 'general'
          ? {
              targets: [
                ...new Set(
                  [...explicitEvidence, ...(proposition.evidence ?? [])].map(
                    (e) => e.conceptId,
                  ),
                ),
              ].filter((id) => !memory.reasoningFocus!.concepts.includes(id)),
            }
          : {}),
        ...(memory.propositionFocus?.scope === 'self'
          ? {
              selfQuery: {
                kind: memory.reasoningFocus.selfKind ?? 'consciousness',
                evidence: 'proposition_reference',
                contextual: true,
              },
            }
          : {}),
      };
    }
    if (
      followUp.selfQuery &&
      (!perception.selfQuery || perception.selfQuery.kind === 'unknown_self')
    )
      perception.selfQuery = followUp.selfQuery;
    const selfQuery =
      perception.selfQuery ??
      (perception.act === 'system_identity_question'
        ? {
            kind: 'identity' as const,
            evidence: perception.evidence.join(' / '),
            contextual: false,
          }
        : undefined);
    if (selfQuery) perception.selfQuery = selfQuery;
    const context = resolveContext(message, perception, memory, locale);
    const attention = selectAttention(
      matches,
      this.graph,
      profile.id,
      locale,
      history,
    );
    // Current-turn only: do not resolve "remember this" from older turns here.
    const disclosures = extractMemoryCandidates(message, locale);
    const disclosure =
      disclosures.length === 1 && disclosures[0]!.confidence >= 0.9
        ? {
            kind: disclosures[0]!.kind,
            value: disclosures[0]!.value,
            confidence: disclosures[0]!.confidence,
            source: 'current_turn' as const,
          }
        : undefined;
    const planned = planResponse(
      perception,
      attention,
      disposition,
      this.graph,
      locale,
      history,
      disclosure,
    );
    let plan = selfQuery
      ? planSelfResponse(
          selfQuery,
          createSystemSelfModel(profile, longTerm?.semantic),
          disposition,
          history.turn,
        )
      : planned.plan.userGroundedMaterial
        ? planned.plan
        : contextualPlan(planned.plan, context, memory, this.graph, locale);
    plan = planReasoning(
      plan,
      message,
      perception,
      memory,
      this.graph,
      this.relations,
      relationTerms,
      locale,
      followUp,
      proposition.evidence,
    );
    plan = planProposition(plan, proposition, memory.propositionFocus);
    if (plan.selfMaterial)
      plan.selfMaterial.supportingConcepts =
        plan.selfMaterial.supportingConcepts.filter(
          (id) => !!this.graph.get(id),
        );
    const memoryReferenceBlockers: string[] = plan.reasoning
      ? ['reasoning_material']
      : [];
    if (longTerm && !plan.selfMaterial) {
      const relevant = retrieveMemories(message, locale, longTerm.semantic);
      if (relevant.length) plan.longTermContext = relevant;
      const reference = relevant.find(
        (m) =>
          m.score >= 0.7 &&
          ['preference', 'interest', 'project'].includes(m.kind) &&
          !longTerm.referencedIds.includes(m.id),
      );
      const revisit =
        /(?:^|\s)(?:снова|опять|again)(?:\s|[.!]|$)|\bback to\b/iu.test(
          message,
        );
      const negated =
        /(?:^|\s)(?:не|нет|not|no|never|don't|don’t)(?:\s|[.!]|$)/iu.test(
          message,
        );
      if (!revisit) memoryReferenceBlockers.push('no_revisit_marker');
      if (negated) memoryReferenceBlockers.push('negated');
      if (!reference)
        memoryReferenceBlockers.push(
          'no_unreferenced_supported_memory_at_0.70',
        );
      if (plan.selectedMaterial.length)
        memoryReferenceBlockers.push('authored_material_selected');
      if (history.turn - longTerm.lastReferenceTurn < 4)
        memoryReferenceBlockers.push('reference_cooldown');
      if (context.kind) memoryReferenceBlockers.push('working_context');
      if (perception.isQuestion) memoryReferenceBlockers.push('question');
      if (['uncertainty', 'disagreement'].includes(perception.act))
        memoryReferenceBlockers.push('uncertain_or_disagreement');
      if (['greet', 'identify_self'].includes(plan.strategy))
        memoryReferenceBlockers.push('system_intent');
      if (extractMemoryCandidates(message, locale).length)
        memoryReferenceBlockers.push('new_explicit_fact');
      if (!memoryReferenceBlockers.length && reference)
        plan.acknowledgeMemoryId = reference.id;
    }
    const candidates =
      plan.selfMaterial || plan.reasoning || context.kind
        ? [{ strategy: plan.strategy, weight: 1 }]
        : planned.candidates;
    const material = plan.selectedMaterial
      .map((ref) => readMaterial(this.graph, ref, locale))
      .filter((item) => item !== undefined);
    const response = await this.provider.respond(
      {
        profile,
        disposition: plan.disposition,
        locale,
        turnIndex: history.turn,
        material,
        relationMaterial: (plan.reasoning?.required ?? []).flatMap(
          (reference) => {
            const text = this.relations.read(reference, locale);
            return text ? [{ reference, text }] : [];
          },
        ),
      },
      plan,
    );
    if (!response.text.trim())
      throw new Error('IntelligenceProvider returned no response');
    const nextMemory = completeExchange(
      memory,
      message,
      perception,
      plan,
      response,
      locale,
    );
    const focusTransition = classifyFocusTransition(
      memory.reasoningFocus,
      nextMemory.reasoningFocus,
      followUp.resolved,
      [
        ...matches.filter((m) => m.score >= 85).map((m) => m.conceptId),
        ...(plan.reasoning?.evidence
          .filter((e) => e.source !== 'working_focus')
          .map((e) => e.conceptId) ?? []),
      ],
    );
    return {
      propositionResolution: proposition,
      focusTransition,
      followUp,
      memoryInspection: {
        retrieval: inspectMemoryRetrieval(
          message,
          locale,
          longTerm?.semantic ?? [],
        ),
        deliveredToPlan: plan.longTermContext?.map((m) => m.id) ?? [],
        referenceBlockers: memoryReferenceBlockers,
        usedMemoryIds: response.usedMemoryIds ?? [],
      },
      context,
      nextMemory,
      perception,
      attention,
      candidates,
      plan,
      response,
      nextHistory: nextMemory.history,
    };
  }
}
