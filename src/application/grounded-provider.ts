import type { ProviderInspection } from '../core/intelligence/grounding.ts';
import type { PresenceRealizer } from '../core/presence/model.ts';
import { presenceRequest, validatePresence } from '../core/presence/surface.ts';
import { realizationSlots } from './realization-slots.ts';
import { BasicIntelligenceProvider } from '../core/intelligence/basic.ts';
import type {
  IntelligenceContext,
  IntelligenceProvider,
  IntelligenceResponse,
} from '../core/intelligence/provider.ts';
import {
  buildIntelligenceRequest,
  memoryGroundingKey,
  type GroundedIntelligenceResponse,
  type RealizationInput,
  type RealizationProvider,
} from '../core/intelligence/grounding.ts';
import {
  responseText,
  validateProviderResponse,
  type ResponseValidation,
} from '../core/intelligence/validation.ts';

function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
/** Application adapter: canonical Basic by default; optional contained realization provider. */
export class GroundedIntelligenceProvider implements IntelligenceProvider {
  private readonly basic = new BasicIntelligenceProvider();
  private readonly timeoutMs: number;
  private readonly provider: RealizationProvider | undefined;
  private readonly presence: PresenceRealizer | undefined;
  constructor(
    provider?: RealizationProvider,
    timeoutMs = 5000,
    presence?: PresenceRealizer,
  ) {
    this.presence = presence;
    this.provider = provider;
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 30000)
      throw new Error('Provider timeout must be in (0, 30000] ms');
    this.timeoutMs = timeoutMs;
  }
  async respond(
    context: IntelligenceContext,
    plan: Parameters<IntelligenceProvider['respond']>[1],
    input?: RealizationInput,
  ): Promise<IntelligenceResponse> {
    if (plan.presence) {
      const basic = await this.basic.respond(context, plan);
      if (!this.presence) return basic;
      const request = freeze(presenceRequest(plan, context));
      const abort = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      let validation = 'error';
      try {
        const raw = await Promise.race([
          Promise.resolve().then(() =>
            this.presence!.realize(request, abort.signal),
          ),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
              validation = 'timeout';
              abort.abort();
              reject(new Error('Presence timeout'));
            }, 10_000);
          }),
        ]);
        if (validatePresence(raw, request))
          return {
            ...basic,
            text: raw.text,
            presenceInspection: { provider: 'local', validation: 'accepted' },
          };
        validation = 'rejected';
      } catch {
        /* Presence is optional; retain the complete deterministic response. */
      } finally {
        clearTimeout(timer);
        abort.abort();
      }
      return {
        ...basic,
        presenceInspection: { provider: 'deterministic', validation },
      };
    }
    const draft = buildIntelligenceRequest(context, plan, input);
    let preparedBasic: IntelligenceResponse | undefined;
    if (this.provider?.requiresRealizationSlots) {
      preparedBasic = await this.basic.respond(context, plan);
      draft.realizationSlots = realizationSlots(draft, preparedBasic);
    }
    const request = freeze(draft);
    let fallback: ProviderInspection['fallback'];
    let attemptedValidation: ResponseValidation | undefined;
    if (this.provider) {
      const abort = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = Symbol('timeout');
      try {
        const raw: unknown = await Promise.race([
          Promise.resolve().then(() =>
            this.provider!.realize(request, abort.signal),
          ),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
              reject(timeout);
              abort.abort();
            }, this.timeoutMs);
          }),
        ]);
        attemptedValidation = validateProviderResponse(raw, request);
        if (attemptedValidation.valid) {
          // Own a copy; providers cannot mutate a completed response during transmission.
          const response = structuredClone(raw) as GroundedIntelligenceResponse;
          const cited = [
            ...new Set(
              [
                ...response.sentences,
                ...(response.followUp ? [response.followUp] : []),
              ].flatMap((s) => s.groundingKeys),
            ),
          ];
          const usedMaterialKeys = cited.filter((key) =>
            request.grounding.material.some(
              (m) =>
                m.key === key &&
                (m.source === 'concept' || m.source === 'relation'),
            ),
          );
          const usedMemoryIds = (plan.longTermContext ?? [])
            .filter((m) => cited.includes(memoryGroundingKey(m.id)))
            .map((m) => m.id);
          return {
            text: responseText(response),
            usedMaterialKeys,
            ...(usedMemoryIds.length ? { usedMemoryIds } : {}),
            providerInspection: {
              request,
              provider: 'injected',
              response,
              validation: attemptedValidation,
            },
          };
        }
        fallback = 'validation';
      } catch (error) {
        fallback = error === timeout ? 'timeout' : 'error';
      } finally {
        clearTimeout(timer);
        abort.abort();
      }
    }
    // Exactly one canonical realization; late provider completion never reaches the engine.
    const basic = preparedBasic ?? (await this.basic.respond(context, plan));
    // Legacy Basic has no per-sentence citations. Use a conservative union of its
    // approved grounds, not guessed clause-level attribution. Preserve text/formatting exactly.
    const groundingKeys = request.grounding.material
      .filter((m) =>
        m.source === 'concept' || m.source === 'relation'
          ? basic.usedMaterialKeys.includes(m.key)
          : m.source === 'memory'
            ? (basic.usedMemoryIds ?? []).some(
                (id) => memoryGroundingKey(id) === m.key,
              )
            : true,
      )
      .map((m) => m.key);
    const response: GroundedIntelligenceResponse = {
      locale: context.locale,
      sentences: (basic.text.match(/[^.!?…]+(?:[.!?…]+|$)/gu) ?? [])
        .map((text) => text.trim())
        .filter(Boolean)
        .map((text) => ({ text, groundingKeys: [...groundingKeys] })),
    };
    const validation = validateProviderResponse(response, request);
    if (!validation.valid)
      throw new Error(
        'Invalid canonical provider contract: ' + validation.reason,
      );
    return {
      ...basic,
      providerInspection: {
        request,
        provider: 'basic',
        ...(fallback ? { fallback } : {}),
        ...(attemptedValidation ? { attemptedValidation } : {}),
        response,
        validation,
      },
    };
  }
}
