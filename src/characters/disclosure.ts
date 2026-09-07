import type { CharacterId } from '../core/character/id.ts';
import type { Locale } from '../core/language/locale.ts';
import type { MemoryKind } from '../core/memory/long-term.ts';

// Quoted values preserve user wording without inflection or factual paraphrase.
export const disclosureVoices = {
  aletheia: {
    ru: {
      name: 'Ты представился именем «{value}». Буду знать, как к тебе обращаться.',
      preference: 'Ты называешь «{value}» своим предпочтением.',
      dislike: 'Ты говоришь, что тебе не нравится «{value}».',
      interest: 'Ты обозначил свой интерес — «{value}».',
      project: 'Ты говоришь, что работаешь над «{value}».',
      important_value: 'Ты называешь «{value}» важным для себя.',
    },
    en: {
      name: 'You introduced yourself as “{value}”. I know how to address you now.',
      preference: 'You describe “{value}” as a preference of yours.',
      dislike: 'You say that you dislike “{value}”.',
      interest: 'You have identified an interest — “{value}”.',
      project: 'You say you are working on “{value}”.',
      important_value: 'You identify “{value}” as important to you.',
    },
  },
  aura: {
    ru: {
      name: 'Рада знакомству, {value}.',
      preference: 'Тебе близко «{value}».',
      dislike: '«{value}» тебе не по душе.',
      interest: '«{value}» — то, что тебя интересует.',
      project:
        'Ты работаешь над «{value}». Что тебе особенно важно в этой работе?',
      important_value: '«{value}» для тебя важно.',
    },
    en: {
      name: 'Good to meet you, {value}.',
      preference: '“{value}” is something you like.',
      dislike: '“{value}” is not to your liking.',
      interest: '“{value}” is something that interests you.',
      project:
        'You are working on “{value}”. What matters most to you in that work?',
      important_value: '“{value}” matters to you.',
    },
  },
  themis: {
    ru: {
      name: 'Поняла, {value}.',
      preference: 'Твоё предпочтение — «{value}».',
      dislike: 'Тебе не нравится «{value}».',
      interest: 'Твой интерес — «{value}».',
      project: 'Ты работаешь над «{value}».',
      important_value: 'Для тебя важно «{value}».',
    },
    en: {
      name: 'Understood, {value}.',
      preference: 'Your stated preference is “{value}”.',
      dislike: 'You dislike “{value}”.',
      interest: 'Your stated interest is “{value}”.',
      project: 'You are working on “{value}”.',
      important_value: '“{value}” is important to you.',
    },
  },
} satisfies Record<CharacterId, Record<Locale, Record<MemoryKind, string>>>;
