import type {
  NormalizedVoiceError,
  VoiceErrorCode,
  VoiceErrorStage,
} from './types.js';

const RETRYABLE_CODES: ReadonlySet<VoiceErrorCode> = new Set<VoiceErrorCode>([
  'network_error',
  'asr_connection_failed',
  'asr_timeout',
  'provider_rate_limited',
]);

const SAFE_MESSAGES: Readonly<Record<VoiceErrorCode, string>> = {
  permission_denied: 'Microphone permission was denied.',
  microphone_unavailable: 'The microphone is unavailable.',
  network_error: 'The voice service could not be reached.',
  asr_connection_failed: 'Speech recognition could not connect.',
  asr_timeout: 'Speech recognition timed out.',
  llm_failed: 'The assistant could not generate a reply.',
  tts_failed: 'The assistant voice could not be generated.',
  audio_playback_failed: 'The generated audio could not be played.',
  provider_rate_limited: 'The voice service is busy. Try again shortly.',
  provider_quota_exceeded: 'The voice service quota has been exceeded.',
  unsupported_runtime: 'This audio operation is not supported in the current runtime.',
  invalid_state: 'The voice session is not ready for that action.',
  aborted: 'The voice operation was cancelled.',
  unknown: 'An unexpected voice error occurred.',
};

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
  /** Processing boundary where the failure occurred. */
  readonly stage?: VoiceErrorStage;
  /** Upstream HTTP status when a response was received. */
  readonly httpStatus?: number;
  /** Hint for UI retry; not enforced by the session. */
  readonly retryable?: boolean;
  /** Whether the session entered its terminal `error` state. */
  readonly fatal?: boolean;
  /** Sanitized summary safe for production logs and user-facing diagnostics. */
  readonly safeMessage?: string;
  /** Original thrown value. May contain user or provider data. */
  override readonly cause?: unknown;
  /** Original provider payload or HTTP body. May contain sensitive data. */
  readonly raw?: unknown;

  /**
   * @param error - Normalized shape to wrap; `retryable` defaults from `code` when omitted.
   */
  constructor(error: NormalizedVoiceError) {
    super(error.message);
    this.name = 'VoiceError';
    this.code = error.code;
    if (error.provider !== undefined) this.provider = error.provider;
    if (error.stage !== undefined) this.stage = error.stage;
    if (error.httpStatus !== undefined) this.httpStatus = error.httpStatus;
    this.retryable =
      error.retryable !== undefined
        ? error.retryable
        : RETRYABLE_CODES.has(error.code);
    if (error.fatal !== undefined) this.fatal = error.fatal;
    this.safeMessage = error.safeMessage ?? SAFE_MESSAGES[error.code];
    if (error.cause !== undefined) this.cause = error.cause;
    if (error.raw !== undefined) this.raw = error.raw;
  }

  /** Flatten back to a plain {@link NormalizedVoiceError} for events / logs. */
  toNormalized(): NormalizedVoiceError {
    const out: NormalizedVoiceError = {
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      safeMessage: this.safeMessage,
    };
    if (this.fatal !== undefined) out.fatal = this.fatal;
    if (this.provider !== undefined) out.provider = this.provider;
    if (this.stage !== undefined) out.stage = this.stage;
    if (this.httpStatus !== undefined) out.httpStatus = this.httpStatus;
    if (this.cause !== undefined) out.cause = this.cause;
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
  /** Processing boundary where the failure occurred. */
  stage?: VoiceErrorStage;
  /** Upstream HTTP status when a response was received. */
  httpStatus?: number;
  /** Override the default retryability for {@link VoiceErrorCode}. */
  retryable?: boolean;
  /** Whether the session entered its terminal `error` state. */
  fatal?: boolean;
  /** Sanitized summary; defaults to a stable message for the error code. */
  safeMessage?: string;
  /** Original thrown value. May contain user or provider data. */
  cause?: unknown;
  /** Original provider payload or HTTP body. May contain sensitive data. */
  raw?: unknown;
}

/**
 * Build a {@link NormalizedVoiceError} with sensible `retryable` defaults.
 *
 * @param code - Stable {@link VoiceErrorCode}.
 * @param message - Human-readable message for logs.
 * @param options - Optional stage, provider, retry, safe-message, and diagnostic metadata. See {@link CreateVoiceErrorOptions}.
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
    safeMessage: options.safeMessage ?? SAFE_MESSAGES[code],
  };
  if (options.provider !== undefined) error.provider = options.provider;
  if (options.stage !== undefined) error.stage = options.stage;
  if (options.httpStatus !== undefined) error.httpStatus = options.httpStatus;
  if (options.fatal !== undefined) error.fatal = options.fatal;
  if (options.cause !== undefined) error.cause = options.cause;
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
 * @param stage - Optional processing stage attached when missing on `value`.
 * @returns A {@link NormalizedVoiceError} suitable for session `error` events.
 */
export function normalizeError(
  value: unknown,
  fallbackCode: VoiceErrorCode = 'unknown',
  provider?: string,
  stage?: VoiceErrorStage,
): NormalizedVoiceError {
  if (value instanceof VoiceError) {
    const normalized = value.toNormalized();
    if (provider !== undefined && normalized.provider === undefined) {
      normalized.provider = provider;
    }
    if (stage !== undefined && normalized.stage === undefined) normalized.stage = stage;
    return normalized;
  }

  if (hasErrorShape(value) && typeof value.code === 'string') {
    const code: VoiceErrorCode = KNOWN_CODES.has(value.code)
      ? (value.code as VoiceErrorCode)
      : fallbackCode;
    const shaped = value as Partial<NormalizedVoiceError>;
    return createVoiceError(code, typeof value.message === 'string' ? value.message : String(value.message), {
      provider: typeof shaped.provider === 'string' ? shaped.provider : provider,
      stage: shaped.stage ?? stage,
      ...(typeof shaped.httpStatus === 'number' ? { httpStatus: shaped.httpStatus } : {}),
      ...(typeof shaped.retryable === 'boolean' ? { retryable: shaped.retryable } : {}),
      ...(typeof shaped.fatal === 'boolean' ? { fatal: shaped.fatal } : {}),
      ...(typeof shaped.safeMessage === 'string' ? { safeMessage: shaped.safeMessage } : {}),
      ...('cause' in shaped ? { cause: shaped.cause } : {}),
      ...('raw' in shaped ? { raw: shaped.raw } : { raw: value }),
    });
  }

  if (value instanceof Error) {
    return createVoiceError(fallbackCode, value.message, {
      provider,
      stage,
      cause: value,
      raw: value,
    });
  }

  return createVoiceError(fallbackCode, String(value), {
    provider,
    stage,
    cause: value,
    raw: value,
  });
}
