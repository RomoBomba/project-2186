# Phase 9A0 calibration

Fixed benchmark: 142 cases, 71 RU + 71 EN, 21 canonical cards. Baseline captured
before question retrieval; identical fixtures used after. Self/contextual cohorts
are separate from the main metrics; see README for denominators and limitations.

| Metric                       | Before          | After            |
| ---------------------------- | --------------- | ---------------- |
| Primary concept accuracy     | 91/110 (82.73%) | 102/110 (92.73%) |
| Expected concept recall      | 99/122 (81.15%) | 111/122 (90.98%) |
| Known → unknown              | 15/110 (13.64%) | 4/110 (3.64%)    |
| False positives              | 2/18 (11.11%)   | 2/18 (11.11%)    |
| Whole relation availability  | 14/24 (58.33%)  | 14/24 (58.33%)   |
| Self retrieval coverage      | 0/8             | 0/8              |
| Contextual primary retention | 9/18            | 9/18             |

No new negative-case matches. Existing false positives are “У меня есть причина
опоздать.” and “I have a cause for being late.”: science.causality, exact alias
причина/cause, score 100. No alias edits or general stop-word changes were made.
“What remains then?”, file copies, zip archives, bread, difficult day and a broken
car wheel remain negative in the benchmark.

## Remaining recall limits

“Как отличить причину от совпадения?” now returns science.causality at 88 from its
exact authored question. Four known cases still return no accepted concept:

- Я (the actual short Russian self title; existing meaningful-token filter).
- Can anything be known for certain?
- Можно ли предсказать сложную систему?
- Что происходило во время реконструкции?

The last two formulations are not present in the current cards' questions. Their
semantic content exists in summaries/claims, which remain deliberately unindexed.
No morphology, new aliases or canonical questions were introduced to hide this gap.

## Relations and drift

Consciousness without memory: RU directly retrieves consciousness only; EN retrieves
both. Belief change: RU retrieves belief; EN retrieves belief and change. Self and
continuity are not all made available simultaneously. Truth + lost archives retrieves
both in both languages. Relation availability remains 14/24 across three characters;
the four-concept belief target exposes the existing bounded planning limit.

For “Может ли машина мыслить?”, Aura connects intelligence with creation. Creation
has moderate direct alias evidence, not graph-only provenance. Likewise, self has
moderate direct evidence for “Что делает человека свободным?”. Other characters
retain their question/contrast strategies. These are alias-overlap/strategy review
questions, not proof of graph-only material displacing the primary. No policy change
was made. The separate canonical “Интеллект” case exercises actual graph-only
association and its diagnostic labeling in tests.

Self questions remain a Phase 9A1 gap: 0/8 retrieve expected concepts. Contextual RU
cases retain self for all characters. EN context begins with “What makes me myself?”,
which fails to establish a grounded thread; subsequent follow-ups remain ungrounded.
This is recorded as a retrieval gap, not repaired by inventing WorkingMemory context.

## Validation limitation

An existing test, alias-policy.test.ts / “keeps moderate candidates without awarding
the strong multi-concept bonus”, expects [100,67,67]. The 21-card corpus returns
[100,67,67,67], including philosophy.freedom from “что делает человека свободным”.
This was reproduced using the unmodified matcher from HEAD. Question retrieval is
not the cause. Its expectation, canonical aliases and policy were left unchanged.
The full check therefore cannot be reported green; the remaining failure requires
a separate author decision about that existing corpus/test conflict.
