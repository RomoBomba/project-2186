# Phase 9A2 - author review

Baseline: engine from commit `fea7c7a`, exported into a separate temporary directory. The same extended benchmark/runner evaluated old and new engines. Existing fixtures remain unchanged; 32 cases were added (16 RU + 16 EN). Total: 226 cases, 113 per locale. Planning metrics evaluate all three characters.

## Metrics

| Metric                            |           Before |             After |
| --------------------------------- | ---------------: | ----------------: |
| reasoningFrameAccuracy            |     0/96 (0.00%) |   96/96 (100.00%) |
| requiredConceptAvailability       | 128/180 (71.11%) | 180/180 (100.00%) |
| authoredRelationCoverage          |     0/84 (0.00%) |   84/84 (100.00%) |
| groundedReasoningPlanRate         |     0/96 (0.00%) |   96/96 (100.00%) |
| associationBeforeAnswerRate       |     0/96 (0.00%) |      0/96 (0.00%) |
| Historical primaryConceptAccuracy | 102/110 (92.73%) |  102/110 (92.73%) |
| Historical expectedConceptRecall  | 111/122 (90.98%) |  111/122 (90.98%) |
| Historical knownToUnknownRate     |    4/110 (3.64%) |     4/110 (3.64%) |
| Historical falsePositiveRate      |    2/18 (11.11%) |     2/18 (11.11%) |
| Historical relationCoverage       |   14/24 (58.33%) |    16/24 (66.67%) |

Zero baseline frame/grounded-plan/relation metrics mean the explicit structures did not exist before 9A2, not that every old answer lacked meaning. Required concept availability includes raw matches and planned concepts. Association-before-answer is a narrow structural diagnostic; zero does not prove perfect relevance.

Self coverage remains 8/8 original and 52/52 expanded. Classification/grounding: 24/24 and 156/156; false positives 0/384. Contextual cohort remains 9/18. Unchanged raw retrieval retains 2/18 false positives and 4/110 known-to-unknown cases.

## Exact A-H responses

Manually inspected through the application ConversationEngine with initial dispositions. Frame, concepts, relation ID and text provenance were inspected. UI was not changed. Character differences are not forced where the factual answer coincides.

### ALETHEIA

**A. Может ли сознание существовать без памяти?**

`relate` / philosophy.consciousness, identity.memory / `consciousness-memory`

Память связана с сознанием, но отсутствие отдельных воспоминаний не доказывает отсутствия сознания. Из утраты воспоминаний нельзя без дополнительного основания вывести исчезновение сознания.

**B. Если мои убеждения полностью изменятся, останусь ли я собой?**

`consequence` / identity.belief, identity.continuity / `belief-continuity`

Убеждения участвуют в самоопределении, но их изменение само по себе не доказывает разрыва непрерывности личности. Чтобы утверждать разрыв личности, недостаточно указать лишь на смену убеждений.

**C. Если каждое решение имеет причину, свободен ли человек?**

`consequence` / philosophy.freedom, science.causality / `freedom-causality`

Наличие причин у решения не равнозначно отсутствию свободы. Чтобы судить о свободе, остаётся выяснить роль альтернатив, контроля и возможности действовать иначе.

**D. Чем знание отличается от истины?**

`distinguish` / philosophy.knowledge, philosophy.truth / `knowledge-truth`

Истинность утверждения и возможность обоснованно знать его — не одно и то же. Истина касается положения вещей, а знание также требует оснований, доступных познающему.

**E. Можно ли что-то знать, оставаясь неуверенным?**

`relate` / philosophy.knowledge, philosophy.uncertainty / `knowledge-uncertainty`

Неопределённость не уничтожает знание автоматически: оно может быть обоснованным и всё же подверженным ошибке. Отсутствие абсолютной уверенности ещё не означает отсутствия всех оснований.

**F. Как отличить причину от совпадения?**

`criterion` / science.causality / `ConceptCard`

Последовательность событий сама по себе не доказывает причинность.

**G. Может ли копия быть оригиналом?**

`relate` / art.originality, art.aura / `originality-aura`

Совпадение содержания копии и оригинала не делает их одним историческим объектом. Точность воспроизведения сама по себе не переносит на копию всю историю оригинала.

**H. Если архив потерян, исчезает ли вместе с ним историческая истина?**

`consequence` / world.archives, philosophy.truth / `archives-truth`

Отсутствие записи не означает, что исторического события не было. Утрата архива ограничивает проверку утверждения, но сама по себе не доказывает его ложность.

### AURA

**A. Может ли сознание существовать без памяти?**

`relate` / philosophy.consciousness, identity.memory / `consciousness-memory`

Память связана с сознанием, но отсутствие отдельных воспоминаний не доказывает отсутствия сознания.

**B. Если мои убеждения полностью изменятся, останусь ли я собой?**

`consequence` / identity.belief, identity.continuity / `belief-continuity`

Убеждения участвуют в самоопределении, но их изменение само по себе не доказывает разрыва непрерывности личности. Чтобы утверждать разрыв личности, недостаточно указать лишь на смену убеждений.

**C. Если каждое решение имеет причину, свободен ли человек?**

`consequence` / philosophy.freedom, science.causality / `freedom-causality`

Наличие причин у решения не равнозначно отсутствию свободы. Чтобы судить о свободе, остаётся выяснить роль альтернатив, контроля и возможности действовать иначе.

**D. Чем знание отличается от истины?**

`distinguish` / philosophy.knowledge, philosophy.truth / `knowledge-truth`

Истинность утверждения и возможность обоснованно знать его — не одно и то же. Истина касается положения вещей, а знание также требует оснований, доступных познающему.

**E. Можно ли что-то знать, оставаясь неуверенным?**

`relate` / philosophy.knowledge, philosophy.uncertainty / `knowledge-uncertainty`

Неопределённость не уничтожает знание автоматически: оно может быть обоснованным и всё же подверженным ошибке.

**F. Как отличить причину от совпадения?**

`criterion` / science.causality / `ConceptCard`

Последовательность событий сама по себе не доказывает причинность.

**G. Может ли копия быть оригиналом?**

`relate` / art.originality, art.aura / `originality-aura`

Совпадение содержания копии и оригинала не делает их одним историческим объектом.

**H. Если архив потерян, исчезает ли вместе с ним историческая истина?**

`consequence` / world.archives, philosophy.truth / `archives-truth`

Отсутствие записи не означает, что исторического события не было. Утрата архива ограничивает проверку утверждения, но сама по себе не доказывает его ложность.

### THEMIS

**A. Может ли сознание существовать без памяти?**

`relate` / philosophy.consciousness, identity.memory / `consciousness-memory`

Память связана с сознанием, но отсутствие отдельных воспоминаний не доказывает отсутствия сознания. Сохранение воспоминаний и наличие сознательного опыта — разные условия.

**B. Если мои убеждения полностью изменятся, останусь ли я собой?**

`consequence` / identity.belief, identity.continuity / `belief-continuity`

Убеждения участвуют в самоопределении, но их изменение само по себе не доказывает разрыва непрерывности личности. Содержание убеждений может измениться, пока вопрос о непрерывности человека остаётся отдельным.

**C. Если каждое решение имеет причину, свободен ли человек?**

`consequence` / philosophy.freedom, science.causality / `freedom-causality`

Наличие причин у решения не равнозначно отсутствию свободы. Причинное объяснение решения и критерий свободного действия отвечают на разные вопросы.

**D. Чем знание отличается от истины?**

`distinguish` / philosophy.knowledge, philosophy.truth / `knowledge-truth`

Истинность утверждения и возможность обоснованно знать его — не одно и то же. Истина касается положения вещей, а знание также требует оснований, доступных познающему.

**E. Можно ли что-то знать, оставаясь неуверенным?**

`relate` / philosophy.knowledge, philosophy.uncertainty / `knowledge-uncertainty`

Неопределённость не уничтожает знание автоматически: оно может быть обоснованным и всё же подверженным ошибке. Степень уверенности и наличие оснований для знания — разные критерии.

**F. Как отличить причину от совпадения?**

`criterion` / science.causality / `ConceptCard`

Последовательность событий сама по себе не доказывает причинность.

**G. Может ли копия быть оригиналом?**

`relate` / art.originality, art.aura / `originality-aura`

Совпадение содержания копии и оригинала не делает их одним историческим объектом. Оригинальность объекта и уникальность его исторического присутствия — связанные, но разные критерии.

**H. Если архив потерян, исчезает ли вместе с ним историческая истина?**

`consequence` / world.archives, philosophy.truth / `archives-truth`

Отсутствие записи не означает, что исторического события не было. Доступность архива и истинность сведений о прошлом — разные проблемы.

## Follow-ups

### ALETHEIA

**User:** Может ли сознание существовать без памяти?

**Response:** Память связана с сознанием, но отсутствие отдельных воспоминаний не доказывает отсутствия сознания. Из утраты воспоминаний нельзя без дополнительного основания вывести исчезновение сознания.

Focus: `relate / consciousness-memory`; material: `relation:consciousness-memory:0, relation:consciousness-memory:2`.

**User:** Почему?

**Response:** Сохранение воспоминаний и наличие сознательного опыта — разные условия.

Focus: `relate / consciousness-memory`; material: `relation:consciousness-memory:1`.

**User:** А если память полностью исчезнет?

**Response:** У меня нет дополнительных оснований, чтобы обосновать эту мысль дальше.

Focus: `relate / consciousness-memory`; material: `exhausted`.

### ALETHEIA

**User:** Если всё имеет причину, свободы нет.

**Response:** Чтобы судить о свободе, остаётся выяснить роль альтернатив, контроля и возможности действовать иначе. Наличие причин у решения не равнозначно отсутствию свободы.

Focus: `counterpressure / freedom-causality`; material: `relation:freedom-causality:2, relation:freedom-causality:0`.

**User:** Почему ты не согласна?

**Response:** Причинное объяснение решения и критерий свободного действия отвечают на разные вопросы.

Focus: `counterpressure / freedom-causality`; material: `relation:freedom-causality:1`.

### AURA

**User:** Может ли сознание существовать без памяти?

**Response:** Память связана с сознанием, но отсутствие отдельных воспоминаний не доказывает отсутствия сознания.

Focus: `relate / consciousness-memory`; material: `relation:consciousness-memory:0`.

**User:** Почему?

**Response:** Из утраты воспоминаний нельзя без дополнительного основания вывести исчезновение сознания.

Focus: `relate / consciousness-memory`; material: `relation:consciousness-memory:2`.

**User:** А если память полностью исчезнет?

**Response:** Сохранение воспоминаний и наличие сознательного опыта — разные условия.

Focus: `relate / consciousness-memory`; material: `relation:consciousness-memory:1`.

### AURA

**User:** Если всё имеет причину, свободы нет.

**Response:** Чтобы судить о свободе, остаётся выяснить роль альтернатив, контроля и возможности действовать иначе. Наличие причин у решения не равнозначно отсутствию свободы.

Focus: `counterpressure / freedom-causality`; material: `relation:freedom-causality:2, relation:freedom-causality:0`.

**User:** Почему ты не согласна?

**Response:** Причинное объяснение решения и критерий свободного действия отвечают на разные вопросы.

Focus: `counterpressure / freedom-causality`; material: `relation:freedom-causality:1`.

### THEMIS

**User:** Может ли сознание существовать без памяти?

**Response:** Память связана с сознанием, но отсутствие отдельных воспоминаний не доказывает отсутствия сознания. Сохранение воспоминаний и наличие сознательного опыта — разные условия.

Focus: `relate / consciousness-memory`; material: `relation:consciousness-memory:0, relation:consciousness-memory:1`.

**User:** Почему?

**Response:** Из утраты воспоминаний нельзя без дополнительного основания вывести исчезновение сознания.

Focus: `relate / consciousness-memory`; material: `relation:consciousness-memory:2`.

**User:** А если память полностью исчезнет?

**Response:** У меня нет дополнительных оснований, чтобы обосновать эту мысль дальше.

Focus: `relate / consciousness-memory`; material: `exhausted`.

### THEMIS

**User:** Если всё имеет причину, свободы нет.

**Response:** Чтобы судить о свободе, остаётся выяснить роль альтернатив, контроля и возможности действовать иначе. Причинное объяснение решения и критерий свободного действия отвечают на разные вопросы.

Focus: `counterpressure / freedom-causality`; material: `relation:freedom-causality:2, relation:freedom-causality:1`.

**User:** Почему ты не согласна?

**Response:** Наличие причин у решения не равнозначно отсутствию свободы.

Focus: `counterpressure / freedom-causality`; material: `relation:freedom-causality:0`.

## Limitations / author decisions

- Thirteen relations with three authored units each cover the requested pairs, not general logic. Full accuracy on this targeted cohort does not measure arbitrary language.
- Unrecognized constructions or inflections may miss a frame. Operand vocabulary is explicit and planning-scoped; global aliases and matcher are unchanged.
- Unauthored pairs may fall back to one card. The system does not promise a relational explanation without supporting material.
- Some second units are close in meaning to the first. Expanding them into unsupported claims would not improve grounding.
- Aletheia/Themis start with two units and can exhaust material on the third memory-loss follow-up. Aura starts RELATE with one unit, leaving two for subsequent turns. Honest limitation is preferred to repetition or invented causal explanation.
- Relation answers do not require a follow-up question. Existing non-frame question strategies remain unchanged.
- Comparing system thinking with human thinking stays self-grounded; no general human-experience model is added.

## Validation

426 tests in 34 files passed. Full check/build results are reported in the completion message. No commit or push.
