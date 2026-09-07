import { expect, it, vi } from 'vitest';
import { Persistence } from './persistence';
import type {
  StorageProvider,
  PersistentCharacter,
  SavedConfiguration,
} from '../core/storage/model';
import { createCharacterRuntime } from '../core/character/runtime';
import { emptyLongTermMemory } from '../core/memory/long-term';
import { createCommunicationSession } from '../ui/terminal/session';
import { conversationEngine } from './intelligence';
class LocalTestStorage implements StorageProvider {
  configuration: unknown;
  character: unknown;
  async loadConfiguration() {
    return structuredClone(this.configuration);
  }
  async loadCharacter() {
    return structuredClone(this.character);
  }
  async saveConfiguration(value: SavedConfiguration) {
    this.configuration = structuredClone(value);
  }
  async saveCharacter(value: PersistentCharacter) {
    this.character = structuredClone(value);
  }
  async deleteCharacter() {
    this.character = undefined;
  }
  async deleteConfiguration() {
    this.configuration = undefined;
  }
}
const config: SavedConfiguration = {
  language: 'ru',
  layout: 'C',
  displayStandard: 'amber',
  audioEnabled: false,
  character: 'aura',
};
it('queues snapshot writes in order, then restores completed state while WorkingMemory and transcript reset', async () => {
  vi.useFakeTimers();
  const storage = new LocalTestStorage();
  const service = new Persistence(storage);
  await service.initialize();
  service.saveConfiguration(config);
  let records = 0;
  const session = createCommunicationSession(
    'aura',
    'ru',
    (s) => (records = s.records.length),
    () => {},
    conversationEngine,
    true,
    { initial: service.restore('aura'), save: (v) => service.saveCharacter(v) },
  );
  try {
    session.submit('Что делает меня мной?');
    await vi.runAllTimersAsync();
    session.submit('Я люблю смотреть на звёзды.');
    await vi.runAllTimersAsync();
    await service.flush();
    expect(records).toBe(4);
    expect(session.inspectLongTermMemory().semantic).toHaveLength(1);
    const original = session.inspectCharacter();
    const returned = new Persistence(storage);
    await returned.initialize();
    expect(returned.configuration).toEqual(config);
    expect(returned.restore('aura').runtime).toEqual(original);
    const restarted = createCommunicationSession(
      'aura',
      'ru',
      (s) => (records = s.records.length),
      () => {},
      conversationEngine,
      true,
      {
        initial: returned.restore('aura'),
        save: (v) => returned.saveCharacter(v),
      },
    );
    expect(restarted.inspectWorkingMemory().recentTurns).toEqual([]);
    expect(restarted.inspectWorkingMemory().currentThread).toBeUndefined();
    expect(restarted.inspectLongTermMemory().semantic).toHaveLength(1);
    restarted.submit('Снова хочется смотреть на звёзды.');
    await vi.runAllTimersAsync();
    expect(records).toBe(2);
    restarted.cancel();
  } finally {
    session.cancel();
    vi.useRealTimers();
  }
});
it('survives unavailable storage and failed writes with explicit session-only status', async () => {
  const storage = new LocalTestStorage();
  storage.loadConfiguration = async () => {
    throw new Error('blocked');
  };
  const unavailable = new Persistence(storage);
  await unavailable.initialize();
  expect(unavailable.status).toBe('session-only');
  expect(unavailable.restore('aura').runtime).toEqual(
    createCharacterRuntime('aura', 0),
  );
  unavailable.saveConfiguration(config);
  await unavailable.flush();
  expect(unavailable.configuration).toEqual(config);
  const failing = new LocalTestStorage();
  failing.saveCharacter = async () => {
    throw new Error('quota');
  };
  const service = new Persistence(failing);
  await service.initialize();
  service.saveCharacter({
    version: 1,
    ...createCharacterRuntime('aura', 0),
    memory: emptyLongTermMemory(),
  });
  await service.flush();
  expect(service.status).toBe('session-only');
});
it('invalid configuration does not erase independently valid character memory on reconfiguration', async () => {
  const storage = new LocalTestStorage();
  storage.configuration = { layout: 'invalid' };
  const record = {
    version: 1 as const,
    ...createCharacterRuntime('aura', 0),
    memory: emptyLongTermMemory(),
  };
  record.relationshipState.familiarity = 0.42;
  await storage.saveCharacter(record);
  const service = new Persistence(storage);
  await service.initialize();
  expect(service.configuration).toBeUndefined();
  expect(service.restore('aura').runtime.relationshipState.familiarity).toBe(
    0.42,
  );
  expect(service.restore('themis').runtime.relationshipState.familiarity).toBe(
    0.05,
  );
});

it('restored session writes new lifecycle state and exact reinforcement back to storage', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(1000);
  const storage = new LocalTestStorage();
  const first = new Persistence(storage);
  await first.initialize();
  first.saveConfiguration(config);
  const open = (service: Persistence) =>
    createCommunicationSession(
      'aura',
      'ru',
      () => {},
      () => {},
      conversationEngine,
      true,
      {
        initial: service.restore('aura'),
        save: (v) => service.saveCharacter(v),
      },
    );
  const session = open(first);
  try {
    session.submit('Я люблю смотреть на звёзды ночью.');
    await vi.runAllTimersAsync();
    await first.flush();
    const before = first.restore('aura');
    session.cancel();
    vi.setSystemTime(10000);
    const second = new Persistence(storage);
    await second.initialize();
    const restored = open(second);
    restored.submit('Я люблю смотреть на звёзды ночью.');
    await vi.runAllTimersAsync();
    await second.flush();
    const third = new Persistence(storage);
    await third.initialize();
    const after = third.restore('aura');
    expect(after.runtime.relationshipState.familiarity).toBeGreaterThan(
      before.runtime.relationshipState.familiarity,
    );
    expect(after.runtime.relationshipState.trust).toBe(
      before.runtime.relationshipState.trust,
    );
    expect(after.runtime.userStyleProfile).not.toEqual(
      before.runtime.userStyleProfile,
    );
    expect(after.runtime.characterState.energy).toBeLessThan(
      before.runtime.characterState.energy,
    );
    expect(after.runtime.characterState.lastInteraction).toBeGreaterThan(
      before.runtime.characterState.lastInteraction!,
    );
    expect(after.memory.semantic).toHaveLength(1);
    expect(after.memory.semantic[0]).toMatchObject({
      id: before.memory.semantic[0]!.id,
      firstSeenAt: before.memory.semantic[0]!.firstSeenAt,
      reinforcementCount: 2,
    });
    expect(after.memory.semantic[0]!.lastSeenAt).toBeGreaterThan(
      before.memory.semantic[0]!.lastSeenAt,
    );
    restored.submit('Я люблю смотреть на звёзды.');
    await vi.runAllTimersAsync();
    await second.flush();
    expect(second.restore('aura').memory.semantic).toHaveLength(2);
    restored.cancel();
  } finally {
    session.cancel();
    vi.useRealTimers();
  }
});
