import { afterEach, expect, it, vi } from 'vitest';
import { conversationEngine } from './intelligence';
import {
  createCommunicationSession,
  type CommunicationSession,
} from '../ui/terminal/session';
import { characterIds } from '../core/character/id';
import { createCharacterRuntime } from '../core/character/runtime';
import { emptyLongTermMemory } from '../core/memory/long-term';
import { restoreCharacter } from '../core/storage/validation';
import type { PersistentCharacter } from '../core/storage/model';
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it.each(characterIds)(
  'completes %s conversations offline, preserves lifecycle and restores saved state',
  async (id) => {
    vi.useFakeTimers();
    const network = vi.fn(() => {
      throw new Error('Network must not be used');
    });
    vi.stubGlobal('fetch', network);
    const states: CommunicationSession['state'][] = [];
    const save = vi.fn<(s: PersistentCharacter) => void>();
    const session = createCommunicationSession(
      id,
      'ru',
      (s) => states.push(s.state),
      () => {},
      conversationEngine,
      false,
      {
        initial: {
          runtime: createCharacterRuntime(id, 0),
          memory: emptyLongTermMemory(),
        },
        save,
      },
    );
    for (const text of [
      'Что такое память?',
      'Кто ты?',
      'Какая столица Франции?',
      'Мне нравится джаз.',
    ]) {
      expect(session.submit(text)).toBe(true);
      expect(states.at(-1)).toBe('forming');
      await vi.runAllTimersAsync();
      expect(states.at(-1)).toBe('ready');
    }
    expect(states).toContain('transmitting');
    expect(network).not.toHaveBeenCalled();
    expect(session.inspectWorkingMemory().recentTurns.length).toBeGreaterThan(
      0,
    );
    const snapshot = save.mock.calls.at(-1)![0];
    expect(snapshot.memory.semantic.some((m) => m.value === 'джаз')).toBe(true);
    const restored = restoreCharacter(JSON.parse(JSON.stringify(snapshot)), id);
    expect(restored.runtime.relationshipState).toEqual(
      snapshot.relationshipState,
    );
    session.cancel();
    const fresh = createCommunicationSession(
      id,
      'ru',
      () => {},
      () => {},
      conversationEngine,
      false,
      { initial: restored, save },
    );
    expect(fresh.inspectWorkingMemory().recentTurns).toEqual([]);
    expect(fresh.inspectLongTermMemory().semantic).toEqual(
      snapshot.memory.semantic,
    );
    expect(fresh.submit('Почему?')).toBe(true);
    await vi.runAllTimersAsync();
    expect(network).not.toHaveBeenCalled();
    fresh.cancel();
  },
);
