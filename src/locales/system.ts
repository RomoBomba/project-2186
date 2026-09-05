import type { Locale } from '../core/language/locale';

type SystemMessages = {
  terminal: string;
  visualChannel: string;
  systemChannel: string;
  communicationChannel: string;
  commandChannel: string;
  ready: string;
  waiting: string;
  noImage: string;
  inactive: string;
  display: string;
};

// Phase 1 composition copy, not canonical lore or live system state.
export const systemMessages = {
  ru: {
    terminal: 'ТЕРМИНАЛ ПЕРСОНАЛЬНОГО ИНТЕЛЛЕКТА',
    visualChannel: 'ВИЗУАЛЬНЫЙ КАНАЛ',
    systemChannel: 'СИСТЕМНЫЙ КАНАЛ',
    communicationChannel: 'КАНАЛ СВЯЗИ',
    commandChannel: 'КОМАНДНЫЙ КАНАЛ',
    ready: 'СИСТЕМА ГОТОВА',
    waiting: 'Ожидание инициализации.',
    noImage: 'ИЗОБРАЖЕНИЕ НЕ ЗАДАНО',
    inactive: 'НЕАКТИВЕН',
    display: 'ЭКРАН',
  },
  en: {
    terminal: 'PERSONAL INTELLIGENCE TERMINAL',
    visualChannel: 'VISUAL',
    systemChannel: 'SYSTEM CHANNEL',
    communicationChannel: 'SIGNAL',
    commandChannel: 'COMMAND',
    ready: 'SYSTEM READY',
    waiting: 'Awaiting initialization.',
    noImage: 'IMAGE NOT ASSIGNED',
    inactive: 'INACTIVE',
    display: 'DISPLAY',
  },
} satisfies Record<Locale, SystemMessages>;
