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
import {
  createOpenRouterASR,
  createOpenRouterTTS,
  type OpenRouterASROptions,
} from './audio.js';
import {
  createOpenRouterAudioLLM,
  type OpenRouterAudioLLMOptions,
} from './audio-llm.js';

export * from './chat.js';
export * from './audio.js';
export * from './audio-llm.js';
export * from './gateway-server.js';

/**
 * Options for {@link createOpenRouterLLM}. Use this direct provider in trusted
 * server/CLI runtimes. Browsers and apps should prefer
 * {@link createOpenRouterGatewayLLM} with a policy-enforcing server gateway.
 */
export interface OpenRouterOptions extends CredentialOptions, HeaderOptions {
  /** OpenRouter model id, e.g. `openai/gpt-4o-mini`. */
  model: string;
  /** API base, default `https://openrouter.ai/api/v1`. */
  baseUrl?: string;
  /** Classify HTTP failures as gateway/provider errors. Defaults from whether `baseUrl` is customized. */
  requestStage?: 'gateway' | 'provider';
  /** Applied when a request does not specify its own temperature. */
  defaultTemperature?: number;
  /** Explicitly enable/disable reasoning tokens on compatible models. */
  reasoningEnabled?: boolean;
  /**
   * Omit model, system prompt, generation controls, and response format from
   * the browser request because a trusted policy gateway reconstructs them.
   * Prefer {@link createOpenRouterGatewayLLM} instead of setting this directly.
   */
  serverManaged?: boolean;
}

const PROVIDER = 'openrouter';

/**
 * LLM provider backed by OpenRouter's OpenAI-compatible HTTP API. A direct
 * client credential is safe only when it is short-lived and tightly scoped;
 * broad OpenRouter credentials require a policy-enforcing server gateway.
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
  const requestStage = options.requestStage ?? (options.baseUrl ? 'gateway' : 'provider');
  const url = `${baseUrl}/chat/completions`;

  async function send(input: LLMGenerateInput, stream: boolean): Promise<Response> {
    const { token } = await resolveCredential();
    const body = options.serverManaged
      ? {
          messages: input.messages
            .filter((message) => message.role === 'user' || message.role === 'assistant')
            .map((message) => ({ role: message.role, content: message.content })),
          stream,
        }
      : buildChatBody(options.model, input, {
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
            stage: requestStage,
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
            stage: requestStage,
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

/** Shared browser/app options for a server-managed OpenRouter gateway profile. */
export interface OpenRouterGatewayClientOptions {
  /** Profile-specific application base URL, such as `/api/voice/llm`. */
  baseUrl: string;
  /** Application-gateway headers, for example a short-lived session token. */
  headers?: Record<string, string>;
  /** Custom fetch implementation, commonly Expo's fetch adapter. */
  fetch?: CredentialOptions['fetch'];
}

/**
 * Client-safe ASR gateway options. Provider model and language policy stay on the server.
 */
export type OpenRouterGatewayASROptions = OpenRouterGatewayClientOptions & Pick<
  OpenRouterASROptions,
  'format' | 'partialIntervalMs' | 'emptyPartialBackoffMs' | 'now'
>;

/** Client-safe Audio LLM gateway options. Model, prompt, voice, and generation limits stay on the server. */
export interface OpenRouterGatewayAudioLLMOptions extends OpenRouterGatewayClientOptions {
  /** Runtime conversion from browser/native capture to WAV or MP3. */
  prepareAudio?: OpenRouterAudioLLMOptions['prepareAudio'];
  /** Require the server SSE response to end with `[DONE]`. */
  requireDoneSentinel?: boolean;
}

const GATEWAY_PLACEHOLDER = 'ottervoice-server-managed-gateway';

/**
 * Create an ASR provider for a server-managed application gateway.
 *
 * @param options - Profile URL plus client-side capture/partial-result behavior.
 * @returns An ASR provider that sends only audio input and no provider policy fields.
 */
export function createOpenRouterGatewayASR(
  options: OpenRouterGatewayASROptions,
): ReturnType<typeof createOpenRouterASR> {
  return createOpenRouterASR({
    ...options,
    apiKey: GATEWAY_PLACEHOLDER,
    model: GATEWAY_PLACEHOLDER,
    requestStage: 'gateway',
    serverManaged: true,
  });
}

/**
 * Create a text LLM provider for a server-managed application gateway.
 *
 * @param options - Profile URL and optional application authorization headers/fetch.
 * @returns An LLM provider that sends only user/assistant history and transport mode.
 */
export function createOpenRouterGatewayLLM(
  options: OpenRouterGatewayClientOptions,
): LLMProvider {
  return createOpenRouterLLM({
    ...options,
    apiKey: GATEWAY_PLACEHOLDER,
    model: GATEWAY_PLACEHOLDER,
    requestStage: 'gateway',
    serverManaged: true,
  });
}

/**
 * Create a TTS provider for a server-managed application gateway.
 *
 * @param options - Profile URL and optional application authorization headers/fetch.
 * @returns A TTS provider that sends only text; model, voice, speed, and format stay server-side.
 */
export function createOpenRouterGatewayTTS(
  options: OpenRouterGatewayClientOptions,
): ReturnType<typeof createOpenRouterTTS> {
  return createOpenRouterTTS({
    ...options,
    apiKey: GATEWAY_PLACEHOLDER,
    model: GATEWAY_PLACEHOLDER,
    voice: GATEWAY_PLACEHOLDER,
    requestStage: 'gateway',
    serverManaged: true,
  });
}

/**
 * Create an Audio LLM provider for a server-managed application gateway.
 *
 * @param options - Profile URL plus runtime audio conversion/stream validation.
 * @returns An Audio LLM provider that sends audio/history without business policy fields.
 */
export function createOpenRouterGatewayAudioLLM(
  options: OpenRouterGatewayAudioLLMOptions,
): ReturnType<typeof createOpenRouterAudioLLM> {
  return createOpenRouterAudioLLM({
    ...options,
    apiKey: GATEWAY_PLACEHOLDER,
    model: GATEWAY_PLACEHOLDER,
    requestStage: 'gateway',
    serverManaged: true,
  });
}
