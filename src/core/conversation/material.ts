import type { Locale } from '../language/locale.ts';
import { ConceptGraph } from '../knowledge/graph.ts';
import type { MaterialRef } from './model.ts';
import type { ConceptId } from '../knowledge/model.ts';
export type SelectedMaterial = {
  reference: MaterialRef;
  title: string;
  text: string;
};
export function readMaterial(
  graph: ConceptGraph,
  ref: MaterialRef,
  locale: Locale,
): SelectedMaterial | undefined {
  const content = graph.get(ref.conceptId)?.content[locale];
  if (!content) return undefined;
  const text =
    ref.kind === 'summary'
      ? ref.index === 0
        ? content.summary
        : undefined
      : content[
          ref.kind === 'claim'
            ? 'claims'
            : ref.kind === 'tension'
              ? 'tensions'
              : 'questions'
        ][ref.index];
  return text
    ? { reference: ref, title: content.title, text: text.trim() }
    : undefined;
}
export function references(
  graph: ConceptGraph,
  id: ConceptId,
  locale: Locale,
  kind: MaterialRef['kind'],
): MaterialRef[] {
  const content = graph.get(id)?.content[locale];
  if (!content) return [];
  const count =
    kind === 'summary'
      ? 1
      : content[
          kind === 'claim'
            ? 'claims'
            : kind === 'tension'
              ? 'tensions'
              : 'questions'
        ].length;
  return Array.from({ length: count }, (_, index) => ({
    conceptId: id,
    kind,
    index,
  }));
}
// Conservative sentence units, not an NLP sentence parser. Never cuts authored text.
export function sentenceCount(text: string): number {
  return (text.trim().match(/[^.!?…]+(?:[.!?…]+|$)/gu) ?? []).filter((part) =>
    part.trim(),
  ).length;
}
