import { resolveFetch, type FetchLike } from '@ottervoice/provider-utils';

const DEFAULT_UPSTREAM_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_GATEWAY_PREFIX = '/api/voice';

/** Server-owned gateway profile selected by an explicit application route. */
export type OpenRouterGatewayProfile = 'asr' | 'llm' | 'tts' | 'audio_llm';

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
}

/** Locked server policy for speech synthesis requests. */
export interface OpenRouterGatewayTTSPolicy {
  /** Provider model id. Never read this value from an untrusted client. */
  model: string;
  /** Server-selected voice id. */
  voice: string;
  /** Server-selected speaking-rate multiplier. */
  speed?: number;
  /** Server-selected output encoding. Defaults to MP3. */
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
  /** Policy for `/asr/audio/transcriptions`. */
  asr?: OpenRouterGatewayASRPolicy;
  /** Policy for `/llm/chat/completions`. */
  llm?: OpenRouterGatewayLLMPolicy;
  /** Policy for `/tts/audio/speech`. */
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
  upstreamPath: '/audio/transcriptions' | '/chat/completions' | '/audio/speech';
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
    case '/llm/chat/completions':
      return { profile: 'llm', upstreamPath: '/chat/completions' };
    case '/tts/audio/speech':
      return { profile: 'tts', upstreamPath: '/audio/speech' };
    case '/audio-llm/chat/completions':
      return { profile: 'audio_llm', upstreamPath: '/chat/completions' };
    default:
      return undefined;
  }
}

function policyEnabled(
  policy: OpenRouterGatewayPolicy,
  profile: OpenRouterGatewayProfile,
): boolean {
  if (profile === 'audio_llm') return policy.audioLlm !== undefined;
  return policy[profile] !== undefined;
}

function readTextMessages(
  body: Record<string, unknown>,
  maxMessages: number,
  maxTextCharacters: number,
): TextMessage[] {
  if (!Array.isArray(body.messages) || body.messages.length > maxMessages) {
    throw new ClientRequestError('invalid conversation history');
  }
  let textCharacters = 0;
  return body.messages.map((value) => {
    if (!isRecord(value) || (value.role !== 'user' && value.role !== 'assistant')) {
      throw new ClientRequestError('client message role is not allowed');
    }
    if (typeof value.content !== 'string') {
      throw new ClientRequestError('client message content must be text');
    }
    textCharacters += value.content.length;
    if (textCharacters > maxTextCharacters) {
      throw new ClientRequestError('conversation text is too large');
    }
    return { role: value.role, content: value.content };
  });
}

function readAudioMessages(
  body: Record<string, unknown>,
  maxMessages: number,
  maxTextCharacters: number,
): Array<Record<string, unknown>> {
  if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > maxMessages) {
    throw new ClientRequestError('invalid audio conversation history');
  }
  let textCharacters = 0;
  let inputAudio: { data: string; format: 'wav' | 'mp3' } | undefined;
  const history: Array<Record<string, unknown>> = [];

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
  history.push({
    role: 'user',
    content: [
      { type: 'text', text: 'Respond naturally to the user audio.' },
      { type: 'input_audio', input_audio: inputAudio },
    ],
  });
  return history;
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

  if (profile === 'tts') {
    const selected = policy.tts!;
    if (typeof body.input !== 'string' || body.input.length === 0 || body.input.length > maxTextCharacters) {
      throw new ClientRequestError('invalid speech text');
    }
    return {
      model: selected.model,
      input: body.input,
      voice: selected.voice,
      response_format: selected.responseFormat ?? 'mp3',
      speed: selected.speed ?? 1,
    };
  }

  if (profile === 'llm') {
    const selected = policy.llm!;
    const messages = readTextMessages(body, maxMessages, maxTextCharacters);
    return {
      model: selected.model,
      messages: [{ role: 'system', content: selected.systemPrompt }, ...messages],
      stream: body.stream === true,
      ...(selected.temperature !== undefined ? { temperature: selected.temperature } : {}),
      ...(selected.maxTokens !== undefined ? { max_tokens: selected.maxTokens } : {}),
      ...(selected.reasoningEnabled !== undefined
        ? { reasoning: { enabled: selected.reasoningEnabled } }
        : {}),
      ...(selected.responseFormat === 'json'
        ? { response_format: { type: 'json_object' } }
        : {}),
    };
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
 * @returns A Fetch-compatible request handler for the four profile routes.
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
    const speechKey = route.profile === 'tts' && ttsCacheEntries > 0
      ? upstreamBody
      : undefined;
    const cachedSpeech = speechKey ? speechCache.get(speechKey) : undefined;
    if (cachedSpeech) {
      return new Response(cachedSpeech.bytes.slice(0), {
        headers: {
          'cache-control': 'no-store',
          'content-type': cachedSpeech.contentType,
          'server-timing': 'voice_gateway;dur=0;desc="TTS memory cache"',
          'x-ottervoice-cache': 'HIT',
          ...(cachedSpeech.generationId ? { 'x-generation-id': cachedSpeech.generationId } : {}),
        },
      });
    }

    const timeoutSignal = AbortSignal.timeout(upstreamTimeoutMs);
    try {
      const startedAt = performance.now();
      const upstreamSignal = AbortSignal.any([request.signal, timeoutSignal]);
      const upstream = await fetchImpl(`${upstreamBaseUrl}${route.upstreamPath}`, {
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
      if (speechKey) {
        const cached: CachedSpeech = {
          bytes: await upstream.arrayBuffer(),
          contentType: headers.get('content-type') ?? 'audio/mpeg',
          ...(generationId ? { generationId } : {}),
        };
        if (speechCache.size >= ttsCacheEntries) {
          const oldestKey = speechCache.keys().next().value;
          if (oldestKey !== undefined) speechCache.delete(oldestKey);
        }
        speechCache.set(speechKey, cached);
        headers.set('x-ottervoice-cache', 'MISS');
        return new Response(cached.bytes.slice(0), { headers });
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
