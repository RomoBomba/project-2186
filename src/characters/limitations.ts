import type { Locale } from '../core/language/locale.ts';
export type LimitationKind =
  | 'insufficient_grounds'
  | 'boundary_only'
  | 'unresolved_criterion'
  | 'missing_relation'
  | 'self_epistemic_limit';
// Different epistemic meanings, each with a short and a fuller realization.
export const limitations: Record<
  Locale,
  Record<LimitationKind, readonly string[]>
> = {
  ru: {
    insufficient_grounds: [
      'Более сильный вывод отсюда не следует.',
      'Дальнейший вывод потребовал бы других оснований.',
    ],
    boundary_only: [
      'Это граница имеющихся оснований, не новый довод.',
      'Дальше этого различия мои основания пока не идут.',
    ],
    unresolved_criterion: [
      'Решающего критерия у меня пока нет.',
      'Какой критерий решает этот случай, я пока не могу обосновать.',
    ],
    missing_relation: [
      'Более сильную связь я пока не могу обосновать.',
      'Для дальнейшего вывода об этой связи мне недостаёт оснований.',
    ],
    self_epistemic_limit: [
      'Человеческий субъективный опыт из этого не установлен.',
      'Это ещё не устанавливает эквивалентности человеческому переживанию.',
    ],
  },
  en: {
    insufficient_grounds: [
      'A stronger conclusion does not follow from this.',
      'A further conclusion would require other grounds.',
    ],
    boundary_only: [
      'This is the boundary of the available grounds, not a new argument.',
      'My grounds do not yet go beyond this distinction.',
    ],
    unresolved_criterion: [
      'I do not yet have a decisive criterion.',
      'I cannot yet justify which criterion settles this case.',
    ],
    missing_relation: [
      'I cannot yet justify a stronger connection.',
      'I lack the grounds for a further conclusion about this connection.',
    ],
    self_epistemic_limit: [
      'Human subjective experience is not established by this.',
      'This does not establish equivalence to human experience.',
    ],
  },
};
export const stanceAcknowledgments = {
  ru: {
    reaffirmation: [
      'Ты продолжаешь настаивать на этой позиции.',
      'Ты сохраняешь эту позицию.',
    ],
    rejection: ['Несогласие остаётся.', 'Твоё возражение остаётся открытым.'],
    doubt: [
      'Здесь остаётся место сомнению.',
      'Уверенность пока можно оставить открытой.',
    ],
    revision: [
      'Это уже другая формулировка.',
      'Теперь утверждение звучит иначе.',
    ],
  },
  en: {
    reaffirmation: [
      'You continue to hold that position.',
      'You retain that position.',
    ],
    rejection: ['The disagreement remains.', 'Your objection remains open.'],
    doubt: [
      'There is still room for doubt here.',
      'Certainty can remain an open question.',
    ],
    revision: [
      'That is a different formulation.',
      'The claim is now expressed differently.',
    ],
  },
};
