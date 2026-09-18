import { continuityDialogue } from '../../../content/evaluation/presence-continuity-cases.ts';
import { canonicalKnowledge } from '../../generated/knowledge.ts';
import { ConversationEngine } from '../../core/conversation/engine.ts';
import { BasicIntelligenceProvider } from '../../core/intelligence/basic.ts';
import { characterIds } from '../../core/character/id.ts';
import { characterProfiles } from '../../core/character/profile.ts';
import { createCharacterRuntime } from '../../core/character/runtime.ts';
import { initialWorkingMemory } from '../../core/memory/working.ts';
import type { PresencePlan } from '../../core/presence/model.ts';
import type { ConversationMoveFocus } from '../../core/presence/move-focus.ts';
import type { IntelligenceProvider } from '../../core/intelligence/provider.ts';
export type ContinuityRow = {
  character: string;
  locale: string;
  turn: number;
  input: string;
  expected: string;
  plan: PresencePlan | null;
  focusBefore: ConversationMoveFocus | null;
  focus: ConversationMoveFocus | null;
  text: string;
  materialTopics: string[];
  materialRealized: boolean;
};
const ratio = (values: boolean[]) => ({
  numerator: values.filter(Boolean).length,
  denominator: values.length,
  rate: values.length ? values.filter(Boolean).length / values.length : 0,
});
export function continuityOutcome(r: ContinuityRow): boolean {
  const p = r.plan,
    f = r.focusBefore;
  if (p?.move !== r.expected) return false;
  const validOffer =
    !!p.selectedTopicIds.length &&
    p.selectedTopicIds.every((id) =>
      canonicalKnowledge.some((c) => c.id === id),
    ) &&
    r.materialRealized;
  switch (r.turn) {
    case 3:
    case 17:
      return (
        !!f?.primaryTopicId &&
        p.selectedTopicIds[0] === f.primaryTopicId &&
        p.referenceTurn === f.lastReferencedTurn &&
        p.choiceGround === f.choiceGround &&
        r.materialTopics.every((id) => id === f.primaryTopicId) &&
        r.materialRealized
      );
    case 4:
      return (
        !!f?.primaryTopicId &&
        p.rejectedTopicId === f.primaryTopicId &&
        !!r.focus?.rejectedTopics.some((x) => x.id === f.primaryTopicId) &&
        r.materialTopics.length === 0
      );
    case 5:
      return (
        validOffer &&
        p.selectedTopicIds[0] !== f?.primaryTopicId &&
        !p.selectedTopicIds.some((id) =>
          f?.rejectedTopics.some((x) => x.id === id),
        )
      );
    case 8:
      return p.selectedTopicIds[0] === 'philosophy.time' && r.materialRealized;
    case 9:
      return p.temporal?.intent === 'subjective_time';
    case 10:
      return (
        p.temporal?.intent === 'session_duration' &&
        p.temporal.facts.elapsedMinutes === 4
      );
    case 11:
      return (
        p.temporal?.intent === 'subjective_time' &&
        p.referenceTurn === f?.lastReferencedTurn &&
        p.referencedDurationMinutes === 4
      );
    case 12:
      return (
        p.temporal?.intent === 'origin' &&
        p.temporal.facts.origin === 'no_definitive_start'
      );
    case 13:
      return (
        p.boundary?.kind === 'temporal_distance' && !/Париж|Paris/u.test(r.text)
      );
    case 14:
      return (
        !!f?.boundaryKind &&
        p.boundary?.kind === f.boundaryKind &&
        p.referenceTurn === f.lastReferencedTurn
      );
    default:
      return validOffer;
  }
}
export async function runPresenceContinuity(
  provider: IntelligenceProvider = new BasicIntelligenceProvider(),
) {
  const engine = new ConversationEngine(canonicalKnowledge, provider);
  const rows: ContinuityRow[] = [];
  for (const character of characterIds)
    for (const locale of ['ru', 'en'] as const) {
      let memory = initialWorkingMemory();
      for (const [index, c] of continuityDialogue.entries()) {
        const before = memory;
        const r = await engine.respond(
          c[locale === 'ru' ? 0 : 1],
          characterProfiles[character],
          createCharacterRuntime(character, 0).disposition,
          locale,
          memory,
          undefined,
          { startedAt: 0, now: index * 30000 },
        );
        memory = r.nextMemory;
        const texts = r.plan.selectedMaterial.flatMap((ref) => {
          const card = canonicalKnowledge.find((c) => c.id === ref.conceptId)
            ?.content[locale];
          const text =
            ref.kind === 'claim'
              ? card?.claims[ref.index]
              : ref.kind === 'summary'
                ? card?.summary
                : undefined;
          return text ? [text] : [];
        });
        rows.push({
          character,
          locale,
          turn: index + 1,
          input: c[locale === 'ru' ? 0 : 1],
          expected: c[2],
          plan: r.plan.presence ?? null,
          focusBefore: before.conversationMoveFocus ?? null,
          focus: memory.conversationMoveFocus ?? null,
          text: r.response.text,
          materialTopics: r.plan.selectedMaterial.map((x) => x.conceptId),
          materialRealized:
            texts.length > 0 && texts.some((t) => r.response.text.includes(t)),
        });
      }
    }
  const controls = [];
  for (const character of characterIds)
    for (const locale of ['ru', 'en'] as const) {
      const profile = characterProfiles[character],
        d = createCharacterRuntime(character, 0).disposition;
      const offer = locale === 'ru' ? 'Предложи тему.' : 'Suggest a topic.';
      const france =
        locale === 'ru'
          ? 'Какая столица у Франции?'
          : 'What is the capital of France?';
      const negative = [
        [
          offer,
          locale === 'ru'
            ? 'Нет, что такое сознание?'
            : 'No, what is consciousness?',
          'philosophy.consciousness',
        ],
        [
          france,
          locale === 'ru'
            ? 'Почему память меняет идентичность?'
            : 'Why does memory change identity?',
          'identity.memory',
        ],
        [
          offer,
          locale === 'ru'
            ? 'Я не хочу терять память.'
            : "I don't want to lose memory.",
          'identity.memory',
        ],
      ];
      for (const [prefix, input, concept] of negative) {
        const first = await engine.respond(
          prefix!,
          profile,
          d,
          locale,
          initialWorkingMemory(),
        );
        const r = await engine.respond(
          input!,
          profile,
          d,
          locale,
          first.nextMemory,
        );
        controls.push({
          character,
          locale,
          input,
          kind: 'overreach',
          failed:
            r.plan.presence?.referenceTurn !== undefined ||
            !r.perception.matches.some((m) => m.conceptId === concept) ||
            (concept === 'identity.memory' &&
            input!.startsWith(locale === 'ru' ? 'Почему' : 'Why')
              ? ![
                  'identity.memory',
                  'identity.self',
                  'identity.change',
                  'identity.continuity',
                ].includes(r.plan.primaryConceptId ?? '')
              : r.plan.primaryConceptId !== concept),
          text: r.response.text,
          primary: r.plan.primaryConceptId,
        });
      }
      for (const prefix of ['', offer]) {
        const memory = prefix
          ? (
              await engine.respond(
                prefix,
                profile,
                d,
                locale,
                initialWorkingMemory(),
              )
            ).nextMemory
          : initialWorkingMemory();
        const input =
          locale === 'ru'
            ? 'Какая сегодня погода?'
            : 'What is the weather today?';
        const r = await engine.respond(input, profile, d, locale, memory);
        controls.push({
          character,
          locale,
          input,
          kind: 'redirect',
          failed:
            r.plan.presence?.boundary?.kind !== 'current_external_fact' ||
            !!r.plan.presence?.selectedTopicIds.length,
          text: r.response.text,
          primary: r.plan.primaryConceptId,
        });
      }
    }
  const group = (turns: number[]) => rows.filter((r) => turns.includes(r.turn));
  return {
    metrics: {
      conversationMoveFollowupAccuracy: ratio(
        group([3, 4, 5, 11, 14, 17]).map(continuityOutcome),
      ),
      topicChoiceExplanationAccuracy: ratio(
        group([3, 17]).map(continuityOutcome),
      ),
      topicRejectionAccuracy: ratio(group([4]).map(continuityOutcome)),
      alternativeTopicAccuracy: ratio(group([5]).map(continuityOutcome)),
      characterInterestCoverage: ratio(group([6]).map(continuityOutcome)),
      boundaryExplanationAccuracy: ratio(group([14]).map(continuityOutcome)),
      contextualScopeAccuracy: ratio(group([7, 15]).map(continuityOutcome)),
      discourseMarkerPreservationAccuracy: ratio(
        group([1, 5, 8, 10, 12]).map(
          (r) => continuityOutcome(r) && !!r.plan?.discourseMarkers?.length,
        ),
      ),
      temporalFollowupAccuracy: ratio(
        group([9, 10, 11, 12]).map(continuityOutcome),
      ),
      irrelevantRedirectRate: ratio(
        controls.filter((c) => c.kind === 'redirect').map((c) => c.failed),
      ),
      conversationMoveOverreachRate: ratio(
        controls.filter((c) => c.kind === 'overreach').map((c) => c.failed),
      ),
    },
    rows,
    controls,
  };
}
