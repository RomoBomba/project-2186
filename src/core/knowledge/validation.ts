import { characterIds } from '../character/id.ts';
import { supportedLocales } from '../language/locale.ts';
import {
  knowledgeDomains,
  type ConceptCard,
  type ConceptId,
  type ConceptSource,
  type KnowledgeDomain,
  type LocalizedConcept,
} from './model.ts';
import { normalizeConceptText } from './normalization.ts';

export function object(value: unknown, path: string): Record<string, unknown> {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  )
    throw new Error(`${path}: expected an object`);
  return value as Record<string, unknown>;
}
export function keys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
): void {
  for (const key of Object.keys(value))
    if (!allowed.includes(key))
      throw new Error(`${path}.${key}: unknown field`);
}
function text(value: unknown, path: string): string {
  if (typeof value !== 'string' || !value.trim())
    throw new Error(`${path}: expected a non-empty string`);
  return value;
}
function strings(value: unknown, path: string): string[] {
  if (!Array.isArray(value))
    throw new Error(`${path}: expected an array of strings`);
  return value.map((item: unknown, i) => text(item, `${path}[${i}]`));
}
function id(value: unknown, path: string): ConceptId {
  const candidate = text(value, path);
  if (
    !/^(philosophy|art|science|identity|world)\.[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u.test(
      candidate,
    )
  )
    throw new Error(`${path}: expected domain.lowercase-slug`);
  return candidate as ConceptId;
}
export function validateConceptCard(value: unknown): ConceptCard {
  const root = object(value, 'card');
  keys(
    root,
    ['id', 'domain', 'content', 'related', 'characterAffinity', 'sources'],
    'card',
  );
  const conceptId = id(root.id, 'id');
  if (!knowledgeDomains.includes(root.domain as KnowledgeDomain))
    throw new Error('domain: unknown knowledge domain');
  const domain = root.domain as KnowledgeDomain;
  if (!conceptId.startsWith(`${domain}.`))
    throw new Error('id: prefix must match domain');
  const content = object(root.content, 'content');
  keys(content, supportedLocales, 'content');
  const validatedContent: ConceptCard['content'] = {};
  for (const locale of supportedLocales) {
    if (!(locale in content)) continue;
    const path = `content.${locale}`;
    const raw = object(content[locale], path);
    keys(
      raw,
      ['title', 'aliases', 'summary', 'claims', 'tensions', 'questions'],
      path,
    );
    const part: LocalizedConcept = {
      title: text(raw.title, `${path}.title`),
      summary: text(raw.summary, `${path}.summary`),
      aliases: strings(raw.aliases, `${path}.aliases`),
      claims: strings(raw.claims, `${path}.claims`),
      tensions: strings(raw.tensions, `${path}.tensions`),
      questions: strings(raw.questions, `${path}.questions`),
    };
    if (!normalizeConceptText(part.title))
      throw new Error(`${path}.title: must contain letters or numbers`);
    const seen = new Set<string>();
    for (const alias of part.aliases) {
      const normalized = normalizeConceptText(alias);
      if (!normalized || seen.has(normalized))
        throw new Error(
          `${path}.aliases: empty or duplicate normalized alias "${alias}"`,
        );
      seen.add(normalized);
    }
    validatedContent[locale] = part;
  }
  if (!Object.keys(validatedContent).length)
    throw new Error('content: at least one complete locale is required');
  const affinity = object(root.characterAffinity, 'characterAffinity');
  keys(affinity, characterIds, 'characterAffinity');
  for (const character of characterIds) {
    const value = affinity[character];
    if (
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      value < 0 ||
      value > 1
    )
      throw new Error(
        `characterAffinity.${character}: expected a finite number in 0–1`,
      );
  }
  const related = strings(root.related, 'related').map((item, i) =>
    id(item, `related[${i}]`),
  );
  if (new Set(related).size !== related.length)
    throw new Error('related: duplicate id');
  if (!Array.isArray(root.sources))
    throw new Error('sources: expected an array');
  const sources: ConceptSource[] = root.sources.map((entry: unknown, i) => {
    const path = `sources[${i}]`;
    const source = object(entry, path);
    keys(source, ['author', 'work', 'chapter', 'note'], path);
    if (!Object.keys(source).length) throw new Error(`${path}: empty source`);
    const result: ConceptSource = {};
    for (const field of ['author', 'work', 'chapter', 'note'] as const)
      if (field in source)
        result[field] = text(source[field], `${path}.${field}`);
    return result;
  });
  return {
    id: conceptId,
    domain,
    content: validatedContent,
    related,
    characterAffinity: {
      aletheia: affinity.aletheia as number,
      aura: affinity.aura as number,
      themis: affinity.themis as number,
    },
    sources,
  };
}
export function validateConceptCards(
  values: readonly unknown[],
): ConceptCard[] {
  const cards = values.map(validateConceptCard);
  const ids = new Set<ConceptId>();
  for (const card of cards) {
    if (ids.has(card.id)) throw new Error(`${card.id}: duplicate concept id`);
    ids.add(card.id);
  }
  for (const card of cards)
    for (const related of card.related)
      if (!ids.has(related))
        throw new Error(`${card.id}.related: missing concept ${related}`);
  return cards;
}
