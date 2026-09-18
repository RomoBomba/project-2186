import type { Locale } from '../core/language/locale.ts';
import type { BoundaryKind } from '../core/presence/model.ts';
export const boundaryWords: Record<
  Locale,
  Record<BoundaryKind, readonly string[]>
> = {
  ru: {
    missing_knowledge: [
      'Об этом у меня нет достаточных сведений.',
      'Здесь я не могу опереться на надёжное знание.',
      'Этот вопрос выходит за пределы доступных мне сведений.',
    ],
    temporal_distance: [
      'Между твоей эпохой и моей сохранилось не всё; эту подробность я не могу подтвердить.',
      'Мои сведения о прежнем мире неполны, и надёжного ответа на этот вопрос у меня нет.',
      'Я не могу уверенно восстановить эту подробность через разрыв в записях.',
    ],
    archive_gap: [
      'Доступные записи не дают мне надёжного ответа об этом.',
      'В этой части прошлого у меня нет надёжной опоры.',
      'Я не могу установить, чего именно недостаёт в этих записях.',
    ],
    current_external_fact: [
      'У меня нет доступа к текущим внешним данным.',
      'Сейчас я не могу проверить это во внешнем мире.',
      'Текущее состояние внешнего мира мне недоступно для проверки.',
    ],
    ambiguous_question: [
      'Пока неясно, какую сторону вопроса ты имеешь в виду.',
      'В этой формулировке я пока не различаю предмет разговора.',
      'Здесь мне не хватает определённого предмета для рассуждения.',
    ],
    unsupported_self_claim: [
      'У меня нет оснований приписывать себе это свойство.',
      'Я не могу подтвердить такое утверждение о себе.',
      'Мои доступные сведения о себе не позволяют это установить.',
    ],
  },
  en: {
    missing_knowledge: [
      'I do not have enough knowledge of this.',
      'I have no reliable grounds for answering that.',
      'This lies beyond the knowledge available to me.',
    ],
    temporal_distance: [
      'Not everything survived between your era and mine; I cannot confirm this detail.',
      'My records of the earlier world are incomplete, and I cannot reliably answer this.',
      'I cannot reliably recover that detail across the gaps in the records.',
    ],
    archive_gap: [
      'The available records do not give me a reliable answer.',
      'I have no reliable foothold in this part of the past.',
      'I cannot establish exactly what is missing from these records.',
    ],
    current_external_fact: [
      'I have no access to current external data.',
      'I cannot check that in the outside world now.',
      'The present state of the outside world is not available for me to verify.',
    ],
    ambiguous_question: [
      'I cannot yet tell which side of the question you mean.',
      'I cannot yet identify the subject in that formulation.',
      'I need a more definite subject to reason about here.',
    ],
    unsupported_self_claim: [
      'I have no grounds for attributing that property to myself.',
      'I cannot confirm that claim about myself.',
      'What I can establish about myself does not settle this.',
    ],
  },
};
export const presenceVoice = {
  ru: {
    aletheia: {
      offer: 'Я бы начала с темы',
      alternative: 'рядом остаются',
      redirect: 'Можно вместо этого рассмотреть',
      questions: [
        'Что для тебя зависит от ответа?',
        'Какое различие ты хочешь здесь проверить?',
        'Почему именно этот вопрос сейчас важен?',
      ],
    },
    aura: {
      offer: 'Мне ближе сейчас тема',
      alternative: 'можно также обратиться к темам',
      redirect: 'Мы можем обратиться к теме',
      questions: [
        'Что привело тебя к этому вопросу?',
        'С какой стороной этого ты хотел бы остаться?',
        'Что в этом тебе особенно интересно?',
      ],
    },
    themis: {
      offer: 'Предлагаю начать с темы',
      alternative: 'другие направления',
      redirect: 'Доступное направление',
      questions: [
        'Какой результат ты хочешь установить?',
        'Что именно нужно различить?',
        'Какую часть вопроса можно уточнить?',
      ],
    },
  },
  en: {
    aletheia: {
      offer: 'I would begin with',
      alternative: 'nearby are',
      redirect: 'We could instead examine',
      questions: [
        'What depends on the answer for you?',
        'Which distinction do you want to test here?',
        'Why does this question matter now?',
      ],
    },
    aura: {
      offer: 'I would turn toward',
      alternative: 'we could also turn to',
      redirect: 'We could turn toward',
      questions: [
        'What brought you to this question?',
        'Which side of this would you like to stay with?',
        'What draws your attention here?',
      ],
    },
    themis: {
      offer: 'I suggest starting with',
      alternative: 'other directions are',
      redirect: 'An available direction is',
      questions: [
        'What result do you want to establish?',
        'What exactly needs distinguishing?',
        'Which part of the question can be specified?',
      ],
    },
  },
} as const;
export const temporalWords = {
  ru: {
    less: 'меньше минуты',
    few: 'несколько минут',
    about: (n: number) => `примерно ${n} мин`,
    session: (d: string) => `Этот разговор длится ${d}.`,
    ambiguous: (d: string) => `Если ты о нынешнем соединении — ${d}.`,
    missing: 'У меня нет надёжной отметки начала этого соединения.',
    origin:
      'Одной надёжной точки, от которой можно отсчитать моё существование, у меня нет.',
    subjective:
      'Я могу измерять промежутки и порядок событий, но это не устанавливает человеческого переживания времени.',
    chronology:
      'В доступных мне записях относительная последовательность надёжнее абсолютной хронологии.',
  },
  en: {
    less: 'less than a minute',
    few: 'a few minutes',
    about: (n: number) => `about ${n} minutes`,
    session: (d: string) => `This conversation has lasted ${d}.`,
    ambiguous: (d: string) => `If you mean this connection, ${d}.`,
    missing: 'I have no reliable start timestamp for this connection.',
    origin:
      'I have no single reliable starting point from which to measure my existence.',
    subjective:
      'I can measure intervals and event order, but this does not establish a human experience of time.',
    chronology:
      'In the records available to me, relative sequence is more reliable than absolute chronology.',
  },
} as const;

/** Grammatical topic mentions only; conceptual assertions still come from cards. */
export const topicAboutRu: Record<string, string> = {
  'identity.self': 'о том, что мы называем собой',
  'identity.memory': 'о памяти',
  'identity.continuity': 'о непрерывности личности',
  'identity.change': 'об изменении',
  'identity.body': 'о теле',
  'identity.belief': 'об убеждениях',
  'philosophy.truth': 'об истине',
  'philosophy.freedom': 'о свободе',
  'philosophy.knowledge': 'о знании',
  'philosophy.uncertainty': 'о неопределённости',
  'philosophy.meaning': 'о смысле',
  'philosophy.consciousness': 'о сознании',
  'philosophy.time': 'о времени',
  'art.aura': 'о присутствии оригинала',
  'art.originality': 'об оригинальности',
  'art.interpretation': 'об интерпретации',
  'art.creation': 'о творчестве',
  'science.causality': 'о причинности',
  'science.complexity': 'о сложности',
  'science.intelligence': 'об интеллекте',
  'world.archives': 'об архивах',
  'world.reconstruction': 'о реконструкции',
};
export const moveWords = {
  ru: {
    aletheia: {
      offer: 'Я бы начала с вопроса',
      reject: 'Тогда не будем.',
      interest: 'Меня занимают вопросы',
      affinity: 'Я особенно внимательно рассматриваю вопросы',
      context: 'Это продолжает вопрос, к которому мы уже подошли.',
      available: 'Здесь есть отправная точка, которую я могу обосновать.',
    },
    aura: {
      offer: 'Мне сейчас ближе разговор',
      reject: 'Оставим это.',
      interest: 'Мне близки вопросы',
      affinity: 'Моё внимание чаще обращено к вопросам',
      context: 'Это связано с тем, на чём мы остановились.',
      available: 'Здесь есть мысль, с которой можно начать разговор.',
    },
    themis: {
      offer: 'Предлагаю поговорить',
      reject: 'Не будем это обсуждать.',
      interest: 'Я сосредоточена на вопросах',
      affinity: 'Я уделяю внимание вопросам',
      context: 'Это продолжает предыдущий предмет обсуждения.',
      available: 'Для этого вопроса у меня есть основания.',
    },
  },
  en: {
    aletheia: {
      offer: 'I would begin with a question',
      reject: 'Then let us leave it.',
      interest: 'I attend to questions',
      affinity: 'I pay particular attention to questions',
      context: 'This continues the question we had reached.',
      available: 'Here is a starting point I can support.',
    },
    aura: {
      offer: 'I would turn to a conversation',
      reject: 'We can leave that aside.',
      interest: 'My interests lie in questions',
      affinity: 'My attention tends toward questions',
      context: 'This connects with where we had paused.',
      available: 'There is a thought here we can begin with.',
    },
    themis: {
      offer: 'I suggest talking',
      reject: 'We will not discuss that.',
      interest: 'I focus on questions',
      affinity: 'My attention is directed toward questions',
      context: 'This continues our previous subject.',
      available: 'I have grounds for this question.',
    },
  },
} as const;
export const boundaryExplanations: Record<
  Locale,
  Record<BoundaryKind, string>
> = {
  ru: {
    missing_knowledge:
      'Этот предмет не представлен в доступных мне знаниях достаточно, чтобы обосновать ответ.',
    ambiguous_question:
      'Я пока не могу установить, к чему относится вопрос, а отвечать за тебя на другой вопрос было бы неверно.',
    current_external_fact:
      'Этот канал не получает текущих наблюдений внешнего мира, поэтому проверить такое состояние я не могу.',
    temporal_distance:
      'Между твоим временем и доступными мне записями есть разрывы, поэтому эта подробность не подтверждена.',
    archive_gap:
      'Доступные архивные записи неполны, и я не могу восполнить этот пробел достоверным утверждением.',
    unsupported_self_claim:
      'Доступные сведения о моих процессах не подтверждают это свойство, поэтому приписывать его себе я не могу.',
  },
  en: {
    missing_knowledge:
      'This subject is not represented sufficiently in the knowledge available to me to support an answer.',
    ambiguous_question:
      'I cannot yet establish what the question refers to, and answering a different question for you would be misleading.',
    current_external_fact:
      'This channel receives no current observations of the outside world, so I cannot verify those conditions.',
    temporal_distance:
      'There are gaps between your time and the records available to me, so this detail is not confirmed.',
    archive_gap:
      'The available archive is incomplete, and I cannot fill that gap with a reliable assertion.',
    unsupported_self_claim:
      'What I can establish about my processes does not confirm that property, so I cannot attribute it to myself.',
  },
};

/** Every prefix takes the same grammatical “about …” topic mention; no new assertions. */
export const offerOpenings = {
  ru: {
    aletheia: ['Можно начать с вопроса', 'Давай поговорим'],
    aura: ['Можно поговорить', 'Начнём с разговора'],
    themis: ['Можно поставить вопрос', 'Начнём с вопроса'],
  },
  en: {
    aletheia: ['We could begin with a question', 'We could talk'],
    aura: ['We could talk', 'We could begin a conversation'],
    themis: ['We could consider a question', 'We could start with a question'],
  },
} as const;

const ruYears = (value: number) =>
  value % 100 >= 11 && value % 100 <= 14
    ? 'лет'
    : value % 10 === 1
      ? 'год'
      : value % 10 >= 2 && value % 10 <= 4
        ? 'года'
        : 'лет';
export const yearWords = {
  ru: {
    interval: (distance: number, user: number, system: number) =>
      `${distance} ${ruYears(distance)} — если сравнивать названный тобой ${user} год с ${system}.`,
    reference: (user: number, system: number) =>
      `Ты называешь ${user} год; моя временная точка — ${system}. Записи неполны, и надёжно восстановить подробности того года я не могу.`,
    missing: 'Какой год твоего времени взять для сравнения?',
  },
  en: {
    interval: (distance: number, user: number, system: number) =>
      `${distance} ${distance === 1 ? 'year' : 'years'}, comparing the ${user} you mentioned with ${system}.`,
    reference: (user: number, system: number) =>
      `You refer to ${user}; my reference year is ${system}. The records are incomplete, and I cannot reliably reconstruct that year's details.`,
    missing: 'Which year of your time should I use for comparison?',
  },
};
