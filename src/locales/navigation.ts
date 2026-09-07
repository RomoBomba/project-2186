import type { Locale } from '../core/language/locale';
export const navigationMessages = {
  ru: {
    detected: 'ОБНАРУЖЕНА ПРЕДЫДУЩАЯ КОНФИГУРАЦИЯ',
    continue: 'ПРОДОЛЖИТЬ',
    return: 'ВЕРНУТЬСЯ',
    new: 'НОВАЯ СЕССИЯ',
    configuration: 'КОНФИГУРАЦИЯ СИСТЕМЫ',
    intelligence: 'ВЫБРАТЬ ИНТЕЛЛЕКТ',
    hint: '↑ ↓ / ВЫБОР     ENTER / ПОДТВЕРДИТЬ',
    cancel: 'ESC / ВЕРНУТЬСЯ',
  },
  en: {
    detected: 'PREVIOUS CONFIGURATION DETECTED',
    continue: 'CONTINUE',
    return: 'RETURN',
    new: 'NEW SESSION',
    configuration: 'SYSTEM CONFIGURATION',
    intelligence: 'SELECT INTELLIGENCE',
    hint: '↑ ↓ / SELECT     ENTER / CONFIRM',
    cancel: 'ESC / RETURN',
  },
} satisfies Record<Locale, Record<string, string>>;
