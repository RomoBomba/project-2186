import {
  extractMemoryCandidates,
  retainCandidates,
  emptyLongTermMemory,
  type LongTermMemory,
} from '../../core/memory/long-term';
import type { PersistentCharacter } from '../../core/storage/model';
import type { CharacterRuntime } from '../../core/character/runtime';
import {
  createCharacterRuntime,
  transitionCharacterRuntime,
} from '../../core/character/runtime';
import { observeSurface } from '../../core/character/user-style';
import type { CharacterId } from '../../core/character/id';
import type { Locale } from '../../core/language/locale';
import { characterProfiles } from '../../core/character/profile';
import type { ConversationEngine } from '../../core/conversation/engine';
import { initialWorkingMemory } from '../../core/memory/working';
import { terminalMessages } from '../../locales/terminal';
import {
  segmentTransmission,
  startSemanticTransmission,
} from './SemanticTransmission';

export const maximumCommandLength = 512;
export type TranscriptRecord = {
  id: number;
  speaker: 'user' | CharacterId;
  locale?: Locale;
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
  persistence?: {
    initial: { runtime: CharacterRuntime; memory: LongTermMemory };
    save: (value: PersistentCharacter) => void;
  },
) {
  let session: CommunicationSession = { state: 'ready', records: [] };
  let characterRuntime =
    persistence?.initial.runtime ??
    createCharacterRuntime(character, Date.now());
  let longTermMemory = persistence?.initial.memory ?? emptyLongTermMemory();
  let referencedIds: string[] = [];
  let lastReferenceTurn = -4;
  const save = () =>
    persistence?.save({
      version: 1,
      characterId: character,
      characterState: characterRuntime.characterState,
      relationshipState: characterRuntime.relationshipState,
      userStyleProfile: characterRuntime.userStyleProfile,
      memory: longTermMemory,
    });
  let workingMemory = initialWorkingMemory();
  let disposed = false;
  let reduced = reducedMotion;
  let playback: ReturnType<typeof startSemanticTransmission> | undefined;
  return {
    setLocale(value: Locale) {
      locale = value;
    },
    // Detached data snapshot for tests/inspection; never rendered by the artwork.
    inspectLongTermMemory() {
      return structuredClone(longTermMemory);
    },
    inspectCharacter() {
      return structuredClone(characterRuntime);
    },
    inspectResponseHistory() {
      return structuredClone(workingMemory.history);
    },
    inspectWorkingMemory() {
      return structuredClone(workingMemory);
    },
    submit(raw: string): boolean {
      if (disposed || session.state !== 'ready') return false;
      const text = raw.trim();
      if (!text || raw.length > maximumCommandLength) return false;
      const exchangeLocale = locale;
      const priorSemantic = longTermMemory.semantic;
      longTermMemory = retainCandidates(
        longTermMemory,
        extractMemoryCandidates(text, exchangeLocale, workingMemory),
        Date.now(),
      );
      const observation = observeSurface(text);
      characterRuntime = transitionCharacterRuntime(characterRuntime, {
        type: 'userMessageReceived',
        at: Date.now(),
        observation,
      });

      save();
      const user: TranscriptRecord = {
        id: session.records.length + 1,
        speaker: 'user',
        locale: exchangeLocale,
        text,
      };
      let response: TranscriptRecord = {
        id: user.id + 1,
        speaker: character,
        locale: exchangeLocale,
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
          exchangeLocale,
          workingMemory,
          { semantic: priorSemantic, referencedIds, lastReferenceTurn },
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
              if (result.response.usedMemoryIds?.length) {
                referencedIds = [
                  ...referencedIds,
                  ...result.response.usedMemoryIds,
                ].slice(-100);
                lastReferenceTurn = workingMemory.history.turn;
              }
              workingMemory = result.nextMemory;
              save();
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
            text: terminalMessages[exchangeLocale].unavailable,
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
      save();
      disposed = true;
      playback?.cancel();
    },
  };
}
