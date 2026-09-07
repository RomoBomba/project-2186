import {
  extractMemoryCandidates,
  deterministicSalience,
  retainCandidates,
  emptyLongTermMemory,
  inspectMemoryRetrieval,
  retrieveMemories,
} from '../../core/memory/long-term.ts';
const args = process.argv.slice(2);
const option = (name: string) => args[args.indexOf(name) + 1];
const locale = args.includes('--locale') ? option('--locale') : 'ru';
if (locale !== 'ru' && locale !== 'en') throw new Error('Use --locale ru|en');
const text = args.includes('--text')
  ? option('--text')
  : 'Я люблю смотреть на звёзды.';
if (!text) throw new Error('Use --text with a statement');
const stored = args.includes('--stored') ? option('--stored') : undefined;
const seed = retainCandidates(
  emptyLongTermMemory(),
  stored ? extractMemoryCandidates(stored, locale) : [],
  0,
);
const candidates = extractMemoryCandidates(text, locale);
console.log(
  JSON.stringify(
    {
      scope: 'pure inspection; browser IndexedDB is not accessed',
      candidates: candidates.map((candidate) => ({
        ...candidate,
        ...deterministicSalience.evaluate(candidate, 0),
      })),
      ...(stored
        ? {
            retrieval: inspectMemoryRetrieval(text, locale, seed.semantic),
            returnedCandidates: retrieveMemories(text, locale, seed.semantic),
          }
        : {}),
      records: retainCandidates(emptyLongTermMemory(), candidates, 0),
    },
    null,
    2,
  ),
);
