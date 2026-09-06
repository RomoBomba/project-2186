import type { CharacterId } from '../core/character/id';
import type { Locale } from '../core/language/locale';

// Temporary Phase 4 review fixtures. No perception, cognition or user-text input.
export const phase4Responses: Record<
  Locale,
  Record<CharacterId, readonly [string, string, string]>
> = {
  ru: {
    aletheia: [
      'Сообщение принято. Что именно ты подразумеваешь под этим?',
      'Иногда различие становится видно, когда мы меняем формулировку. Я бы начала с одного слова.',
      'Я пока оставлю вопрос открытым. Неопределённость тоже заслуживает точного описания.',
    ],
    aura: [
      'Я получила сообщение. Какая деталь здесь важнее всего для тебя?',
      'У описания есть свой ритм, даже когда оно очень короткое. Мне хочется задержаться на этой мысли.',
      'Не всё нужно сразу объяснять. Иногда образ оставляет больше пространства, чем определение.',
    ],
    themis: [
      'Сообщение принято. С какого условия начнём?',
      'Сначала обозначим границы вопроса, затем проверим возможные последствия. Порядок здесь имеет значение.',
      'Это ещё не вывод. Для него нужно различить наблюдение и предположение.',
    ],
  },
  en: {
    aletheia: [
      'Message received. What exactly do you mean by that?',
      'Sometimes a distinction becomes visible when we change the wording. I would begin with a single word.',
      'I will leave the question open for now. Uncertainty also deserves a precise description.',
    ],
    aura: [
      'I received your message. Which detail matters most to you?',
      'A description has its own rhythm, even when it is very short. I would like to stay with that thought.',
      'Not everything needs an explanation immediately. Sometimes an image leaves more room than a definition.',
    ],
    themis: [
      'Message received. Which condition shall we begin with?',
      'First establish the boundaries of the question, then examine the possible consequences. Order matters here.',
      'This is not a conclusion yet. We need to distinguish observation from assumption.',
    ],
  },
};

export function phase4Response(
  character: CharacterId,
  locale: Locale,
  exchange: number,
): string {
  const responses = phase4Responses[locale][character];
  return responses[exchange % responses.length]!;
}
