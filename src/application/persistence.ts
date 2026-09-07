import { characterIds, type CharacterId } from '../core/character/id.ts';
import type {
  PersistentCharacter,
  SavedConfiguration,
  StorageProvider,
} from '../core/storage/model.ts';
import {
  restoreCharacter,
  validateConfiguration,
} from '../core/storage/validation.ts';
export const persistenceContext = Symbol('local-persistence');
export class Persistence {
  status: 'loading' | 'available' | 'session-only' = 'loading';
  configuration: SavedConfiguration | undefined;
  lastFailure: { operation: string; name: string } | undefined;
  completedWrites = 0;
  private characters: Partial<Record<CharacterId, unknown>> = {};
  private queue = Promise.resolve();
  constructor(private readonly storage: StorageProvider) {}
  async initialize() {
    try {
      this.configuration = validateConfiguration(
        await this.storage.loadConfiguration(),
      );
      const snapshots = await Promise.all(
        characterIds.map(
          async (id) => [id, await this.storage.loadCharacter(id)] as const,
        ),
      );
      for (const [id, snapshot] of snapshots) this.characters[id] = snapshot;
      this.status = 'available';
    } catch (error) {
      this.degrade('load', error);
    }
  }
  private degrade(operation: string, error: unknown) {
    this.status = 'session-only';
    this.lastFailure = {
      operation,
      name: error instanceof Error ? error.name : 'UnknownError',
    };
  }
  restore(id: CharacterId) {
    return restoreCharacter(this.characters[id], id);
  }
  saveConfiguration(configuration: SavedConfiguration) {
    this.configuration = { ...configuration };
    const copy = { ...configuration };
    this.enqueue('configuration', () => this.storage.saveConfiguration(copy));
  }
  saveCharacter(character: PersistentCharacter) {
    const copy = structuredClone(character);
    this.characters[copy.characterId] = copy;
    this.enqueue('character', () => this.storage.saveCharacter(copy));
  }
  private enqueue(operation: string, write: () => Promise<void>) {
    this.queue = this.queue.then(async () => {
      if (this.status !== 'available') return;
      try {
        await write();
        this.completedWrites++;
      } catch (error) {
        this.degrade(operation, error);
      }
    });
  }
  async inspectStored() {
    await this.flush();
    const configuration = validateConfiguration(
      await this.storage.loadConfiguration(),
    );
    return {
      status: this.status,
      lastFailure: this.lastFailure,
      completedWrites: this.completedWrites,
      configuration,
      ...(configuration
        ? restoreCharacter(
            await this.storage.loadCharacter(configuration.character),
            configuration.character,
          )
        : {}),
    };
  }
  async flush() {
    await this.queue;
  }
}
