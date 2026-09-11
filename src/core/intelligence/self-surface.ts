import {
  selfFactText,
  selfQuestions,
  selfInterests,
  selfAttentionText,
} from '../../characters/self.ts';
import type { Locale } from '../language/locale.ts';
import type { ResponsePlan } from '../conversation/model.ts';
export function realizeSelf(plan: ResponsePlan, locale: Locale): string {
  const material = plan.selfMaterial!;
  const parts = material.facts.map((f) => selfFactText[locale][f]);
  if (material.query.kind === 'character_difference') {
    // Stable profile interests, not a persona-specific prewritten answer.
    const describe = (c: typeof material.character) =>
      selfAttentionText[locale].replace('{name}', c.id.toUpperCase()).replace(
        '{interests}',
        Object.keys(selfInterests[locale])
          .filter((i) => c.interests.includes(i))
          .slice(0, 3)
          .map((i) => selfInterests[locale][i])
          .join(', '),
      );
    parts.splice(1, 1, describe(material.character));
    const comparisons = material.comparisons.filter(
      (c) => c.id !== material.character.id,
    );
    if (comparisons.length > 1) parts.shift();
    parts.push(...comparisons.map(describe));
  }
  if (material.question) parts.push(selfQuestions[locale][material.question]);
  // Whole clauses only; preserve mandatory epistemic limits before optional questions.
  const accepted: string[] = [];
  for (const part of parts) {
    if (
      accepted.length >= plan.desiredLength.maxSentences ||
      [...accepted, part].join(' ').length > plan.desiredLength.maxCharacters
    )
      break;
    accepted.push(part);
  }
  return accepted.join(' ');
}
