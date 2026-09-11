# Intelligence evaluation — Phase 9A0

This fixed benchmark is development/test data, not canonical or browser content.
No runtime application module imports it. The runner uses the existing Node YAML
parser and the same matcher/engine as the application.

Run `npm run intelligence:benchmark` for counts/ratios, or append `-- --details`
for per-case evidence, three-character plans, material provenance and responses.

## Cases

Each YAML entry has unique `id`, `locale`, `input`, `category`, optional
`expectedPrimaryConcept`, `expectedConcepts`, `mustAnswer` and `mustNotMatch`.
Optional `context` contains prior user turns. Referenced concept IDs are validated.
Categories: canonical, paraphrase, relation, contextual, self, unknown, false_positive.
142 frozen cases: 71 per language, covering titles and one authored question per
card, natural queries, relations, negatives, self queries and follow-ups.
Expected labels are evaluation hypotheses, not canonical assertions. The four-ID
belief relation deliberately demands broad recall. English is evaluated independently.

## Metric contract

Each case/character starts with initial disposition, empty WorkingMemory and no
long-term memory. Context is replayed before the scored input. Disposition remains
fixed to isolate retrieval/planning. Matcher uses normal threshold 65 and limit 5.
Summary metrics exclude self/contextual cases, reported separately.

- primaryConceptAccuracy: top raw matcher ID equals expectedPrimaryConcept /110.
  Normal ID tie-breaking applies; affinity does not determine this metric.
- expectedConceptRecall: accepted expected IDs / all expected IDs (micro recall /122).
- knownToUnknownRate: mustAnswer cases with no accepted match / mustAnswer cases.
  This measures retrieval absence, not generated answer quality.
- falsePositiveRate: negative cases with any accepted canonical concept /18.
  Per-case forbiddenMatches also reports explicit mustNotMatch violations.
- relationCoverage: all expected IDs available in accepted matches or plan
  primary/associated concepts /24 relation-case × character pairs. Strict whole
  relation availability, not reasoning correctness.
- selfCoverage: self cases retrieving an expected ID /8, not successful self-answers.
- contextualCoverage: contextual case × character pairs retaining expected primary /18.

Material provenance: direct_input means accepted current matcher evidence (inspect
its score; moderate overlap is not strong explicit mention); working_context means
contextual planning; graph_only means no current direct evidence. Labels are only
diagnostic and never change policy or generated text.

## Frozen evidence

baseline.json was captured before matcher changes against this same YAML and the
21-card corpus. after.json records question retrieval. These intentional compact
audit artifacts retain metrics and per-case evidence/plans. Full responses remain
reproducible with --details. Do not tune expected labels to improve metrics.
Canonical/title coverage makes this easier than unseen conversation: the score is
not general intelligence accuracy.
