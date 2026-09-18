import type { CharacterId } from '../../core/character/id';
import neutral from '../../assets/portraits/aletheia/neutral.png';
import blink from '../../assets/portraits/aletheia/blink.png';
import thinking from '../../assets/portraits/aletheia/thinking.png';
import transmitA from '../../assets/portraits/aletheia/transmit-a.png';
import transmitB from '../../assets/portraits/aletheia/transmit-b.png';
import aura from '../../assets/portraits/aura/neutral.png';
import auraBlink from '../../assets/portraits/aura/blink.png';
import auraThinking from '../../assets/portraits/aura/thinking.png';
import auraTransmitA from '../../assets/portraits/aura/transmit-a.png';
import auraTransmitB from '../../assets/portraits/aura/transmit-b.png';
import themis from '../../assets/portraits/themis/neutral.png';

export type PortraitState =
  'neutral' | 'blink' | 'thinking' | 'transmit-a' | 'transmit-b';

const portraits: Record<
  CharacterId,
  Partial<Record<PortraitState, string>> & { neutral: string }
> = {
  aletheia: {
    neutral,
    blink,
    thinking,
    'transmit-a': transmitA,
    'transmit-b': transmitB,
  },
  aura: {
    neutral: aura,
    blink: auraBlink,
    thinking: auraThinking,
    'transmit-a': auraTransmitA,
    'transmit-b': auraTransmitB,
  },
  themis: { neutral: themis },
};

export function portraitSource(
  character: CharacterId | undefined,
  state: PortraitState = 'neutral',
) {
  if (!character) return undefined;
  return portraits[character][state] ?? portraits[character].neutral;
}
