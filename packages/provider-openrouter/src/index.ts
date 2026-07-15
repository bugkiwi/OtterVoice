import {
  VoiceError,
  type LLMGenerateInput,
  type LLMGenerateOutput,
  type LLMProvider,
  type LLMStreamChunk,
} from '@ottervoice/core';
import {
  createCredentialResolver,
  normalizeHttpError,
  parseSSEStream,
  readBody,
  resolveFetch,
  type CredentialOptions,
} from '@ottervoice/provider-utils';
import {
  buildChatBody,
  buildHeaders,
  DEFAULT_BASE_URL,
  extractDelta,
  extractText,
  mapUsage,
  type HeaderOptions,
} from './chat.js';

export * from './chat.js';
export * from './audio.js';
export * from './audio-llm.js';

/**
 * Options for {@link createOpenRouterLLM}. Extends {@link CredentialOptions} and
 * {@link HeaderOptions}; prefer `tokenBrokerUrl` on clients over a static `apiKey`.
 */
export interface OpenRouterOptions extends CredentialOptions, HeaderOptions {
  /** OpenRouter model id, e.g. `openai/gpt-4o-mini`. */
  model: string;
  /** API base, default `https://openrouter.ai/api/v1`. */
  baseUrl?: string;
  /** Applied when a request does not specify its own temperature. */
  defaultTemperature?: number;
  /** Explicitly enable/disable reasoning tokens on compatible models. */
  reasoningEnabled?: boolean;
}

const PROVIDER = 'openrouter';

/**
 * LLM provider backed by OpenRouter's OpenAI-compatible HTTP API. Credentials
 * come from a static `apiKey` (server) or a `tokenBrokerUrl` (client-safe).
 *
 * @param options - Model id plus {@link CredentialOptions} / header overrides.
 */
export function createOpenRouterLLM(options: OpenRouterOptions): LLMProvider {
  const fetchImpl = resolveFetch(options.fetch);
  const resolveCredential = createCredentialResolver(options, {
    provider: PROVIDER,
    purpose: 'llm',
  });
  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
  const url = `${baseUrl}/chat/completions`;

  async function send(input: LLMGenerateInput, stream: boolean): Promise<Response> {
    const { token } = await resolveCredential();
    const body = buildChatBody(options.model, input, {
      temperature: options.defaultTemperature,
      stream,
    }, {
      reasoningEnabled: options.reasoningEnabled,
    });
    return fetchImpl(url, {
      method: 'POST',
      headers: buildHeaders(token, options),
      body: JSON.stringify(body),
      signal: input.signal,
    });
  }

  return {
    name: PROVIDER,

    async generate(input: LLMGenerateInput): Promise<LLMGenerateOutput> {
      const res = await send(input, false);
      if (!res.ok) {
        throw new VoiceError(
          normalizeHttpError(res.status, await readBody(res), {
            provider: PROVIDER,
            failureCode: 'llm_failed',
          }),
        );
      }
      const json = (await res.json()) as Record<string, unknown>;
      const text = extractText(json);
      const output: LLMGenerateOutput = { text, raw: json };
      const usage = mapUsage((json as { usage?: never }).usage);
      if (usage) output.usage = usage;
      if (input.responseFormat === 'json') {
        try {
          output.json = JSON.parse(text);
        } catch {
          output.json = undefined;
        }
      }
      return output;
    },

    async *stream(input: LLMGenerateInput): AsyncIterable<LLMStreamChunk> {
      const res = await send(input, true);
      if (!res.ok || res.body === null) {
        yield {
          type: 'error',
          error: normalizeHttpError(res.status, await readBody(res), {
            provider: PROVIDER,
            failureCode: 'llm_failed',
          }),
        };
        return;
      }
      for await (const data of parseSSEStream(res.body)) {
        if (data === '[DONE]') break;
        let json: Record<string, unknown>;
        try {
          json = JSON.parse(data);
        } catch {
          continue; // tolerate keep-alive / malformed lines
        }
        const delta = extractDelta(json);
        if (delta.length > 0) yield { type: 'text_delta', text: delta };
        const usage = mapUsage((json as { usage?: never }).usage);
        if (usage) yield { type: 'usage', usage };
      }
      yield { type: 'done' };
    },
  };
}
