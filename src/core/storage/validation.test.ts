import { expect, it } from 'vitest';
import { characterIds } from '../character/id';
import { createCharacterRuntime } from '../character/runtime';
import { validateConfiguration, restoreCharacter } from './validation';
import {
  emptyLongTermMemory,
  extractMemoryCandidates,
  retainCandidates,
} from '../memory/long-term';
import type { PersistentCharacter } from './model';
it('validates configuration round trips and rejects malformed fields', () => {
  const c = {
    language: 'ru',
    layout: 'C',
    displayStandard: 'amber',
    audioEnabled: false,
    character: 'aura',
  };
  expect(validateConfiguration(JSON.parse(JSON.stringify(c)))).toEqual(c);
  for (const invalid of [
    null,
    {},
    { ...c, layout: 'D' },
    { ...c, audioEnabled: 1 },
    { ...c, character: 'other' },
    { ...c, language: { toString: 'bad' } },
  ])
    expect(validateConfiguration(invalid)).toBeUndefined();
});
it.each(characterIds)(
  'restores %s state exactly, discards transient activity and recomputes disposition',
  (id) => {
    const runtime = createCharacterRuntime(id, 0);
    runtime.characterState.activity = 'thinking';
    runtime.relationshipState.familiarity = 0.24;
    runtime.userStyleProfile.verbosity = 0.6;
    const memory = retainCandidates(
      emptyLongTermMemory(),
      extractMemoryCandidates('Запомни, что я люблю джаз.', 'ru'),
      10,
    );
    const record: PersistentCharacter = { version: 1, ...runtime, memory };
    const result = restoreCharacter(JSON.parse(JSON.stringify(record)), id);
    expect(result.runtime.characterState).toEqual({
      ...runtime.characterState,
      activity: 'idle',
    });
    expect(result.runtime.relationshipState).toEqual(runtime.relationshipState);
    expect(result.runtime.userStyleProfile).toEqual(runtime.userStyleProfile);
    expect(result.memory).toEqual(memory);
    expect(result.runtime.disposition).not.toEqual(runtime.disposition);
  },
);
it('recovers independent valid fields and memory records from corruption', () => {
  const runtime = createCharacterRuntime('aura', 0);
  const memory = retainCandidates(
    emptyLongTermMemory(),
    extractMemoryCandidates('Меня зовут Роман.', 'ru'),
    1,
  );
  const valid = { version: 1, ...runtime, memory };
  const restored = restoreCharacter(
    {
      ...valid,
      characterState: { ...runtime.characterState, energy: NaN },
      memory: {
        semantic: [
          null,
          { ...memory.semantic[0], confidence: 2 },
          ...memory.semantic,
        ],
        episodic: [{}, ...memory.episodic],
      },
    },
    'aura',
  );
  expect(restored.runtime.characterState.energy).toBe(0.75);
  expect(restored.memory).toEqual(memory);
  expect(restoreCharacter({ ...valid, version: 2 }, 'aura').memory).toEqual(
    emptyLongTermMemory(),
  );
  expect(restoreCharacter(valid, 'themis').memory).toEqual(
    emptyLongTermMemory(),
  );
});
