import type { Locale } from '../core/language/locale';

type SetupMessages = {
  system: string;
  languageTitle: string;
  languagePrompt: string;
  standardTitle: string;
  standardPrompt: string;
  layoutTitle: string;
  layoutPrompt: string;
  audioTitle: string;
  audioPrompt: string;
  layoutA: string;
  layoutB: string;
  layoutC: string;
  enabled: string;
  muted: string;
  audioNote: string;
  completionTitle: string;
  completionPrompt: string;
  completionNote: string;
  navigate: string;
  confirm: string;
  back: string;
};

export const languageChoices = [
  { value: 'ru', label: 'РУССКИЙ' },
  { value: 'en', label: 'ENGLISH' },
] as const;

export const setupMessages = {
  en: {
    system: 'SYSTEM CONFIGURATION',
    languageTitle: 'LINGUISTIC INTERFACE',
    languagePrompt: 'SELECT ACTIVE LANGUAGE',
    standardTitle: 'DISPLAY STANDARD',
    standardPrompt: 'SELECT DISPLAY TECHNOLOGY',
    layoutTitle: 'DISPLAY GEOMETRY',
    layoutPrompt: 'SELECT VISUAL ARRANGEMENT',
    audioTitle: 'AUDIO CHANNEL',
    audioPrompt: 'SYSTEM SIGNAL OUTPUT',
    layoutA: 'VISUAL / LEFT',
    layoutB: 'VISUAL / RIGHT',
    layoutC: 'VISUAL / COMPACT',
    enabled: 'ENABLED',
    muted: 'MUTED',
    audioNote: 'SIGNAL CONFIGURATION ONLY / CHANNEL SILENT',
    completionTitle: 'INTERFACE CONFIGURED',
    completionPrompt: 'INTELLIGENCE CONFIGURATION REQUIRED',
    completionNote: 'SELECTION CHANNEL / NOT YET AVAILABLE',
    navigate: 'ARROWS / SELECT',
    confirm: 'ENTER / CONFIRM',
    back: 'ESC / RETURN',
  },
  ru: {
    system: 'НАСТРОЙКА СИСТЕМЫ',
    languageTitle: 'ЯЗЫКОВОЙ ИНТЕРФЕЙС',
    languagePrompt: 'ВЫБЕРИТЕ ЯЗЫК',
    standardTitle: 'СТАНДАРТ ЭКРАНА',
    standardPrompt: 'ВЫБЕРИТЕ ТИП ДИСПЛЕЯ',
    layoutTitle: 'ГЕОМЕТРИЯ ЭКРАНА',
    layoutPrompt: 'ВЫБЕРИТЕ РАСПОЛОЖЕНИЕ КАНАЛОВ',
    audioTitle: 'ЗВУКОВОЙ КАНАЛ',
    audioPrompt: 'СИСТЕМНЫЕ ЗВУКОВЫЕ СИГНАЛЫ',
    layoutA: 'ИЗОБРАЖЕНИЕ / СЛЕВА',
    layoutB: 'ИЗОБРАЖЕНИЕ / СПРАВА',
    layoutC: 'КОМПАКТНЫЙ КАНАЛ',
    enabled: 'ВКЛЮЧЁН',
    muted: 'ОТКЛЮЧЁН',
    audioNote: 'ПАРАМЕТР СИГНАЛОВ / ЗВУК ПОКА НЕДОСТУПЕН',
    completionTitle: 'ИНТЕРФЕЙС НАСТРОЕН',
    completionPrompt: 'ТРЕБУЕТСЯ ВЫБОР ИНТЕЛЛЕКТА',
    completionNote: 'КАНАЛ ВЫБОРА / ПОКА НЕДОСТУПЕН',
    navigate: 'СТРЕЛКИ / ВЫБОР',
    confirm: 'ENTER / ПОДТВЕРДИТЬ',
    back: 'ESC / ВОЗВРАТ',
  },
} satisfies Record<Locale, SetupMessages>;
