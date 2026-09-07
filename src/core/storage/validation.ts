import { characterIds, type CharacterId } from '../character/id.ts';
import { createCharacterRuntime } from '../character/runtime.ts';
import { deriveBehaviourDisposition } from '../character/behaviour-policy.ts';
import { characterProfiles } from '../character/profile.ts';
import { characterActivities } from '../character/state.ts';
import {
  memoryKinds,
  normalizeMemoryValue,
  safeMemoryValue,
  type SemanticMemory,
  type EpisodicMemory,
} from '../memory/long-term.ts';
import type { PersistentCharacter, SavedConfiguration } from './model.ts';
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const unit = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1;
const time = (v: unknown): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const text = (v: unknown, limit = 150): v is string =>
  typeof v === 'string' && v.length > 0 && v.length <= limit;
const strings = (v: unknown, limit: number): v is string[] =>
  Array.isArray(v) && v.length <= limit && v.every((s) => text(s));
export function validateConfiguration(
  raw: unknown,
): SavedConfiguration | undefined {
  if (
    !object(raw) ||
    !['ru', 'en'].includes(raw.language as string) ||
    !['A', 'B', 'C'].includes(raw.layout as string) ||
    !['civic', 'phosphor', 'amber'].includes(raw.displayStandard as string) ||
    typeof raw.audioEnabled !== 'boolean' ||
    !characterIds.includes(raw.character as CharacterId)
  )
    return;
  return {
    language: raw.language as SavedConfiguration['language'],
    layout: raw.layout as SavedConfiguration['layout'],
    displayStandard:
      raw.displayStandard as SavedConfiguration['displayStandard'],
    audioEnabled: raw.audioEnabled,
    character: raw.character as CharacterId,
  };
}
export function validateSemantic(raw: unknown): SemanticMemory | undefined {
  if (
    !object(raw) ||
    !text(raw.id) ||
    !memoryKinds.includes(raw.kind as SemanticMemory['kind']) ||
    !text(raw.value, 100) ||
    !safeMemoryValue(raw.value) ||
    raw.normalizedValue !== normalizeMemoryValue(raw.value) ||
    !['ru', 'en'].includes(raw.locale as string) ||
    !unit(raw.confidence) ||
    raw.confidence < 0.9 ||
    !unit(raw.salience) ||
    raw.salience < 0.75 ||
    !time(raw.firstSeenAt) ||
    !time(raw.lastSeenAt) ||
    raw.lastSeenAt < raw.firstSeenAt ||
    !time(raw.reinforcementCount) ||
    raw.reinforcementCount < 1 ||
    raw.reinforcementCount > 1000000 ||
    !text(raw.pattern, 80) ||
    !['current', 'superseded'].includes(raw.status as string) ||
    (raw.status === 'superseded' && !time(raw.replacedAt))
  )
    return;
  return {
    id: raw.id,
    kind: raw.kind as SemanticMemory['kind'],
    value: raw.value,
    normalizedValue: raw.normalizedValue,
    locale: raw.locale as SemanticMemory['locale'],
    confidence: raw.confidence,
    salience: raw.salience,
    firstSeenAt: raw.firstSeenAt,
    lastSeenAt: raw.lastSeenAt,
    reinforcementCount: raw.reinforcementCount,
    pattern: raw.pattern,
    status: raw.status as SemanticMemory['status'],
    ...(raw.status === 'superseded'
      ? { replacedAt: raw.replacedAt as number }
      : {}),
  };
}
export function validateEpisode(raw: unknown): EpisodicMemory | undefined {
  if (
    !object(raw) ||
    !text(raw.id, 220) ||
    !time(raw.createdAt) ||
    !['explicit_remember', 'explicit_personal_disclosure'].includes(
      raw.kind as string,
    ) ||
    !text(raw.semanticMemoryId) ||
    !strings(raw.primaryConceptIds, 2) ||
    !strings(raw.systemMaterialKeys, 4) ||
    !text(raw.userExcerpt, 100) ||
    !unit(raw.significance)
  )
    return;
  return {
    id: raw.id,
    createdAt: raw.createdAt,
    kind: raw.kind as EpisodicMemory['kind'],
    semanticMemoryId: raw.semanticMemoryId,
    primaryConceptIds: [...raw.primaryConceptIds],
    systemMaterialKeys: [...raw.systemMaterialKeys],
    userExcerpt: raw.userExcerpt,
    significance: raw.significance,
  };
}
export function restoreCharacter(raw: unknown, id: CharacterId) {
  const runtime = createCharacterRuntime(id, 0);
  const memory: PersistentCharacter['memory'] = { semantic: [], episodic: [] };
  if (!object(raw) || raw.version !== 1 || raw.characterId !== id)
    return { runtime, memory };
  const c = raw.characterState,
    r = raw.relationshipState,
    u = raw.userStyleProfile;
  if (
    object(c) &&
    ['mood', 'energy', 'curiosity', 'openness'].every((k) => unit(c[k])) &&
    characterActivities.includes(
      c.activity as (typeof characterActivities)[number],
    ) &&
    (c.lastInteraction === null || time(c.lastInteraction))
  )
    runtime.characterState = {
      mood: c.mood as number,
      energy: c.energy as number,
      curiosity: c.curiosity as number,
      openness: c.openness as number,
      activity: 'idle',
      lastInteraction: c.lastInteraction as number | null,
    };
  if (
    object(r) &&
    ['familiarity', 'trust', 'intellectualAffinity', 'openness'].every((k) =>
      unit(r[k]),
    )
  )
    runtime.relationshipState = {
      familiarity: r.familiarity as number,
      trust: r.trust as number,
      intellectualAffinity: r.intellectualAffinity as number,
      openness: r.openness as number,
    };
  if (
    object(u) &&
    [
      'verbosity',
      'formality',
      'questionFrequency',
      'emotionalExpressiveness',
    ].every((k) => unit(u[k])) &&
    typeof u.averageSentenceLength === 'number' &&
    Number.isFinite(u.averageSentenceLength) &&
    u.averageSentenceLength >= 0 &&
    u.averageSentenceLength <= 100 &&
    strings(u.preferredTopics, 0)
  )
    runtime.userStyleProfile = {
      verbosity: u.verbosity as number,
      formality: u.formality as number,
      questionFrequency: u.questionFrequency as number,
      emotionalExpressiveness: u.emotionalExpressiveness as number,
      averageSentenceLength: u.averageSentenceLength,
      preferredTopics: [],
    };
  if (object(raw.memory)) {
    const unique = <T extends { id: string }>(items: T[]) =>
      items.filter(
        (item, index) =>
          items.findIndex((other) => other.id === item.id) === index,
      );
    if (Array.isArray(raw.memory.semantic))
      memory.semantic = unique(
        raw.memory.semantic
          .slice(-100)
          .map(validateSemantic)
          .filter((m): m is SemanticMemory => !!m),
      );
    if (Array.isArray(raw.memory.episodic))
      memory.episodic = unique(
        raw.memory.episodic
          .slice(-30)
          .map(validateEpisode)
          .filter((m): m is EpisodicMemory => !!m),
      );
  }
  runtime.disposition = deriveBehaviourDisposition(
    characterProfiles[id],
    runtime.characterState,
    runtime.relationshipState,
    runtime.userStyleProfile,
  );
  return { runtime, memory };
}
