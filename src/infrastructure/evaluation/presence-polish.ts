import type { ResponsePlan } from '../../core/conversation/model.ts';
import {
  polishDialogue,
  polishScope,
  polishInterests,
} from '../../../content/evaluation/presence-polish-cases.ts';
import { canonicalKnowledge } from '../../generated/knowledge.ts';
import { ConversationEngine } from '../../core/conversation/engine.ts';
import { BasicIntelligenceProvider } from '../../core/intelligence/basic.ts';
import { characterIds } from '../../core/character/id.ts';
import { characterProfiles } from '../../core/character/profile.ts';
import { createCharacterRuntime } from '../../core/character/runtime.ts';
import { initialWorkingMemory } from '../../core/memory/working.ts';
import { sentenceCount } from '../../core/conversation/material.ts';
import { surfaceOpening } from '../../core/intelligence/composition.ts';
const ratio = (values: boolean[]) => ({
  numerator: values.filter(Boolean).length,
  denominator: values.length,
  rate: values.length ? values.filter(Boolean).length / values.length : 0,
});
export async function runPresencePolish() {
  const engine = new ConversationEngine(
    canonicalKnowledge,
    new BasicIntelligenceProvider(),
  );
  const rows: {
    character: string;
    locale: string;
    input: string;
    kind: string;
    success: boolean;
    text: string;
    rhythm: ResponsePlan['rhythm'];
    self: NonNullable<ResponsePlan['selfMaterial']>['query'] | undefined;
    primary: ResponsePlan['primaryConceptId'];
    presence: ResponsePlan['presence'];
    repeatedOpening: boolean;
    brief: boolean;
  }[] = [];
  const scope: boolean[] = [],
    interest: boolean[] = [],
    years: boolean[] = [],
    intervals: boolean[] = [];
  for (const character of characterIds)
    for (const locale of ['ru', 'en'] as const) {
      const profile = characterProfiles[character],
        disposition = createCharacterRuntime(character, 0).disposition;
      const ask = (text: string, memory = initialWorkingMemory()) =>
        engine.respond(text, profile, disposition, locale, memory);
      let memory = initialWorkingMemory();
      const openings: string[] = [];
      for (const [ru, en, kind] of polishDialogue) {
        const input = locale === 'ru' ? ru : en;
        const r = await ask(input, memory);
        memory = r.nextMemory;
        const p = r.plan,
          text = r.response.text;
        const success =
          kind === 'identity'
            ? p.strategy === 'identify_self'
            : kind === 'scope'
              ? p.presence?.move === 'offer_topic' &&
                p.selectedMaterial.length > 0
              : kind === 'interest'
                ? p.primaryConceptId === 'identity.self' &&
                  p.presence?.move === 'topic_overview' &&
                  p.selectedMaterial.length > 0
                : kind === 'general'
                  ? !p.selfMaterial && p.primaryConceptId === 'identity.self'
                  : kind === 'personhood'
                    ? p.selfMaterial?.query.kind === 'personhood' &&
                      p.selfMaterial.facts.includes('personhood_criterion')
                    : kind === 'deictic'
                      ? p.selfMaterial?.query.kind === 'personhood' &&
                        p.selfMaterial.query.contextual
                      : kind === 'human'
                        ? p.selfMaterial?.facts[0] === 'not_human' &&
                          /^(?:Нет|No)[,.]/u.test(text)
                        : kind === 'year'
                          ? memory.temporalAnchor?.userReferencedYear ===
                              2026 && text.includes('2026')
                          : p.presence?.yearReference?.interval === 160 &&
                            /^160/u.test(text);
        if (kind === 'scope') scope.push(success);
        if (kind === 'interest') interest.push(success);
        if (kind === 'year') years.push(success);
        if (kind === 'interval') intervals.push(success);
        const opening = surfaceOpening(text);
        rows.push({
          character,
          locale,
          input,
          kind,
          success,
          text,
          rhythm: p.rhythm,
          self: p.selfMaterial?.query,
          primary: p.primaryConceptId,
          presence: p.presence,
          repeatedOpening: openings.slice(-4).includes(opening),
          brief: sentenceCount(text) === 1,
        });
        openings.push(opening);
      }
      for (const c of polishScope) {
        const r = await ask(c[locale === 'ru' ? 0 : 1]);
        scope.push(
          r.plan.presence?.move === 'offer_topic' &&
            r.plan.selectedMaterial.length > 0,
        );
      }
      for (const c of polishInterests) {
        const r = await ask(c[locale === 'ru' ? 0 : 1]);
        interest.push(
          r.plan.primaryConceptId === c[2] &&
            r.plan.presence?.move === 'topic_overview' &&
            r.response.usedMaterialKeys.length > 0,
        );
      }
      for (const year of [2000, 2100]) {
        const first = await ask(
          locale === 'ru'
            ? `Что ты знаешь про ${year} год`
            : `What do you know about ${year}?`,
        );
        const second = await ask(
          locale === 'ru'
            ? 'Сколько лет между нами?'
            : 'How many years separate us?',
          first.nextMemory,
        );
        years.push(
          first.nextMemory.temporalAnchor?.userReferencedYear === year,
        );
        intervals.push(
          second.plan.presence?.yearReference?.interval === 2186 - year &&
            second.response.text.startsWith(String(2186 - year)),
        );
      }
    }
  const group = (kind: string) =>
    rows.filter((r) => r.kind === kind).map((r) => r.success);
  return {
    metrics: {
      conversationScopeNaturalCoverage: ratio(scope),
      topicInterestStatementCoverage: ratio(interest),
      selfPersonhoodRoutingAccuracy: ratio(group('personhood')),
      selfDeicticContinuationAccuracy: ratio(group('deictic')),
      directHumanIdentityAccuracy: ratio(group('human')),
      explicitYearAnchorAccuracy: ratio(years),
      temporalIntervalAccuracy: ratio(intervals),
      // Structural diagnostics on direct self/arithmetic answers, not literary grading.
      directNucleusFirstRate: ratio(
        rows
          .filter((r) => ['human', 'interval', 'personhood'].includes(r.kind))
          .map(
            (r) =>
              r.success &&
              (r.kind !== 'personhood' ||
                /^(?:У меня|Моя|I have|My)/u.test(r.text)),
          ),
      ),
      questionEndingRate: ratio(rows.map((r) => r.text.endsWith('?'))),
      briefResponseCoverage: ratio(rows.map((r) => r.brief)),
      openingRepeatRate: ratio(rows.map((r) => r.repeatedOpening)),
    },
    rows,
  };
}
