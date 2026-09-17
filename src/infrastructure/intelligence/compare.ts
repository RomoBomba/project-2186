import type {
  IntelligenceContext,
  IntelligenceProvider,
  IntelligenceResponse,
} from '../../core/intelligence/provider.ts';
import type { RealizationInput } from '../../core/intelligence/grounding.ts';
import type { ResponsePlan } from '../../core/conversation/model.ts';
import { createIntelligenceProvider } from '../../application/provider-selection.ts';
import type { LocalInspection } from '../ollama/local-provider.ts';

export type RealizationComparison = {
  input: string;
  plan: ResponsePlan;
  grounding: NonNullable<IntelligenceResponse['providerInspection']>['request'];
  basic: IntelligenceResponse;
  local: IntelligenceResponse;
  localInspection?: LocalInspection;
  totalLatencyMs: number;
};
/** One cognition call. BOTH realizations consume exactly the same context/plan/input.
 * The deterministic Basic branch alone advances the comparison conversation. */
export class ComparingProvider implements IntelligenceProvider {
  private readonly basic = createIntelligenceProvider('basic');
  private readonly local: IntelligenceProvider;
  private readonly observe: (result: RealizationComparison) => void;
  private trace: LocalInspection | undefined;
  constructor(
    observe: (result: RealizationComparison) => void,
    options: { endpoint?: string | undefined; fetcher?: typeof fetch } = {},
  ) {
    this.observe = observe;
    this.local = createIntelligenceProvider('local', {
      ...options,
      inspect: (trace) => {
        this.trace = trace;
      },
    });
  }
  async respond(
    context: IntelligenceContext,
    plan: ResponsePlan,
    input?: RealizationInput,
  ): Promise<IntelligenceResponse> {
    this.trace = undefined;
    const started = performance.now();
    const basic = await this.basic.respond(context, plan, input);
    const local = await this.local.respond(context, plan, input);
    const grounding = basic.providerInspection!.request;
    if (
      JSON.stringify({ ...grounding, realizationSlots: undefined }) !==
      JSON.stringify({
        ...local.providerInspection!.request,
        realizationSlots: undefined,
      })
    )
      throw new Error('A/B grounding packets diverged');
    this.observe({
      input: input?.currentTurn ?? '',
      plan,
      grounding,
      basic,
      local,
      ...(this.trace ? { localInspection: this.trace } : {}),
      totalLatencyMs: performance.now() - started,
    });
    return basic;
  }
}
export function localStatistics(rows: readonly RealizationComparison[]) {
  const latency = rows.map((r) => r.totalLatencyMs).sort((a, b) => a - b);
  const reason = (r: RealizationComparison) => {
    const v = r.local.providerInspection?.attemptedValidation;
    return v && !v.valid ? v.reason : undefined;
  };
  const riskCount = (reason: string) =>
    rows.filter((r) => {
      const risk = r.localInspection?.riskValidation;
      return risk && !risk.valid && risk.reason === reason;
    }).length;
  return {
    requests: rows.length,
    structuredParseSuccess: rows.filter((r) => r.localInspection?.parsed)
      .length,
    validatorPass: rows.filter((r) => r.localInspection?.validation?.valid)
      .length,
    semanticRiskGuardPass: rows.filter(
      (r) => r.localInspection?.riskValidation?.valid,
    ).length,
    strengtheningRejections: riskCount('strengthening'),
    modalityNegationRejections: riskCount('modality_negation'),
    userExperienceRejections: riskCount('user_experience'),
    internalLeakRejections: riskCount('internal_leak'),
    riskRejections: rows.reduce<Record<string, number>>((counts, r) => {
      const risk = r.localInspection?.riskValidation;
      if (risk && !risk.valid)
        counts[risk.reason] = (counts[risk.reason] ?? 0) + 1;
      return counts;
    }, {}),
    fallbacks: rows.filter((r) => !!r.local.providerInspection?.fallback)
      .length,
    invalidGroundingKeys: rows.filter(
      (r) => reason(r) === 'unknown_grounding_key',
    ).length,
    localeMismatches: rows.filter((r) => reason(r) === 'locale').length,
    sentenceLimitViolations: rows.filter((r) => reason(r) === 'sentence_limit')
      .length,
    validationReasons: rows.reduce<Record<string, number>>((counts, r) => {
      const key = reason(r) ?? r.local.providerInspection?.fallback;
      if (key) counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    }, {}),
    averageLatencyMs: latency.length
      ? latency.reduce((a, b) => a + b, 0) / latency.length
      : 0,
    medianLatencyMs: latency.length
      ? (latency[Math.floor((latency.length - 1) / 2)]! +
          latency[Math.floor(latency.length / 2)]!) /
        2
      : 0,
    maximumLatencyMs: latency.at(-1) ?? 0,
  };
}
