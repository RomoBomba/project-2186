import type { Locale } from '../core/language/locale.ts';
// Neutral descriptions of a conversational move, never a philosophical assertion.
export const discourseVoice: Record<
  Locale,
  {
    qualify: readonly [string, string, string];
    withhold: string;
    distinguish: string;
    challenge: string;
    revision: string;
  }
> = {
  ru: {
    qualify: [
      'Я уточняю границу этого вывода.',
      'Здесь остаётся оговорка к этому выводу.',
      'Этот вывод требует отдельного основания.',
    ],
    withhold: 'Я не принимаю эту характеристику как установленный факт.',
    distinguish: 'Я разделяю два разных утверждения.',
    challenge: 'Я проверяю основание этого перехода.',
    revision: 'Теперь ты формулируешь позицию иначе.',
  },
  en: {
    qualify: [
      'I am qualifying that conclusion.',
      'There is still a qualification to that conclusion.',
      'That conclusion needs a separate basis.',
    ],
    withhold: 'I do not accept that description as an established fact.',
    distinguish: 'I am separating two different claims.',
    challenge: 'I am examining the basis for that step.',
    revision: 'You are now expressing the position differently.',
  },
};
