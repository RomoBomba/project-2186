import type { Locale } from '../language/locale.ts';
import type { WorkingMemory } from './working.ts';
export const memoryKinds = [
  'name',
  'preference',
  'dislike',
  'interest',
  'project',
  'important_value',
] as const;
export type MemoryKind = (typeof memoryKinds)[number];
export type MemoryCandidate = {
  kind: MemoryKind;
  value: string;
  normalizedValue: string;
  locale: Locale;
  confidence: number;
  pattern: string;
  explicitRemember: boolean;
};
export type SemanticMemory = Omit<MemoryCandidate, 'explicitRemember'> & {
  id: string;
  salience: number;
  firstSeenAt: number;
  lastSeenAt: number;
  reinforcementCount: number;
  status: 'current' | 'superseded';
  replacedAt?: number;
};
export type EpisodicMemory = {
  id: string;
  createdAt: number;
  kind: 'explicit_remember' | 'explicit_personal_disclosure';
  semanticMemoryId: string;
  primaryConceptIds: string[];
  userExcerpt: string;
  systemMaterialKeys: string[];
  significance: number;
};
export type LongTermMemory = {
  semantic: SemanticMemory[];
  episodic: EpisodicMemory[];
};
export const emptyLongTermMemory = (): LongTermMemory => ({
  semantic: [],
  episodic: [],
});
export function normalizeMemoryValue(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
export function safeMemoryValue(value: string): boolean {
  const letters = value.match(/[\p{L}\p{N}]/gu)?.length ?? 0;
  return (
    value.length >= 2 &&
    value.length <= 100 &&
    letters >= 2 &&
    letters / value.length >= 0.6 &&
    !/[!?;,\n<>:{}=]/u.test(value) &&
    !/https?:|\b(?:ignore|execute|delete|sudo|remember)\b|(?:игнорируй|выполни|удали|запомни)/iu.test(
      value,
    ) &&
    !/^(?:это|то|все|ничего|it|this|that|things)$/iu.test(value)
  );
}
type Pattern = {
  kind: MemoryKind;
  expression: RegExp;
  name: string;
  confidence: number;
};
const patterns: Record<Locale, Pattern[]> = {
  ru: [
    {
      kind: 'name',
      expression: /^(?:Меня зовут|Мо[ёе] имя) (.+)$/iu,
      name: 'ru.name',
      confidence: 0.99,
    },
    {
      kind: 'dislike',
      expression: /^Я (?:очень )?не люблю (.+)$/iu,
      name: 'ru.dislike',
      confidence: 0.96,
    },
    {
      kind: 'preference',
      expression: /^(?:Я (?:очень )?люблю|Мне (?:очень )?нравится) (.+)$/iu,
      name: 'ru.preference',
      confidence: 0.95,
    },
    {
      kind: 'preference',
      expression: /^Мой любимый художник (.+)$/iu,
      name: 'ru.favorite-artist',
      confidence: 0.96,
    },
    {
      kind: 'interest',
      expression: /^Я интересуюсь (.+)$/iu,
      name: 'ru.interest',
      confidence: 0.95,
    },
    {
      kind: 'project',
      expression: /^Я работаю над (.+)$/iu,
      name: 'ru.project',
      confidence: 0.96,
    },
    {
      kind: 'important_value',
      expression: /^Для меня важ(?:на|но|ен|ны) (.+)$/iu,
      name: 'ru.value',
      confidence: 0.96,
    },
  ],
  en: [
    {
      kind: 'name',
      expression: /^My name is (.+)$/iu,
      name: 'en.name',
      confidence: 0.99,
    },
    {
      kind: 'name',
      expression: /^I'm ([A-Z][a-z]{1,30}(?: [A-Z][a-z]{1,30})?)$/u,
      name: 'en.short-name',
      confidence: 0.94,
    },
    {
      kind: 'dislike',
      expression: /^I (?:really )?(?:don't|do not) like (.+)$/iu,
      name: 'en.dislike',
      confidence: 0.96,
    },
    {
      kind: 'preference',
      expression: /^I (?:really )?(?:like|love) (.+)$/iu,
      name: 'en.preference',
      confidence: 0.95,
    },
    {
      kind: 'preference',
      expression: /^My favou?rite artist is (.+)$/iu,
      name: 'en.favorite-artist',
      confidence: 0.96,
    },
    {
      kind: 'interest',
      expression: /^I(?:'m| am) (?:also )?interested in (.+)$/iu,
      name: 'en.interest',
      confidence: 0.95,
    },
    {
      kind: 'project',
      expression: /^I(?:'m| am) working on (.+)$/iu,
      name: 'en.project',
      confidence: 0.96,
    },
    {
      kind: 'important_value',
      expression: /^(.+) is important to me$/iu,
      name: 'en.value',
      confidence: 0.96,
    },
  ],
};
export function extractMemoryCandidates(
  text: string,
  locale: Locale,
  working?: WorkingMemory,
): MemoryCandidate[] {
  if (text.length > 240 || /[?\n]/u.test(text)) return [];
  let phrase = text
    .trim()
    .replace(/[.!]+$/u, '')
    .replace(/’/g, "'");
  // Only an exact terminal instruction may follow one explicit fact.
  const suffix =
    locale === 'ru' ? /\.\s*запомни это$/iu : /\.\s*remember this$/iu;
  const sameMessageRemember = suffix.test(phrase);
  phrase = phrase.replace(suffix, '');
  const discourse =
    locale === 'ru'
      ? /^(?:(?:привет|здравствуйте|кстати)[,.]?\s+|(?:также|ещ[ёе])\s+)/iu
      : /^(?:hi|hello|by the way|also)[,.]?\s+/iu;
  phrase = phrase.replace(discourse, '');
  const rememberOnly = /^(?:запомни это|remember this)$/iu.test(phrase);
  const prefix =
    /^(?:запомни(?:,? что)?|не забудь(?:,? что)?|remember(?: that)?|don't forget(?: that)?)[,:]?\s+/iu;
  const explicitRemember =
    sameMessageRemember || rememberOnly || prefix.test(phrase);
  if (rememberOnly) {
    const recent = working?.recentTurns.at(-2);
    if (recent?.speaker !== 'user') return [];
    return extractMemoryCandidates(recent.text, locale).map((c) => ({
      ...c,
      explicitRemember: true,
    }));
  }
  phrase = phrase.replace(prefix, '');
  if (
    /\b(?:maybe|sometimes|perhaps|might|if)\b|(?:наверное|иногда|возможно|кажется|может быть|если)/iu.test(
      phrase,
    )
  )
    return [];
  for (const pattern of patterns[locale]) {
    const match = phrase.match(pattern.expression);
    if (!match?.[1]) continue;
    let value = match[1].trim();
    if (pattern.name.endsWith('favorite-artist'))
      value = `${locale === 'ru' ? 'художник' : 'artist'} ${value}`;
    if (!safeMemoryValue(value) || /[.]/u.test(value)) return [];
    if (
      pattern.kind === 'name' &&
      (!/^[\p{L}][\p{L}' -]{1,49}$/u.test(value) ||
        /^(?:happy|sad|tired|ready|fine|sorry|sure|hungry|angry|interested|working)$/iu.test(
          value,
        ))
    )
      return [];
    return [
      {
        kind: pattern.kind,
        value,
        normalizedValue: normalizeMemoryValue(value),
        locale,
        confidence: pattern.confidence,
        pattern: pattern.name,
        explicitRemember,
      },
    ];
  }
  return [];
}
export interface MemorySalienceEvaluator {
  evaluate(
    candidate: MemoryCandidate,
    priorReinforcements: number,
  ): { score: number; keep: boolean };
}
export const deterministicSalience: MemorySalienceEvaluator = {
  evaluate(candidate, priorReinforcements) {
    const bonus =
      candidate.kind === 'name'
        ? 0.25
        : candidate.kind === 'important_value'
          ? 0.2
          : 0.16;
    const confidence = Number.isFinite(candidate.confidence)
      ? Math.max(0, Math.min(1, candidate.confidence))
      : 0;
    const repetitions = Number.isFinite(priorReinforcements)
      ? Math.max(0, Math.min(3, priorReinforcements))
      : 0;
    const score = Math.min(
      1,
      0.65 * confidence +
        bonus +
        (candidate.explicitRemember ? 0.2 : 0) +
        0.04 * repetitions,
    );
    return {
      score,
      keep:
        confidence >= 0.9 && score >= 0.75 && safeMemoryValue(candidate.value),
    };
  },
};
export function retainCandidates(
  previous: LongTermMemory,
  candidates: readonly MemoryCandidate[],
  at: number,
  evaluator = deterministicSalience,
): LongTermMemory {
  if (!Number.isSafeInteger(at) || at < 0) return previous;
  let semantic = previous.semantic.map((m) => ({ ...m }));
  const episodic = [...previous.episodic];
  for (const candidate of candidates) {
    const prior = semantic.find(
      (m) =>
        m.status === 'current' &&
        m.kind === candidate.kind &&
        m.locale === candidate.locale &&
        m.normalizedValue === candidate.normalizedValue,
    );
    const decision = evaluator.evaluate(
      candidate,
      prior?.reinforcementCount ?? 0,
    );
    if (!decision.keep) continue;
    const opposite =
      candidate.kind === 'preference'
        ? 'dislike'
        : candidate.kind === 'dislike'
          ? 'preference'
          : undefined;
    semantic = semantic.map((m) =>
      m.status === 'current' &&
      m.locale === candidate.locale &&
      ((m.kind === opposite &&
        m.normalizedValue === candidate.normalizedValue) ||
        (candidate.kind === 'name' &&
          m.kind === 'name' &&
          m.normalizedValue !== candidate.normalizedValue))
        ? { ...m, status: 'superseded', replacedAt: at }
        : m,
    );
    const { explicitRemember, ...data } = candidate;
    let serial = semantic.length;
    while (semantic.some((m) => m.id === `semantic:${at}:${serial}`)) serial++;
    const record: SemanticMemory = prior
      ? {
          ...prior,
          salience: decision.score,
          lastSeenAt: Math.max(at, prior.lastSeenAt),
          reinforcementCount: Math.min(1000000, prior.reinforcementCount + 1),
        }
      : {
          ...data,
          id: `semantic:${at}:${serial}`,
          salience: decision.score,
          firstSeenAt: at,
          lastSeenAt: at,
          reinforcementCount: 1,
          status: 'current',
        };
    semantic = [...semantic.filter((m) => m.id !== record.id), record];
    const kind =
      explicitRemember && decision.score >= 0.95
        ? 'explicit_remember'
        : candidate.kind === 'name' && decision.score >= 0.88
          ? 'explicit_personal_disclosure'
          : undefined;
    if (
      kind &&
      !episodic.some((e) => e.semanticMemoryId === record.id && e.kind === kind)
    )
      episodic.push({
        id: `episode:${record.id}:${kind}`,
        createdAt: at,
        kind,
        semanticMemoryId: record.id,
        primaryConceptIds: [],
        userExcerpt: record.value,
        systemMaterialKeys: [],
        significance: decision.score,
      });
  }
  return { semantic: semantic.slice(-100), episodic: episodic.slice(-30) };
}
export type RetrievedMemory = {
  id: string;
  kind: MemoryKind;
  value: string;
  score: number;
};
export function inspectMemoryRetrieval(
  text: string,
  locale: Locale,
  memories: readonly SemanticMemory[],
) {
  const tokens = (s: string) =>
    normalizeMemoryValue(s)
      .match(/[\p{L}\p{N}]+/gu)
      ?.filter((t) => t.length >= 4) ?? [];
  const input = new Set(tokens(text));
  return memories.map((m) => {
    const terms = [...new Set(tokens(m.value))];
    const matchedTerms = terms.filter((t) => input.has(t));
    const hits = matchedTerms.length;
    const score = terms.length
      ? (0.8 * hits) / terms.length + 0.2 * m.salience
      : 0;
    const reason =
      m.status !== 'current'
        ? 'superseded'
        : m.locale !== locale
          ? 'different_locale'
          : !hits || !terms.length
            ? 'no_matching_terms'
            : hits / terms.length < 0.5
              ? 'insufficient_overlap'
              : terms.length > 1 && hits < 2
                ? 'single_partial_term'
                : 'eligible';
    return {
      id: m.id,
      kind: m.kind,
      value: m.value,
      terms,
      matchedTerms,
      score,
      reason,
    };
  });
}
export function retrieveMemories(
  text: string,
  locale: Locale,
  memories: readonly SemanticMemory[],
): RetrievedMemory[] {
  return inspectMemoryRetrieval(text, locale, memories)
    .filter((m) => m.reason === 'eligible')
    .map(({ id, kind, value, score }) => ({ id, kind, value, score }))
    .sort(
      (a, b) => b.score - a.score || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    )
    .slice(0, 3);
}
