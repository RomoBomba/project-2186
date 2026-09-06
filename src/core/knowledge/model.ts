import type { CharacterId } from '../character/id.ts';
import type { Locale } from '../language/locale.ts';

export const knowledgeDomains = [
  'philosophy',
  'art',
  'science',
  'identity',
  'world',
] as const;
export type KnowledgeDomain = (typeof knowledgeDomains)[number];
export type ConceptId = `${KnowledgeDomain}.${string}`;
export type LocalizedConcept = {
  title: string;
  aliases: string[];
  summary: string;
  claims: string[];
  tensions: string[];
  questions: string[];
};
export type CharacterAffinity = Record<CharacterId, number>;
export type ConceptSource = {
  author?: string;
  work?: string;
  chapter?: string;
  note?: string;
};
export type ConceptCard = {
  id: ConceptId;
  domain: KnowledgeDomain;
  content: Partial<Record<Locale, LocalizedConcept>>;
  related: ConceptId[];
  characterAffinity: CharacterAffinity;
  sources: ConceptSource[];
};

export function affinityFor(card: ConceptCard, character: CharacterId): number {
  return card.characterAffinity[character];
}
