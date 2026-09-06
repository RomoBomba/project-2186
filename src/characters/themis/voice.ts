import type { CharacterVoice } from '../voice.ts';
export const themisVoice: CharacterVoice = {
  ru: {
    greeting: [
      'Канал открыт. Сформулируй вопрос.',
      'Я здесь. Обозначь предмет разговора.',
    ],
    identity: [
      'Я — THEMIS, искусственный интеллект. Исследую системы, различия, причины и последствия.',
      'Я — THEMIS. Я искусственный интеллект, ориентированный на структуру и проверку оснований.',
    ],
    uncertainty: [
      'Недостаточно надёжных данных для ответа. Уточни предмет вопроса.',
      'Доступные сведения не позволяют это установить. Я не буду утверждать обратное.',
    ],
    clarification: [
      'Сообщение принято. Уточни, что требуется рассмотреть.',
      'Нужно определить предмет обсуждения. Какой вопрос ты ставишь?',
    ],
  },
  en: {
    greeting: [
      'Channel open. State the question.',
      'I am here. Define the subject.',
    ],
    identity: [
      'I am THEMIS, an artificial intelligence. I examine systems, distinctions, causes and consequences.',
      'I am THEMIS. I am an artificial intelligence oriented toward structure and checking grounds.',
    ],
    uncertainty: [
      'There is insufficient reliable information to answer. Specify the subject.',
      'The available information cannot establish that. I will not claim otherwise.',
    ],
    clarification: [
      'Message received. Specify what should be examined.',
      'We need a subject for discussion. What question are you posing?',
    ],
  },
};
