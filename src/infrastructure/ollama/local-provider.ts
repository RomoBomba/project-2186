import type {
  IntelligenceRequest,
  RealizationProvider,
  GroundedIntelligenceResponse,
} from '../../core/intelligence/grounding.ts';
import {
  validateProviderResponse,
  type ResponseValidation,
} from '../../core/intelligence/validation.ts';
import {
  allowedGroundingKeys,
  serializeOllamaRequest,
  type OllamaRequest,
} from './serializer.ts';
import {
  OllamaError,
  OllamaTransport,
  type SafeOllamaEnvelope,
} from './transport.ts';
import {
  projectSlotResponse,
  validateSlots,
  type RiskValidation,
} from './risk-guard.ts';

export type LocalInspection = {
  selected: 'local';
  serialized: OllamaRequest;
  allowedGroundingKeys: string[];
  latencyMs: number;
  envelope?: SafeOllamaEnvelope;
  candidate?: unknown;
  parsed: boolean;
  validation?: ResponseValidation;
  riskValidation?: RiskValidation;
  failure?: 'aborted' | 'connection' | 'semantic_risk' | OllamaError['code'];
};
/** No storage/history/profile access. Accepts only Phase 11A's bounded request. */
export class LocalLLMProvider implements RealizationProvider {
  readonly requiresRealizationSlots = true;
  private readonly transport: OllamaTransport;
  private readonly inspect: ((trace: LocalInspection) => void) | undefined;
  constructor(
    transport = new OllamaTransport(),
    inspect?: (trace: LocalInspection) => void,
  ) {
    this.transport = transport;
    this.inspect = inspect;
  }
  async realize(
    request: IntelligenceRequest,
    signal: AbortSignal,
  ): Promise<unknown> {
    const started = performance.now();
    const serialized = serializeOllamaRequest(request);
    const trace: LocalInspection = {
      selected: 'local',
      serialized,
      allowedGroundingKeys: allowedGroundingKeys(request),
      latencyMs: 0,
      parsed: false,
    };
    try {
      const envelope = await this.transport.chat(serialized, signal);
      trace.envelope = envelope;
      let candidate: unknown;
      try {
        candidate = JSON.parse(envelope.message.content);
      } catch {
        throw new OllamaError('content_json');
      }
      signal.throwIfAborted();
      trace.parsed = true;
      trace.candidate = candidate;
      // Diagnostic only; Phase 11A's application boundary makes the acceptance decision.
      const projected = projectSlotResponse(candidate);
      trace.validation = validateProviderResponse(projected, request);
      if (trace.validation.valid) {
        trace.riskValidation = validateSlots(
          candidate,
          projected as GroundedIntelligenceResponse,
          request,
        );
        if (!trace.riskValidation.valid) {
          trace.failure = 'semantic_risk';
          throw new Error('Local realization rejected');
        }
      }
      return projected;
    } catch (error) {
      trace.failure ??= signal.aborted
        ? 'aborted'
        : error instanceof OllamaError
          ? error.code
          : 'connection';
      throw error;
    } finally {
      trace.latencyMs = performance.now() - started;
      // Explicit dev opt-in only; observation must never break a conversation.
      try {
        this.inspect?.(trace);
      } catch {
        /* Diagnostics are not response authority. */
      }
    }
  }
}
