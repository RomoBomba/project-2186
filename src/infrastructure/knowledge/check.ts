import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { ConceptGraph } from '../../core/knowledge/graph.ts';
import { ConceptMatcher } from '../../core/knowledge/matcher.ts';
import type { ConceptId } from '../../core/knowledge/model.ts';
import { loadRepositoryKnowledge } from './repository.ts';

// Node-only author/developer command; never imported by the application.
try {
  const args = process.argv.slice(2);
  const options = new Map<string, string>();
  let fixtures = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === '--fixtures') {
      fixtures = true;
      continue;
    }
    if (
      !['--text', '--locale', '--id'].includes(arg) ||
      args[i + 1] === undefined
    )
      throw new Error(
        'Usage: npm run knowledge:check -- [--fixtures] [--locale ru|en] [--text "text"] [--id identity.memory]',
      );
    options.set(arg, args[++i]!);
  }
  const locale = options.get('--locale') ?? 'ru';
  if (locale !== 'ru' && locale !== 'en')
    throw new Error('--locale must be ru or en');
  const cards = await loadRepositoryKnowledge(
    fixtures
      ? fileURLToPath(new URL('./__fixtures__/', import.meta.url))
      : undefined,
  );
  const graph = new ConceptGraph(cards);
  const matches = new ConceptMatcher(cards).match(
    options.get('--text') ?? '',
    locale,
  );
  const id = options.get('--id') as ConceptId | undefined;
  if (id && !graph.get(id)) throw new Error(`Unknown concept: ${id}`);
  console.log(
    JSON.stringify(
      {
        corpus: fixtures ? 'TEST FIXTURES — NOT CANON' : 'authored',
        count: graph.size,
        ...(id ? { concept: graph.get(id), related: graph.related(id) } : {}),
        ...(options.has('--text') ? { matches } : {}),
        ...(id || matches.length
          ? {
              expanded: graph.expand(
                id ? [id] : matches.map((match) => match.conceptId),
              ),
            }
          : {}),
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
