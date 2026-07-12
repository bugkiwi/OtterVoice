import {
  createVoiceError,
  type NormalizedVoiceError,
  type VoiceErrorCode,
} from '@ottervoice/core';

export type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

/** Resolve the `fetch` implementation, preferring an injected one. */
export function resolveFetch(fetchImpl?: FetchLike): FetchLike {
  return fetchImpl ?? (globalThis.fetch as FetchLike);
}

export interface HttpErrorOptions {
  provider?: string;
  /** Code to use for ordinary 4xx failures (e.g. `llm_failed`, `tts_failed`). */
  failureCode?: VoiceErrorCode;
}

/**
 * Map an HTTP status + body into a {@link NormalizedVoiceError}, with sensible
 * retryable/quota/rate-limit handling shared by every HTTP provider.
 */
export function normalizeHttpError(
  status: number,
  body: string,
  options: HttpErrorOptions = {},
): NormalizedVoiceError {
  const message = `HTTP ${status}: ${body}`;
  const raw = { status, body };
  const provider = options.provider;
  if (status === 429) {
    return createVoiceError('provider_rate_limited', message, {
      provider,
      retryable: true,
      raw,
    });
  }
  if (status === 402) {
    return createVoiceError('provider_quota_exceeded', message, { provider, raw });
  }
  if (status >= 500) {
    return createVoiceError('network_error', message, {
      provider,
      retryable: true,
      raw,
    });
  }
  return createVoiceError(options.failureCode ?? 'unknown', message, {
    provider,
    raw,
  });
}

/** Read a response body as text, returning '' if the body cannot be read. */
export async function readBody(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '';
  }
}
