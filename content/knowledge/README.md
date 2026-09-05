# Author-curated knowledge

Use small YAML concept cards written in the author's own words. Initial domains:
`philosophy`, `art`, `science`, `identity`, `world`. Store cards as
`<domain>/<id>.yaml`; the empty domain directories are preserved with `.gitkeep`.
No parser, graph, matcher, ingestion system or knowledge engine exists in Phase 0.

## Proposed schema (author review required)

The following is a structural example, not a researched production card. Strings
in angle brackets are authoring placeholders and must not ship as content.

```yaml
id: memory-continuity
domain: identity

title:
  ru: '<Краткое название>'
  en: '<Short title>'

aliases:
  ru: ['<вариант названия>']
  en: ['<alternative name>']

summary:
  ru: '<Краткое авторское изложение своими словами>'
  en: '<Concise authored summary in your own words>'

claims:
  ru: ['<Утверждение для обсуждения>']
  en: ['<Claim to examine>']

tensions:
  ru: ['<Противоречие или открытая проблема>']
  en: ['<Tension or unresolved issue>']

questions:
  ru: ['<Содержательный вопрос>']
  en: ['<Meaningful question>']

related: []

character_affinity:
  aletheia: 0.8
  aura: 0.9
  themis: 0.5

sources:
  - title: '<Research source title>'
    creator: '<Author or institution>'
    locator: '<URL, ISBN, archive identifier or other source location>'
    section: '<Page, chapter or section when applicable>'
    note: '<What this source informed; distinguish interpretation from quotation>'
```

Proposed validation conventions, to confirm before the loader is built:

- `id`: stable, globally unique lowercase kebab-case string. Cross-domain links use IDs.
- `domain`: one of the five directory names; it must match the containing directory.
- `title` and `summary`: localized strings under `ru` and `en`.
- `aliases`, `claims`, `tensions`, `questions`: localized arrays of strings.
  Aliases aid future matching; claims are discussion material, not automatic certainty.
- `related`: array of existing card IDs forming a lightweight concept graph;
  validate broken references. Example association: memory → continuity → identity → change.
- `character_affinity`: three numbers, proposed range 0–1, independently weighted
  rather than probabilities that must sum to one. Values are not user-visible.
- `sources`: array of provenance records, with title and locator, plus optional
  creator, section and note. This is research provenance, not runtime reply text.
  For original fictional world content, identify the PROJECT 2186 author/source;
  preserve the world's deliberate uncertainty.

Use empty arrays where a list has no entries. During drafting, incomplete English
content can be marked with empty strings/arrays; publish-time checks and a central
fallback policy must distinguish drafts from usable content. UI translations are
separate and complete. Review whether incomplete cards are excluded or fall back
as a whole before Phase 6; never spread ad hoc language checks through components.

## Editorial principles

Prefer concise summaries, interesting tensions and precise questions to large
extracts. Do not ingest full books as the core knowledge strategy. Runtime
behaviour relies on authored summaries, not copied long passages from books.
Keep sources for traceable research and review. Factual uncertainty and the
unreliability of fictional archives should be expressed rather than filled with
invented certainty. Translation should preserve meaning, not force identical word
order or aliases between Russian and English.

Knowledge resources are separate from UI/system localization and authored
character dialogue. Affinities guide attention; they do not replace character
policy or restrict a card to one character. No YAML dependency is needed until
content loading and validation are actually implemented.
