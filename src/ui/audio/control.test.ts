import { expect, it, vi } from 'vitest';
import { render } from 'svelte/server';
import ReferenceComposition from '../display/ReferenceComposition.svelte';
import { toggleAudio } from './routing';
import { silentAudio } from '../../infrastructure/audio/model';
import { Persistence } from '../../application/persistence';
import type {
  SavedConfiguration,
  StorageProvider,
} from '../../core/storage/model';
import { createCommunicationSession } from '../terminal/session';
import { conversationEngine } from '../../application/intelligence';

const config: SavedConfiguration = {
  language: 'ru',
  layout: 'C',
  displayStandard: 'amber',
  character: 'aura',
  audioEnabled: true,
};
it.each(['ru', 'en'] as const)(
  'shows the current audio preference as one accessible metadata button: %s',
  (locale) => {
    for (const audioEnabled of [false, true]) {
      const body = render(ReferenceComposition, {
        props: {
          locale,
          character: 'aura',
          active: true,
          reducedMotion: true,
          systemConfiguration: { ...config, language: locale, audioEnabled },
          onaudiotoggle: () => {},
          onsystemaction: () => {},
        },
      }).body;
      const label = locale === 'ru' ? 'ЗВУК' : 'AUDIO';
      const state =
        locale === 'ru'
          ? audioEnabled
            ? 'ВКЛ'
            : 'ВЫКЛ'
          : audioEnabled
            ? 'ON'
            : 'OFF';
      expect(body).toContain(
        `aria-label="${label}" aria-pressed="${audioEnabled}"`,
      );
      expect(body).toContain(`${label} / ${state}`);
      expect(body.indexOf('aria-keyshortcuts="F2"')).toBeLessThan(
        body.indexOf(`aria-label="${label}"`),
      );
      expect(body.indexOf(`aria-label="${label}"`)).toBeLessThan(
        body.indexOf('aria-keyshortcuts="F1"'),
      );
      expect(body).not.toContain('F3');
    }
  },
);
it('writes the existing preference and restores both states without changing a live conversation', async () => {
  vi.useFakeTimers();
  let stored: unknown = { ...config };
  const store: StorageProvider = {
    loadConfiguration: async () => structuredClone(stored),
    saveConfiguration: async (value) => {
      stored = structuredClone(value);
    },
    loadCharacter: async () => undefined,
    saveCharacter: vi.fn(),
    deleteCharacter: vi.fn(),
    deleteConfiguration: vi.fn(),
  };
  const persistence = new Persistence(store);
  await persistence.initialize();
  const configuration = persistence.configuration!;
  const audio = {
    ...silentAudio,
    setEnabled: vi.fn(),
    unlock: vi.fn(),
    play: vi.fn(),
  };
  let records: unknown;
  const session = createCommunicationSession(
    'aura',
    'ru',
    (state) => {
      records = state.records;
    },
    () => {},
    conversationEngine,
    true,
  );
  try {
    session.submit('Что делает меня мной?');
    await vi.runAllTimersAsync();
    session.submit('Почему?');
    await vi.runAllTimersAsync();
    const before = {
      memory: session.inspectWorkingMemory(),
      character: session.inspectCharacter(),
      history: session.inspectResponseHistory(),
      records,
    };
    for (const expected of [false, true]) {
      toggleAudio(configuration, audio);
      persistence.saveConfiguration(configuration);
      await persistence.flush();
      expect(audio.setEnabled).toHaveBeenLastCalledWith(expected);
      expect(audio.unlock).toHaveBeenCalledTimes(expected ? 1 : 0);
      expect(audio.play).not.toHaveBeenCalled();
      const returning = new Persistence(store);
      await returning.initialize();
      expect(returning.configuration).toEqual({
        ...config,
        audioEnabled: expected,
      });
      expect(Object.keys(returning.configuration!).sort()).toEqual(
        Object.keys(config).sort(),
      );
      expect(session.inspectWorkingMemory()).toEqual(before.memory);
      expect(session.inspectCharacter()).toEqual(before.character);
      expect(session.inspectResponseHistory()).toEqual(before.history);
      expect(records).toBe(before.records);
    }
    expect(store.saveCharacter).not.toHaveBeenCalled();
    expect(store.deleteCharacter).not.toHaveBeenCalled();
    expect(session.submit('Продолжай.')).toBe(true);
    await vi.runAllTimersAsync();
    expect(session.inspectWorkingMemory().currentThread).toBeDefined();
  } finally {
    session.cancel();
    vi.useRealTimers();
  }
});
