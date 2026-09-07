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
  ) {
    const memory =
      'history' in workspace
        ? workspace
        : { ...initialWorkingMemory(), history: workspace };
    const history = memory.history;
    const matches = this.matcher.match(message, locale, {
      allowFallback: false,
    });
    const perception = perceive(message, locale, matches);
    const context = resolveContext(message, perception, memory, locale);
    const attention = selectAttention(
      matches,
      this.graph,
      profile.id,
      locale,
      history,
    );
    const planned = planResponse(
      perception,
      attention,
      disposition,
      this.graph,
      locale,
      history,
    );
    const plan = contextualPlan(
      planned.plan,
      context,
      memory,
      this.graph,
      locale,
    );
    const candidates = context.kind
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
