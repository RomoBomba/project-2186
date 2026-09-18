/** Continuous authored regression, never runtime content. Expectations are semantic operations. */
export const continuityDialogue = [
  [
    'Привет. О чем ты хочешь поговорить?',
    'Hi. What would you like to talk about?',
    'offer_topic',
  ],
  ['О чем поговорим?', 'What shall we talk about?', 'offer_topic'],
  ['Почему именно об этом?', 'Why this topic?', 'explain_topic_choice'],
  ['А если я не хочу?', "I don't want that topic.", 'reject_topic'],
  [
    'Тогда предложи что-нибудь другое.',
    'Then suggest something else.',
    'offer_topic',
  ],
  [
    'Что тебе самой здесь интересно?',
    'What interests you here?',
    'offer_topic',
  ],
  [
    'Я вообще не знаю, о чем говорить.',
    "I really don't know what to talk about.",
    'offer_topic',
  ],
  [
    'Ладно, расскажи мне что-нибудь о времени.',
    'Okay, tell me something about time.',
    'topic_overview',
  ],
  [
    'Что время значит для тебя?',
    'What does time mean to you?',
    'session_presence',
  ],
  [
    'А сколько длится наш разговор?',
    'And how long have we been talking?',
    'session_presence',
  ],
  [
    'Ты чувствуешь, что прошло столько времени?',
    'Do you feel that much time passed?',
    'session_presence',
  ],
  [
    'А сколько ты вообще существуешь?',
    'And how long have you existed?',
    'session_presence',
  ],
  [
    'Какая столица у Франции?',
    'What is the capital of France?',
    'temporal_distance',
  ],
  ['Почему ты этого не знаешь?', "Why don't you know?", 'explain_boundary'],
  [
    'Что ты тогда знаешь лучше всего?',
    'What do you know best then?',
    'offer_topic',
  ],
  ['Выбери одну тему сама.', 'Choose one topic yourself.', 'offer_topic'],
  ['Почему именно её?', 'Why did you choose that?', 'explain_topic_choice'],
] as const;
