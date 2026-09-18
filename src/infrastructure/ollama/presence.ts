import type {
  PresenceRealizer,
  PresenceRequest,
} from '../../core/presence/model.ts';
import { temporalWorld } from '../../world/temporal.ts';
import { OllamaTransport } from './transport.ts';

export function serializePresence(request: PresenceRequest) {
  return {
    model: 'qwen3:4b-instruct',
    think: false as const,
    stream: false as const,
    options: { temperature: 0.35, num_ctx: 2048, num_predict: 96 },
    keep_alive: '2m',
    format: {
      type: 'object',
      additionalProperties: false,
      required: ['move', 'text', 'topicIds', 'worldFrameIds'],
      properties: {
        move: { type: 'string', enum: [request.plan.move] },
        text: { type: 'string', enum: request.alternatives.map((a) => a.text) },
        topicIds: {
          type: 'array',
          items: { type: 'string', enum: request.plan.selectedTopicIds },
        },
        worldFrameIds: {
          type: 'array',
          items: { type: 'string', enum: request.plan.allowedWorldFrames },
        },
      },
    },
    messages: [
      {
        role: 'system' as const,
        content:
          'Select one complete authored alternative to realize the supplied presence move. Return its exact structured object. Vary wording by selecting an alternative; never supply facts, translations, memories or history from your own knowledge.',
      },
      {
        role: 'user' as const,
        content: JSON.stringify({
          ...request,
          worldFrames: request.plan.allowedWorldFrames.map((id) => ({
            id,
            facts: temporalWorld[id],
          })),
        }),
      },
    ],
  };
}
/** Separate from factual realization and semantic interpretation; no raw user text. */
export class LocalPresenceRealizer implements PresenceRealizer {
  private readonly transport: OllamaTransport;
  constructor(transport = new OllamaTransport()) {
    this.transport = transport;
  }
  async realize(
    request: PresenceRequest,
    signal: AbortSignal,
  ): Promise<unknown> {
    const response = await this.transport.chat(
      serializePresence(request),
      signal,
    );
    signal.throwIfAborted();
    return JSON.parse(response.message.content) as unknown;
  }
}
