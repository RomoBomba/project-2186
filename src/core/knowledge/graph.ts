import type { ConceptCard, ConceptId } from './model.ts';
import { validateConceptCards } from './validation.ts';
import { compareIds } from './normalization.ts';

function limit(value: number, fallback: number, maximum: number): number {
  return Number.isFinite(value)
    ? Math.max(0, Math.min(maximum, Math.floor(value)))
    : fallback;
}
export class ConceptGraph {
  private readonly cards: Map<ConceptId, ConceptCard>;
  constructor(cards: readonly ConceptCard[]) {
    this.cards = new Map(
      validateConceptCards(cards)
        .sort((a, b) => compareIds(a.id, b.id))
        .map((card) => [card.id, card]),
    );
  }
  get size(): number {
    return this.cards.size;
  }
  get(id: ConceptId): ConceptCard | undefined {
    const card = this.cards.get(id);
    // Return ordinary detached data; callers cannot corrupt the assembled graph.
    return card ? (JSON.parse(JSON.stringify(card)) as ConceptCard) : undefined;
  }
  related(id: ConceptId): ConceptCard[] {
    return (this.cards.get(id)?.related ?? [])
      .slice()
      .sort(compareIds)
      .map((id) => this.get(id)!);
  }
  expand(
    seedIds: readonly ConceptId[],
    options: { depth?: number; limit?: number } = {},
  ): ConceptCard[] {
    const depth = limit(options.depth ?? 1, 1, 3);
    const count = limit(options.limit ?? 6, 6, 20);
    const seen = new Set(seedIds);
    let frontier = [...seen]
      .filter((id) => this.cards.has(id))
      .sort(compareIds);
    const results: ConceptCard[] = [];
    for (let level = 0; level < depth && results.length < count; level++) {
      const next: ConceptId[] = [];
      for (const seed of frontier)
        for (const card of this.related(seed)) {
          if (seen.has(card.id)) continue;
          seen.add(card.id);
          results.push(card);
          next.push(card.id);
          if (results.length >= count) return results;
        }
      frontier = next.sort(compareIds);
    }
    return results;
  }
}
