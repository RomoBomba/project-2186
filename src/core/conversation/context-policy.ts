import type { ContextHints } from '../memory/context.ts';
import type { WorkingMemory } from '../memory/working.ts';
import type { ConceptGraph } from '../knowledge/graph.ts';
import type { Locale } from '../language/locale.ts';
import { materialKey, type MaterialRef, type ResponsePlan } from './model.ts';
import { references, readMaterial, sentenceCount } from './material.ts';
// Context selects a further authored thought; it does not assert that a graph edge
// proves the previous statement. No new strategies or fabricated matching scores.
export function contextualPlan(
  base: ResponsePlan,
  hints: ContextHints,
  memory: WorkingMemory,
  graph: ConceptGraph,
  locale: Locale,
): ResponsePlan {
  if (!hints.kind || !hints.inheritedConceptIds[0]) return base;
  const primary = hints.inheritedConceptIds[0];
  const d = base.disposition;
  const strategy =
    hints.kind === 'disagreement'
      ? d.questionBias > d.structureBias
        ? 'ask_follow_up'
        : 'clarify'
      : hints.kind === 'reversal'
        ? 'contrast'
        : hints.kind === 'continuation' || hints.kind === 'answer'
          ? 'reflect'
          : hints.kind === 'reason'
            ? d.warmth > d.challengeBias && d.warmth > d.structureBias
              ? 'reflect'
              : d.challengeBias > d.structureBias
                ? 'gentle_challenge'
                : 'clarify'
            : 'clarify';
  const kinds: MaterialRef['kind'][] =
    strategy === 'ask_follow_up'
      ? ['question', 'tension', 'claim']
      : strategy === 'contrast' || strategy === 'gentle_challenge'
        ? ['tension', 'claim', 'summary']
        : hints.kind === 'clarification'
          ? ['summary', 'claim', 'tension']
          : ['claim', 'tension', 'summary'];
  const ids = [
    ...new Set([
      ...hints.inheritedConceptIds,
      ...graph.expand([primary], { depth: 1, limit: 6 }).map((card) => card.id),
    ]),
  ];
  let selected: MaterialRef | undefined;
  for (const id of ids) {
    const choices = kinds
      .flatMap((kind) => references(graph, id, locale, kind))
      .filter((ref) => {
        const item = readMaterial(graph, ref, locale)!;
        return (
          !memory.history.materialKeys.includes(materialKey(ref)) &&
          !memory.lastResponse!.materialKeys.includes(materialKey(ref)) &&
          // Equal text under a different key must not masquerade as new support.
          !memory.recentTurns.some(
            (turn) =>
              turn.speaker === 'intelligence' && turn.text.includes(item.text),
          ) &&
          item.text.length <= base.desiredLength.maxCharacters &&
          sentenceCount(item.text) <= base.desiredLength.maxSentences
        );
      });
    selected = choices[0];
    if (selected) break;
  }
  return {
    strategy: selected ? strategy : 'admit_uncertainty',
    primaryConceptId: primary,
    ...(selected && selected.conceptId !== primary
      ? { associatedConceptId: selected.conceptId }
      : {}),
    knowledgeConfidence: 0,
    disposition: d,
    desiredLength: base.desiredLength,
    selectedMaterial: selected ? [selected] : [],
    certainty: selected ? 'authored_view' : 'limited',
    ...(selected?.kind === 'question'
      ? { questionIntent: 'examine_concept' as const }
      : {}),
    contextReference: {
      kind: hints.kind,
      turn: hints.refersToTurn!,
      previousMaterialKeys: [...memory.lastResponse!.materialKeys],
      exhausted: !selected,
    },
  };
}
