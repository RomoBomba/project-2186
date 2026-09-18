import { createSemanticResolver } from './resolver-selection.ts';
import { canonicalKnowledge } from '../generated/knowledge.ts';
import { ConversationEngine } from '../core/conversation/engine.ts';
import {
  createIntelligenceProvider,
  providerSelection,
} from './provider-selection.ts';
// Stateless shared corpus/pipeline. Every terminal owns its own history and character runtime.
export const conversationEngine = new ConversationEngine(
  canonicalKnowledge,
  createIntelligenceProvider(
    providerSelection(
      import.meta.env?.MODE === 'test'
        ? 'basic'
        : import.meta.env?.VITE_INTELLIGENCE_PROVIDER,
    ),
    {
      endpoint: import.meta.env?.VITE_OLLAMA_ENDPOINT,
      presence:
        import.meta.env?.DEV &&
        import.meta.env?.MODE !== 'test' &&
        import.meta.env?.VITE_PRESENCE_REALIZER === 'local'
          ? 'local'
          : undefined,
      ...(import.meta.env?.DEV && import.meta.env?.MODE !== 'test'
        ? {
            inspect: (
              trace: import('../infrastructure/ollama/local-provider.ts').LocalInspection,
            ) => {
              console.debug(
                'PROJECT 2186 local provider',
                JSON.stringify({
                  selected: trace.selected,
                  finalProvider:
                    trace.validation?.valid && trace.riskValidation?.valid
                      ? 'local'
                      : 'basic',
                  parsed: trace.parsed,
                  validation: trace.validation,
                  riskValidation: trace.riskValidation,
                  failure: trace.failure,
                  latencyMs: trace.latencyMs,
                }),
              );
            },
          }
        : {}),
    },
  ),
  import.meta.env?.DEV && import.meta.env?.MODE !== 'test'
    ? createSemanticResolver(
        import.meta.env?.VITE_SEMANTIC_RESOLVER,
        import.meta.env?.VITE_OLLAMA_ENDPOINT,
      )
    : undefined,
);
