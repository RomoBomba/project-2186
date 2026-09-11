import type { Locale } from '../language/locale.ts';
import type { CharacterId } from '../character/id.ts';
import { normalizeConceptText } from '../knowledge/normalization.ts';
export const selfQueryKinds = [
  'identity',
  'reasoning',
  'memory',
  'consciousness',
  'creativity',
  'embodiment',
  'character_difference',
  'capability',
  'unknown_self',
] as const;
export type SelfQueryKind = (typeof selfQueryKinds)[number];
export type SelfQuery = {
  kind: SelfQueryKind;
  evidence: string;
  contextual: boolean;
  focus?: 'retained_user' | 'full_transcript';
  comparison?: CharacterId | 'others';
};
const patterns: Record<Locale, Partial<Record<SelfQueryKind, RegExp[]>>> = {
  ru: {
    reasoning: [
      /^(?:а )?ты (?:мыслишь|думаешь|умеешь рассуждать)$/,
      /^как ты (?:думаешь|мыслишь|рассуждаешь|приходишь к ответу|приходишь к ответам)$/,
      /^чем мышление отличается для тебя от сознания$/,
    ],
    memory: [
      /^ты (?:меня )?помнишь(?: меня| наши прошлые разговоры| наш прошлый разговор| весь наш прошлый разговор| предыдущие разговоры| все)?$/,
      /^ты все запоминаешь$/,
      /^(?:что|что именно) ты (?:обо мне помнишь|можешь помнить|запоминаешь)$/,
      /^(?:есть ли у тебя|у тебя есть) память$/,
    ],
    consciousness: [
      /^(?:а )?(?:у тебя есть|есть ли у тебя) (?:сознание|субъективный опыт)$/,
      /^(?:а )?сознание у тебя есть$/,
      /^ты (?:обладаешь сознанием|сознательна|осознаешь себя)$/,
    ],
    creativity: [
      /^ты (?:создаешь искусство|умеешь творить|творческая|можешь создать что то новое)$/,
      /^тогда чем твое создание отличается от копирования$/,
    ],
    embodiment: [
      /^(?:у тебя есть|есть ли у тебя) тело$/,
      /^это твое лицо(?: на экране)?$/,
      /^как ты выглядишь$/,
      /^ты находишься здесь$/,
    ],
    character_difference: [
      /^в чем ты уникальна$/,
      /^чем ты отличаешься от (?:aura|aletheia|themis|ауры|алетеи|темиды|двух других интеллектов|других интеллектов)$/,
      /^почему ты (?:aletheia|aura|themis|алетея|аура|темида)$/,
      /^ты такая же как другие интеллекты$/,
    ],
    capability: [/^что ты (?:умеешь|можешь делать)$/],
  },
  en: {
    reasoning: [
      /^(?:do you think|can you reason|how do you think|how do you reason|how do you arrive at (?:an answer|answers))$/,
      /^how does thinking differ from consciousness for you$/,
    ],
    memory: [
      /^do you (?:remember me|remember everything|remember (?:our )?(?:previous conversations|last conversation|whole last conversation))$/,
      /^what (?:exactly )?(?:do you remember about me|can you remember)$/,
      /^do you have memory$/,
    ],
    consciousness: [
      /^(?:are you conscious|do you have (?:consciousness|subjective experience))$/,
    ],
    creativity: [
      /^(?:do you create art|can you create something new|are you creative|can you be creative)$/,
      /^then how does your creation differ from copying$/,
    ],
    embodiment: [
      /^(?:do you have a body|is that your face(?: on the screen)?|what do you look like|are you here)$/,
    ],
    character_difference: [
      /^(?:what makes you different from|how do you differ from) (?:the other intelligences|the other two intelligences|aura|aletheia|themis)$/,
      /^what (?:is unique about you|makes you unique)$/,
      /^why are you (?:aletheia|aura|themis)$/,
    ],
    capability: [/^what can you do$/],
  },
};
export function recognizeSelfQuery(
  text: string,
  locale: Locale,
  previous?: SelfQueryKind,
): SelfQuery | undefined {
  const normalized = normalizeConceptText(text).replace(/что-то/gu, 'что то');
  const source = normalized.replace(
    locale === 'ru' ? /^(?:привет|здравствуйте) /u : /^(?:hello|hi) /u,
    '',
  );
  for (const kind of selfQueryKinds) {
    if (patterns[locale][kind]?.some((p) => p.test(source))) {
      const contextual = /^(?:тогда|then) /u.test(source);
      if (contextual && previous !== kind) return undefined;
      const named = source.match(
        /(?:от |from )(aletheia|aura|themis|ауры|алетеи|темиды)$/u,
      )?.[1];
      const names: Record<string, CharacterId> = {
        aletheia: 'aletheia',
        aura: 'aura',
        themis: 'themis',
        ауры: 'aura',
        алетеи: 'aletheia',
        темиды: 'themis',
      };
      const name = /других интеллектов|other (?:two )?intelligences/u.test(
        source,
      )
        ? ('others' as const)
        : named
          ? names[named]
          : undefined;
      return {
        kind,
        evidence: source,
        contextual,
        ...(kind === 'memory' &&
        /прошл|previous|last|меня|обо мне|\bme\b/u.test(source)
          ? {
              focus: /прошл|previous|last/u.test(source)
                ? ('full_transcript' as const)
                : ('retained_user' as const),
            }
          : {}),
        ...(name ? { comparison: name } : {}),
      };
    }
  }
  if (
    previous &&
    (locale === 'ru'
      ? /^(?:почему|продолжай|что ты имеешь в виду)$/u
      : /^(?:why|continue|what do you mean)$/u
    ).test(source)
  )
    return { kind: previous, evidence: source, contextual: true };
  // Questions about an unsupported personal attribute, not a generic "you" trigger.
  if (
    (locale === 'ru'
      ? /^(?:ты (?:спишь|жива|женат|замужем|испытываешь боль)|сколько тебе лет|где ты родилась)$/u
      : /^(?:do you (?:sleep|feel pain)|are you (?:alive|married)|how old are you|where were you born)$/u
    ).test(source)
  )
    return { kind: 'unknown_self', evidence: source, contextual: false };
  return undefined;
}
