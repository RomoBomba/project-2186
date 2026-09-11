# Phase 9A2.2 — focus refinement

Baseline снят с точной временной копии незакоммиченного состояния 9A2.1 до
калибровки. Один и тот же runner и 16 новых RU/EN случаев запускались на старом
и новом движке. Каждый случай проверен для трёх персонажей.

Приоритет: новый явный концепт → совместимое уточнение → наследование без новой
темы. Входные сильные matcher-кандидаты имеют приоритет над словарным операндом;
среди равных используется порядок появления в реплике. Ведущие «а если», «тогда»,
«почему» не запрещают переключение. Изолированное «я» не служит концептом; только
ограниченный вопрос о сохранении собственного Я при существующем общем фокусе
может явно нацелить identity.self.

Старое отношение нельзя выбрать, если оно не содержит новый target. При отсутствии
авторского отношения выбирается карточка нового концепта. Прежний второй концепт
может остаться контекстной опорой, но relation ID не выдумывается. В условном
продолжении предпочтено авторское tension/summary нового концепта.

Диагностика retained/refined/pivoted/replaced/cleared описывает фактический переход
после планирования и ответа. Она не используется в интерфейсе и не сохраняется.
Метрика переходов проверяет использованные material keys: одной смены метаданных
недостаточно для успеха.

Исторические expectedFocus и знаменатели 9A2.1 не переписаны. Старый показатель
удержания снизился со 168/168 до 132/168. Все 36 расхождений — по три персонажа на
12 RU/EN префиксах: переключение belief→memory, consciousness→self и
knowledge/truth→belief, включая следующие чистые продолжения уже новой темы.
Проверки теперь требуют сохранения текущего фокуса именно без нового target,
а с target требуют его присутствия в фокусе и фактическом материале ответа.

Ниже — точные метрики и ответы регрессионных случаев. Все 13 ConceptRelations,
канонические карточки, SystemSelfModel, UI, persistence, портреты и тайминги
сохранены. Коммит и push не выполнялись.

## Baseline / after

| Metric                            |          Baseline |             After |
| --------------------------------- | ----------------: | ----------------: |
| focusTransitionAccuracy           |    30/48 (62.50%) |   48/48 (100.00%) |
| overRetainedFocusRate             |    18/30 (60.00%) |      0/30 (0.00%) |
| paraphraseFrameAccuracy           |   42/42 (100.00%) |   42/42 (100.00%) |
| followUpResolutionRate            | 144/144 (100.00%) | 144/144 (100.00%) |
| reasoningFocusRetentionRate       | 168/168 (100.00%) |  132/168 (78.57%) |
| groundedPartialAnswerRate         | 126/126 (100.00%) | 126/126 (100.00%) |
| selfFocusRetentionRate            |   24/24 (100.00%) |   24/24 (100.00%) |
| irrelevantOptionalAssociationRate |     0/192 (0.00%) |     0/192 (0.00%) |
| RUInflectionOperandRecall         |     6/6 (100.00%) |     6/6 (100.00%) |
| reasoningFrameAccuracy            |   96/96 (100.00%) |   96/96 (100.00%) |
| requiredConceptAvailability       | 180/180 (100.00%) | 180/180 (100.00%) |
| authoredRelationCoverage          |   84/84 (100.00%) |   84/84 (100.00%) |
| groundedReasoningPlanRate         |   96/96 (100.00%) |   96/96 (100.00%) |
| associationBeforeAnswerRate       |      0/96 (0.00%) |      0/96 (0.00%) |
| primaryConceptAccuracy            |  102/110 (92.73%) |  102/110 (92.73%) |
| expectedConceptRecall             |  111/122 (90.98%) |  111/122 (90.98%) |
| knownToUnknownRate                |     4/110 (3.64%) |     4/110 (3.64%) |
| falsePositiveRate                 |     2/18 (11.11%) |     2/18 (11.11%) |
| relationCoverage                  |    16/24 (66.67%) |    16/24 (66.67%) |

Self: original 8/8, expanded 52/52; classification/grounding 24/24 and 156/156; false positives 0/384. Historical contextual cohort 9/18. All unchanged.

## RU / EN regression output

### ru-focus-transition-1

Если всё имеет причину, возможна ли свобода? → Почему?

**ALETHEIA**

retained / freedom-causality

Причинное объяснение решения и критерий свободного действия отвечают на разные вопросы. Этого недостаточно для более сильного вывода в этом случае.

**AURA**

retained / freedom-causality

Причинное объяснение решения и критерий свободного действия отвечают на разные вопросы. Этого недостаточно для более сильного вывода в этом случае.

**THEMIS**

retained / freedom-causality

Чтобы судить о свободе, остаётся выяснить роль альтернатив, контроля и возможности действовать иначе. Этого недостаточно для более сильного вывода в этом случае.

### en-focus-transition-1

If everything has a cause, is freedom possible? → Why?

**ALETHEIA**

retained / freedom-causality

A causal explanation of a decision and a criterion of free action answer different questions. This is not sufficient for a stronger conclusion in this case.

**AURA**

retained / freedom-causality

A causal explanation of a decision and a criterion of free action answer different questions. This is not sufficient for a stronger conclusion in this case.

**THEMIS**

retained / freedom-causality

Judging freedom still requires examining alternatives, control, and what it means to act otherwise. This is not sufficient for a stronger conclusion in this case.

### ru-focus-transition-2

Может ли копия быть оригиналом? → А если она атом в атом идентична?

**ALETHEIA**

retained / originality-aura

Оригинальность объекта и уникальность его исторического присутствия — связанные, но разные критерии. Этого недостаточно для более сильного вывода в этом случае.

**AURA**

retained / originality-aura

Точность воспроизведения сама по себе не переносит на копию всю историю оригинала. Этого недостаточно для более сильного вывода в этом случае.

**THEMIS**

retained / originality-aura

Точность воспроизведения сама по себе не переносит на копию всю историю оригинала. Этого недостаточно для более сильного вывода в этом случае.

### en-focus-transition-2

Can a copy be an original? → What if it is identical atom for atom?

**ALETHEIA**

retained / originality-aura

An object being original and its historical presence being unique are related but different criteria. This is not sufficient for a stronger conclusion in this case.

**AURA**

retained / originality-aura

Accuracy of reproduction does not by itself transfer the entire history of an original to its copy. This is not sufficient for a stronger conclusion in this case.

**THEMIS**

retained / originality-aura

Accuracy of reproduction does not by itself transfer the entire history of an original to its copy. This is not sufficient for a stronger conclusion in this case.

### ru-focus-transition-3

Если архив потерян, исчезает ли истина? → А если остался только один источник?

**ALETHEIA**

retained / archives-truth

Доступность архива и истинность сведений о прошлом — разные проблемы. Этого недостаточно для более сильного вывода в этом случае.

**AURA**

retained / archives-truth

Доступность архива и истинность сведений о прошлом — разные проблемы. Этого недостаточно для более сильного вывода в этом случае.

**THEMIS**

retained / archives-truth

Утрата архива ограничивает проверку утверждения, но сама по себе не доказывает его ложность. Этого недостаточно для более сильного вывода в этом случае.

### en-focus-transition-3

If archives are lost, is truth lost? → What if only one source remains?

**ALETHEIA**

retained / archives-truth

Archive availability and the truth of claims about the past are different problems. This is not sufficient for a stronger conclusion in this case.

**AURA**

retained / archives-truth

Archive availability and the truth of claims about the past are different problems. This is not sufficient for a stronger conclusion in this case.

**THEMIS**

retained / archives-truth

Losing an archive limits verification of a claim but does not by itself establish its falsity. This is not sufficient for a stronger conclusion in this case.

### ru-focus-transition-4

Если мои убеждения полностью изменятся, останусь ли я собой? → А если воспоминания изменятся?

**ALETHEIA**

pivoted / ['identity.memory', 'identity.continuity']

Если воспоминания изменяются, непонятно, почему они должны гарантировать неизменность личности. Этого недостаточно для более сильного вывода в этом случае.

**AURA**

pivoted / ['identity.memory', 'identity.continuity']

Если воспоминания изменяются, непонятно, почему они должны гарантировать неизменность личности. Этого недостаточно для более сильного вывода в этом случае.

**THEMIS**

pivoted / ['identity.memory', 'identity.continuity']

Если воспоминания изменяются, непонятно, почему они должны гарантировать неизменность личности. Этого недостаточно для более сильного вывода в этом случае.

### en-focus-transition-4

If my beliefs completely change, will I remain myself? → What if my memories change?

**ALETHEIA**

pivoted / ['identity.memory', 'identity.continuity']

If memories change, it is unclear why they should guarantee an unchanged identity. This is not sufficient for a stronger conclusion in this case.

**AURA**

pivoted / ['identity.memory', 'identity.continuity']

If memories change, it is unclear why they should guarantee an unchanged identity. This is not sufficient for a stronger conclusion in this case.

**THEMIS**

pivoted / ['identity.memory', 'identity.continuity']

If memories change, it is unclear why they should guarantee an unchanged identity. This is not sufficient for a stronger conclusion in this case.

### ru-focus-transition-5

Допустим я потерял все воспоминания. Сознание останется? → А если личность изменится?

**ALETHEIA**

pivoted / ['identity.self', 'identity.memory']

Если у Я нет одной неизменной части, возникает вопрос, является ли оно самостоятельной сущностью или только устойчивым отношением между меняющимися элементами. Этого недостаточно для более сильного вывода в этом случае.

**AURA**

pivoted / ['identity.self', 'identity.memory']

Если у Я нет одной неизменной части, возникает вопрос, является ли оно самостоятельной сущностью или только устойчивым отношением между меняющимися элементами. Этого недостаточно для более сильного вывода в этом случае.

**THEMIS**

pivoted / ['identity.self', 'identity.memory']

Если у Я нет одной неизменной части, возникает вопрос, является ли оно самостоятельной сущностью или только устойчивым отношением между меняющимися элементами. Этого недостаточно для более сильного вывода в этом случае.

### en-focus-transition-5

Suppose I lost all memories. Would consciousness remain? → What if personal identity changes?

**ALETHEIA**

pivoted / ['identity.self', 'identity.memory']

If the self has no single unchanging part, it is unclear whether it is an independent entity or only a stable relation among changing elements. This is not sufficient for a stronger conclusion in this case.

**AURA**

pivoted / ['identity.self', 'identity.memory']

If the self has no single unchanging part, it is unclear whether it is an independent entity or only a stable relation among changing elements. This is not sufficient for a stronger conclusion in this case.

**THEMIS**

pivoted / ['identity.self', 'identity.memory']

If the self has no single unchanging part, it is unclear whether it is an independent entity or only a stable relation among changing elements. This is not sufficient for a stronger conclusion in this case.

### ru-focus-transition-6

Может ли сознание существовать без памяти? → Тогда это всё ещё буду я?

**ALETHEIA**

pivoted / ['identity.self', 'identity.memory']

Человек переживает себя как единое Я, даже когда его мысли и состояния постоянно меняются. Этого недостаточно для более сильного вывода в этом случае.

**AURA**

pivoted / ['identity.self', 'identity.memory']

Человек переживает себя как единое Я, даже когда его мысли и состояния постоянно меняются. Этого недостаточно для более сильного вывода в этом случае.

**THEMIS**

pivoted / ['identity.self', 'identity.memory']

Человек переживает себя как единое Я, даже когда его мысли и состояния постоянно меняются. Этого недостаточно для более сильного вывода в этом случае.

### en-focus-transition-6

Can consciousness exist without memory? → Then would that still be me?

**ALETHEIA**

pivoted / ['identity.self', 'identity.memory']

A person experiences themselves as a unified self even while thoughts and states constantly change. This is not sufficient for a stronger conclusion in this case.

**AURA**

pivoted / ['identity.self', 'identity.memory']

A person experiences themselves as a unified self even while thoughts and states constantly change. This is not sufficient for a stronger conclusion in this case.

**THEMIS**

pivoted / ['identity.self', 'identity.memory']

A person experiences themselves as a unified self even while thoughts and states constantly change. This is not sufficient for a stronger conclusion in this case.

### ru-focus-transition-7

Мы потеряли архивы прошлого. Значит мы больше не можем знать правду о нём? → Что ты тогда считаешь знанием?

**ALETHEIA**

refined / knowledge-truth

Истина касается положения вещей, а знание также требует оснований, доступных познающему. Этого недостаточно для более сильного вывода в этом случае.

**AURA**

refined / knowledge-truth

Истина касается положения вещей, а знание также требует оснований, доступных познающему. Этого недостаточно для более сильного вывода в этом случае.

**THEMIS**

refined / knowledge-truth

Истина касается положения вещей, а знание также требует оснований, доступных познающему. Этого недостаточно для более сильного вывода в этом случае.

### en-focus-transition-7

We lost the archives of the past. Does that mean we cannot know the truth about it? → What do you consider knowledge then?

**ALETHEIA**

refined / knowledge-truth

Truth concerns how things are, while knowledge also requires grounds available to a knower. This is not sufficient for a stronger conclusion in this case.

**AURA**

refined / knowledge-truth

Truth concerns how things are, while knowledge also requires grounds available to a knower. This is not sufficient for a stronger conclusion in this case.

**THEMIS**

refined / knowledge-truth

Truth concerns how things are, while knowledge also requires grounds available to a knower. This is not sufficient for a stronger conclusion in this case.

### ru-focus-transition-8

Если всё имеет причину, возможна ли свобода? → Что такое оригинальность?

**ALETHEIA**

replaced / ['art.originality']

Оригинальность может означать происхождение от конкретного автора, уникальность объекта или появление нового способа видеть и создавать. Эти значения не всегда совпадают.

**AURA**

replaced / ['art.originality']

Оригинальность может означать происхождение от конкретного автора, уникальность объекта или появление нового способа видеть и создавать. Эти значения не всегда совпадают.

**THEMIS**

replaced / ['art.originality']

Оригинальность может означать происхождение от конкретного автора, уникальность объекта или появление нового способа видеть и создавать. Эти значения не всегда совпадают.

### en-focus-transition-8

If everything has a cause, is freedom possible? → What is originality?

**ALETHEIA**

replaced / ['art.originality']

Originality may refer to originating from a particular author, the uniqueness of an object, or the emergence of a new way of seeing and creating. These senses do not always coincide.

**AURA**

replaced / ['art.originality']

Originality may refer to originating from a particular author, the uniqueness of an object, or the emergence of a new way of seeing and creating. These senses do not always coincide.

**THEMIS**

replaced / ['art.originality']

Originality may refer to originating from a particular author, the uniqueness of an object, or the emergence of a new way of seeing and creating. These senses do not always coincide.
