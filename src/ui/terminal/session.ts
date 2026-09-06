import {
  createCharacterRuntime,
  transitionCharacterRuntime,
} from '../../core/character/runtime';
import { observeSurface } from '../../core/character/user-style';
import type { CharacterId } from '../../core/character/id';
import type { Locale } from '../../core/language/locale';
import { characterProfiles } from '../../core/character/profile';
import type { ConversationEngine } from '../../core/conversation/engine';
import { initialResponseHistory } from '../../core/conversation/model';
import { terminalMessages } from '../../locales/terminal';
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
  engine: ConversationEngine,
  reducedMotion = false,
) {
  let session: CommunicationSession = { state: 'ready', records: [] };
  let characterRuntime = createCharacterRuntime(character, Date.now());
  let responseHistory = initialResponseHistory();
  let disposed = false;
  let reduced = reducedMotion;
  let playback: ReturnType<typeof startSemanticTransmission> | undefined;
  return {
    // Detached data snapshot for tests/inspection; never rendered by the artwork.
    inspectCharacter() {
      return structuredClone(characterRuntime);
    },
    inspectResponseHistory() {
      return structuredClone(responseHistory);
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
      void engine
        .respond(
          text,
          characterProfiles[character],
          characterRuntime.disposition,
          locale,
          responseHistory,
        )
        .then((result) => {
          if (disposed) return;
          playback = startSemanticTransmission(
            segmentTransmission(result.response.text),
            (chunk) => {
              if (session.state === 'forming')
                characterRuntime = transitionCharacterRuntime(
                  characterRuntime,
                  {
                    type: 'responseStarted',
                    at: Date.now(),
                  },
                );
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
              responseHistory = result.nextHistory;
              session = { ...session, state: 'ready' };
              publish(session);
              completed(response);
            },
            reduced,
          );
        })
        .catch(() => {
          if (disposed) return;
          // Provider failure is not a successful exchange and must not grow relationship.
          characterRuntime = transitionCharacterRuntime(characterRuntime, {
            type: 'sessionStarted',
            at: Date.now(),
          });
          response = {
            ...response,
            text: terminalMessages[locale].unavailable,
          };
          session = {
            state: 'ready',
            records: [...session.records.slice(0, -1), response],
          };
          publish(session);
          completed(response);
        });
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
