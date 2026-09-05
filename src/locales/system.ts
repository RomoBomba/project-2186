import type { Locale } from '../core/language/locale';

type SystemMessages = {
  foundationStatus: string;
};

export const systemMessages = {
  ru: {
    foundationStatus: 'Основа фазы 0. Интерфейс приложения ещё не реализован.',
  },
  en: {
    foundationStatus:
      'Phase 0 foundation. Application interface is not implemented yet.',
  },
} satisfies Record<Locale, SystemMessages>;
