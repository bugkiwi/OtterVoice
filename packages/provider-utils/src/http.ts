import {
  createVoiceError,
  type NormalizedVoiceError,
  type VoiceErrorCode,
} from '@ottervoice/core';

/**
 * Minimal `fetch`-compatible callable. Inject a custom impl for tests or
 * React Native polyfills; otherwise {@link resolveFetch} uses `globalThis.fetch`.
 */
export type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

/**
 * Resolve the `fetch` implementation, preferring an injected one.
 *
 * @param fetchImpl - Optional override; when omitted, uses `globalThis.fetch`.
 * @returns A {@link FetchLike} ready for HTTP calls.
 */
export function resolveFetch(fetchImpl?: FetchLike): FetchLike {
  return fetchImpl ?? (globalThis.fetch as FetchLike);
}

/**
 * Options for {@link normalizeHttpError}. Use when mapping vendor HTTP
 * failures into OtterVoice's shared error shape.
 */
export interface HttpErrorOptions {
  /** Vendor id attached to the resulting {@link NormalizedVoiceError}. */
  provider?: string;
  /** Code to use for ordinary 4xx failures (e.g. `llm_failed`, `tts_failed`). */
  failureCode?: VoiceErrorCode;
}

/**
 * Map an HTTP status + body into a {@link NormalizedVoiceError}, with sensible
 * retryable/quota/rate-limit handling shared by every HTTP provider.
 *
 * @param status - HTTP status code from the failed response.
 * @param body - Response body text (may be empty).
 * @param options - Provider id and non-2xx / non-5xx failure code.
 * @returns A normalized error suitable for `VoiceError` or event emission.
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

/**
 * Read a response body as text, returning `''` if the body cannot be read.
 *
 * @param res - Fetch {@link Response} whose body to consume.
 * @returns Body text, or an empty string on read failure.
 */
export async function readBody(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '';
  }
}
