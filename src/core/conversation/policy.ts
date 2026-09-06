import type { BehaviourDisposition } from '../character/behaviour-policy.ts';
import { unit } from '../character/numbers.ts';
import type { Locale } from '../language/locale.ts';
import { ConceptGraph } from '../knowledge/graph.ts';
import type { Attention } from './attention.ts';
import type { Perception } from './perception.ts';
import {
  materialKey,
  type MaterialRef,
  type ResponseHistory,
  type ResponsePlan,
  type ResponseStrategy,
} from './model.ts';
import { readMaterial, references, sentenceCount } from './material.ts';
export type StrategyCandidate = { strategy: ResponseStrategy; weight: number };
export function planResponse(
  perception: Perception,
  attention: Attention,
  disposition: BehaviourDisposition,
  graph: ConceptGraph,
  locale: Locale,
  history: ResponseHistory,
): { plan: ResponsePlan; candidates: StrategyCandidate[] } {
  const d = Object.fromEntries(
    Object.entries(disposition).map(([key, value]) => [key, unit(value)]),
  ) as BehaviourDisposition;
  const desiredLength = {
    maxCharacters:
      d.desiredVerbosity < 0.35 ? 300 : d.desiredVerbosity < 0.65 ? 420 : 480,
    maxSentences: d.desiredVerbosity < 0.35 ? 2 : 3,
  };
  const base = {
    knowledgeConfidence: attention.ranked[0]?.matchScore
      ? attention.ranked[0].matchScore / 100
      : 0,
    disposition: d,
    desiredLength,
  };
  function simple(strategy: ResponseStrategy) {
    return {
      plan: {
        ...base,
        strategy,
        selectedMaterial: [],
        certainty:
          strategy === 'identify_self'
            ? ('system_identity' as const)
            : ('limited' as const),
      },
      candidates: [{ strategy, weight: 1 }],
    };
  }
  if (perception.act === 'system_identity_question')
    return simple('identify_self');
  if (perception.act === 'greeting' && !attention.primary)
    return simple('greet');
  if (!attention.primary)
    return simple(perception.isQuestion ? 'admit_uncertainty' : 'clarify');
  const primary = attention.primary;
  const has = (kind: MaterialRef['kind']) =>
    references(graph, primary, locale, kind).length > 0;
  const opinion =
    perception.act === 'claim_or_opinion' || perception.act === 'disagreement';
  const uncertain = perception.act === 'uncertainty';
  const candidates: StrategyCandidate[] = [
    {
      strategy: 'reflect',
      weight:
        0.8 +
        d.warmth * 0.9 +
        (1 - d.personalDistance) * 0.4 +
        (uncertain ? 0.25 : 0),
    },
    {
      strategy: 'clarify',
      weight:
        0.5 +
        d.structureBias * 0.8 +
        d.directness * 0.2 +
        (uncertain ? 0.5 : 0) +
        (perception.act === 'explanation_request' ? 3 : 0),
    },
  ];
  if (has('tension'))
    candidates.push(
      {
        strategy: 'gentle_challenge',
        weight:
          0.3 +
          d.challengeBias * 1.9 +
          d.desiredVerbosity * 0.2 +
          d.uncertaintyTolerance * 0.25 +
          (opinion ? 0.35 : 0),
      },
      {
        strategy: 'contrast',
        weight: 0.2 + d.structureBias * 1.9 + d.directness * 0.4,
      },
    );
  if (has('question'))
    candidates.push({
      strategy: 'ask_follow_up',
      weight: 0.2 + d.questionBias * 1.9 + (perception.isQuestion ? 0.25 : 0),
    });
  if (attention.associated)
    candidates.push({
      strategy: 'connect',
      weight:
        0.2 +
        d.warmth * 1.2 +
        d.questionBias * 0.5 +
        (1 - d.personalDistance) +
        (attention.associationReason === 'matched_related' ? 0.8 : 0),
    });
  for (const candidate of candidates) {
    candidate.weight -=
      history.strategies.filter((strategy) => strategy === candidate.strategy)
        .length * 0.18;
    if (history.strategies.at(-1) === candidate.strategy) candidate.weight -= 1;
  }
  // Stable insertion order breaks equal weights; no wall clock or random selection.
  candidates.sort((a, b) => b.weight - a.weight);
  const strategy = candidates[0]!.strategy;
  const selectedMaterial: MaterialRef[] = [];
  function choose(id: typeof primary, kinds: MaterialRef['kind'][]) {
    for (const kind of kinds) {
      const available = references(graph, id, locale, kind).filter((ref) => {
        const material = readMaterial(graph, ref, locale)!;
        return (
          material.text.length <= desiredLength.maxCharacters - 65 &&
          sentenceCount(material.text) <= desiredLength.maxSentences
        );
      });
      // Unused first, then least recently used; fixed authored index resolves ties.
      available.sort(
        (a, b) =>
          history.materialKeys.lastIndexOf(materialKey(a)) -
            history.materialKeys.lastIndexOf(materialKey(b)) ||
          a.index - b.index,
      );
      if (available[0]) {
        selectedMaterial.push(available[0]);
        return;
      }
    }
  }
  switch (strategy) {
    case 'clarify':
      choose(primary, ['summary', 'claim']);
      break;
    case 'reflect':
      choose(primary, ['claim', 'summary']);
      break;
    case 'ask_follow_up':
      choose(primary, ['claim']);
      choose(primary, ['question']);
      break;
    case 'contrast':
      choose(primary, ['tension', 'claim']);
      break;
    case 'gentle_challenge':
      choose(primary, ['claim', 'summary']);
      choose(primary, ['tension']);
      break;
    case 'connect':
      choose(primary, ['claim', 'summary']);
      if (attention.associated)
        choose(attention.associated, ['claim', 'summary']);
      break;
  }
  if (!selectedMaterial.length) return simple('admit_uncertainty');
  return {
    candidates,
    plan: {
      ...base,
      strategy,
      primaryConceptId: primary,
      ...(strategy === 'connect' && attention.associated
        ? { associatedConceptId: attention.associated }
        : {}),
      selectedMaterial,
      ...(strategy === 'ask_follow_up'
        ? { questionIntent: 'examine_concept' as const }
        : {}),
      certainty: 'authored_view',
    },
  };
}
