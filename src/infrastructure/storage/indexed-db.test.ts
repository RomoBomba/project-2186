import { expect, it, vi, afterEach } from 'vitest';
import {
  IndexedDBStorage,
  upgradeStorage,
  databaseVersion,
  databaseName,
} from './indexed-db';
afterEach(() => vi.unstubAllGlobals());
it('creates only missing v1 stores and upgrade is idempotent', () => {
  const stores = new Set<string>();
  const createObjectStore = vi.fn((name: string) => stores.add(name));
  const db = {
    objectStoreNames: { contains: (name: string) => stores.has(name) },
    createObjectStore,
  } as unknown as IDBDatabase;
  upgradeStorage(db);
  upgradeStorage(db);
  expect([...stores]).toEqual(['configuration', 'characters']);
  expect(createObjectStore).toHaveBeenCalledTimes(2);
  expect(databaseVersion).toBe(1);
  expect(databaseName).toBe('project-2186');
});
it('rejects gracefully when browser storage is unavailable', async () => {
  vi.stubGlobal('indexedDB', undefined);
  await expect(new IndexedDBStorage().loadConfiguration()).rejects.toThrow();
});
it('rejects blocked opens and closes a later connection instead of using stale storage', async () => {
  const request: {
    onblocked?: () => void;
    onsuccess?: () => void;
    error: null;
    result: { close: () => void };
  } = { error: null, result: { close: vi.fn() } };
  vi.stubGlobal('indexedDB', { open: () => request });
  const read = new IndexedDBStorage().loadConfiguration();
  request.onblocked?.();
  await expect(read).rejects.toThrow('Storage unavailable');
  request.onsuccess?.();
  expect(request.result.close).toHaveBeenCalledTimes(1);
});
it('acknowledges writes only on transaction completion, and rejects aborted transactions', async () => {
  let transaction: {
    oncomplete?: () => void;
    onabort?: () => void;
    error: Error | null;
    objectStore: () => { put: ReturnType<typeof vi.fn> };
  };
  const put = vi.fn(() => ({ result: 'active' }));
  const db = {
    transaction: vi.fn(() => {
      transaction = { error: null, objectStore: () => ({ put }) };
      return transaction;
    }),
    close: vi.fn(),
  };
  const request: { result: typeof db; onsuccess?: () => void } = { result: db };
  vi.stubGlobal('indexedDB', { open: () => request });
  const adapter = new IndexedDBStorage();
  const configuration = {
    language: 'ru' as const,
    layout: 'C' as const,
    displayStandard: 'amber' as const,
    audioEnabled: false,
    character: 'aura' as const,
  };
  let complete = false;
  const write = adapter.saveConfiguration(configuration).then(() => {
    complete = true;
  });
  request.onsuccess?.();
  await Promise.resolve();
  expect(put).toHaveBeenCalledWith(configuration, 'active');
  expect(complete).toBe(false);
  transaction!.oncomplete?.();
  await write;
  expect(complete).toBe(true);
  const failed = adapter.saveConfiguration(configuration);
  await Promise.resolve();
  transaction!.error = new Error('quota');
  transaction!.onabort?.();
  await expect(failed).rejects.toThrow('quota');
});
