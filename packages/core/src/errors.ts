import type { NormalizedVoiceError, VoiceErrorCode } from './types.js';

const RETRYABLE_CODES: ReadonlySet<VoiceErrorCode> = new Set<VoiceErrorCode>([
  'network_error',
  'asr_connection_failed',
  'asr_timeout',
  'provider_rate_limited',
]);

/**
 * Typed error wrapper so a {@link NormalizedVoiceError} can flow through
 * `throw`/`catch` and `Promise` rejection while remaining structurally
 * inspectable.
 */
export class VoiceError extends Error implements NormalizedVoiceError {
  /** Stable application error code. */
  readonly code: VoiceErrorCode;
  /** Provider name when the failure originated in an adapter. */
  readonly provider?: string;
  /** Hint for UI retry; not enforced by the session. */
  readonly retryable?: boolean;
  /** Original thrown value or HTTP body, when available. */
  readonly raw?: unknown;

  /**
   * @param error - Normalized shape to wrap; `retryable` defaults from `code` when omitted.
   */
  constructor(error: NormalizedVoiceError) {
    super(error.message);
    this.name = 'VoiceError';
    this.code = error.code;
    if (error.provider !== undefined) this.provider = error.provider;
    this.retryable =
      error.retryable !== undefined
        ? error.retryable
        : RETRYABLE_CODES.has(error.code);
    if (error.raw !== undefined) this.raw = error.raw;
  }

  /** Flatten back to a plain {@link NormalizedVoiceError} for events / logs. */
  toNormalized(): NormalizedVoiceError {
    const out: NormalizedVoiceError = {
      code: this.code,
      message: this.message,
      retryable: this.retryable,
    };
    if (this.provider !== undefined) out.provider = this.provider;
    if (this.raw !== undefined) out.raw = this.raw;
    return out;
  }
}

/**
 * Optional metadata for {@link createVoiceError}.
 * Omitted fields get sensible defaults (`retryable` from known network/ASR codes).
 */
export interface CreateVoiceErrorOptions {
  /** Provider name when the failure originated in an adapter. */
  provider?: string;
  /** Override the default retryability for {@link VoiceErrorCode}. */
  retryable?: boolean;
  /** Original thrown value or HTTP body, when available. */
  raw?: unknown;
}

/**
 * Build a {@link NormalizedVoiceError} with sensible `retryable` defaults.
 *
 * @param code - Stable {@link VoiceErrorCode}.
 * @param message - Human-readable message for logs.
 * @param options - Optional provider, retryable, and raw. See {@link CreateVoiceErrorOptions}.
 * @returns A plain {@link NormalizedVoiceError} (not a thrown `Error`).
 */
export function createVoiceError(
  code: VoiceErrorCode,
  message: string,
  options: CreateVoiceErrorOptions = {},
): NormalizedVoiceError {
  const error: NormalizedVoiceError = {
    code,
    message,
    retryable:
      options.retryable !== undefined
        ? options.retryable
        : RETRYABLE_CODES.has(code),
  };
  if (options.provider !== undefined) error.provider = options.provider;
  if (options.raw !== undefined) error.raw = options.raw;
  return error;
}

function hasErrorShape(value: unknown): value is { code: unknown; message: unknown } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'message' in value
  );
}

const KNOWN_CODES: ReadonlySet<string> = new Set<VoiceErrorCode>([
  'permission_denied',
  'microphone_unavailable',
  'network_error',
  'asr_connection_failed',
  'asr_timeout',
  'llm_failed',
  'tts_failed',
  'audio_playback_failed',
  'provider_rate_limited',
  'provider_quota_exceeded',
  'unsupported_runtime',
  'invalid_state',
  'aborted',
  'unknown',
]);

/**
 * Coerce an arbitrary thrown value into a {@link NormalizedVoiceError}.
 *
 * Used by the session and provider adapters so that every error surfaced to
 * consumers shares one shape, regardless of where it originated.
 *
 * @param value - Unknown thrown/rejected value.
 * @param fallbackCode - Code used when `value` has no recognized shape. Defaults to `unknown`.
 * @param provider - Optional provider name attached when missing on `value`.
 * @returns A {@link NormalizedVoiceError} suitable for session `error` events.
 */
export function normalizeError(
  value: unknown,
  fallbackCode: VoiceErrorCode = 'unknown',
  provider?: string,
): NormalizedVoiceError {
  if (value instanceof VoiceError) {
    const normalized = value.toNormalized();
    if (provider !== undefined && normalized.provider === undefined) {
      normalized.provider = provider;
    }
    return normalized;
  }

  if (hasErrorShape(value) && typeof value.code === 'string') {
    const code: VoiceErrorCode = KNOWN_CODES.has(value.code)
      ? (value.code as VoiceErrorCode)
      : fallbackCode;
    return createVoiceError(
      code,
      typeof value.message === 'string' ? value.message : String(value.message),
      { provider, raw: value },
    );
  }

  if (value instanceof Error) {
    return createVoiceError(fallbackCode, value.message, {
      provider,
      raw: value,
    });
  }

  return createVoiceError(fallbackCode, String(value), { provider, raw: value });
}
