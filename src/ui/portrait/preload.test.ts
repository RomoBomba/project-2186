import { afterEach, expect, it, vi } from 'vitest';
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});
it('decodes all five unique assets before opening the motion gate and shares in-flight work', async () => {
  const resolvers: (() => void)[] = [];
  const sources: string[] = [];
  vi.stubGlobal(
    'Image',
    class {
      set src(value: string) {
        sources.push(value);
      }
      decode() {
        return new Promise<void>((resolve) => resolvers.push(resolve));
      }
    },
  );
  const { preloadAletheia } = await import('./preload');
  const pending = preloadAletheia();
  expect(preloadAletheia()).toBe(pending);
  expect(new Set(sources).size).toBe(5);
  let done = false;
  void pending.then(() => {
    done = true;
  });
  resolvers.slice(0, 4).forEach((resolve) => resolve());
  await Promise.resolve();
  expect(done).toBe(false);
  resolvers[4]!();
  expect(await pending).toBe(true);
});
it('decode failure keeps the neutral fallback and allows a later retry', async () => {
  const decode = vi.fn().mockRejectedValue(new Error('missing image'));
  vi.stubGlobal(
    'Image',
    class {
      src = '';
      decode = decode;
    },
  );
  const { preloadAletheia } = await import('./preload');
  expect(await preloadAletheia()).toBe(false);
  decode.mockResolvedValue(undefined);
  expect(await preloadAletheia()).toBe(true);
});
it('decodes complete character sets independently and preserves successful caches', async () => {
  const sources: string[] = [];
  const decode = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal(
    'Image',
    class {
      set src(value: string) {
        sources.push(value);
      }
      decode = decode;
    },
  );
  const { preloadPortrait } = await import('./preload');
  expect(await preloadPortrait('aura')).toBe(true);
  expect(sources).toHaveLength(5);
  expect(sources.every((src) => src.includes('/aura/'))).toBe(true);
  decode.mockRejectedValue(new Error('missing'));
  expect(await preloadPortrait('aletheia')).toBe(false);
  expect(await preloadPortrait('aura')).toBe(true);
  decode.mockResolvedValue(undefined);
  const beforeThemis = sources.length;
  expect(await preloadPortrait('themis')).toBe(true);
  expect(sources.slice(beforeThemis)).toHaveLength(5);
  expect(
    sources.slice(beforeThemis).every((src) => src.includes('/themis/')),
  ).toBe(true);
});
