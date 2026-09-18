import { expect, it } from 'vitest';
import { designCue, mix } from './presets';
import { audioCues } from './model';
it('raises only the four presence cue groups by 3dB, preserving motif proportions and a conservative peak budget', () => {
  const gain = 10 ** (3 / 20);
  for (const [type, original] of [
    [audioCues.commandSubmit, [0.25]],
    [audioCues.intelligenceForming, [0.1]],
    [audioCues.transmissionStart, [0.12, 0.07]],
  ] as const)
    expect(designCue({ type }).tones.map((t) => t.gain)).toEqual(
      original.map((g) => g * gain),
    );
  for (const [character, original] of [
    ['aletheia', [0.17, 0.12]],
    ['aura', [0.19, 0.12]],
    ['themis', [0.2, 0.14]],
  ] as const)
    expect(
      designCue({ type: audioCues.characterConnect, character }).tones.map(
        (t) => t.gain,
      ),
    ).toEqual(original.map((g) => g * gain));
  const key = designCue({ type: audioCues.commandKey, category: 'text' })
    .tones[0]!.gain;
  expect(key).toBe(0.13);
  expect(designCue({ type: audioCues.systemConfirm }).tones[0]!.gain).toBe(
    0.17,
  );
  expect(designCue({ type: audioCues.systemOpen }).tones[0]!.gain).toBe(0.2);
  expect(
    designCue({ type: audioCues.intelligenceForming }).tones[0]!.gain,
  ).toBeGreaterThan(key);
  const peak =
    0.25 *
    gain *
    mix.maximumMaster *
    Math.max(mix.ui, mix.terminal, mix.character) *
    mix.maxVoices;
  expect(peak).toBeLessThan(0.25); // Even six simultaneous worst-case oscillators leave generous full-scale headroom.
});
