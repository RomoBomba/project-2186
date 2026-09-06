import type { ResponsePlan } from '../conversation/model.ts';

/** Compose whole authored units; never infer a causal or adversative connection.
 * The plan already supplies the observation, tension or question. No rephrasing,
 * extra question, or strategy announcement is necessary to make it a thought.
 */
export function compose(parts: readonly string[], plan: ResponsePlan): string {
  if (parts.length < 2) return parts.join('');
  // Related concepts retain their own sentence/paragraph: related is not "therefore".
  // A challenge separates the observation from its authored tension. Compact
  // dispositions keep the pair in one paragraph; follow-up stays beside its claim.
  const separated =
    plan.strategy === 'connect' ||
    (plan.strategy === 'gentle_challenge' &&
      plan.disposition.desiredVerbosity >= 0.35);
  return parts.join(separated ? '\n' : ' ');
}
