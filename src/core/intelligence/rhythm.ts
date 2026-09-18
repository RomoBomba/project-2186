import type { ResponsePlan, ResponseRhythm } from '../conversation/model.ts';
/** Surface guidance only: no clock delays, factual selection or persistent preferences. */
export function responseRhythm(plan: ResponsePlan): ResponseRhythm {
  if (plan.rhythm) return plan.rhythm;
  if (plan.reasoning)
    return plan.disposition.structureBias > 0.75 ? 'standard' : 'reflective';
  return plan.desiredLength.maxSentences <= 1 ? 'brief' : 'standard';
}
