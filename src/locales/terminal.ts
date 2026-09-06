import type { Locale } from '../core/language/locale';

type TerminalMessages = {
  you: string;
  history: string;
  command: string;
  hint: string;
  ready: string;
  forming: string;
  transmitting: string;
  opening: string;
  waiting: string;
};
export const terminalMessages: Record<Locale, TerminalMessages> = {
  ru: {
    you: 'ВЫ',
    history: 'Журнал связи',
    command: 'Сообщение',
    hint: 'ENTER / ПЕРЕДАТЬ · ДО 512 СИМВОЛОВ',
    ready: 'КАНАЛ ГОТОВ',
    forming: 'ФОРМИРОВАНИЕ',
    transmitting: 'ПЕРЕДАЧА',
    opening: 'СВЯЗЬ УСТАНОВЛЕНА',
    waiting: 'Введите сообщение в командный канал.',
  },
  en: {
    you: 'YOU',
    history: 'Communication record',
    command: 'Message',
    hint: 'ENTER / TRANSMIT · UP TO 512 CHARACTERS',
    ready: 'CHANNEL READY',
    forming: 'FORMING',
    transmitting: 'TRANSMITTING',
    opening: 'LINK ESTABLISHED',
    waiting: 'Enter a message in the command channel.',
  },
};
