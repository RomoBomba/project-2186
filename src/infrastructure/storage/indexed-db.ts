import type { CharacterId } from '../../core/character/id.ts';
import type {
  PersistentCharacter,
  SavedConfiguration,
  StorageProvider,
} from '../../core/storage/model.ts';
export const databaseName = 'project-2186';
export const databaseVersion = 1;
export function upgradeStorage(database: IDBDatabase) {
  if (!database.objectStoreNames.contains('configuration'))
    database.createObjectStore('configuration');
  if (!database.objectStoreNames.contains('characters'))
    database.createObjectStore('characters');
}
export class IndexedDBStorage implements StorageProvider {
  private pending: Promise<IDBDatabase> | undefined;
  private open(): Promise<IDBDatabase> {
    if (this.pending) return this.pending;
    this.pending = new Promise((resolve, reject) => {
      const request = indexedDB.open(databaseName, databaseVersion);
      let settled = false;
      const timer = setTimeout(() => {
        settled = true;
        reject(new Error('Storage open timeout'));
      }, 1500);
      const fail = () => {
        settled = true;
        clearTimeout(timer);
        reject(request.error ?? new Error('Storage unavailable'));
      };
      request.onblocked = fail;
      request.onerror = fail;
      request.onupgradeneeded = () => upgradeStorage(request.result);
      request.onsuccess = () => {
        clearTimeout(timer);
        if (settled) {
          request.result.close();
          return;
        }
        const db = request.result;
        db.onversionchange = () => db.close();
        resolve(db);
      };
    });
    return this.pending;
  }
  private async access(
    store: string,
    key: string,
    operation: 'get' | 'put' | 'delete',
    value?: unknown,
  ): Promise<unknown> {
    const database = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(
        store,
        operation === 'get' ? 'readonly' : 'readwrite',
      );
      const objectStore = transaction.objectStore(store);
      const request =
        operation === 'get'
          ? objectStore.get(key)
          : operation === 'put'
            ? objectStore.put(value, key)
            : objectStore.delete(key);
      const timer = setTimeout(() => {
        transaction.abort();
        reject(new Error('Storage transaction timeout'));
      }, 1500);
      transaction.oncomplete = () => {
        clearTimeout(timer);
        resolve(request.result);
      };
      transaction.onabort = transaction.onerror = () => {
        clearTimeout(timer);
        reject(transaction.error ?? new Error('Storage transaction failed'));
      };
    });
  }
  loadConfiguration() {
    return this.access('configuration', 'active', 'get');
  }
  async saveConfiguration(value: SavedConfiguration) {
    await this.access('configuration', 'active', 'put', value);
  }
  loadCharacter(id: CharacterId) {
    return this.access('characters', id, 'get');
  }
  async saveCharacter(value: PersistentCharacter) {
    await this.access('characters', value.characterId, 'put', value);
  }
  async deleteCharacter(id: CharacterId) {
    await this.access('characters', id, 'delete');
  }
  async deleteConfiguration() {
    await this.access('configuration', 'active', 'delete');
  }
}
