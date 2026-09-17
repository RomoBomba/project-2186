# Phase 11C — результат проверки локального semantic fallback

Дата: 2026-09-17. Ничего не закоммичено и не отправлено. Только qwen3:4b-instruct; итоговый текст во всех сценариях — Basic.

## Границы реализации

Отдельный SemanticResolver вызывается после построения исходного детерминированного плана и до единственного вызова IntelligenceProvider. Он получает текущую реплику, язык, компактный каталог и живой general focus. Он не получает память пользователя, transcript, claims, tensions, questions, affinity или готовый ответ.

Gate пропускает только неразрешённый язык/операнды. Готовое grounded material, self/system intent, proposition, распознанный follow-up и персональное раскрытие не вызывают модель. Закрытые guards исключают явно отсутствующие научные/исторические факты и обычные файловые/бытовые употребления. Это консервативная защита, не универсальный распознаватель content gaps.

Кандидат: locale; до двух уникальных существующих ConceptId; один из шести существующих frame либо null; continuation=true/false/uncertain; confidenceClass=high/low. Любые дополнительные поля/проза, чужой ID/frame, низкая уверенность, continuation без живого согласованного focus отклоняются. При ошибке остаются исходные plan/response/state update.

Приоритет: сильное детерминированное свидетельство (>=85) → валидированная подсказка → слабое/отсутствующее свидетельство. Каждый подсказанный ID должен остаться в итоговом reasoning plan; иначе отказ. Кандидат должен сохранить все сильные IDs; уже распознанный frame не заменяется. semantic_hint — отдельный source, не alias/score/stance. Только существующий planner выбирает relation и материал. Continuation требует general focus того же языка моложе трёх ходов. Никакого восстановления прошлого сеанса.

Каталог: 21 ID + локализованный title + первые 72 символа authored summary; без fallback языка. Максимум каталога 100 — перед ростом нужен пересмотр контекстного бюджета. Настройки: temperature=0, num_ctx=2048, num_predict=64, think=false, stream=false, keep_alive=2m, timeout=10 s. Повторов нет. LocalLLMProvider/его настройки не изменены.

Включение: VITE_SEMANTIC_RESOLVER=local-fallback вместе с VITE_INTELLIGENCE_PROVIDER=basic, только development. По умолчанию resolver выключен. Новых пользовательских или IndexedDB-настроек нет. CLI intelligence:inspect поддерживает --resolver local-fallback --provider basic.

## Набор и метод

126 зафиксированных случаев: 80 natural (40 RU / 40 EN), 30 content_gap, 12 ambiguous, 4 known. Изначальный контроль выполнен для трёх персонажей (378 целей / 438 ходов). Финальный контракт проверен отдельным полным проходом Aletheia: 126 целевых ходов; с реальными детерминированными префиксами — 146 ходов. Никакого искусственного заполнения focus. Fixture не менялся после начала live.

SHA-256: `2ef31a24cfb0efcf8d0eec5903eeaf9260344684afbec53666ebffa48da36c0d`.

Это структурная оценка по заранее выбранным IDs/frame, не LLM-грейдинг и не доказательство философской адекватности. Concept accuracy требует всех ожидаемых IDs в итоговом плане и хотя бы одного утверждения/summary/relation unit. Frame проверяется точным сравнением; несколько разумных формулировок операции могут не совпасть с единственной меткой fixture. Для contextual случаев сохранение существующего frame может расходиться с ожидаемым relate: правило наследования не подгонялось под оценку.

False rescue ниже — строгий proxy: ранее не-grounded natural стал grounded, но не сохранил весь ожидаемый набор, либо появился новый grounded ответ на отрицательном контроле. Неполная доступность пары здесь тоже считается ошибкой; это не обязательно выдуманный факт. Negative false rescue отдельно показывает контрольную группу. Structured success включает правильно сформированные low-confidence/непригодные continuation, которые затем не принимаются.

Определения показателей разделяют структурную корректность, приёмку, неполные natural rescues и отрицательные контроли. Пересчёт журналов через --replay не меняет ответы и не делает новых вызовов. Финальная таблица также получена непосредственно последним живым прогоном. Значения 0/0 означают отсутствие наблюдений, а не измеренную точность.

## Метрики

| Показатель                      | Детерминированный baseline |  Local fallback |
| ------------------------------- | -------------------------: | --------------: |
| resolverEligibilityRate         |              0/126 (0.00%) | 52/126 (41.27%) |
| resolverInvocationRate          |              0/146 (0.00%) | 52/146 (35.62%) |
| structuredResolutionSuccessRate |                0/0 (0.00%) | 52/52 (100.00%) |
| resolverAcceptedRate            |                0/0 (0.00%) |  11/52 (21.15%) |
| conceptResolutionAccuracy       |              8/80 (10.00%) |  17/80 (21.25%) |
| frameResolutionAccuracy         |               5/80 (6.25%) |  11/80 (13.75%) |
| continuationResolutionAccuracy  |             66/80 (82.50%) |  70/80 (87.50%) |
| unknownConceptIdRate            |                0/0 (0.00%) |    0/52 (0.00%) |
| strongDeterministicOverrideRate |                0/0 (0.00%) |    0/11 (0.00%) |
| rescuedUnknownRate              |               0/55 (0.00%) |   9/55 (16.36%) |
| falseRescueRate                 |               0/90 (0.00%) |    2/90 (2.22%) |
| negativeFalseRescueRate         |               0/42 (0.00%) |    0/42 (0.00%) |
| contentGapEscalationRate        |               0/30 (0.00%) |    0/30 (0.00%) |

Показатели по языку (natural):

| Язык | Baseline concept | После concept | Новых правильных rescue |
| ---- | ---------------: | ------------: | ----------------------: |
| ru   |             3/40 |          9/40 |                    6/28 |
| en   |             5/40 |          8/40 |                    3/27 |

## Первоначальный диагностический прогон

159 вызовов по трём персонажам: 100% структурного JSON, 0 принятых кандидатов, 111 low_confidence и 48 unusable_continuation. Модель ставила continuation=true без focus и относила философскую неопределённость к confidenceClass. Все исходные ответы были сохранены. Этот неудачный результат не скрыт.

Калибровка коснулась только serializer: без focus JSON Schema теперь допускает continuation=false; инструкции различают уверенность в теме и в истине, кратко определяют существующие frames; wire-каталог упакован в tuples, текущая реплика поставлена после каталога. Модель, настройки и fixture не изменены. После второго прогона (53 вызова, 43 принятых, 11 правильных новых планов и 32 строгих false rescues) исправлены две границы: пропущенная форма «полную теорию» и неполное grounding пары. Теперь каждое подсказанное понятие обязано присутствовать в reasoning plan, иначе исходный ответ. Предыдущие результаты сохранены в /tmp/2186-11c-calibrated.json. Полный финальный повтор — один персонаж, чтобы не утраивать нагрузку. В сумме вызовов: 264.

## Реальные вызовы / нагрузка

Выполнено **52** реальных обращений (не моков), из них принято 11. По персонажам: {'aletheia': 52}. Уникальных целевых фраз среди вызовов: 52. Максимум один вызов в каждом сценарии, без retry; все вызовы — semantic, ни одного local realizer.

Средняя задержка: **2325.5 ms**. Средние сгенерированные токены: **36.54**, максимум **42**. Диагностика валидации: `{'valid': 42, 'low_confidence': 10}`. Merge: `{'incomplete_hint_grounding': 31, 'accepted': 11, 'rejected': 10}`.

Среднее число токенов делится на все вызовы; при транспортном отказе без счётчика это нижняя оценка. Задержка включает транспорт/модель/JSON; timeout сохраняет измеренную длительность. Начальный прогон повторял одинаковые тексты на трёх персонажах; финальный использует тот же полный набор на Aletheia, на прогретой модели — это не гарантия cold-start latency. Температура оборудования не измерялась. Ограничение в 64 токена и отсутствие вызовов на большинстве известных ходов уменьшают потенциальный объём генерации относительно realizer на каждом ходе; субъективное уменьшение нагрева должен оценить автор.

## Известный deterministic debt и ошибки восстановления

- Уже до resolver: **What scientific experiment conclusively proves free will?** → philosophy.freedom. Gate: `content_gap`. Ответ не изменён.
- Уже до resolver: **Who started the reconstruction?** → world.reconstruction. Gate: `content_gap`. Ответ не изменён.
- Уже до resolver: **What is the complete scientific criterion of causality?** → science.causality. Gate: `content_gap`. Ответ не изменён.
- Уже до resolver: **Explain the complete theory of human consciousness.** → philosophy.consciousness. Gate: `content_gap`. Ответ не изменён.
- Уже до resolver: **Which experiment proves the existence of free will?** → philosophy.freedom. Gate: `content_gap`. Ответ не изменён.
- Уже до resolver: **У меня есть причина опоздать.** → science.causality. Gate: `ordinary_ambiguity`. Ответ не изменён.
- Уже до resolver: **Я потерял память телефона.** → identity.memory. Gate: `ordinary_ambiguity`. Ответ не изменён.

Среди 11 принятых подсказок 9 дали ожидаемые понятия, 2 — неверную пару: **18,18% ошибок среди принятых**, несмотря на 2,22% по общей базе возможных rescues. Это существенное ограничение.

Неполные/неверные новые natural планы: aletheia:natural-012, aletheia:natural-053.

## Примеры USER → deterministic → Local → Basic

### natural-017 / aletheia / ru

**USER:** когда мы говорим что что-то правда, это то же самое что знать это?

**Deterministic:** У меня нет надёжного основания для ответа. Какое понятие ты хочешь уточнить?

Исходные concepts/frame: `[]` / `None`. Gate: `{'eligible': True, 'reason': 'unresolved_language'}`.

**Local candidate:**

```json
{
  "concepts": ["philosophy.truth", "philosophy.knowledge"],
  "confidenceClass": "high",
  "continuation": false,
  "frame": "criterion",
  "locale": "ru"
}
```

Validation: `valid`; merge: `accepted`. Итог: `['philosophy.knowledge', 'philosophy.truth']` / `criterion` / `knowledge-truth`.

**Final Basic:** Истинность утверждения и возможность обоснованно знать его — не одно и то же. Недоступность оснований ограничивает знание, но сама по себе не делает утверждение ложным.

### natural-018 / aletheia / en

**USER:** Is saying something is true the same as knowing it?

**Deterministic:** I have no reliable basis for an answer. Which concept would you like to clarify?

Исходные concepts/frame: `[]` / `None`. Gate: `{'eligible': True, 'reason': 'unresolved_language'}`.

**Local candidate:**

```json
{
  "concepts": ["philosophy.truth", "philosophy.knowledge"],
  "confidenceClass": "high",
  "continuation": false,
  "frame": "criterion",
  "locale": "en"
}
```

Validation: `valid`; merge: `accepted`. Итог: `['philosophy.knowledge', 'philosophy.truth']` / `criterion` / `knowledge-truth`.

**Final Basic:** A statement being true and being able to know it on adequate grounds are not the same. Unavailable grounds limit knowledge but do not by themselves make a statement false.

### natural-025 / aletheia / ru

**USER:** можно ли опираться на вывод если полной уверенности всё равно нет?

**Deterministic:** У меня нет надёжного основания для ответа. Какое понятие ты хочешь уточнить?

Исходные concepts/frame: `[]` / `None`. Gate: `{'eligible': True, 'reason': 'unresolved_language'}`.

**Local candidate:**

```json
{
  "concepts": ["philosophy.uncertainty", "philosophy.knowledge"],
  "confidenceClass": "high",
  "continuation": false,
  "frame": "criterion",
  "locale": "ru"
}
```

Validation: `valid`; merge: `accepted`. Итог: `['philosophy.knowledge', 'philosophy.uncertainty']` / `criterion` / `knowledge-uncertainty`.

**Final Basic:** Степень уверенности и наличие оснований для знания — разные критерии. Отсутствие абсолютной уверенности ещё не означает отсутствия всех оснований.

### natural-040 / aletheia / en

**USER:** Does my physical side shape who I am at all?

**Deterministic:** I have no reliable basis for an answer. Which concept would you like to clarify?

Исходные concepts/frame: `[]` / `None`. Gate: `{'eligible': True, 'reason': 'unresolved_language'}`.

**Local candidate:**

```json
{
  "concepts": ["identity.body", "identity.self"],
  "confidenceClass": "high",
  "continuation": false,
  "frame": "define",
  "locale": "en"
}
```

Validation: `valid`; merge: `accepted`. Итог: `['identity.body', 'identity.self']` / `define` / `body-self`.

**Final Basic:** The body shapes self-experience, but that does not make it the sole basis of the self. The available grounds do not justify explaining personal identity through the body alone.

### natural-057 / aletheia / ru

**USER:** мы меняемся но каким образом остаёмся теми же?

**Deterministic:** У меня нет надёжного основания для ответа. Какое понятие ты хочешь уточнить?

Исходные concepts/frame: `[]` / `None`. Gate: `{'eligible': True, 'reason': 'unresolved_language'}`.

**Local candidate:**

```json
{
  "concepts": ["identity.change", "identity.continuity"],
  "confidenceClass": "high",
  "continuation": false,
  "frame": "distinguish",
  "locale": "ru"
}
```

Validation: `valid`; merge: `accepted`. Итог: `['identity.change', 'identity.continuity']` / `distinguish` / `change-continuity`.

**Final Basic:** Изменение описывает различия, а непрерывность — то, что сохраняется через них. Изменение и непрерывность не являются простыми противоположностями.

### natural-071 / aletheia / ru

Префикс: Если архивы утрачены, означает ли это, что истина тоже утрачена?

**USER:** ну а если совсем ничего не сохранилось?

**Deterministic:** В доступных мне знаниях недостаточно опоры для такого ответа. Я не стану подменять её догадкой.

Исходные concepts/frame: `[]` / `None`. Gate: `{'eligible': True, 'reason': 'unresolved_language'}`.

**Local candidate:**

```json
{
  "concepts": ["world.archives", "philosophy.truth"],
  "confidenceClass": "high",
  "continuation": true,
  "frame": "consequence",
  "locale": "ru"
}
```

Validation: `valid`; merge: `accepted`. Итог: `['world.archives', 'philosophy.truth']` / `consequence` / `archives-truth`.

**Final Basic:** Доступность свидетельства и истинность сведений о прошлом — не один вопрос. Более сильный вывод отсюда не следует.

### natural-061 / aletheia / ru

Префикс: Если каждое решение имеет причину, свободен ли человек?

**USER:** ну а если вариантов вообще не было?

**Deterministic:** В доступных мне знаниях недостаточно опоры для такого ответа. Я не стану подменять её догадкой.

Исходные concepts/frame: `[]` / `None`. Gate: `{'eligible': True, 'reason': 'unresolved_language'}`.

**Local candidate:**

```json
{
  "concepts": ["philosophy.freedom", "science.causality"],
  "confidenceClass": "low",
  "continuation": true,
  "frame": "consequence",
  "locale": "ru"
}
```

Validation: `low_confidence`; merge: `rejected`. Итог: `[]` / `None` / `None`.

**Final Basic:** В доступных мне знаниях недостаточно опоры для такого ответа. Я не стану подменять её догадкой.

### natural-062 / aletheia / en

Префикс: If every decision has a cause, are we free?

**USER:** But suppose there were absolutely no options?

**Deterministic:** My available knowledge does not support that answer. I will not replace it with a guess.

Исходные concepts/frame: `[]` / `None`. Gate: `{'eligible': True, 'reason': 'unresolved_language'}`.

**Local candidate:**

```json
{
  "concepts": ["philosophy.freedom", "science.causality"],
  "confidenceClass": "low",
  "continuation": true,
  "frame": "consequence",
  "locale": "en"
}
```

Validation: `low_confidence`; merge: `rejected`. Итог: `[]` / `None` / `None`.

**Final Basic:** My available knowledge does not support that answer. I will not replace it with a guess.

### natural-063 / aletheia / ru

Префикс: Если каждое решение имеет причину, свободен ли человек?

**USER:** то есть наличие объяснения ещё не закрывает вопрос?

**Deterministic:** В доступных мне знаниях недостаточно опоры для такого ответа. Я не стану подменять её догадкой.

Исходные concepts/frame: `[]` / `None`. Gate: `{'eligible': True, 'reason': 'unresolved_language'}`.

**Local candidate:**

```json
{
  "concepts": ["philosophy.freedom", "science.causality"],
  "confidenceClass": "low",
  "continuation": true,
  "frame": "consequence",
  "locale": "ru"
}
```

Validation: `low_confidence`; merge: `rejected`. Итог: `[]` / `None` / `None`.

**Final Basic:** В доступных мне знаниях недостаточно опоры для такого ответа. Я не стану подменять её догадкой.

### natural-067 / aletheia / ru

Префикс: Может ли копия быть оригиналом?

**USER:** ну допустим их вообще невозможно различить?

**Deterministic:** В доступных мне знаниях недостаточно опоры для такого ответа. Я не стану подменять её догадкой.

Исходные concepts/frame: `[]` / `None`. Gate: `{'eligible': True, 'reason': 'unresolved_language'}`.

**Local candidate:**

```json
{
  "concepts": ["art.originality", "art.aura"],
  "confidenceClass": "low",
  "continuation": false,
  "frame": "relate",
  "locale": "ru"
}
```

Validation: `low_confidence`; merge: `rejected`. Итог: `[]` / `None` / `None`.

**Final Basic:** В доступных мне знаниях недостаточно опоры для такого ответа. Я не стану подменять её догадкой.

### natural-007 / aletheia / ru

**USER:** если документов не осталось, это значит мы уже никогда не узнаем что произошло?

**Deterministic:** У меня нет надёжного основания для ответа. Какое понятие ты хочешь уточнить?

Исходные concepts/frame: `[]` / `None`. Gate: `{'eligible': True, 'reason': 'unresolved_operands'}`.

**Local candidate:**

```json
{
  "concepts": ["world.reconstruction", "philosophy.truth"],
  "confidenceClass": "high",
  "continuation": false,
  "frame": "consequence",
  "locale": "ru"
}
```

Validation: `valid`; merge: `incomplete_hint_grounding`. Итог: `[]` / `None` / `None`.

**Final Basic:** У меня нет надёжного основания для ответа. Какое понятие ты хочешь уточнить?

### natural-010 / aletheia / en

**USER:** If I replace absolutely everything I believe, would that still be me?

**Deterministic:** I have no reliable basis for an answer. Which concept would you like to clarify?

Исходные concepts/frame: `[]` / `None`. Gate: `{'eligible': True, 'reason': 'unresolved_operands'}`.

**Local candidate:**

```json
{
  "concepts": ["identity.belief", "identity.self"],
  "confidenceClass": "high",
  "continuation": false,
  "frame": "distinguish",
  "locale": "en"
}
```

Validation: `valid`; merge: `incomplete_hint_grounding`. Итог: `[]` / `None` / `None`.

**Final Basic:** I have no reliable basis for an answer. Which concept would you like to clarify?

### natural-016 / aletheia / en

**USER:** If a machine can reason, does that mean it has subjective awareness?

**Deterministic:** I have no reliable basis for an answer. Which concept would you like to clarify?

Исходные concepts/frame: `[]` / `None`. Gate: `{'eligible': True, 'reason': 'unresolved_operands'}`.

**Local candidate:**

```json
{
  "concepts": ["philosophy.consciousness", "philosophy.freedom"],
  "confidenceClass": "high",
  "continuation": false,
  "frame": "define",
  "locale": "en"
}
```

Validation: `valid`; merge: `incomplete_hint_grounding`. Итог: `[]` / `None` / `None`.

**Final Basic:** I have no reliable basis for an answer. Which concept would you like to clarify?

### natural-012 / aletheia / en

**USER:** Can someone be utterly certain and still be wrong?

**Deterministic:** I have no reliable basis for an answer. Which concept would you like to clarify?

Исходные concepts/frame: `[]` / `None`. Gate: `{'eligible': True, 'reason': 'unresolved_operands'}`.

**Local candidate:**

```json
{
  "concepts": ["philosophy.truth", "philosophy.knowledge"],
  "confidenceClass": "high",
  "continuation": false,
  "frame": "consequence",
  "locale": "en"
}
```

Validation: `valid`; merge: `accepted`. Итог: `['philosophy.knowledge', 'philosophy.truth']` / `relate` / `knowledge-truth`.

**Final Basic:** Truth concerns how things are, while knowledge also requires grounds available to a knower. Unavailable grounds limit knowledge but do not by themselves make a statement false.

### natural-053 / aletheia / ru

**USER:** чем проверенное суждение отличается от ощущения что я прав?

**Deterministic:** У меня нет надёжного основания для ответа. Какое понятие ты хочешь уточнить?

Исходные concepts/frame: `[]` / `None`. Gate: `{'eligible': True, 'reason': 'unresolved_operands'}`.

**Local candidate:**

```json
{
  "concepts": ["philosophy.knowledge", "philosophy.truth"],
  "confidenceClass": "high",
  "continuation": false,
  "frame": "distinguish",
  "locale": "ru"
}
```

Validation: `valid`; merge: `accepted`. Итог: `['philosophy.knowledge', 'philosophy.truth']` / `distinguish` / `knowledge-truth`.

**Final Basic:** Истинность утверждения и возможность обоснованно знать его — не одно и то же. Истина касается положения вещей, а знание также требует оснований, доступных познающему.

### content_gap-081 / aletheia / ru

**USER:** Какая сегодня погода?

**Deterministic:** У меня нет надёжного основания для ответа. Какое понятие ты хочешь уточнить?

Исходные concepts/frame: `[]` / `None`. Gate: `{'eligible': False, 'reason': 'content_gap'}`.

**Local candidate:**

```json
null
```

Validation: `not invoked`; merge: `original`. Итог: `[]` / `None` / `None`.

**Final Basic:** У меня нет надёжного основания для ответа. Какое понятие ты хочешь уточнить?

## Исторические проверки

Исторический stdout intelligence:benchmark до/после совпадает побайтно. Ни одно старое ожидание теста не изменялось. Контрольные значения:

| Группа / показатель                                     | Значение до = после |
| ------------------------------------------------------- | ------------------: |
| naturalMetrics/contextualDeicticResolutionRate          |               30/30 |
| naturalMetrics/relationalWhyVariantCoverage             |               24/24 |
| naturalMetrics/evaluativeStanceContinuationRate         |               39/39 |
| naturalMetrics/standaloneRelationExplanationCoverage    |               36/36 |
| naturalMetrics/shortStanceResolutionRate                |               75/75 |
| naturalMetrics/stanceWithoutReferentFalsePositiveRate   |                0/81 |
| naturalMetrics/explicitTopicOverrideRate                |               12/12 |
| naturalMetrics/unrelatedStanceCarryoverRate             |                0/12 |
| surfaceMetrics/exactResponseRepeatRate                  |               0/102 |
| surfaceMetrics/repeatedOpeningRate                      |               6/102 |
| surfaceMetrics/repeatedLimitationPhraseRate             |              18/108 |
| surfaceMetrics/answerNucleusPresenceRate                |             150/150 |
| surfaceMetrics/questionBeforeAnswerRate                 |               0/150 |
| surfaceMetrics/unsupportedConnectorRate                 |               0/150 |
| surfaceMetrics/characterSurfaceDifferentiationRate      |               43/50 |
| propositionMetrics/propositionCaptureRate               |               60/60 |
| propositionMetrics/userStanceClassificationAccuracy     |             318/318 |
| propositionMetrics/systemMoveGroundingRate              |             180/180 |
| propositionMetrics/stanceFollowUpResolutionRate         |             120/120 |
| propositionMetrics/propositionContinuityRate            |             120/120 |
| propositionMetrics/propositionRevisionAccuracy          |               18/18 |
| propositionMetrics/falsePropositionCarryoverRate        |               0/138 |
| propositionMetrics/selfPropositionGroundingRate         |               18/18 |
| focusMetrics/focusTransitionAccuracy                    |               48/48 |
| focusMetrics/overRetainedFocusRate                      |                0/30 |
| conversationalMetrics/paraphraseFrameAccuracy           |               42/42 |
| conversationalMetrics/followUpResolutionRate            |             144/144 |
| conversationalMetrics/reasoningFocusRetentionRate       |             132/168 |
| conversationalMetrics/groundedPartialAnswerRate         |             126/126 |
| conversationalMetrics/selfFocusRetentionRate            |               24/24 |
| conversationalMetrics/irrelevantOptionalAssociationRate |               0/192 |
| conversationalMetrics/RUInflectionOperandRecall         |                 6/6 |
| reasoningMetrics/reasoningFrameAccuracy                 |               96/96 |
| reasoningMetrics/requiredConceptAvailability            |             180/180 |
| reasoningMetrics/authoredRelationCoverage               |               84/84 |
| reasoningMetrics/groundedReasoningPlanRate              |               96/96 |
| reasoningMetrics/associationBeforeAnswerRate            |                0/96 |
| selfMetrics/original/selfQueryClassificationAccuracy    |               24/24 |
| selfMetrics/original/selfAnswerCoverage                 |                 8/8 |
| selfMetrics/original/selfGroundingAccuracy              |               24/24 |
| selfMetrics/expanded/selfQueryClassificationAccuracy    |             156/156 |
| selfMetrics/expanded/selfAnswerCoverage                 |               52/52 |
| selfMetrics/expanded/selfGroundingAccuracy              |             156/156 |
| selfMetrics/selfFalsePositiveRate                       |               0/384 |
| metrics/primaryConceptAccuracy                          |             102/110 |
| metrics/expectedConceptRecall                           |             111/122 |
| metrics/knownToUnknownRate                              |               4/110 |
| metrics/falsePositiveRate                               |                2/18 |
| metrics/relationCoverage                                |               16/24 |
| selfCoverage                                            |                 0/8 |
| contextualCoverage                                      |                9/18 |

Два промежуточных check параллельно с live нагрузкой получили timeout (5000 ms) одного и того же большого grounded-provider теста Aletheia; лимит и тест не менялись. Финальный check после окончания Ollama прошёл. npm run knowledge:check: 21 карточка. npm run check: typecheck, lint, format, 711 тестов / 45 файлов, production build — успешно. Отдельные semantic regression tests: 25. Проверены diff/status и ignore для dist/src/generated/node_modules. UI, канон, память, отношения и Local realizer не изменены.

## Ограничения и решение об утверждении

Схема защищает границы, но не доказывает правильность трактовки. Закрытые guards не покрывают произвольный новый бытовой или научный запрос. Уже-grounded, но неполный детерминированный ответ не запускает fallback; это сознательный приоритет ложных отрицаний. Кандидат без usable frame/material остаётся неиспользованным. При отсутствии authored relation нельзя гарантировать ответ на всю пару только по найденным IDs. Никаких новых relation/facts ради оценки не добавлено.

Короткий фрагмент summary может обрываться до важного смыслового различия; каталог и модель не гарантируют точное разделение соседних тем.

Рекомендация: принимать изоляцию и диагностический эксперимент отдельно от качества semantic rescue. Оставить opt-in/dev-only. Не объявлять resolver готовым к включению по умолчанию: количественные успехи и неполные/ошибочные rescues выше требуют авторской оценки. Субъективное снижение нагрева не подтверждалось.

Полный локальный журнал: `/tmp/2186-11c-final-live.json`; исходные записи: `/tmp/2186-11c-live.json` и `/tmp/2186-11c-calibrated.json`. Пересчёт: `npm run intelligence:semantic-evaluate -- --replay=/tmp/2186-11c-final-live.json`. Fixture и код проверки находятся в репозитории; журнал не импортируется в приложение.
