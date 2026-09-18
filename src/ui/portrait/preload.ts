import type { CharacterId } from '../../core/character/id';
import { motionProfiles } from './profiles';
import { portraitSource, type PortraitState } from './states';
const states: PortraitState[] = [
  'neutral',
  'blink',
  'thinking',
  'transmit-a',
  'transmit-b',
];
const decoded = new Map<CharacterId, Promise<boolean>>();
export function preloadPortrait(character: CharacterId): Promise<boolean> {
  if (!motionProfiles[character]) return Promise.resolve(false);
  const existing = decoded.get(character);
  if (existing) return existing;
  const pending = Promise.all(
    states.map(async (state) => {
      const image = new Image();
      image.src = portraitSource(character, state)!;
      await image.decode();
      return image;
    }),
  ).then(
    () => true,
    () => {
      decoded.delete(character);
      return false;
    },
  );
  decoded.set(character, pending);
  return pending;
}
export const preloadAletheia = () => preloadPortrait('aletheia');
