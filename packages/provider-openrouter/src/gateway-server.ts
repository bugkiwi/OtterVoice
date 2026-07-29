import { SpeechTextSegmenter } from '@ottervoice/core';
import {
  parseSSEStream,
  resolveFetch,
  type FetchLike,
} from '@ottervoice/provider-utils';
import { bytesToBase64 } from './audio.js';
import { extractDelta, mapUsage } from './chat.js';

const DEFAULT_UPSTREAM_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_GATEWAY_PREFIX = '/api/voice';

/** Server-owned gateway profile selected by an explicit application route. */
export type OpenRouterGatewayProfile =
  | 'asr'
  | 'audio_llm'
  | 'asr_llm_tts';

/** Locked server policy for speech recognition requests. */
export interface OpenRouterGatewayASRPolicy {
  /** Provider model id. Never read this value from an untrusted client. */
  model: string;
  /** Optional fixed recognition language. Omit to let the provider detect it. */
  language?: string;
}

/** Locked server policy for text LLM requests. */
export interface OpenRouterGatewayLLMPolicy {
  /** Provider model id. Never read this value from an untrusted client. */
  model: string;
  /** Trusted system instruction injected before client conversation history. */
  systemPrompt: string;
  /** Server-selected sampling temperature. */
  temperature?: number;
  /** Hard server-selected output-token ceiling. */
  maxTokens: number;
  /** Server-selected OpenRouter reasoning behavior. */
  reasoningEnabled?: boolean;
  /** Server-selected response shape. Defaults to text. */
  responseFormat?: 'text' | 'json';
  /**
   * Server-selected OpenRouter endpoint routing preferences. See
   * {@link OpenRouterGatewayProviderRoutingPolicy}.
   */
  provider?: OpenRouterGatewayProviderRoutingPolicy;
}

/** Locked OpenRouter endpoint-routing preferences for text LLM requests. */
export interface OpenRouterGatewayProviderRoutingPolicy {
  /** Attribute used to order eligible provider endpoints. */
  sort?: 'price' | 'throughput' | 'latency';
  /**
   * Preferred maximum time-to-first-token latency in seconds. Endpoints above
   * these rolling percentile thresholds are deprioritized, not excluded.
   */
  preferredMaxLatency?: {
    /** Preferred maximum median latency in seconds. */
    p50?: number;
    /** Preferred maximum p75 latency in seconds. */
    p75?: number;
    /** Preferred maximum p90 latency in seconds. */
    p90?: number;
    /** Preferred maximum p99 latency in seconds. */
    p99?: number;
  };
}

/** Locked server policy for speech synthesis requests. */
export interface OpenRouterGatewayTTSPolicy {
  /** Provider model id. Never read this value from an untrusted client. */
  model: string;
  /** Server-selected voice id. */
  voice: string;
  /** Server-selected speaking-rate multiplier. */
  speed?: number;
  /** Server-selected one-shot output encoding. Streaming requests force PCM. */
  responseFormat?: 'mp3' | 'pcm';
}

/** Locked server policy for native Audio LLM requests. */
export interface OpenRouterGatewayAudioLLMPolicy {
  /** Provider model id. Never read this value from an untrusted client. */
  model: string;
  /** Trusted system instruction injected before client conversation history. */
  systemPrompt: string;
  /** Server-selected output voice. */
  voice: string;
  /** Server-selected sampling temperature. */
  temperature?: number;
  /** Hard server-selected output-token ceiling. */
  maxTokens: number;
}

/**
 * Server-owned provider policy. Omit a profile to disable its route entirely.
 * The gateway never accepts these values from a browser or app request body.
 */
export interface OpenRouterGatewayPolicy {
  /** Policy for standalone ASR and the ASR stage of the composite voice route. */
  asr?: OpenRouterGatewayASRPolicy;
  /** Policy for the LLM stage of the composite voice route. */
  llm?: OpenRouterGatewayLLMPolicy;
  /** Policy for the TTS stage of the composite voice route. */
  tts?: OpenRouterGatewayTTSPolicy;
  /** Policy for `/audio-llm/chat/completions`. */
  audioLlm?: OpenRouterGatewayAudioLLMPolicy;
}

/** Context passed to the application-owned gateway authorization hook. */
export interface OpenRouterGatewayAuthorizationContext {
  /** Original application request. */
  request: Request;
  /** Parsed request URL. */
  url: URL;
  /** Server profile selected by the explicit route. */
  profile: OpenRouterGatewayProfile;
}

/**
 * Authorization result for an OpenRouter policy gateway.
 * Return `true` to continue, `false` to reject, or a custom response.
 */
export type OpenRouterGatewayAuthorizationResult =
  | boolean
  | Response
  | Promise<boolean | Response>;

/** Options for {@link createOpenRouterGateway}. */
export interface OpenRouterGatewayOptions {
  /** Long-lived OpenRouter key read only in the trusted server runtime. */
  apiKey?: string;
  /** Locked model, prompt, voice, and generation policy. */
  policy: OpenRouterGatewayPolicy;
  /**
   * Application authorization and session-ownership check. This hook is
   * mandatory so production integrations cannot accidentally omit the trust boundary.
   */
  authorize: (
    context: OpenRouterGatewayAuthorizationContext,
  ) => OpenRouterGatewayAuthorizationResult;
  /** Browser-facing prefix. Defaults to `/api/voice`. */
  gatewayPrefix?: string;
  /** Provider API root. Defaults to OpenRouter's public v1 endpoint. */
  upstreamBaseUrl?: string;
  /** Maximum encoded request size. Defaults to 6 MiB. */
  maxRequestBodyBytes?: number;
  /** Maximum conversation messages accepted from a client. Defaults to 32. */
  maxMessages?: number;
  /** Maximum cumulative client-controlled text characters. Defaults to 32,000. */
  maxTextCharacters?: number;
  /** Total upstream response timeout in milliseconds. Defaults to 60 seconds. */
  upstreamTimeoutMs?: number;
  /** Maximum in-memory TTS cache entries. Defaults to zero (disabled). */
  ttsCacheEntries?: number;
  /** Server-owned HTTP Referer sent upstream. */
  referer?: string;
  /** Server-owned application title sent upstream. */
  title?: string;
  /** Server-side fetch override for tests or custom runtimes. */
  fetch?: FetchLike;
}

interface CachedSpeech {
  bytes: ArrayBuffer;
  contentType: string;
  generationId?: string;
}

interface GatewayRoute {
  profile: OpenRouterGatewayProfile;
  upstreamPath?: '/audio/transcriptions' | '/chat/completions' | '/audio/speech';
}

interface TextMessage {
  role: 'user' | 'assistant';
  content: string;
}

class ClientRequestError extends Error {}

function json(body: unknown, status: number): Response {
  return Response.json(body, {
    status,
    headers: { 'cache-control': 'no-store' },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizePrefix(prefix: string): string {
  const withSlash = prefix.startsWith('/') ? prefix : `/${prefix}`;
  return withSlash.length > 1 && withSlash.endsWith('/')
    ? withSlash.slice(0, -1)
    : withSlash;
}

function routeFor(pathname: string, prefix: string): GatewayRoute | undefined {
  const suffix = pathname.startsWith(`${prefix}/`)
    ? pathname.slice(prefix.length)
    : undefined;
  switch (suffix) {
    case '/asr/audio/transcriptions':
      return { profile: 'asr', upstreamPath: '/audio/transcriptions' };
    case '/audio-llm/chat/completions':
      return { profile: 'audio_llm', upstreamPath: '/chat/completions' };
    case '/asr-llm-tts/chat/completions':
      return { profile: 'asr_llm_tts' };
    default:
      return undefined;
  }
}

function policyEnabled(
  policy: OpenRouterGatewayPolicy,
  profile: OpenRouterGatewayProfile,
): boolean {
  if (profile === 'asr_llm_tts') {
    return policy.asr !== undefined &&
      policy.llm !== undefined &&
      policy.tts !== undefined;
  }
  if (profile === 'audio_llm') return policy.audioLlm !== undefined;
  return policy[profile] !== undefined;
}

interface AudioTurnInput {
  history: TextMessage[];
  inputAudio: { data: string; format: 'wav' | 'mp3' };
}

function readAudioTurn(
  body: Record<string, unknown>,
  maxMessages: number,
  maxTextCharacters: number,
): AudioTurnInput {
  if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > maxMessages) {
    throw new ClientRequestError('invalid audio conversation history');
  }
  let textCharacters = 0;
  let inputAudio: AudioTurnInput['inputAudio'] | undefined;
  const history: TextMessage[] = [];
  for (const [index, value] of body.messages.entries()) {
    if (!isRecord(value) || (value.role !== 'user' && value.role !== 'assistant')) {
      throw new ClientRequestError('client message role is not allowed');
    }
    if (typeof value.content === 'string') {
      textCharacters += value.content.length;
      if (textCharacters > maxTextCharacters) {
        throw new ClientRequestError('conversation text is too large');
      }
      history.push({ role: value.role, content: value.content });
      continue;
    }
    if (index !== body.messages.length - 1 || value.role !== 'user' || !Array.isArray(value.content)) {
      throw new ClientRequestError('multimodal audio must be the final user message');
    }
    for (const item of value.content) {
      if (!isRecord(item)) throw new ClientRequestError('invalid audio content item');
      if (item.type === 'text') {
        if (typeof item.text !== 'string') throw new ClientRequestError('invalid audio text item');
        continue;
      }
      if (item.type !== 'input_audio' || !isRecord(item.input_audio)) {
        throw new ClientRequestError('audio content item is not allowed');
      }
      const data = item.input_audio.data;
      const format = item.input_audio.format;
      if (
        inputAudio !== undefined ||
        typeof data !== 'string' ||
        (format !== 'wav' && format !== 'mp3')
      ) {
        throw new ClientRequestError('invalid input audio');
      }
      inputAudio = { data, format };
    }
  }
  if (!inputAudio) throw new ClientRequestError('input audio is required');
  return { history, inputAudio };
}

function readAudioMessages(
  body: Record<string, unknown>,
  maxMessages: number,
  maxTextCharacters: number,
): Array<Record<string, unknown>> {
  const { history, inputAudio } = readAudioTurn(
    body,
    maxMessages,
    maxTextCharacters,
  );
  const messages: Array<Record<string, unknown>> = history.map((message) => ({
    role: message.role,
    content: message.content,
  }));
  messages.push({
    role: 'user',
    content: [
      { type: 'text', text: 'Respond naturally to the user audio.' },
      { type: 'input_audio', input_audio: inputAudio },
    ],
  });
  return messages;
}

function buildLockedBody(
  profile: OpenRouterGatewayProfile,
  body: Record<string, unknown>,
  policy: OpenRouterGatewayPolicy,
  maxMessages: number,
  maxTextCharacters: number,
): Record<string, unknown> {
  if (profile === 'asr') {
    const selected = policy.asr!;
    if (!isRecord(body.input_audio)) throw new ClientRequestError('input audio is required');
    const data = body.input_audio.data;
    const format = body.input_audio.format;
    if (
      typeof data !== 'string' ||
      (format !== 'webm' && format !== 'wav' && format !== 'mp3' && format !== 'opus')
    ) {
      throw new ClientRequestError('invalid transcription audio');
    }
    return {
      model: selected.model,
      input_audio: { data, format },
      ...(selected.language ? { language: selected.language } : {}),
      temperature: 0,
    };
  }

  if (profile === 'asr_llm_tts') {
    throw new ClientRequestError('composite voice turns use the streaming handler');
  }

  const selected = policy.audioLlm!;
  const messages = readAudioMessages(body, maxMessages, maxTextCharacters);
  return {
    model: selected.model,
    messages: [{ role: 'system', content: selected.systemPrompt }, ...messages],
    modalities: ['text', 'audio'],
    audio: { voice: selected.voice, format: 'pcm16' },
    stream: true,
    stream_options: { include_usage: true },
    ...(selected.temperature !== undefined ? { temperature: selected.temperature } : {}),
    ...(selected.maxTokens !== undefined ? { max_tokens: selected.maxTokens } : {}),
  };
}

/**
 * Create a server-side OpenRouter gateway that reconstructs every upstream
 * request from a locked policy. Browser-supplied model, system/developer
 * messages, voice, temperature, token limits, reasoning options, and unknown
 * fields are never forwarded.
 *
 * @param options - Server credentials, locked policy, authorization hook, and limits.
 * @returns A Fetch-compatible request handler for standalone and composite profile routes.
 */
export function createOpenRouterGateway(
  options: OpenRouterGatewayOptions,
): (request: Request) => Promise<Response> {
  const fetchImpl = resolveFetch(options.fetch);
  const prefix = normalizePrefix(options.gatewayPrefix ?? DEFAULT_GATEWAY_PREFIX);
  const upstreamBaseUrl = (options.upstreamBaseUrl ?? DEFAULT_UPSTREAM_BASE_URL).replace(/\/$/, '');
  const maxRequestBodyBytes = options.maxRequestBodyBytes ?? 6 * 1024 * 1024;
  const maxMessages = options.maxMessages ?? 32;
  const maxTextCharacters = options.maxTextCharacters ?? 32_000;
  const upstreamTimeoutMs = Math.max(1, options.upstreamTimeoutMs ?? 60_000);
  const ttsCacheEntries = Math.max(0, options.ttsCacheEntries ?? 0);
  const speechCache = new Map<string, CachedSpeech>();

  const upstreamHeaders = {
    authorization: `Bearer ${options.apiKey ?? ''}`,
    'content-type': 'application/json',
    ...(options.referer ? { 'http-referer': options.referer } : {}),
    ...(options.title ? { 'x-title': options.title } : {}),
  };

  function handleCompositeVoiceTurn(
    request: Request,
    clientBody: Record<string, unknown>,
  ): Response {
    const turn = readAudioTurn(clientBody, maxMessages, maxTextCharacters);
    const encoder = new TextEncoder();
    const localAbort = new AbortController();
    const timeoutSignal = AbortSignal.timeout(upstreamTimeoutMs);
    const signal = AbortSignal.any([
      request.signal,
      localAbort.signal,
      timeoutSignal,
    ]);
    let closed = false;

    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        const send = (event: unknown) => {
          if (closed || signal.aborted) return;
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
            );
          } catch {
            closed = true;
            localAbort.abort();
          }
        };
        const finish = () => {
          if (closed) return;
          closed = true;
          try {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch {
            localAbort.abort();
          }
        };

        void (async () => {
          let stage: 'asr' | 'llm' | 'tts' = 'asr';
          try {
            const asrPolicy = options.policy.asr!;
            const asrResponse = await fetchImpl(
              `${upstreamBaseUrl}/audio/transcriptions`,
              {
                method: 'POST',
                headers: upstreamHeaders,
                body: JSON.stringify({
                  model: asrPolicy.model,
                  input_audio: turn.inputAudio,
                  ...(asrPolicy.language
                    ? { language: asrPolicy.language }
                    : {}),
                  temperature: 0,
                }),
                signal,
              },
            );
            if (!asrResponse.ok) {
              throw new Error(`ASR request failed with status ${asrResponse.status}`);
            }
            const asrPayload = await asrResponse.json() as Record<string, unknown>;
            const inputText = typeof asrPayload.text === 'string'
              ? asrPayload.text.trim()
              : '';
            send({ type: 'input_text', text: inputText });
            if (inputText.length === 0) {
              send({ type: 'done' });
              finish();
              return;
            }

            stage = 'llm';
            const llmPolicy = options.policy.llm!;
            const llmResponse = await fetchImpl(
              `${upstreamBaseUrl}/chat/completions`,
              {
                method: 'POST',
                headers: upstreamHeaders,
                body: JSON.stringify({
                  model: llmPolicy.model,
                  messages: [
                    { role: 'system', content: llmPolicy.systemPrompt },
                    ...turn.history,
                    { role: 'user', content: inputText },
                  ],
                  stream: true,
                  stream_options: { include_usage: true },
                  ...(llmPolicy.temperature !== undefined
                    ? { temperature: llmPolicy.temperature }
                    : {}),
                  max_tokens: llmPolicy.maxTokens,
                  ...(llmPolicy.reasoningEnabled !== undefined
                    ? { reasoning: { enabled: llmPolicy.reasoningEnabled } }
                    : {}),
                  ...(llmPolicy.provider
                    ? {
                        provider: {
                          ...(llmPolicy.provider.sort
                            ? { sort: llmPolicy.provider.sort }
                            : {}),
                          ...(llmPolicy.provider.preferredMaxLatency
                            ? {
                                preferred_max_latency:
                                  llmPolicy.provider.preferredMaxLatency,
                              }
                            : {}),
                        },
                      }
                    : {}),
                }),
                signal,
              },
            );
            if (!llmResponse.ok || llmResponse.body === null) {
              throw new Error(`LLM request failed with status ${llmResponse.status}`);
            }

            const segmenter = new SpeechTextSegmenter();
            let sequence = 0;
            let delivery = Promise.resolve();
            const queueSpeech = (text: string) => {
              const ttsPolicy = options.policy.tts!;
              const speechBody = JSON.stringify({
                model: ttsPolicy.model,
                input: text,
                voice: ttsPolicy.voice,
                response_format: 'mp3',
                speed: ttsPolicy.speed ?? 1,
              });
              const synthesis = (async () => {
                const cached = ttsCacheEntries > 0
                  ? speechCache.get(speechBody)
                  : undefined;
                if (cached) return cached;
                const response = await fetchImpl(
                  `${upstreamBaseUrl}/audio/speech`,
                  {
                    method: 'POST',
                    headers: upstreamHeaders,
                    body: speechBody,
                    signal,
                  },
                );
                if (!response.ok) {
                  throw new Error(`TTS request failed with status ${response.status}`);
                }
                const result: CachedSpeech = {
                  bytes: await response.arrayBuffer(),
                  contentType: response.headers.get('content-type') ?? 'audio/mpeg',
                  ...(response.headers.get('x-generation-id')
                    ? { generationId: response.headers.get('x-generation-id')! }
                    : {}),
                };
                if (ttsCacheEntries > 0) {
                  if (speechCache.size >= ttsCacheEntries) {
                    const oldestKey = speechCache.keys().next().value;
                    if (oldestKey !== undefined) speechCache.delete(oldestKey);
                  }
                  speechCache.set(speechBody, result);
                }
                return result;
              })().then(
                (value) => ({ ok: true as const, value }),
                (error: unknown) => ({ ok: false as const, error }),
              );
              const currentSequence = sequence++;
              delivery = delivery.then(async () => {
                const result = await synthesis;
                if (!result.ok) throw result.error;
                send({
                  type: 'output_audio_segment',
                  sequence: currentSequence,
                  mimeType: result.value.contentType,
                  data: bytesToBase64(new Uint8Array(result.value.bytes)),
                });
              });
              void delivery.catch(() => {});
            };

            for await (const data of parseSSEStream(llmResponse.body)) {
              if (data === '[DONE]') break;
              let payload: Record<string, unknown>;
              try {
                payload = JSON.parse(data) as Record<string, unknown>;
              } catch {
                continue;
              }
              const delta = extractDelta(payload);
              if (delta.length > 0) {
                send({ type: 'output_text_delta', delta });
                for (const segment of segmenter.push(delta)) queueSpeech(segment);
              }
              const usage = mapUsage((payload as { usage?: never }).usage);
              if (usage) send({ type: 'usage', usage });
            }
            for (const segment of segmenter.flush()) queueSpeech(segment);
            stage = 'tts';
            await delivery;
            send({ type: 'done' });
            finish();
          } catch {
            if (closed || request.signal.aborted || localAbort.signal.aborted) {
              if (!closed) {
                closed = true;
                try {
                  controller.close();
                } catch {
                  // Client cancellation already closed the stream.
                }
              }
              return;
            }
            send({
              type: 'error',
              error: {
                code: stage === 'asr'
                  ? 'asr_connection_failed'
                  : stage === 'tts'
                    ? 'tts_failed'
                    : 'llm_failed',
                message: `${stage.toUpperCase()} stage failed`,
                stage: 'gateway',
                retryable: true,
              },
            });
            finish();
          }
        })();
      },
      cancel() {
        closed = true;
        localAbort.abort();
      },
    });

    return new Response(body, {
      headers: {
        'cache-control': 'no-store',
        'content-type': 'text/event-stream; charset=utf-8',
        connection: 'keep-alive',
        'x-accel-buffering': 'no',
      },
    });
  }

  return async function handleOpenRouterGateway(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const route = routeFor(url.pathname, prefix);
    if (request.method !== 'POST' || !route || !policyEnabled(options.policy, route.profile)) {
      return json({ error: 'not found' }, 404);
    }

    let authorization: boolean | Response;
    try {
      authorization = await options.authorize({ request, url, profile: route.profile });
    } catch {
      return json({ error: 'authorization failed' }, 401);
    }
    if (authorization instanceof Response) return authorization;
    if (authorization !== true) return json({ error: 'unauthorized' }, 401);
    if (!options.apiKey) return json({ error: 'voice gateway is not configured' }, 503);

    const contentType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
    if (contentType !== 'application/json') {
      return json({ error: 'content type must be application/json' }, 415);
    }
    const contentLength = Number(request.headers.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > maxRequestBodyBytes) {
      return json({ error: 'voice request is too large' }, 413);
    }

    const encodedBody = await request.arrayBuffer();
    if (encodedBody.byteLength > maxRequestBodyBytes) {
      return json({ error: 'voice request is too large' }, 413);
    }
    let clientBody: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(new TextDecoder().decode(encodedBody));
      if (!isRecord(parsed)) throw new ClientRequestError('request body must be an object');
      clientBody = parsed;
    } catch {
      return json({ error: 'invalid JSON request' }, 400);
    }

    if (route.profile === 'asr_llm_tts') {
      try {
        return handleCompositeVoiceTurn(request, clientBody);
      } catch (error) {
        return json({
          error: error instanceof ClientRequestError
            ? error.message
            : 'invalid request',
        }, 400);
      }
    }

    let lockedBody: Record<string, unknown>;
    try {
      lockedBody = buildLockedBody(
        route.profile,
        clientBody,
        options.policy,
        maxMessages,
        maxTextCharacters,
      );
    } catch (error) {
      return json({ error: error instanceof ClientRequestError ? error.message : 'invalid request' }, 400);
    }

    const upstreamBody = JSON.stringify(lockedBody);
    const timeoutSignal = AbortSignal.timeout(upstreamTimeoutMs);
    try {
      const startedAt = performance.now();
      const upstreamSignal = AbortSignal.any([request.signal, timeoutSignal]);
      const upstream = await fetchImpl(`${upstreamBaseUrl}${route.upstreamPath!}`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${options.apiKey}`,
          'content-type': 'application/json',
          ...(options.referer ? { 'http-referer': options.referer } : {}),
          ...(options.title ? { 'x-title': options.title } : {}),
        },
        body: upstreamBody,
        signal: upstreamSignal,
      });
      const headers = new Headers({
        'cache-control': 'no-store',
        'content-type': upstream.headers.get('content-type') ?? 'application/octet-stream',
        'server-timing': `voice_gateway;dur=${(performance.now() - startedAt).toFixed(1)}`,
      });
      const generationId = upstream.headers.get('x-generation-id');
      if (generationId) headers.set('x-generation-id', generationId);

      if (!upstream.ok) {
        return json({ error: 'voice provider request failed' }, upstream.status);
      }
      return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers,
      });
    } catch {
      if (request.signal.aborted) return new Response(null, { status: 499 });
      if (timeoutSignal.aborted) return json({ error: 'upstream voice request timed out' }, 504);
      return json({ error: 'upstream voice request failed' }, 502);
    }
  };
}
