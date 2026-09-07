import type { CharacterId } from '../core/character/id.ts';
import type { Locale } from '../core/language/locale.ts';
export const memoryVoices = {
  aletheia: {
    ru: {
      preference: 'Это уже появлялось среди твоих предпочтений.',
      interest: 'Этот интерес уже возникал в нашем разговоре.',
      project: 'Работа над этим проектом уже появлялась в нашем разговоре.',
    },
    en: {
      preference: 'This has come up among your preferences before.',
      interest: 'This interest has appeared in our conversation before.',
      project: 'You have mentioned working on this project before.',
    },
  },
  aura: {
    ru: {
      preference: 'Я помню, что это тебе близко.',
      interest: 'Я помню твой интерес к этому.',
      project: 'Я помню, что ты работаешь над этим проектом.',
    },
    en: {
      preference: 'I remember that you like this.',
      interest: 'I remember your interest in this.',
      project: 'I remember that you are working on this project.',
    },
  },
  themis: {
    ru: {
      preference: 'Это предпочтение уже было обозначено.',
      interest: 'Этот интерес уже был обозначен.',
      project: 'Этот проект уже появлялся в разговоре.',
    },
    en: {
      preference: 'You have stated this preference before.',
      interest: 'You have stated this interest before.',
      project: 'You have identified this project as part of your work before.',
    },
  },
} satisfies Record<
  CharacterId,
  Record<Locale, Record<'preference' | 'interest' | 'project', string>>
>;
