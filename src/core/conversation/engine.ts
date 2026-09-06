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
import { recordResponse, type ResponseHistory } from './model.ts';
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
    history: ResponseHistory,
  ) {
    const matches = this.matcher.match(message, locale, {
      allowFallback: false,
    });
    const perception = perceive(message, locale, matches);
    const attention = selectAttention(
      matches,
      this.graph,
      profile.id,
      locale,
      history,
    );
    const { plan, candidates } = planResponse(
      perception,
      attention,
      disposition,
      this.graph,
      locale,
      history,
    );
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
    return {
      perception,
      attention,
      candidates,
      plan,
      response,
      nextHistory: recordResponse(
        history,
        plan.strategy,
        response.usedMaterialKeys,
      ),
    };
  }
}
