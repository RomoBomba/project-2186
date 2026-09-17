import type { CharacterId } from '../../core/character/id';

export const audioCues = {
  bootWake: 'BOOT_WAKE',
  bootChannel: 'BOOT_CHANNEL',
  commandKey: 'COMMAND_KEY',
  commandSubmit: 'COMMAND_SUBMIT',
  intelligenceForming: 'INTELLIGENCE_FORMING',
  transmissionStart: 'TRANSMISSION_START',
  systemOpen: 'SYSTEM_OPEN',
  systemConfirm: 'SYSTEM_CONFIRM',
  characterConnect: 'CHARACTER_CONNECT',
} as const;
export type AudioCue =
  | {
      type: Exclude<
        (typeof audioCues)[keyof typeof audioCues],
        'COMMAND_KEY' | 'CHARACTER_CONNECT'
      >;
    }
  | { type: typeof audioCues.commandKey; category: 'text' | 'space' | 'erase' }
  | { type: typeof audioCues.characterConnect; character: CharacterId };
export type AudioScope = 'boot' | 'terminal' | 'system' | 'character';
export interface AudioEngine {
  /** Call from a user gesture only. Never queues missed cues. */
  unlock(): void;
  setEnabled(enabled: boolean): void;
  setMasterGain(value: number): void;
  play(cue: AudioCue): void;
  cancel(scope?: AudioScope): void;
  dispose(): void;
}
export const audioContextKey = Symbol('project2186-audio');
/** Components and SSR remain usable without the application adapter. */
export const silentAudio: AudioEngine = {
  unlock() {},
  setEnabled() {},
  setMasterGain() {},
  play() {},
  cancel() {},
  dispose() {},
};
