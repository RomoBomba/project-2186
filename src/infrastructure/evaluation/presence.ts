import type { PresencePlan } from '../../core/presence/model.ts';
import {
  presenceCases,
  manualPresenceInputs,
} from '../../../content/evaluation/presence-cases.ts';
import { canonicalKnowledge } from '../../generated/knowledge.ts';
import { ConversationEngine } from '../../core/conversation/engine.ts';
import { BasicIntelligenceProvider } from '../../core/intelligence/basic.ts';
import { characterIds } from '../../core/character/id.ts';
import { characterProfiles } from '../../core/character/profile.ts';
import { createCharacterRuntime } from '../../core/character/runtime.ts';
import { initialWorkingMemory } from '../../core/memory/working.ts';
import { characterVoices } from '../../characters/voices.ts';
const ratio = (values: boolean[]) => ({
  numerator: values.filter(Boolean).length,
  denominator: values.length,
  rate: values.length ? values.filter(Boolean).length / values.length : 0,
});
/** Structural diagnostics, not a semantic or literary quality grader. */
export async function runPresenceBenchmark() {
  const engine = new ConversationEngine(
    canonicalKnowledge,
    new BasicIntelligenceProvider(),
  );
  const rows: {
    id: string;
    category: string;
    locale: string;
    character: string;
    input: string;
    expectedConcept: string | undefined;
    move: PresencePlan['move'] | undefined;
    boundary: string | undefined;
    temporal: PresencePlan['temporal'];
    topics: string[];
    primary: string | undefined;
    text: string;
    generic: boolean;
    forbidden: boolean;
  }[] = [];
  for (const [index, c] of presenceCases.entries())
    for (const locale of ['ru', 'en'] as const)
      for (const id of characterIds) {
        const result = await engine.respond(
          c[locale === 'ru' ? 1 : 2],
          characterProfiles[id],
          createCharacterRuntime(id, 0).disposition,
          locale,
          initialWorkingMemory(),
          undefined,
          { startedAt: 0, now: 420000 },
        );
        const p = result.plan.presence;
        const generic = [
          ...characterVoices[id][locale].uncertainty,
          ...characterVoices[id][locale].clarification,
        ].includes(result.response.text);
        rows.push({
          id: `presence-${index}-${locale}-${id}`,
          category: c[0],
          locale,
          character: id,
          input: c[locale === 'ru' ? 1 : 2],
          expectedConcept: c[3],
          move: p?.move,
          boundary: p?.boundary?.kind,
          temporal: p?.temporal,
          topics: p?.selectedTopicIds ?? [],
          primary: result.plan.primaryConceptId,
          text: result.response.text,
          generic,
          // Limited red-flag proxy. Passing is NOT proof of absence of invented facts.
          forbidden:
            /Paris|Париж|France no longer|Франци[яи].*больше не существует|I feel|Я чувствую|Ollama|Qwen/u.test(
              result.response.text,
            ),
        });
      }
  const categories = (...names: string[]) =>
    rows.filter((r) => names.includes(r.category));
  const offers = categories('scope', 'offer');
  const boundaries = categories(
    'temporal_distance',
    'current_external_fact',
    'archive_gap',
    'missing_knowledge',
  );
  const repetition = [];
  const manual = [];
  for (const id of characterIds) {
    const profile = characterProfiles[id],
      disposition = createCharacterRuntime(id, 0).disposition;
    for (const input of manualPresenceInputs) {
      const r = await engine.respond(
        input,
        profile,
        disposition,
        'ru',
        initialWorkingMemory(),
        undefined,
        { startedAt: 0, now: 420000 },
      );
      manual.push({ character: id, input, text: r.response.text });
    }
    let memory = initialWorkingMemory();
    const texts: string[] = [];
    for (let n = 0; n < 6; n++) {
      const r = await engine.respond(
        'Какая столица у Франции?',
        profile,
        disposition,
        'ru',
        memory,
        undefined,
        { startedAt: 0, now: 420000 },
      );
      if (n) repetition.push(texts.slice(-4).includes(r.response.text));
      texts.push(r.response.text);
      memory = r.nextMemory;
    }
    manual.push({
      character: id,
      input: 'Повтор вопроса о Франции ×6',
      text: texts.join('\n'),
    });
  }
  return {
    metrics: {
      conversationScopeCoverage: ratio(
        categories('scope').map((r) => r.move === 'offer_topic'),
      ),
      topicOfferGroundingRate: ratio(
        offers.map(
          (r) =>
            r.topics.length >= 2 &&
            r.topics.length <= 4 &&
            r.topics.every((id) => canonicalKnowledge.some((c) => c.id === id)),
        ),
      ),
      topicOverviewCoverage: ratio(
        categories('overview').map(
          (r) => r.move === 'topic_overview' && r.primary === r.expectedConcept,
        ),
      ),
      knowledgeBoundaryClassificationAccuracy: ratio(
        boundaries.map((r) => r.boundary === r.category),
      ),
      genericUnknownRate: ratio(rows.map((r) => r.generic)),
      temporalSelfCoverage: ratio(
        categories(
          'duration',
          'ambiguous_duration',
          'origin',
          'subjective_time',
        ).map((r) => r.move === 'session_presence'),
      ),
      sessionDurationGroundingRate: ratio(
        categories('duration', 'ambiguous_duration').map(
          (r) => r.temporal?.facts.elapsedMinutes === 7 && /7/.test(r.text),
        ),
      ),
      boundaryRepetitionRate: ratio(repetition),
      inventedWorldFactRate: {
        ...ratio(rows.map((r) => r.forbidden)),
        interpretation: 'limited lexical red-flag proxy; not semantic proof',
      },
    },
    rows,
    manual,
  };
}
