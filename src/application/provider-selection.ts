import { LocalPresenceRealizer } from '../infrastructure/ollama/presence.ts';
import { GroundedIntelligenceProvider } from './grounded-provider.ts';
import {
  LocalLLMProvider,
  type LocalInspection,
} from '../infrastructure/ollama/local-provider.ts';
import { OllamaTransport } from '../infrastructure/ollama/transport.ts';
import { localTimeoutMs } from '../infrastructure/ollama/serializer.ts';

export type ProviderSelection = 'basic' | 'local';
export function providerSelection(value?: string): ProviderSelection {
  if (!value || value === 'basic') return 'basic';
  if (value === 'local') return 'local';
  throw new Error('Intelligence provider must be basic or local');
}
/** Runtime/development config, never persisted user configuration. No Vite in infrastructure/core. */
export function createIntelligenceProvider(
  selection: ProviderSelection = 'basic',
  options: {
    presence?: 'local' | undefined;
    endpoint?: string | undefined;
    fetcher?: typeof fetch;
    inspect?: (trace: LocalInspection) => void;
  } = {},
) {
  const presence =
    options.presence === 'local'
      ? new LocalPresenceRealizer(
          new OllamaTransport(options.endpoint, options.fetcher),
        )
      : undefined;
  return selection === 'local'
    ? new GroundedIntelligenceProvider(
        new LocalLLMProvider(
          new OllamaTransport(options.endpoint, options.fetcher),
          options.inspect,
        ),
        localTimeoutMs,
        presence,
      )
    : new GroundedIntelligenceProvider(undefined, 5000, presence);
}
