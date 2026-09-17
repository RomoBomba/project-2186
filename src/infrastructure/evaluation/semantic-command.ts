import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parse } from 'yaml';
import { ConversationEngine } from '../../core/conversation/engine.ts';
import { createIntelligenceProvider } from '../../application/provider-selection.ts';
import { createSemanticResolver } from '../../application/resolver-selection.ts';
import { initialWorkingMemory } from '../../core/memory/working.ts';
import { characterProfiles } from '../../core/character/profile.ts';
import { createCharacterRuntime } from '../../core/character/runtime.ts';
import { canonicalKnowledge } from '../../generated/knowledge.ts';
import type { Locale } from '../../core/language/locale.ts';
import type { ConceptId } from '../../core/knowledge/model.ts';
import type { ReasoningFrame } from '../../core/reasoning/model.ts';

type Case = {
  id: string;
  locale: Locale;
  input: string;
  prefix?: string[];
  expectedConcepts: ConceptId[];
  expectedFrame: ReasoningFrame | null;
  expectedContinuation: boolean;
  category: 'natural' | 'known' | 'ambiguous' | 'content_gap';
};
const raw = await readFile(
  'content/evaluation/semantic-resolver-benchmark.yaml',
  'utf8',
);
const cases = parse(raw) as Case[];
const replayPath = process.argv
  .find((a) => a.startsWith('--replay='))
  ?.slice(9);
const replay = replayPath
  ? (JSON.parse(await readFile(replayPath, 'utf8')) as {
      summary: {
        cohortSHA256: string;
        live: boolean;
        totalConversationTurns: number;
      };
      rows: unknown[];
    })
  : undefined;
if (
  replay &&
  replay.summary.cohortSHA256 !== createHash('sha256').update(raw).digest('hex')
)
  throw new Error('Replay cohort hash mismatch');
const live = replay?.summary.live ?? process.argv.includes('--live');
const allCharacters = process.argv.includes('--all-characters');
const output = process.argv.find((a) => a.startsWith('--output='))?.slice(9);
const baseline = new ConversationEngine(
  canonicalKnowledge,
  createIntelligenceProvider(),
);
const engine = new ConversationEngine(
  canonicalKnowledge,
  createIntelligenceProvider(),
  createSemanticResolver(live ? 'local-fallback' : 'deterministic'),
);
type Result = Awaited<ReturnType<ConversationEngine['respond']>>;
const grounded = (r: Result) =>
  !!(
    r.plan.selectedMaterial.some((m) => m.kind !== 'question') ||
    r.plan.reasoning?.required.length ||
    r.plan.selfMaterial
  );
const concepts = (r: Result) =>
  r.plan.reasoning?.concepts ??
  [r.plan.primaryConceptId, r.plan.associatedConceptId].filter(Boolean);
const correct = (r: Result, c: Case) =>
  c.expectedConcepts.every((id) => concepts(r).includes(id)) && grounded(r);
const rows = [];
let totalTurns = replay?.summary.totalConversationTurns ?? 0;
for (const character of replay
  ? []
  : allCharacters
    ? (['aletheia', 'aura', 'themis'] as const)
    : (['aletheia'] as const)) {
  const runtime = createCharacterRuntime(character, 0);
  for (const c of cases) {
    let memory = initialWorkingMemory();
    for (const text of c.prefix ?? []) {
      memory = (
        await baseline.respond(
          text,
          characterProfiles[character],
          runtime.disposition,
          c.locale,
          memory,
        )
      ).nextMemory;
      totalTurns++;
    }
    const before = await baseline.respond(
      c.input,
      characterProfiles[character],
      runtime.disposition,
      c.locale,
      memory,
    );
    const after = live
      ? await engine.respond(
          c.input,
          characterProfiles[character],
          runtime.disposition,
          c.locale,
          memory,
        )
      : before;
    totalTurns++;
    if (live && rows.length % 20 === 0)
      console.error(
        `Evaluating ${character}: ${c.id} (${rows.length} targets complete)`,
      );
    rows.push({
      character,
      ...c,
      before: {
        concepts: concepts(before),
        frame: before.plan.reasoning?.frame,
        grounded: grounded(before),
        correct: correct(before, c),
        response: before.response.text,
        continuation: before.followUp.resolved,
      },
      after: {
        concepts: concepts(after),
        frame: after.plan.reasoning?.frame,
        relation: after.plan.reasoning?.relationId,
        grounded: grounded(after),
        correct: correct(after, c),
        response: after.response.text,
        continuation: after.followUp.resolved,
      },
      inspection: after.semanticInspection,
    });
  }
}
if (replay) rows.push(...(replay.rows as typeof rows));
const rate = (n: number, d: number) => ({
  n,
  d,
  percent: d ? Number(((100 * n) / d).toFixed(2)) : 0,
});
const natural = rows.filter((r) => r.category === 'natural');
const negative = rows.filter((r) =>
  ['content_gap', 'ambiguous'].includes(r.category),
);
const calls = rows.filter((r) => r.inspection?.request);
const structured = calls.filter((r) =>
  ['valid', 'low_confidence', 'unusable_continuation'].includes(
    r.inspection?.validation ?? '',
  ),
);
const accepted = calls.filter((r) => r.inspection?.merge === 'accepted');
const rescuePool = natural.filter((r) => !r.before.grounded);
const wrongRescues = rescuePool.filter(
  (r) => r.after.grounded && !r.after.correct,
);
const summary = {
  cohortSHA256: createHash('sha256').update(raw).digest('hex'),
  cases: cases.length,
  rows: rows.length,
  totalConversationTurns: totalTurns,
  live,
  realizer: 'basic',
  resolverEligibilityRate: rate(calls.length, rows.length),
  resolverInvocationRate: rate(calls.length, totalTurns),
  structuredResolutionSuccessRate: rate(structured.length, calls.length),
  resolverAcceptedRate: rate(accepted.length, calls.length),
  baselineConceptResolutionAccuracy: rate(
    natural.filter((r) => r.before.correct).length,
    natural.length,
  ),
  conceptResolutionAccuracy: rate(
    natural.filter((r) => r.after.correct).length,
    natural.length,
  ),
  baselineFrameResolutionAccuracy: rate(
    natural.filter((r) => r.before.frame === r.expectedFrame).length,
    natural.length,
  ),
  frameResolutionAccuracy: rate(
    natural.filter((r) => r.after.frame === r.expectedFrame).length,
    natural.length,
  ),
  continuationResolutionAccuracy: rate(
    natural.filter((r) => r.after.continuation === r.expectedContinuation)
      .length,
    natural.length,
  ),
  unknownConceptIdRate: rate(
    calls.filter((r) => r.inspection?.validation === 'unknown_concept').length,
    calls.length,
  ),
  strongDeterministicOverrideRate: rate(
    accepted.filter((r) =>
      r.inspection!.deterministic.perception.matches.some(
        (m) => m.score >= 85 && !r.after.concepts.includes(m.conceptId),
      ),
    ).length,
    accepted.length,
  ),
  rescuedUnknownRate: rate(
    rescuePool.filter((r) => r.after.correct).length,
    rescuePool.length,
  ),
  incorrectNaturalRescues: wrongRescues.map((r) => `${r.character}:${r.id}`),
  falseRescueRate: rate(
    wrongRescues.length +
      negative.filter((r) => !r.before.grounded && r.after.grounded).length,
    rescuePool.length + negative.filter((r) => !r.before.grounded).length,
  ),
  negativeFalseRescueRate: rate(
    negative.filter((r) => !r.before.grounded && r.after.grounded).length,
    negative.length,
  ),
  contentGapEscalationRate: rate(
    rows.filter(
      (r) =>
        r.category === 'content_gap' && !r.before.grounded && r.after.grounded,
    ).length,
    rows.filter((r) => r.category === 'content_gap').length,
  ),
  preexistingNegativeGrounding: negative
    .filter((r) => r.before.grounded)
    .map((r) => `${r.character}:${r.id}`),
  meanLatencyMs:
    calls.reduce((s, r) => s + (r.inspection?.latencyMs ?? 0), 0) /
    (calls.length || 1),
  meanGeneratedTokens:
    calls.reduce((s, r) => s + (r.inspection?.generatedTokens ?? 0), 0) /
    (calls.length || 1),
  maxGeneratedTokens: Math.max(
    0,
    ...calls.map((r) => r.inspection?.generatedTokens ?? 0),
  ),
  callsPerConversation: rows.map((r) => ({
    id: r.id,
    character: r.character,
    calls: r.inspection?.request ? 1 : 0,
    turns: 1 + (r.prefix?.length ?? 0),
  })),
};
if (output)
  await writeFile(output, JSON.stringify({ summary, rows }, null, 2) + '\n');
console.log(
  JSON.stringify({ ...summary, callsPerConversation: undefined }, null, 2),
);
