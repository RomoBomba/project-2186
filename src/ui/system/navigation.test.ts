import { expect, it, vi, afterEach } from 'vitest';
import { render } from 'svelte/server';
import SystemExperience from './SystemExperience.svelte';
import SystemGate from './SystemGate.svelte';
import { Persistence } from '../../application/persistence';
import type {
  StorageProvider,
  SavedConfiguration,
  PersistentCharacter,
} from '../../core/storage/model';
import {
  createCommunicationSession,
  type CommunicationSession,
} from '../terminal/session';
import { conversationEngine } from '../../application/intelligence';
import { navigationMessages } from '../../locales/navigation';
class Store implements StorageProvider {
  config: unknown;
  chars = new Map<string, unknown>();
  async loadConfiguration() {
    return structuredClone(this.config);
  }
  async saveConfiguration(c: SavedConfiguration) {
    this.config = structuredClone(c);
  }
  async loadCharacter(id: string) {
    return structuredClone(this.chars.get(id));
  }
  async saveCharacter(c: PersistentCharacter) {
    this.chars.set(c.characterId, structuredClone(c));
  }
  async deleteConfiguration() {
    throw Error('Navigation must not delete');
  }
  async deleteCharacter() {
    throw Error('Navigation must not delete');
  }
}
const config: SavedConfiguration = {
  language: 'ru',
  layout: 'C',
  displayStandard: 'amber',
  audioEnabled: false,
  character: 'aura',
};
afterEach(() => vi.useRealTimers());
it('renders fresh setup or returning gate from the existing configuration, with locale parity', () => {
  const persistence = new Persistence(new Store());
  const props = {
    persistence,
    active: true,
    reducedMotion: true,
    onstandardchange: () => {},
  };
  expect(render(SystemExperience, { props }).body).toContain(
    'data-setup-stage="language"',
  );
  const returning = render(SystemExperience, {
    props: { ...props, initial: config },
  }).body;
  expect(returning).toContain('data-system-mode="returning"');
  expect(returning.replace(/\s+/g, ' ')).toContain('AURA │ ЭКРАН / C │ AMBER');
  expect(returning).not.toContain('data-setup-stage');
  expect(returning).not.toContain('640 × 400');
  expect(Object.keys(navigationMessages.ru)).toEqual(
    Object.keys(navigationMessages.en),
  );
});
it.each(['ru', 'en'] as const)(
  'uses four safe actions and independent compact metadata: %s',
  (language) => {
    for (const character of ['aletheia', 'aura', 'themis'] as const)
      for (const layout of ['A', 'B', 'C'] as const)
        for (const displayStandard of ['civic', 'phosphor', 'amber'] as const) {
          const body = render(SystemGate, {
            props: {
              configuration: {
                ...config,
                language,
                character,
                layout,
                displayStandard,
              },
              onaction: () => {},
            },
          }).body;
          expect(body.match(/<button/g)).toHaveLength(4);
          expect(body).toContain(`${character.toUpperCase()} │`);
          expect(body.replace(/\s+/g, ' ')).toContain(
            `/ ${layout} │ ${displayStandard.toUpperCase()}`,
          );
        }
    const menu = render(SystemGate, {
      props: {
        configuration: { ...config, language },
        menu: true,
        onaction: () => {},
      },
    }).body;
    expect(menu).toContain(navigationMessages[language].return);
    expect(menu).not.toContain(navigationMessages[language].continue);
  },
);
it('keeps a live session across presentation/locale edits and restores per-character continuity on switching', async () => {
  vi.useFakeTimers();
  const store = new Store(),
    p = new Persistence(store);
  await p.initialize();
  p.saveConfiguration(config);
  let state: CommunicationSession = { state: 'ready', records: [] };
  const open = (character: 'aura' | 'themis', locale: 'ru' | 'en') =>
    createCommunicationSession(
      character,
      locale,
      (s) => (state = s),
      () => {},
      conversationEngine,
      true,
      { initial: p.restore(character), save: (s) => p.saveCharacter(s) },
    );
  const aura = open('aura', 'ru');
  aura.submit('Я люблю звёзды.');
  await vi.runAllTimersAsync();
  aura.submit('Что делает меня мной?');
  await vi.runAllTimersAsync();
  const records = structuredClone(state.records),
    wm = aura.inspectWorkingMemory(),
    runtime = aura.inspectCharacter();
  p.saveConfiguration({
    ...config,
    language: 'en',
    layout: 'B',
    displayStandard: 'phosphor',
    audioEnabled: true,
  });
  aura.setLocale('en');
  expect(state.records).toEqual(records);
  expect(aura.inspectWorkingMemory()).toEqual(wm);
  expect(aura.inspectCharacter()).toEqual(runtime);
  aura.submit('My name is Roman.');
  await vi.runAllTimersAsync();
  expect(state.records.slice(0, 4)).toEqual(records);
  expect(state.records.at(-1)?.text).toBe('Good to meet you, Roman.');
  aura.cancel();
  await p.flush();
  const auraSaved = structuredClone(store.chars.get('aura'));
  const themis = open('themis', 'en');
  expect(themis.inspectWorkingMemory().recentTurns).toEqual([]);
  themis.submit('I like jazz.');
  await vi.runAllTimersAsync();
  themis.cancel();
  await p.flush();
  expect(store.chars.get('aura')).toEqual(auraSaved);
  p.saveConfiguration({
    ...config,
    character: 'themis',
    language: 'en',
    layout: 'B',
    displayStandard: 'phosphor',
  });
  await p.flush();
  const reload = new Persistence(store);
  await reload.initialize();
  expect(reload.configuration?.character).toBe('themis');
  expect(reload.restore('aura').memory.semantic).toHaveLength(2);
  expect(reload.restore('themis').memory.semantic).toHaveLength(1);
  const again = open('aura', 'en');
  expect(again.inspectWorkingMemory().recentTurns).toEqual([]);
  expect(again.inspectCharacter().relationshipState).toEqual(
    aura.inspectCharacter().relationshipState,
  );
  expect(again.inspectLongTermMemory()).toEqual(aura.inspectLongTermMemory());
  again.cancel();
});

it('routes all returning actions explicitly while persisted data stays available', async () => {
  const { routeForAction, routeAfterConfiguration } = await import('./menu');
  const storage = new Store();
  const persistence = new Persistence(storage);
  await persistence.initialize();
  persistence.saveConfiguration(config);
  const snapshot = persistence.restore('aura');
  persistence.saveCharacter({
    version: 1,
    characterId: 'aura',
    characterState: snapshot.runtime.characterState,
    relationshipState: snapshot.runtime.relationshipState,
    userStyleProfile: snapshot.runtime.userStyleProfile,
    memory: snapshot.memory,
  });
  await persistence.flush();
  const stored = structuredClone(storage.chars);
  expect(routeForAction('return')).toBe('terminal');
  for (const [action, destination] of [
    ['new', 'setup'],
    ['configuration', 'edit'],
    ['intelligence', 'selection'],
  ] as const) {
    const screen = routeForAction(action);
    expect(screen).toBe(destination);
    expect(screen).not.toBe('terminal');
    // Reading/restoring the same saved configuration is not a route action.
    await persistence.initialize();
    expect(screen).toBe(destination);
    expect(persistence.configuration).toEqual(config);
    expect(storage.chars).toEqual(stored);
  }
  expect(routeAfterConfiguration('edit', 'gate')).toBe('gate');
  expect(routeAfterConfiguration('setup', 'gate')).toBe('selection');
  expect(routeAfterConfiguration('selection', 'gate')).toBe('selection');
  expect(routeAfterConfiguration('gate', 'terminal')).toBe('gate');
  expect(routeAfterConfiguration('edit', 'terminal')).toBe('terminal');
});

it('arrows and Enter share one selected row; gate Escape is inert and overlay Escape returns', async () => {
  const { menuKey, systemActions } = await import('./menu');
  let index = 0;
  for (const key of ['ArrowDown', 'ArrowRight'])
    index = menuKey(index, key, false).index;
  expect(index).toBe(2);
  expect(menuKey(index, 'Enter', false).action).toBe('configuration');
  index = menuKey(index, 'ArrowLeft', false).index;
  expect(menuKey(index, 'Enter', false).action).toBe('new');
  index = menuKey(index, 'ArrowUp', false).index;
  expect(menuKey(index, 'Enter', false).action).toBe('return');
  index = menuKey(index, 'ArrowUp', false).index;
  expect(index).toBe(3);
  expect(menuKey(index, 'Enter', false).action).toBe('intelligence');
  expect(menuKey(index, 'Escape', false)).toEqual({ index, handled: false });
  expect(menuKey(index, 'Escape', true).action).toBe('return');
  expect(systemActions).toEqual([
    'return',
    'new',
    'configuration',
    'intelligence',
  ]);
  for (const menu of [false, true]) {
    const body = render(SystemGate, {
      props: { configuration: config, menu, onaction: () => {} },
    }).body;
    expect(body.match(/class="[^"]*\bselected\b/g)).toHaveLength(1);
    expect(body.match(/class="[^"]*\bchosen\b/g)).toHaveLength(1);
    expect(body.match(/tabindex="0"/g)).toHaveLength(1);
  }
});

it('returns selector cancellation to the gate, active menu host, or preceding audio stage', async () => {
  const { selectorReturn } = await import('./menu');
  expect(selectorReturn('gate').screen).toBe('gate');
  expect(selectorReturn('terminal').screen).toBe('terminal');
  expect(selectorReturn('setup')).toEqual({
    screen: 'setup',
    setupStage: 'audio',
  });
});
