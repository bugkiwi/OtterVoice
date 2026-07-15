import type { LLMGenerateInput, LLMUsage } from '@ottervoice/core';

/** Default OpenRouter OpenAI-compatible API root. */
export const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';

/** OpenAI-compatible chat-completions request body fields used by the adapter. */
export interface ChatBody {
  /** Model id on OpenRouter. */
  model: string;
  /** Chat messages in OpenAI role/content shape. */
  messages: Array<{ role: string; content: string }>;
  /** Sampling temperature. */
  temperature?: number;
  /** Max completion tokens. */
  max_tokens?: number;
  /** When true, request SSE streaming. */
  stream?: boolean;
  /** Force JSON-object responses when supported. */
  response_format?: { type: 'json_object' };
  /** OpenRouter reasoning toggle when the model supports it. */
  reasoning?: { enabled: boolean };
}

/**
 * Build the OpenAI-compatible chat-completions request body.
 *
 * @param model - OpenRouter model id.
 * @param input - Core {@link LLMGenerateInput} messages and knobs.
 * @param defaults - Adapter-level temperature / stream defaults.
 * @param openRouter - OpenRouter-specific extras (e.g. reasoning).
 */
export function buildChatBody(
  model: string,
  input: LLMGenerateInput,
  defaults: { temperature?: number; stream?: boolean } = {},
  openRouter: { reasoningEnabled?: boolean } = {},
): ChatBody {
  const messages: ChatBody['messages'] = [];
  if (input.system !== undefined) {
    messages.push({ role: 'system', content: input.system });
  }
  for (const m of input.messages) messages.push({ role: m.role, content: m.content });

  const body: ChatBody = { model, messages };
  const temperature = input.temperature ?? defaults.temperature;
  if (temperature !== undefined) body.temperature = temperature;
  if (input.maxTokens !== undefined) body.max_tokens = input.maxTokens;
  if (defaults.stream) body.stream = true;
  if (input.responseFormat === 'json') body.response_format = { type: 'json_object' };
  if (openRouter.reasoningEnabled !== undefined) {
    body.reasoning = { enabled: openRouter.reasoningEnabled };
  }
  return body;
}

/** Optional OpenRouter attribution and header overrides. */
export interface HeaderOptions {
  /** Sent as `HTTP-Referer` for OpenRouter rankings / allowlists. */
  referer?: string;
  /** Sent as `X-Title` (app name shown on OpenRouter). */
  title?: string;
  /** Extra headers merged last (override defaults carefully). */
  headers?: Record<string, string>;
}

/**
 * Assemble request headers, including OpenRouter's optional attribution.
 *
 * @param token - Bearer token from apiKey or token broker.
 * @param options - Attribution and header overrides.
 */
export function buildHeaders(token: string, options: HeaderOptions): Record<string, string> {
  const headers: Record<string, string> = {
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
    ...options.headers,
  };
  if (options.referer !== undefined) headers['http-referer'] = options.referer;
  if (options.title !== undefined) headers['x-title'] = options.title;
  return headers;
}

interface RawUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

/** Map an OpenAI-style `usage` object to the core {@link LLMUsage} shape. */
export function mapUsage(usage: RawUsage | undefined | null): LLMUsage | undefined {
  if (!usage) return undefined;
  const mapped: LLMUsage = {};
  if (usage.prompt_tokens !== undefined) mapped.inputTokens = usage.prompt_tokens;
  if (usage.completion_tokens !== undefined) mapped.outputTokens = usage.completion_tokens;
  if (usage.total_tokens !== undefined) mapped.totalTokens = usage.total_tokens;
  return mapped;
}

interface ChatCompletion {
  choices?: Array<{ message?: { content?: string }; delta?: { content?: string } }>;
  usage?: RawUsage;
}

/** Extract the assistant text from a non-streamed completion. */
export function extractText(json: ChatCompletion): string {
  return json.choices?.[0]?.message?.content ?? '';
}

/** Extract the incremental text from a streamed chunk. */
export function extractDelta(json: ChatCompletion): string {
  return json.choices?.[0]?.delta?.content ?? '';
}
