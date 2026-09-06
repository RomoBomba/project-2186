import type { Locale } from '../core/language/locale.ts';
export type Voice = {
  greeting: readonly string[];
  identity: readonly string[];
  uncertainty: readonly string[];
  clarification: readonly string[];
};
export type CharacterVoice = Record<Locale, Voice>;
