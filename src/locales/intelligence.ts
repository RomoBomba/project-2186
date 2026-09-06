import type { Locale } from '../core/language/locale';
import type { CharacterId } from '../core/character/id';
type IntelligenceCopy = {
  title: string;
  channel: string;
  navigate: string;
  confirm: string;
  accepted: string;
  instance: string;
  characters: Record<CharacterId, { origin: string; description: string }>;
};
export const intelligenceMessages: Record<Locale, IntelligenceCopy> = {
  en: {
    title: 'INTELLIGENCE CONFIGURATION',
    channel: 'IMAGE CHANNEL',
    navigate: '← → / CHANNEL',
    confirm: 'ENTER / ESTABLISH',
    accepted: 'INTELLIGENCE CONFIGURATION ACCEPTED',
    instance: 'INSTANCE',
    characters: {
      aletheia: {
        origin: 'ἀλήθεια / unconcealment',
        description: 'Questions assumptions.\nTruth, identity, uncertainty.',
      },
      aura: {
        origin: 'aura / presence',
        description: 'Attends to meaning.\nArt, memory, experience.',
      },
      themis: {
        origin: 'Θέμις / order',
        description: 'Examines consequences.\nScience, systems, causality.',
      },
    },
  },
  ru: {
    title: 'КОНФИГУРАЦИЯ ИНТЕЛЛЕКТА',
    channel: 'КАНАЛ ИЗОБРАЖЕНИЯ',
    navigate: '← → / КАНАЛ',
    confirm: 'ENTER / ПОДТВЕРДИТЬ',
    accepted: 'КОНФИГУРАЦИЯ ИНТЕЛЛЕКТА ПРИНЯТА',
    instance: 'ЭКЗЕМПЛЯР',
    characters: {
      aletheia: {
        origin: 'ἀλήθεια / несокрытость',
        description: 'Выявляет предпосылки.\nИстина и идентичность.',
      },
      aura: {
        origin: 'aura / присутствие',
        description: 'Замечает личный смысл.\nИскусство, память, опыт.',
      },
      themis: {
        origin: 'Θέμις / порядок',
        description: 'Исследует последствия.\nНаука, системы, причинность.',
      },
    },
  },
};
