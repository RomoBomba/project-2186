import type { CharacterId } from '../core/character/id.ts';
import type { CharacterVoice } from './voice.ts';
import { aletheiaVoice } from './aletheia/voice.ts';
import { auraVoice } from './aura/voice.ts';
import { themisVoice } from './themis/voice.ts';
export const characterVoices: Record<CharacterId, CharacterVoice> = {
  aletheia: aletheiaVoice,
  aura: auraVoice,
  themis: themisVoice,
};
