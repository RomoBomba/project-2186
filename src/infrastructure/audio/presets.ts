import { audioCues, type AudioCue, type AudioScope } from './model';
export type Tone = {
  at: number;
  duration: number;
  frequency: number;
  endFrequency?: number;
  gain: number;
  attack: number;
  waveform: 'sine' | 'triangle';
  cutoff: number;
};
export type CueDesign = {
  scope: AudioScope;
  bus: 'ui' | 'terminal' | 'character';
  tones: readonly Tone[];
};
// Seconds, Hz and linear amplitudes. No equal-tempered melodies or sample assets.
const tone = (
  frequency: number,
  duration: number,
  gain: number,
  at = 0,
  cutoff = 1400,
  attack = 0.006,
): Tone => ({
  frequency,
  duration,
  gain,
  at,
  cutoff,
  attack,
  waveform: 'sine',
});
export const mix = {
  master: 0.22,
  maximumMaster: 0.35,
  ui: 0.32,
  terminal: 0.24,
  character: 0.3,
  maxVoices: 6,
} as const;
export function designCue(cue: AudioCue): CueDesign {
  switch (cue.type) {
    case audioCues.bootWake:
      return {
        scope: 'boot',
        bus: 'ui',
        tones: [{ ...tone(190, 0.11, 0.28), endFrequency: 150 }],
      };
    case audioCues.bootChannel:
      return {
        scope: 'boot',
        bus: 'ui',
        tones: [tone(660, 0.065, 0.13), tone(690, 0.07, 0.09, 0.09)],
      };
    case audioCues.commandKey:
      return {
        scope: 'terminal',
        bus: 'terminal',
        tones: [
          {
            ...tone(
              cue.category === 'space'
                ? 510
                : cue.category === 'erase'
                  ? 430
                  : 580,
              0.018,
              0.13,
              0,
              900,
              0.002,
            ),
            waveform: 'triangle',
          },
        ],
      };
    case audioCues.commandSubmit:
      return {
        scope: 'terminal',
        bus: 'terminal',
        tones: [{ ...tone(390, 0.065, 0.25), endFrequency: 260 }],
      };
    case audioCues.intelligenceForming:
      return {
        scope: 'terminal',
        bus: 'terminal',
        tones: [tone(285, 0.11, 0.1, 0.07, 750, 0.018)],
      };
    case audioCues.transmissionStart:
      return {
        scope: 'terminal',
        bus: 'terminal',
        tones: [tone(610, 0.055, 0.12, 0, 1200), tone(640, 0.045, 0.07, 0.04)],
      };
    case audioCues.systemOpen:
      return {
        scope: 'system',
        bus: 'ui',
        tones: [{ ...tone(320, 0.09, 0.2), endFrequency: 360 }],
      };
    case audioCues.systemConfirm:
      return {
        scope: 'system',
        bus: 'ui',
        tones: [
          { ...tone(430, 0.03, 0.17, 0, 1100, 0.002), waveform: 'triangle' },
        ],
      };
    case audioCues.characterConnect:
      return {
        scope: 'character',
        bus: 'character',
        tones: {
          aletheia: [
            tone(820, 0.13, 0.17, 0, 1800, 0.004),
            tone(865, 0.15, 0.12, 0.09, 1800, 0.004),
          ],
          aura: [
            tone(340, 0.19, 0.19, 0, 850, 0.018),
            tone(425, 0.21, 0.12, 0.12, 850, 0.02),
          ],
          themis: [
            {
              ...tone(290, 0.048, 0.2, 0, 950, 0.003),
              waveform: 'triangle' as const,
            },
            tone(435, 0.06, 0.14, 0.085, 950, 0.003),
          ],
        }[cue.character],
      };
  }
}
