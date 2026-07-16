import { normalizeError, VoiceError } from '@ottervoice/core';
import { normalizeHttpError, readBody, resolveFetch, type FetchLike } from './http.js';

/**
 * Why a short-lived credential is being minted. Sent as
 * {@link BrokerRequest.purpose} so the broker can scope permissions.
 */
export type CredentialPurpose = 'asr' | 'llm' | 'tts' | 'pronunciation';

/** Body posted to {@link CredentialOptions.tokenBrokerUrl}. */
export interface BrokerRequest {
  /** Vendor id echoed to the broker (e.g. `deepgram`, `openrouter`). */
  provider: string;
  /** Why the token is needed so the broker can scope permissions. */
  purpose: CredentialPurpose;
  /** Optional client session id for audit / rate limits. */
  sessionId?: string;
}

/**
 * Short-lived auth material returned by a token broker (or synthesized from
 * {@link CredentialOptions.apiKey}). Use via {@link createCredentialResolver}.
 */
export interface BrokerToken {
  /** Optional signed URL (e.g. a websocket endpoint) returned by the broker. */
  url?: string;
  /** Bearer / API token used for upstream auth. */
  token: string;
  /** Epoch millis after which the token must be refreshed. */
  expiresAt?: number;
}

/**
 * Auth input for provider factories. Reserve {@link CredentialOptions.apiKey}
 * for trusted server-side runtimes. A browser/app may use
 * {@link CredentialOptions.tokenBrokerUrl} only when the returned credential is
 * genuinely short-lived and scoped to the required route/model/budget; otherwise
 * use a policy-enforcing application gateway.
 */
export interface CredentialOptions {
  /** A long-lived key (server-side only — never ship to clients). */
  apiKey?: string;
  /** Endpoint that mints short-lived, least-privilege tokens; broad provider bearer tokens are not client-safe. */
  tokenBrokerUrl?: string;
  /**
   * Application-authentication headers sent only to the token broker, such as
   * a short-lived user session bearer token. Use browser-compatible characters.
   */
  tokenBrokerHeaders?: Readonly<Record<string, string>>;
  /** Application voice-session id sent to the broker for ownership checks, audit, and quotas. */
  tokenBrokerSessionId?: string;
  /** Browser credential mode for the broker request. Use `include` for a cross-origin cookie session. */
  tokenBrokerCredentials?: RequestCredentials;
  /** Custom `fetch` implementation (tests / React Native polyfills). */
  fetch?: FetchLike;
  /** Clock override for deterministic expiry checks in tests. */
  now?: () => number;
}

/** Refresh a token this many ms before its stated expiry. */
const EXPIRY_SKEW_MS = 5_000;

/**
 * Returns a resolver that yields a usable {@link BrokerToken}. Prefers a static
 * `apiKey`; otherwise calls the token broker and caches the result until just
 * before it expires.
 *
 * @param options - Static key and/or broker URL.
 * @param request - Provider + purpose posted to the broker when minting.
 * @returns Async function that resolves a fresh-enough {@link BrokerToken}.
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
        stage: 'session',
        retryable: false,
      });
    }
    if (
      cached !== undefined &&
      (cached.expiresAt === undefined || cached.expiresAt > now() + EXPIRY_SKEW_MS)
    ) {
      return cached;
    }

    let res: Response;
    try {
      res = await fetchImpl(options.tokenBrokerUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...options.tokenBrokerHeaders,
        },
        ...(options.tokenBrokerCredentials
          ? { credentials: options.tokenBrokerCredentials }
          : {}),
        body: JSON.stringify({
          ...request,
          ...(options.tokenBrokerSessionId
            ? { sessionId: options.tokenBrokerSessionId }
            : {}),
        }),
      });
    } catch (error) {
      throw new VoiceError(
        normalizeError(error, 'network_error', request.provider, 'gateway'),
      );
    }
    if (!res.ok) {
      throw new VoiceError(
        normalizeHttpError(res.status, await readBody(res), {
          provider: request.provider,
          failureCode: 'network_error',
          stage: 'gateway',
        }),
      );
    }

    let json: Partial<BrokerToken> | null;
    try {
      json = (await res.json()) as Partial<BrokerToken> | null;
    } catch (error) {
      throw new VoiceError({
        ...normalizeError(error, 'network_error', request.provider, 'gateway'),
        stage: 'gateway',
        safeMessage: 'The token broker returned an invalid response.',
      });
    }
    if (!json || typeof json.token !== 'string') {
      throw new VoiceError({
        code: 'network_error',
        message: `${request.provider}: token broker returned no token`,
        provider: request.provider,
        stage: 'gateway',
        retryable: true,
        safeMessage: 'The token broker returned no usable credential.',
      });
    }
    cached = json as BrokerToken;
    return cached;
  };
}
