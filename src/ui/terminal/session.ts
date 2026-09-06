import {
  createCharacterRuntime,
  transitionCharacterRuntime,
} from '../../core/character/runtime';
import { observeSurface } from '../../core/character/user-style';
import type { CharacterId } from '../../core/character/id';
import type { Locale } from '../../core/language/locale';
import { phase4Response } from '../../fixtures/phase4-responses';
import {
  segmentTransmission,
  startSemanticTransmission,
} from './SemanticTransmission';

export const maximumCommandLength = 512;
export type TranscriptRecord = {
  id: number;
  speaker: 'user' | CharacterId;
  text: string;
};
export type CommunicationSession = {
  state: 'ready' | 'forming' | 'transmitting';
  records: readonly TranscriptRecord[];
};
export function createCommunicationSession(
  character: CharacterId,
  locale: Locale,
  publish: (session: CommunicationSession) => void,
  completed: (record: TranscriptRecord) => void,
  reducedMotion = false,
) {
  let session: CommunicationSession = { state: 'ready', records: [] };
  let characterRuntime = createCharacterRuntime(character, Date.now());
  let exchange = 0;
  let disposed = false;
  let reduced = reducedMotion;
  let playback: ReturnType<typeof startSemanticTransmission> | undefined;
  return {
    // Detached data snapshot for tests/inspection; never rendered by the artwork.
    inspectCharacter() {
      return structuredClone(characterRuntime);
    },
    submit(raw: string): boolean {
      if (disposed || session.state !== 'ready') return false;
      const text = raw.trim();
      if (!text || raw.length > maximumCommandLength) return false;
      const observation = observeSurface(text);
      characterRuntime = transitionCharacterRuntime(characterRuntime, {
        type: 'userMessageReceived',
        at: Date.now(),
        observation,
      });
      const fullResponse = phase4Response(character, locale, exchange++);
      const user: TranscriptRecord = {
        id: session.records.length + 1,
        speaker: 'user',
        text,
      };
      let response: TranscriptRecord = {
        id: user.id + 1,
        speaker: character,
        text: '',
      };
      session = {
        state: 'forming',
        records: [...session.records, user, response],
      };
      publish(session);
      playback = startSemanticTransmission(
        segmentTransmission(fullResponse),
        (chunk) => {
          if (session.state === 'forming')
            characterRuntime = transitionCharacterRuntime(characterRuntime, {
              type: 'responseStarted',
              at: Date.now(),
            });
          response = { ...response, text: response.text + chunk };
          session = {
            ...session,
            state: 'transmitting',
            records: [...session.records.slice(0, -1), response],
          };
          publish(session);
        },
        () => {
          characterRuntime = transitionCharacterRuntime(characterRuntime, {
            type: 'responseCompleted',
            at: Date.now(),
          });
          session = { ...session, state: 'ready' };
          publish(session);
          completed(response);
        },
        reduced,
      );
      return true;
    },
    reduceMotion() {
      reduced = true;
      playback?.reduceMotion();
    },
    cancel() {
      disposed = true;
      playback?.cancel();
    },
  };
}
