import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { portraitSource, type PortraitState } from './states';

it('maps five distinct Aura PNG assets with one canonical canvas size', () => {
  const states: PortraitState[] = [
    'neutral',
    'blink',
    'thinking',
    'transmit-a',
    'transmit-b',
  ];
  const hashes = states.map((state) => {
    expect(portraitSource('aura', state)).toBe(
      `/src/assets/portraits/aura/${state}.png`,
    );
    const png = readFileSync(
      new URL(`../../assets/portraits/aura/${state}.png`, import.meta.url),
    );
    expect(png.subarray(1, 4).toString()).toBe('PNG');
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([144, 180]);
    return createHash('sha256').update(png).digest('hex');
  });
  expect(new Set(hashes).size).toBe(5);
});
it('keeps undefined handling and the Aletheia mapping', () => {
  expect(portraitSource('themis', 'blink')).toBe(
    '/src/assets/portraits/themis/blink.png',
  );
  expect(portraitSource(undefined)).toBeUndefined();
  for (const state of [
    'neutral',
    'blink',
    'thinking',
    'transmit-a',
    'transmit-b',
  ] as const)
    expect(portraitSource('aletheia', state)).toBe(
      `/src/assets/portraits/aletheia/${state}.png`,
    );
});

it('maps five distinct Themis PNG assets on the canonical portrait canvas', () => {
  const states: PortraitState[] = [
    'neutral',
    'blink',
    'thinking',
    'transmit-a',
    'transmit-b',
  ];
  const hashes = states.map((state) => {
    const png = readFileSync(
      new URL(`../../assets/portraits/themis/${state}.png`, import.meta.url),
    );
    expect(png.subarray(1, 4).toString()).toBe('PNG');
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([144, 180]);
    expect(portraitSource('themis', state)).toBe(
      `/src/assets/portraits/themis/${state}.png`,
    );
    return createHash('sha256').update(png).digest('hex');
  });
  expect(new Set(hashes).size).toBe(5);
});
