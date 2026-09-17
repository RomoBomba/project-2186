import type { SystemConfiguration } from '../setup/model';
import type { CharacterId } from '../../core/character/id';
import { audioCues, type AudioEngine } from '../../infrastructure/audio/model';
import type { BootStep } from '../boot/sequence';
import type { CommunicationSession } from '../terminal/session';

/** One wake + one channel cue; no delayed queue separate from the visual scheduler. */
export function bootAudio(audio: AudioEngine) {
  let wake = false,
    channel = false,
    stopped = false;
  return {
    step(step: BootStep) {
      if (stopped) return;
      if (step.state === 'power' && !wake) {
        wake = true;
        audio.play({ type: audioCues.bootWake });
      }
      if (step.state === 'initializing' && !channel) {
        channel = true;
        audio.play({ type: audioCues.bootChannel });
      }
      if (step.state === 'collapse' || step.state === 'ready')
        audio.cancel('boot');
    },
    cancel() {
      stopped = true;
      audio.cancel('boot');
    },
  };
}
export function terminalAudio(audio: AudioEngine) {
  let state: CommunicationSession['state'] = 'ready';
  let active = false;
  let connected = false;
  return {
    setActive(value: boolean) {
      active = value;
      if (!active) {
        audio.cancel('terminal');
        audio.cancel('character');
      }
    },
    connect(character: CharacterId) {
      if (!active || connected) return;
      connected = true;
      audio.play({ type: audioCues.characterConnect, character });
    },
    observe(next: CommunicationSession['state']) {
      const previous = state;
      state = next;
      if (!active || next === previous) return;
      if (next === 'forming') {
        audio.play({ type: audioCues.commandSubmit });
        audio.play({ type: audioCues.intelligenceForming });
      } else if (next === 'transmitting')
        audio.play({ type: audioCues.transmissionStart });
    },
    key(
      event: Pick<
        KeyboardEvent,
        'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'isComposing' | 'repeat'
      > & { keyCode?: number },
      composing = false,
    ) {
      if (
        !active ||
        state !== 'ready' ||
        composing ||
        event.isComposing ||
        event.keyCode === 229 ||
        event.repeat ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      )
        return;
      const category =
        event.key === 'Backspace' || event.key === 'Delete'
          ? 'erase'
          : event.key === ' '
            ? 'space'
            : Array.from(event.key).length === 1
              ? 'text'
              : undefined;
      if (category) audio.play({ type: audioCues.commandKey, category });
    },
    cancel() {
      active = false;
      audio.cancel('terminal');
      audio.cancel('character');
    },
  };
}

/** Both visible controls and F1/F2 enter the same quiet system mode. */
export function openSystemAudio(audio: AudioEngine) {
  audio.cancel('terminal');
  audio.cancel('character');
  audio.cancel('system');
  audio.play({ type: audioCues.systemOpen });
}

/** Mutate the one application preference; never replay cues skipped while muted. */
export function toggleAudio(
  configuration: SystemConfiguration,
  audio: AudioEngine,
) {
  configuration.audioEnabled = !configuration.audioEnabled;
  audio.setEnabled(configuration.audioEnabled);
  if (configuration.audioEnabled) audio.unlock();
}
