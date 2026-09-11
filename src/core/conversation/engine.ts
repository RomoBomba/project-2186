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
  private readonly provider: IntelligenceProvider;
  constructor(cards: readonly ConceptCard[], provider: IntelligenceProvider) {
    this.matcher = new ConceptMatcher(cards);
    this.graph = new ConceptGraph(cards);
    this.provider = provider;
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
    const plan = selfQuery
      ? planSelfResponse(
          selfQuery,
          createSystemSelfModel(profile, longTerm?.semantic),
          disposition,
          history.turn,
        )
      : planned.plan.userGroundedMaterial
        ? planned.plan
        : contextualPlan(planned.plan, context, memory, this.graph, locale);
    if (plan.selfMaterial)
      plan.selfMaterial.supportingConcepts =
        plan.selfMaterial.supportingConcepts.filter(
          (id) => !!this.graph.get(id),
        );
    const memoryReferenceBlockers: string[] = [];
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
      plan.selfMaterial || context.kind
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
    return {
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
