import { VoiceError } from '@ottervoice/core';
import { normalizeHttpError, readBody, resolveFetch, type FetchLike } from './http';

export type CredentialPurpose = 'asr' | 'llm' | 'tts' | 'pronunciation';

export interface BrokerRequest {
  provider: string;
  purpose: CredentialPurpose;
  sessionId?: string;
}

export interface BrokerToken {
  /** Optional signed URL (e.g. a websocket endpoint) returned by the broker. */
  url?: string;
  token: string;
  /** Epoch millis after which the token must be refreshed. */
  expiresAt?: number;
}

export interface CredentialOptions {
  /** A long-lived key (server-side only — never ship to clients). */
  apiKey?: string;
  /** Endpoint that mints short-lived tokens (client-safe). */
  tokenBrokerUrl?: string;
  fetch?: FetchLike;
  now?: () => number;
}

/** Refresh a token this many ms before its stated expiry. */
const EXPIRY_SKEW_MS = 5_000;

/**
 * Returns a resolver that yields a usable {@link BrokerToken}. Prefers a static
 * `apiKey`; otherwise calls the token broker and caches the result until just
 * before it expires.
 */
export function createCredentialResolver(
  options: CredentialOptions,
  request: BrokerRequest,
): () => Promise<BrokerToken> {
  const fetchImpl = resolveFetch(options.fetch);
  const now = options.now ?? Date.now;
  let cached: BrokerToken | undefined;

  return async function resolve(): Promise<BrokerToken> {
    if (options.apiKey !== undefined) {
      return { token: options.apiKey };
    }
    if (options.tokenBrokerUrl === undefined) {
      throw new VoiceError({
        code: 'unsupported_runtime',
        message: `${request.provider}: provide either apiKey or tokenBrokerUrl`,
        provider: request.provider,
        retryable: false,
      });
    }
    if (
      cached !== undefined &&
      (cached.expiresAt === undefined || cached.expiresAt > now() + EXPIRY_SKEW_MS)
    ) {
      return cached;
    }

    const res = await fetchImpl(options.tokenBrokerUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      throw new VoiceError(
        normalizeHttpError(res.status, await readBody(res), {
          provider: request.provider,
          failureCode: 'network_error',
        }),
      );
    }

    const json = (await res.json()) as Partial<BrokerToken> | null;
    if (!json || typeof json.token !== 'string') {
      throw new VoiceError({
        code: 'network_error',
        message: `${request.provider}: token broker returned no token`,
        provider: request.provider,
        retryable: true,
      });
    }
    cached = json as BrokerToken;
    return cached;
  };
}
