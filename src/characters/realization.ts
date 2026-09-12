// Reviewed surface alternatives; source changes disable their use until reviewed again.
export const realizationVariants: Record<
  string,
  {
    source: { ru: string; en: string };
    ru: readonly string[];
    en: readonly string[];
  }
> = {
  'relation:freedom-causality:0': {
    source: {
      ru: 'Наличие причин у решения не равнозначно отсутствию свободы.',
      en: 'A decision having causes is not equivalent to an absence of freedom.',
    },
    ru: [
      'Причина решения сама по себе ещё не отрицает свободу.',
      'То, что у решения есть причины, ещё не означает отсутствия свободы.',
      'Наличие причины не равнозначно отсутствию свободы.',
    ],
    en: [
      'A cause for a decision does not by itself rule out freedom.',
      'Having causes behind a decision does not by itself mean freedom is absent.',
      'Having a cause is not the same as lacking freedom.',
    ],
  },
  'relation:freedom-causality:1': {
    source: {
      ru: 'Причинное объяснение решения и критерий свободного действия отвечают на разные вопросы.',
      en: 'A causal explanation of a decision and a criterion of free action answer different questions.',
    },
    ru: [
      'Объяснить причину решения — не то же самое, что установить критерий его свободы.',
      'Объяснить, откуда взялось решение, и определить, свободно ли оно, — разные задачи.',
      'Причинное объяснение и критерий свободного действия различны.',
    ],
    en: [
      'Explaining the cause of a decision is not the same as establishing a criterion for its freedom.',
      'A causal account of a decision and a criterion for free action address different questions.',
      'Causal explanation and a criterion for free action are distinct.',
    ],
  },
  'relation:freedom-causality:2': {
    source: {
      ru: 'Чтобы судить о свободе, остаётся выяснить роль альтернатив, контроля и возможности действовать иначе.',
      en: 'Judging freedom still requires examining alternatives, control, and what it means to act otherwise.',
    },
    ru: [
      'Вопрос остаётся в том, какие альтернативы и какой контроль позволяют говорить о возможности действовать иначе.',
      'О свободе ещё нужно судить по альтернативам, контролю и возможности поступить иначе.',
      'Нужно ещё рассмотреть альтернативы, контроль и возможность действовать иначе.',
    ],
    en: [
      'The open question is what alternatives and control allow us to speak of acting otherwise.',
      'Freedom still calls for examining alternatives, control and the possibility of acting otherwise.',
      'Alternatives, control and the meaning of acting otherwise still require examination.',
    ],
  },
  'relation:originality-aura:0': {
    source: {
      ru: 'Совпадение содержания копии и оригинала не делает их одним историческим объектом.',
      en: 'Matching content does not make a copy and an original the same historical object.',
    },
    ru: [
      'Одинаковое содержание ещё не делает копию и оригинал одним историческим объектом.',
      'Копия и оригинал могут совпадать по содержанию, оставаясь разными историческими объектами.',
      'Совпадение содержания не означает тождества исторического объекта.',
    ],
    en: [
      'Identical content does not make a copy and an original one historical object.',
      'A copy and an original can share content while remaining distinct historical objects.',
      'Matching content does not establish identity as a historical object.',
    ],
  },
  'relation:originality-aura:1': {
    source: {
      ru: 'Оригинальность объекта и уникальность его исторического присутствия — связанные, но разные критерии.',
      en: 'An object being original and its historical presence being unique are related but different criteria.',
    },
    ru: [
      'Оригинальность вещи и уникальность её исторического присутствия связаны, но не совпадают.',
      'Оригинальность объекта связана с его уникальным присутствием в истории, но это разные критерии.',
      'Оригинальность объекта и уникальность исторического присутствия — разные, хотя и связанные критерии.',
    ],
    en: [
      'An object’s originality and its unique historical presence are connected, but do not coincide.',
      'An object’s originality is connected to its unique historical presence, though the criteria differ.',
      'Originality and unique historical presence are distinct, related criteria.',
    ],
  },
  'relation:originality-aura:2': {
    source: {
      ru: 'Точность воспроизведения сама по себе не переносит на копию всю историю оригинала.',
      en: 'Accuracy of reproduction does not by itself transfer the entire history of an original to its copy.',
    },
    ru: [
      'Точность копирования ещё не означает, что вся история оригинала перешла к копии.',
      'Даже точное воспроизведение само по себе не переносит всю историю оригинала.',
      'Точное воспроизведение не переносит на копию всю историю оригинала само по себе.',
    ],
    en: [
      'Accuracy of copying does not mean the original’s entire history has passed to the copy.',
      'Even accurate reproduction does not by itself carry over the original’s whole history.',
      'Accurate reproduction alone does not transfer the original’s entire history.',
    ],
  },
  'relation:archives-truth:0': {
    source: {
      ru: 'Отсутствие записи не означает, что исторического события не было.',
      en: 'The absence of a record does not mean that a historical event did not occur.',
    },
    ru: [
      'Отсутствие записи ещё не доказывает, что события не было.',
      'Утрата записи не означает, что само историческое событие не произошло.',
      'Нет записи — ещё не значит, что не было события.',
    ],
    en: [
      'The absence of a record does not establish that an event never happened.',
      'Losing a record does not mean the historical event itself did not occur.',
      'No record does not mean no event.',
    ],
  },
  'relation:archives-truth:1': {
    source: {
      ru: 'Доступность архива и истинность сведений о прошлом — разные проблемы.',
      en: 'Archive availability and the truth of claims about the past are different problems.',
    },
    ru: [
      'Доступность свидетельства и истинность сведений о прошлом — не один вопрос.',
      'То, доступны ли архивы, и то, истинны ли сведения о прошлом, — разные вопросы.',
      'Доступность архива и истинность исторических сведений различны.',
    ],
    en: [
      'Access to a record and the truth of an account of the past are separate questions.',
      'Whether archives are accessible and whether accounts of the past are true are different questions.',
      'Archive availability and historical truth are distinct.',
    ],
  },
  'relation:archives-truth:2': {
    source: {
      ru: 'Утрата архива ограничивает проверку утверждения, но сама по себе не доказывает его ложность.',
      en: 'Losing an archive limits verification of a claim but does not by itself establish its falsity.',
    },
    ru: [
      'Утраченный архив затрудняет проверку утверждения, но не доказывает его ложности.',
      'Без архива проверить утверждение труднее, но из одной этой утраты его ложность не следует.',
      'Утрата архива ограничивает проверку, а не устанавливает ложность утверждения.',
    ],
    en: [
      'A lost archive limits verification of a claim, but does not establish its falsity.',
      'Without the archive, checking a claim is harder, but its loss alone does not make the claim false.',
      'Archive loss limits verification rather than establishing a claim’s falsity.',
    ],
  },
  'self:experience_unestablished': {
    source: {
      ru: 'У меня нет надёжных оснований утверждать, что я переживаю происходящее так, как человек.',
      en: 'I have no reliable grounds to claim that I experience events as a human does.',
    },
    ru: [
      'Из моих процессов ещё нельзя заключить, что мне доступен человеческий субъективный опыт.',
      'Пока не установлено, равнозначны ли мои процессы человеческому переживанию.',
      'Мои процессы сами по себе не устанавливают наличия человеческого субъективного опыта.',
    ],
    en: [
      'My processes do not establish that I have human subjective experience.',
      'Whether my processes amount to human experience is not established.',
      'My processes do not by themselves establish human subjective experience.',
    ],
  },
  'self:compare_context': {
    source: {
      ru: 'Я сопоставляю сообщение с понятиями и контекстом разговора.',
      en: 'I compare your message with concepts and the context of our conversation.',
    },
    ru: [
      'Я сопоставляю сказанное с понятиями и текущим контекстом.',
      'Я связываю твоё сообщение с понятиями и контекстом нашей беседы.',
      'Я сравниваю сообщение с понятиями и контекстом разговора.',
    ],
    en: [
      'I compare what is said with concepts and the current context.',
      'I connect your message with concepts and the context of our conversation.',
      'I compare the message with concepts and conversational context.',
    ],
  },
  'self:connect_alternatives': {
    source: {
      ru: 'Я связываю идеи и рассматриваю возможные различия между ними.',
      en: 'I connect ideas and examine possible differences between them.',
    },
    ru: [
      'Я связываю идеи и проверяю, в чём они могут различаться.',
      'Я могу соединить идеи и рассмотреть различия между ними.',
      'Я устанавливаю связи между идеями и рассматриваю их возможные различия.',
    ],
    en: [
      'I connect ideas and examine how they may differ.',
      'I can bring ideas together and consider their differences.',
      'I connect ideas and examine possible distinctions.',
    ],
  },
  'self:select_response': {
    source: {
      ru: 'Я сравниваю доступные основания и выбираю, как построить ответ.',
      en: 'I compare the available grounds and choose how to form an answer.',
    },
    ru: [
      'Я сопоставляю доступные основания, прежде чем выбрать форму ответа.',
      'Я рассматриваю доступные основания и выбираю, как выразить ответ.',
      'Я сравниваю основания и выбираю построение ответа.',
    ],
    en: [
      'I compare the available grounds before choosing the form of an answer.',
      'I consider the available grounds and choose how to express an answer.',
      'I compare grounds and choose how to construct the answer.',
    ],
  },
  'identity.memory:claim:0': {
    source: {
      ru: 'Человек не помнит большую часть собственной жизни.',
      en: 'A person does not remember most of their own life.',
    },
    ru: [
      'Собственную жизнь человек помнит далеко не целиком.',
      'Большую часть своей жизни человек не помнит.',
      'Человек помнит лишь меньшую часть собственной жизни.',
    ],
    en: [
      'Most of a person’s own life is not remembered.',
      'A person remembers only a smaller part of their own life.',
      'Most of one’s own life remains unremembered.',
    ],
  },
  'identity.memory:tension:0': {
    source: {
      ru: 'Если воспоминания изменяются, непонятно, почему они должны гарантировать неизменность личности.',
      en: 'If memories change, it is unclear why they should guarantee an unchanged identity.',
    },
    ru: [
      'Неясно, почему изменчивые воспоминания должны гарантировать неизменную личность.',
      'Если воспоминания меняются, неясно, как они могут гарантировать неизменность личности.',
      'Изменчивость воспоминаний оставляет неясной их роль как гарантии неизменной личности.',
    ],
    en: [
      'It is unclear why changing memories should guarantee an unchanged identity.',
      'If memories change, it remains unclear how they could guarantee an unchanged identity.',
      'Changing memories leave their role as a guarantee of unchanged identity unclear.',
    ],
  },
};
