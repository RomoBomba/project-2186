import { expect, it } from 'vitest';
import { readFile, readdir } from 'node:fs/promises';
import { canonicalKnowledge } from '../../generated/knowledge.ts';
import { serializeCorpus, generatedKnowledgePath } from './build.ts';
import { loadRepositoryKnowledge } from './repository.ts';
import { compareIds } from '../../core/knowledge/normalization.ts';
it('delivers only validated canonical cards, deterministically, without a tracked artifact', async () => {
  const cards = await loadRepositoryKnowledge();
  expect(canonicalKnowledge).toEqual(
    [...cards].sort((a, b) => compareIds(a.id, b.id)),
  );
  expect(serializeCorpus(cards)).toBe(serializeCorpus([...cards].reverse()));
  expect(await readFile(generatedKnowledgePath, 'utf8')).toBe(
    serializeCorpus(cards),
  );
  expect(JSON.stringify(canonicalKnowledge)).not.toContain(
    'Test card; not PROJECT',
  );
  expect(
    await readFile(new URL('../../../.gitignore', import.meta.url), 'utf8'),
  ).toContain('src/generated/');
});
it('keeps Node/YAML/UI dependencies outside new core cognition', async () => {
  for (const folder of ['conversation', 'intelligence']) {
    const root = new URL(`../../core/${folder}/`, import.meta.url);
    for (const filename of await readdir(root)) {
      if (filename.endsWith('.test.ts')) continue;
      const code = await readFile(new URL(filename, root), 'utf8');
      expect(code).not.toMatch(/from\s+['"](?:svelte|yaml|node:|vite)/);
      expect(code).not.toMatch(
        /Math\.random|Date\.now|\bfetch\(|localStorage|indexedDB/,
      );
    }
  }
  const session = await readFile(
    new URL('../../ui/terminal/session.ts', import.meta.url),
    'utf8',
  );
  expect(session).not.toContain('phase4');
});
