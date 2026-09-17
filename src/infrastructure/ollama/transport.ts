import { localEndpoint, type OllamaRequest } from './serializer.ts';

export class OllamaError extends Error {
  readonly code: 'http' | 'envelope' | 'content_json' | 'body_limit';
  constructor(code: OllamaError['code']) {
    super('Ollama ' + code);
    this.code = code;
  }
}
export function loopbackEndpoint(value = localEndpoint): string {
  const url = new URL(value);
  if (
    url.protocol !== 'http:' ||
    !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/api/chat'
  )
    throw new Error('Ollama requires an HTTP loopback /api/chat endpoint');
  return url.href;
}
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
export type SafeOllamaEnvelope = {
  model?: string;
  done: true;
  done_reason?: string;
  message: { role: 'assistant'; content: string };
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
};
export function parseOllamaEnvelope(raw: unknown): SafeOllamaEnvelope {
  if (
    !object(raw) ||
    raw.done !== true ||
    !object(raw.message) ||
    raw.message.role !== 'assistant' ||
    typeof raw.message.content !== 'string' ||
    !raw.message.content.trim() ||
    raw.message.content.length > 32_768 ||
    (raw.message.tool_calls !== undefined &&
      (!Array.isArray(raw.message.tool_calls) || raw.message.tool_calls.length))
  )
    throw new OllamaError('envelope');
  // Whitelist diagnostics: never return thinking, tools, context tokens or unknown envelope fields.
  return {
    done: true,
    message: { role: 'assistant', content: raw.message.content },
    ...(typeof raw.model === 'string' ? { model: raw.model } : {}),
    ...(typeof raw.done_reason === 'string'
      ? { done_reason: raw.done_reason }
      : {}),
    ...Object.fromEntries(
      ['total_duration', 'load_duration', 'prompt_eval_count', 'eval_count']
        .filter(
          (key) => typeof raw[key] === 'number' && Number.isFinite(raw[key]),
        )
        .map((key) => [key, raw[key]]),
    ),
  };
}
export class OllamaTransport {
  readonly endpoint: string;
  private readonly fetcher: typeof fetch;
  constructor(endpoint = localEndpoint, fetcher: typeof fetch = fetch) {
    this.endpoint = loopbackEndpoint(endpoint);
    this.fetcher = fetcher;
  }
  async chat(
    body: OllamaRequest,
    signal: AbortSignal,
  ): Promise<SafeOllamaEnvelope> {
    signal.throwIfAborted();
    // Native browser fetch must not receive the transport instance as its receiver.
    const fetcher = this.fetcher;
    const response = await fetcher(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
      redirect: 'error',
      credentials: 'omit',
      cache: 'no-store',
      mode: 'cors',
    });
    if (!response.ok) throw new OllamaError('http');
    const text = await response.text();
    if (text.length > 65_536) throw new OllamaError('body_limit');
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      throw new OllamaError('envelope');
    }
    signal.throwIfAborted();
    return parseOllamaEnvelope(raw);
  }
}
