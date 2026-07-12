import type { NormalizedVoiceError, VoiceErrorCode } from './types';

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
  readonly code: VoiceErrorCode;
  readonly provider?: string;
  readonly retryable?: boolean;
  readonly raw?: unknown;

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

export interface CreateVoiceErrorOptions {
  provider?: string;
  retryable?: boolean;
  raw?: unknown;
}

/** Build a {@link NormalizedVoiceError} with sensible `retryable` defaults. */
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
