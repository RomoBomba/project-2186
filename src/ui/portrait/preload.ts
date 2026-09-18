import { portraitSource, type PortraitState } from './states';
const states: PortraitState[] = [
  'neutral',
  'blink',
  'thinking',
  'transmit-a',
  'transmit-b',
];
let decoded: Promise<boolean> | undefined;
export function preloadAletheia(): Promise<boolean> {
  return (decoded ??= Promise.all(
    states.map(async (state) => {
      const image = new Image();
      image.src = portraitSource('aletheia', state)!;
      await image.decode();
      return image;
    }),
  ).then(
    () => true,
    () => {
      decoded = undefined;
      return false;
    },
  ));
}
