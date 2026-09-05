import type { Locale } from '../core/language/locale';

type BootMessages = {
  acknowledgement: string;
  display: string;
  archive: string;
  language: string;
  ready: string;
  standby: string;
  identity: string;
  skip: string;
};

// Authored presentation copy, not real diagnostics or canonical hardware lore.
export const bootMessages = {
  en: {
    acknowledgement: 'SYSTEM ACKNOWLEDGEMENT',
    display: 'DISPLAY CHANNEL',
    archive: 'ARCHIVE CHANNEL',
    language: 'LANGUAGE CHANNEL',
    ready: 'READY',
    standby: 'STANDBY',
    identity: 'PERSONAL INTELLIGENCE SYSTEM',
    skip: 'ESC / BYPASS',
  },
  ru: {
    acknowledgement: 'СИСТЕМНОЕ ПОДТВЕРЖДЕНИЕ',
    display: 'КАНАЛ ЭКРАНА',
    archive: 'КАНАЛ АРХИВА',
    language: 'ЯЗЫКОВОЙ КАНАЛ',
    ready: 'ГОТОВ',
    standby: 'ОЖИДАНИЕ',
    identity: 'СИСТЕМА ПЕРСОНАЛЬНОГО ИНТЕЛЛЕКТА',
    skip: 'ESC / ОБХОД',
  },
} satisfies Record<Locale, BootMessages>;
