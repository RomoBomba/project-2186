import { LocalSemanticResolver } from '../infrastructure/ollama/semantic-resolver.ts';
/** Development selection only; never persisted as user configuration. */
export function createSemanticResolver(selection?: string, endpoint?: string) {
  if (!selection || selection === 'deterministic') return undefined;
  if (selection !== 'local-fallback')
    throw new Error('Resolver must be deterministic or local-fallback');
  return new LocalSemanticResolver(endpoint);
}
