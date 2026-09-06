import { parseDocument } from 'yaml';
import { supportedLocales } from '../../core/language/locale.ts';
import type { ConceptCard } from '../../core/knowledge/model.ts';
import {
  keys,
  object,
  validateConceptCard,
} from '../../core/knowledge/validation.ts';

const localizedFields = [
  'title',
  'aliases',
  'summary',
  'claims',
  'tensions',
  'questions',
] as const;
// YAML's field-oriented shape becomes a locale-oriented plain domain record.
export function parseConceptYaml(
  source: string,
  filename: string,
): ConceptCard {
  try {
    const document = parseDocument(source, {
      version: '1.2',
      uniqueKeys: true,
    });
    if (document.errors.length || document.warnings.length)
      throw new Error(
        [...document.errors, ...document.warnings]
          .map((error) => error.message)
          .join('\n'),
      );
    const root = object(document.toJS({ maxAliasCount: 0 }), 'card');
    keys(
      root,
      [
        'id',
        'domain',
        ...localizedFields,
        'related',
        'character_affinity',
        'sources',
      ],
      'card',
    );
    const fields = Object.fromEntries(
      localizedFields.map((field) => {
        const value = object(root[field], field);
        keys(value, supportedLocales, field);
        return [field, value];
      }),
    ) as Record<(typeof localizedFields)[number], Record<string, unknown>>;
    const content: Record<string, unknown> = {};
    for (const locale of supportedLocales) {
      const values = localizedFields.map((field) => fields[field][locale]);
      if (values.every((value) => value === undefined)) continue;
      // An explicit wholly empty translation is unavailable, not a partial fallback.
      if (
        values.every((value, index) =>
          index === 0 || index === 2
            ? typeof value === 'string' && !value.trim()
            : Array.isArray(value) && value.length === 0,
        )
      )
        continue;
      content[locale] = Object.fromEntries(
        localizedFields.map((field) => [field, fields[field][locale]]),
      );
    }
    return validateConceptCard({
      id: root.id,
      domain: root.domain,
      content,
      related: root.related,
      characterAffinity: root.character_affinity,
      sources: 'sources' in root ? root.sources : [],
    });
  } catch (error) {
    throw new Error(
      `${filename}: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
}
