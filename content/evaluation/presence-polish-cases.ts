// Development-only Phase 12A.2 cohort. Never imported by the application.
export const polishDialogue = [
  ['Привет, кто ты', 'Hello, who are you', 'identity'],
  ['О чем мы можем поговорить?', 'What can we talk about?', 'scope'],
  [
    'Вероятно мне интересна природа личности',
    'Perhaps I am interested in the nature of self',
    'interest',
  ],
  ['Что такое личность', 'What is self', 'general'],
  ['Ты личность?', 'Are you a person?', 'personhood'],
  ['Я про тебя говорю', 'I mean you', 'deictic'],
  ['Ты человек?', 'Are you human?', 'human'],
  ['Что ты знаешь про 2026 год', 'What do you know about 2026?', 'year'],
  ['Сколько лет между нами?', 'How many years separate us?', 'interval'],
] as const;
export const polishScope = [
  ['Что мы можем обсудить?', 'What can we discuss?'],
  ['Какие темы мы можем обсудить?', 'What should we talk about?'],
  ['О чем тебе хотелось бы поговорить?', 'What would you like to discuss?'],
  ['Что ты предложишь обсудить?', 'Suggest a topic.'],
  ['Что ты знаешь лучше всего?', 'What do you know best?'],
  ['Предложи тему сама.', 'Choose a topic yourself.'],
] as const;
export const polishInterests = [
  [
    'Мне интересна природа личности.',
    'I am interested in the nature of self.',
    'identity.self',
  ],
  [
    'Наверное, меня интересует сознание.',
    'Perhaps I am interested in consciousness.',
    'philosophy.consciousness',
  ],
  [
    'Я хочу поговорить о памяти.',
    'I want to talk about memory.',
    'identity.memory',
  ],
  ['Давай про свободу.', "Let's talk about freedom.", 'philosophy.freedom'],
  ['Меня интересует время.', 'I am interested in time.', 'philosophy.time'],
] as const;
