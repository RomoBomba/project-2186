import type { CharacterId } from '../../core/character/id';
import neutral from '../../assets/portraits/aletheia/neutral.png';
import blink from '../../assets/portraits/aletheia/blink.png';
import thinking from '../../assets/portraits/aletheia/thinking.png';
import transmitA from '../../assets/portraits/aletheia/transmit-a.png';
import transmitB from '../../assets/portraits/aletheia/transmit-b.png';
import aura from '../../assets/portraits/aura/neutral.png';
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
  aura: { neutral: aura },
  themis: { neutral: themis },
};

export function portraitSource(
  character: CharacterId | undefined,
  state: PortraitState = 'neutral',
) {
  if (!character) return undefined;
  return portraits[character][state] ?? portraits[character].neutral;
}
