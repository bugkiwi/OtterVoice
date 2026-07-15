/**
 * Core type definitions for OtterVoice.
 *
 * These types are platform-agnostic: they must not reference DOM, React,
 * React Native or Node-specific APIs. Platform capabilities arrive through
 * the {@link RuntimeAdapter}; cloud capabilities through the provider
 * interfaces.
 */

// ---------------------------------------------------------------------------
// Session state
// ---------------------------------------------------------------------------

/**
 * Finite-state machine states for {@link VoiceSession}.
 * Subscribe via the `statechange` event on {@link VoiceSessionEventMap}.
 */
export type VoiceSessionState =
  /** Constructed; call {@link VoiceSession.start}. */
  | 'idle'
  /** Opening message / mic bootstrap in progress. */
  | 'starting'
  /** Assistant audio is playing. */
  | 'assistant_speaking'
  /** Mic open; waiting for or capturing user speech. */
  | 'listening'
  /** User speech detected; ASR active. */
  | 'user_speaking'
  /** ASR final received; LLM/TTS or Audio LLM in flight. */
  | 'processing'
  /** Optional pronunciation / scoring phase. */
  | 'scoring'
  /** Temporarily stopped via {@link VoiceSession.pause}. */
  | 'paused'
  /** Ended via {@link VoiceSession.finish}. */
  | 'finished'
  /** Terminal failure; see the `error` event. */
  | 'error';

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/**
 * Stable application error codes for voice sessions and providers.
 * Prefer these over free-form strings when building {@link NormalizedVoiceError}
 * or {@link createVoiceError}.
 */
export type VoiceErrorCode =
  | 'permission_denied'
  | 'microphone_unavailable'
  | 'network_error'
  | 'asr_connection_failed'
  | 'asr_timeout'
  | 'llm_failed'
  | 'tts_failed'
  | 'audio_playback_failed'
  | 'provider_rate_limited'
  | 'provider_quota_exceeded'
  | 'unsupported_runtime'
  | 'invalid_state'
  | 'aborted'
  | 'unknown';

/**
 * Vendor-neutral error shape used by session events, providers, and {@link VoiceError}.
 * Construct via {@link createVoiceError} when possible so `retryable` defaults apply.
 */
export interface NormalizedVoiceError {
  /** Stable application error code. */
  code: VoiceErrorCode;
  /** Human-readable message suitable for logs (not always UI-safe). */
  message: string;
  /** Provider name when the failure originated in an adapter. */
  provider?: string;
  /** Hint for UI retry; not enforced by the session. */
  retryable?: boolean;
  /** Original thrown value or HTTP body, when available. */
  raw?: unknown;
}

// ---------------------------------------------------------------------------
// Turns & usage
// ---------------------------------------------------------------------------

/** Speaker role for a {@link VoiceTurn} in the transcript. */
export type TurnRole = 'user' | 'assistant' | 'system';

/**
 * One conversation turn recorded by the session / {@link TranscriptBuffer}.
 * Emitted on `turn` / `turn_end` events and available via transcript APIs.
 */
export interface VoiceTurn {
  /** Stable turn id shared with streaming events. */
  id: string;
  /** Who spoke this turn. */
  role: TurnRole;
  /** Final transcript or assistant text for the turn. */
  text: string;
  /** Optional local or remote playback URL when recorded. */
  audioUrl?: string;
  /** Epoch millis when the turn started. */
  startedAt: number;
  /** Epoch millis when the turn ended. */
  endedAt?: number;
  /** Convenience duration (`endedAt - startedAt`) when known. */
  durationMs?: number;
  /** Opaque app metadata attached to the turn. */
  metadata?: Record<string, unknown>;
}

/**
 * Cumulative usage counters for a live {@link VoiceSession}.
 * Emitted periodically / on finish for cost and latency dashboards.
 */
export interface VoiceUsageSnapshot {
  /** Wall time since {@link VoiceSession.start}. */
  sessionDurationMs: number;
  /** Accumulated user speech duration when runtimes report chunk durations. */
  userSpeechMs: number;
  /** Assistant spoken character count (approx). */
  assistantSpeechChars: number;
  /** Audio milliseconds forwarded to ASR. */
  asrAudioMs: number;
  /** Characters sent to TTS. */
  ttsChars: number;
  /** Accumulated LLM prompt tokens when providers report usage. */
  llmInputTokens?: number;
  /** Accumulated LLM completion tokens when providers report usage. */
  llmOutputTokens?: number;
  /** Optional per-provider cost estimates in billable units. */
  providerCosts?: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

/**
 * Strongly typed event payloads for {@link VoiceSession}.
 * Subscribe with `session.on('eventName', handler)`.
 */
export type VoiceSessionEventMap = {
  /** FSM transition with optional reason string. */
  statechange: {
    from: VoiceSessionState;
    to: VoiceSessionState;
    reason?: string;
  };
  /** Provisional ASR caption; upsert by `turnId`. */
  asr_partial: {
    /** Accumulated provisional transcript. */
    text: string;
    turnId: string;
    confidence?: number;
  };
  /** Authoritative user transcript for the turn. */
  asr_final: {
    text: string;
    turnId: string;
    confidence?: number;
    durationMs?: number;
  };
  /** VAD/manual boundary used as the response-latency start point. */
  user_audio_end: {
    turnId: string;
    at: number;
  };
  /** Final assistant text for the turn (may normalize streaming text). */
  assistant_text: {
    text: string;
    turnId: string;
  };
  /** Incremental assistant transcript emitted before `assistant_text`. */
  assistant_text_delta: {
    /** Newly received text fragment. */
    delta: string;
    /** Complete assistant text accumulated for this turn so far. */
    text: string;
    turnId: string;
  };
  /** Assistant audio playback began for this turn. */
  assistant_audio_start: {
    turnId: string;
  };
  /** Assistant audio playback ended (completed or interrupted). */
  assistant_audio_end: {
    turnId: string;
  };
  /** A committed {@link VoiceTurn} was added to history. */
  turn: {
    turn: VoiceTurn;
  };
  /** Latest usage meters. */
  usage: VoiceUsageSnapshot;
  /** Session completed gracefully; turns are the full history. */
  finished: {
    turns: VoiceTurn[];
  };
  /** Normalized failure; see {@link NormalizedVoiceError}. */
  error: NormalizedVoiceError;
};

// ---------------------------------------------------------------------------
// ASR provider
// ---------------------------------------------------------------------------

/**
 * Wire encoding of audio bytes sent to ASR / Audio LLM adapters.
 * Runtimes stamp this on {@link AudioChunk}; providers may narrow further.
 */
export type AudioEncoding = 'pcm_s16le' | 'opus' | 'webm' | 'wav' | 'mp3';

/**
 * Feature flags advertised by an {@link ASRProvider}.
 * Core uses these to choose streaming vs batch capture and whether to expect
 * partials / endpointing.
 */
export interface ASRCapabilities {
  /** True when the provider accepts live chunked audio over a persistent session. */
  streaming: boolean;
  /** True when the provider expects complete turn audio (batch / rolling). */
  batch: boolean;
  /** Whether provisional results are available via {@link ASRSession.onPartial}. */
  partialResults: boolean;
  /** Whether {@link ASRResult.words} may include timing. */
  wordTimestamps?: boolean;
  /** Whether {@link ASRResult.confidence} may be populated. */
  confidence?: boolean;
  /** Whether the provider can emit utterance-end / endpoint signals. */
  endpointing?: boolean;
  /** BCP-47 language tags the provider claims to support (empty = unspecified). */
  languages: string[];
}

/** Options passed to {@link ASRProvider.createSession}. */
export interface ASRSessionOptions {
  /** Preferred recognition language (e.g. `zh-CN`). */
  language?: string;
  /** Input sample rate in Hz when the provider needs it (e.g. PCM streams). */
  sampleRate?: number;
  /** Channel count; typically `1` for voice. */
  channels?: number;
  /** Encoding of audio bytes sent via {@link ASRSession.sendAudio}. */
  encoding?: AudioEncoding;
  /** Request provisional partials when the provider supports them. */
  interimResults?: boolean;
  /** Ask the provider to emit endpointing / utterance-end signals when available. */
  endpointing?: boolean;
  /** Opaque metadata forwarded to the adapter (not interpreted by core). */
  metadata?: Record<string, unknown>;
}

/** Optional word-level timing from an ASR provider. */
export interface ASRWord {
  /** Recognized token / word. */
  text: string;
  /** Word start offset within the utterance, in milliseconds. */
  startMs?: number;
  /** Word end offset within the utterance, in milliseconds. */
  endMs?: number;
  /** Provider confidence in `[0, 1]` when available. */
  confidence?: number;
}

/** A partial or final transcript emitted by an ASR session. */
export interface ASRResult {
  /** Transcript text (accumulated for the current utterance). */
  text: string;
  /** Provider confidence in `[0, 1]` when available. */
  confidence?: number;
  /** Utterance start offset in milliseconds. */
  startMs?: number;
  /** Utterance end offset in milliseconds. */
  endMs?: number;
  /** Optional word timestamps. */
  words?: ASRWord[];
  /** Raw provider payload for debugging. */
  raw?: unknown;
}

/**
 * Live recognition session returned by {@link ASRProvider.createSession}.
 * Core feeds audio via {@link ASRSession.sendAudio} and upserts UI from
 * {@link ASRSession.onPartial} / {@link ASRSession.onFinal}.
 */
export interface ASRSession {
  /**
   * Push the next audio fragment to the provider.
   *
   * @param chunk - Encoded or PCM bytes matching the session encoding.
   */
  sendAudio(chunk: ArrayBuffer): void | Promise<void>;
  /** Drop buffered non-user audio while keeping the session connected. */
  resetAudio?(): void | Promise<void>;
  /**
   * Pause or resume provisional transcript work without affecting the final
   * transcript. Batch-backed providers can use this to avoid paid rolling
   * requests until voice activity confirms that the user is speaking.
   *
   * @param enabled - When `false`, skip rolling / interim work until re-enabled.
   */
  setInterimResultsEnabled?(enabled: boolean): void | Promise<void>;
  /** Signal end-of-audio and wait for a final transcript when applicable. */
  stop(): Promise<void>;
  /** Tear down the underlying connection / resources. */
  close(): Promise<void>;
  /**
   * Subscribe to provisional transcripts.
   *
   * @param cb - Invoked on each partial; return value unsubscribes.
   */
  onPartial(cb: (result: ASRResult) => void): () => void;
  /**
   * Subscribe to authoritative finals for the current utterance.
   *
   * @param cb - Invoked once per finalized segment; return value unsubscribes.
   */
  onFinal(cb: (result: ASRResult) => void): () => void;
  /**
   * Subscribe to provider failures.
   *
   * @param cb - Receives a {@link NormalizedVoiceError}; return value unsubscribes.
   */
  onError(cb: (error: NormalizedVoiceError) => void): () => void;
}

/**
 * Speech-to-text adapter. Implement this to plug a vendor ASR or a mock.
 * Declare {@link ASRCapabilities.streaming} accurately so core chooses live
 * chunks vs complete-turn audio.
 */
export interface ASRProvider {
  /** Stable provider id used in errors and usage (e.g. `deepgram`). */
  name: string;
  /** Declared feature flags used by the session when routing audio. */
  capabilities: ASRCapabilities;
  /**
   * Open a recognition session.
   *
   * @param options - Language / encoding hints for this turn or call.
   */
  createSession(options: ASRSessionOptions): Promise<ASRSession>;
}

// ---------------------------------------------------------------------------
// LLM provider
// ---------------------------------------------------------------------------

/** One chat message forwarded to an {@link LLMProvider}. */
export interface LLMMessage {
  /** Message role in the conversation. */
  role: 'system' | 'user' | 'assistant';
  /** Plain text content. */
  content: string;
}

/** Optional token usage reported by an LLM or Audio LLM provider. */
export interface LLMUsage {
  /** Prompt / input tokens when the provider reports them. */
  inputTokens?: number;
  /** Completion / output tokens when the provider reports them. */
  outputTokens?: number;
  /** Total tokens when the provider reports a combined figure. */
  totalTokens?: number;
}

/** Input for {@link LLMProvider.generate} / {@link LLMProvider.stream}. */
export interface LLMGenerateInput {
  /** Optional system instruction for this request. */
  system?: string;
  /** Chronological chat history for the model. */
  messages: LLMMessage[];
  /** Sampling temperature; provider default when omitted. */
  temperature?: number;
  /** Soft cap on completion tokens. */
  maxTokens?: number;
  /** Prefer plain text or structured JSON when the model supports it. */
  responseFormat?: 'text' | 'json';
  /** Opaque metadata forwarded to the adapter. */
  metadata?: Record<string, unknown>;
  /** Cancels an in-flight provider request when this turn is superseded. */
  signal?: AbortSignal;
}

/** Non-streaming completion from {@link LLMProvider.generate}. */
export interface LLMGenerateOutput {
  /** Assistant reply text. */
  text: string;
  /** Parsed JSON when `responseFormat` was `json`. */
  json?: unknown;
  /** Token usage when reported. */
  usage?: LLMUsage;
  /** Raw provider payload for debugging. */
  raw?: unknown;
}

/** One chunk from {@link LLMProvider.stream}. */
export interface LLMStreamChunk {
  /** Chunk kind: text fragment, usage update, completion, or error. */
  type: 'text_delta' | 'usage' | 'done' | 'error';
  /** New text for `text_delta`. */
  text?: string;
  /** Usage snapshot for `usage` / `done`. */
  usage?: LLMUsage;
  /** Normalized failure for `error`. */
  error?: NormalizedVoiceError;
}

/**
 * Text LLM used by the classic `asr_llm_tts` pipeline.
 * Prefer implementing {@link LLMProvider.stream} so the UI can show incremental text.
 */
export interface LLMProvider {
  /** Stable provider id used in errors and usage. */
  name: string;
  /**
   * Produce a complete reply for the current turn.
   *
   * @param input - System prompt, history, and generation knobs.
   */
  generate(input: LLMGenerateInput): Promise<LLMGenerateOutput>;
  /**
   * Optional token stream used when available (lower time-to-first-text).
   *
   * @param input - Same shape as {@link LLMProvider.generate}.
   */
  stream?(input: LLMGenerateInput): AsyncIterable<LLMStreamChunk>;
}

// ---------------------------------------------------------------------------
// Native audio LLM provider
// ---------------------------------------------------------------------------

/**
 * Container / codec accepted by {@link AudioLLMGenerateInput.format}.
 * WebM/Opus often need a runtime `prepareAudio` step before OpenAI-style APIs.
 */
export type AudioLLMInputFormat = 'webm' | 'wav' | 'mp3' | 'opus';

/** Streaming PCM fragment from an {@link AudioLLMProvider}. */
export interface AudioLLMAudioChunk {
  /** Raw interleaved PCM bytes for immediate playback. */
  data: ArrayBuffer;
  /** Always linear 16-bit PCM for runtime players. */
  encoding: 'pcm_s16le';
  /** Sample rate of `data` in Hz. */
  sampleRate: number;
  /** Channel count of `data`. */
  channels: number;
}

/** Input for {@link AudioLLMProvider.generate}. */
export interface AudioLLMGenerateInput {
  /** Complete audio for the current VAD-delimited user turn. */
  audio: ArrayBuffer;
  /** Container / codec of `audio`. */
  format: AudioLLMInputFormat;
  /** Text history from completed earlier turns. */
  messages: LLMMessage[];
  /** Optional system instruction for this request. */
  system?: string;
  /** Sampling temperature; provider default when omitted. */
  temperature?: number;
  /** Soft cap on output tokens (often shared by audio + transcript). */
  maxTokens?: number;
  /** Opaque metadata forwarded to the adapter. */
  metadata?: Record<string, unknown>;
  /** Cancels an in-flight provider request when this turn is superseded. */
  signal?: AbortSignal;
  /** Receives decoded output audio while the model response is still streaming. */
  onAudioChunk?: (chunk: AudioLLMAudioChunk) => void | Promise<void>;
  /** Receives the model's spoken transcript while output audio is streaming. */
  onTranscriptDelta?: (text: string) => void | Promise<void>;
}

/** Completed reply from {@link AudioLLMProvider.generate}. */
export interface AudioLLMGenerateOutput {
  /** Transcript of the generated assistant audio. */
  text: string;
  /** Full assistant audio buffer (may be empty if only streamed via callbacks). */
  audioBuffer: ArrayBuffer;
  /** MIME type of `audioBuffer`. */
  mimeType: string;
  /** Token usage when reported. */
  usage?: LLMUsage;
  /** Provider timing/cost metadata, when available. */
  raw?: unknown;
}

/**
 * A single model that consumes user audio and directly generates speech
 * (used when {@link VoiceSessionConfig.pipeline} is `audio_llm`).
 */
export interface AudioLLMProvider {
  /** Stable provider id used in errors and usage. */
  name: string;
  /**
   * Run one audio-in / audio-out turn.
   *
   * @param input - Completed user audio plus history and stream callbacks.
   */
  generate(input: AudioLLMGenerateInput): Promise<AudioLLMGenerateOutput>;
}

// ---------------------------------------------------------------------------
// TTS provider
// ---------------------------------------------------------------------------

/**
 * Output audio container requested from a {@link TTSProvider}.
 * Passed via {@link TTSInput.format} and listed in {@link TTSCapabilities.formats}.
 */
export type TTSFormat = 'mp3' | 'wav' | 'ogg' | 'opus' | 'pcm';

/** A synthesizable voice advertised by a {@link TTSProvider}. */
export interface TTSVoice {
  /** Stable voice id passed to {@link TTSInput.voice}. */
  id: string;
  /** Human-readable display name for UI pickers. */
  name: string;
  /** Primary BCP-47 language for this voice. */
  language: string;
  /** Optional gender metadata for filtering. */
  gender?: 'male' | 'female' | 'neutral';
  /** Optional style tags (e.g. `cheerful`, `news`). */
  style?: string[];
}

/** Declared voices / formats for a {@link TTSProvider}. */
export interface TTSCapabilities {
  /** Whether the provider can stream partial audio (future use). */
  streaming: boolean;
  /** Voices advertised by the adapter. */
  voices: TTSVoice[];
  /** Output formats the adapter can produce. */
  formats: TTSFormat[];
  /** BCP-47 language tags supported for synthesis. */
  languages: string[];
}

/** Input for {@link TTSProvider.synthesize}. */
export interface TTSInput {
  /** Text to speak. */
  text: string;
  /** Provider voice id / name. */
  voice?: string;
  /** Preferred language for multilingual voices. */
  language?: string;
  /** Speaking rate multiplier (provider-specific scale). */
  speed?: number;
  /** Pitch adjustment (provider-specific scale). */
  pitch?: number;
  /** Preferred output container / codec. */
  format?: TTSFormat;
  /** Optional cache key for adapters that memoize synthesis. */
  cacheKey?: string;
  /** Opaque metadata forwarded to the adapter. */
  metadata?: Record<string, unknown>;
}

/** Audio returned by {@link TTSProvider.synthesize}. */
export interface TTSOutput {
  /** Remote or blob URL for playback when buffering is inconvenient. */
  audioUrl?: string;
  /** In-memory audio bytes (preferred for local playback). */
  audioBuffer?: ArrayBuffer;
  /** MIME type of `audioUrl` / `audioBuffer`. */
  mimeType: string;
  /** Estimated duration when known. */
  durationMs?: number;
  /** True when served from an adapter cache. */
  cached?: boolean;
  /** Raw provider payload for debugging. */
  raw?: unknown;
}

/**
 * Text-to-speech adapter for the classic `asr_llm_tts` pipeline.
 * Required when {@link VoiceSessionConfig.pipeline} is `asr_llm_tts`.
 */
export interface TTSProvider {
  /** Stable provider id used in errors and usage. */
  name: string;
  /** Declared voices and formats. */
  capabilities: TTSCapabilities;
  /**
   * Synthesize speech for the given text.
   *
   * @param input - Text plus optional voice / format hints.
   */
  synthesize(input: TTSInput): Promise<TTSOutput>;
}

// ---------------------------------------------------------------------------
// Pronunciation provider
// ---------------------------------------------------------------------------

/** Input for optional pronunciation / speaking assessment providers. */
export interface PronunciationInput {
  /** Raw audio bytes or a remote URL the provider can fetch. */
  audio?: ArrayBuffer | string;
  /** Recognized or user-submitted spoken text. */
  transcript: string;
  /** Expected reference sentence when scoring against a prompt. */
  referenceText?: string;
  /** BCP-47 language for scoring models. */
  language?: string;
  /** Spoken duration in milliseconds when known. */
  durationMs?: number;
  /** Optional word timings from ASR to align scoring. */
  words?: ASRWord[];
  /** Opaque adapter metadata. */
  metadata?: Record<string, unknown>;
}

/** Normalized scores from a {@link PronunciationProvider}. */
export interface PronunciationResult {
  /** Overall 0–100 (or provider scale) score when available. */
  overall?: number;
  /** Pronunciation accuracy component. */
  accuracy?: number;
  /** Fluency / pacing component. */
  fluency?: number;
  /** Completeness vs reference text. */
  completeness?: number;
  /** Prosody / intonation component. */
  prosody?: number;
  /** Per-word diagnostics when the provider returns them. */
  words?: Array<{
    /** Word / syllable text. */
    text: string;
    /** Per-word score. */
    score?: number;
    /** Provider-specific error category (e.g. substitution). */
    errorType?: string;
  }>;
  /** Original upstream payload for debugging. */
  raw?: unknown;
}

/** Optional adapter for scoring user pronunciation after a turn. */
export interface PronunciationProvider {
  /** Stable provider id used in errors and usage. */
  name: string;
  /**
   * Score a spoken utterance.
   *
   * @param input - Audio and/or transcript to assess.
   * @returns Normalized {@link PronunciationResult}.
   */
  assess(input: PronunciationInput): Promise<PronunciationResult>;
}

// ---------------------------------------------------------------------------
// Runtime adapter
// ---------------------------------------------------------------------------

/**
 * Capture hints passed to {@link AudioInputAdapter.start}.
 * Runtimes may ignore unsupported fields (e.g. browser MediaRecorder encodings).
 */
export interface AudioInputOptions {
  /** Target sample rate in Hz (e.g. `16000` for PCM runtimes). */
  sampleRate?: number;
  /** Channel count; typically `1` for voice. */
  channels?: number;
  /** Encoded chunk format when the runtime can choose. */
  encoding?: 'pcm_s16le' | 'opus' | 'webm';
  /** Preferred encoded chunk duration in milliseconds. */
  chunkMs?: number;
  /** Request hardware / browser echo cancellation when available. */
  echoCancellation?: boolean;
  /** Request noise suppression when available. */
  noiseSuppression?: boolean;
  /** Request auto gain control when available. */
  autoGainControl?: boolean;
}

/** Encoded or PCM audio fragment from {@link AudioInputAdapter}. */
export interface AudioChunk {
  /** Audio bytes (container or raw PCM depending on `encoding`). */
  data: ArrayBuffer;
  /** Capture time in epoch millis. */
  timestamp: number;
  /** Approximate duration of this fragment. */
  durationMs?: number;
  /** Sample rate in Hz when known (PCM). */
  sampleRate?: number;
  /** Channel count when known. */
  channels?: number;
  /** Codec / container label (e.g. `webm`, `pcm_s16le`). */
  encoding?: string;
  /**
   * `stream` is a low-latency fragment for streaming ASR; `turn` is the
   * complete VAD-delimited recording for batch ASR and audio-LLM input.
   * Omitted keeps the legacy behavior and makes the chunk available to both.
   */
  delivery?: 'stream' | 'turn';
}

/** Platform microphone capture injected via {@link RuntimeAdapter}. */
export interface AudioInputAdapter {
  /** Prompt for mic permission; `false` should surface as a session error. */
  requestPermission(): Promise<boolean>;
  /**
   * Begin capture.
   *
   * @param options - Preferred rate / encoding hints the runtime may honor.
   */
  start(options: AudioInputOptions): Promise<void>;
  /** Stop capture and release resources tied to the current start. */
  stop(): Promise<void>;
  /**
   * Suspend encoded chunk delivery while leaving volume/VAD monitoring active.
   * A runtime may retain a bounded barge-in pre-roll internally.
   */
  suspendCapture?(): Promise<void>;
  /**
   * Resume encoded chunk capture after {@link suspendCapture}. Runtimes with a
   * barge-in pre-roll buffer may include it when `includePreRoll` is true.
   *
   * @param options.includePreRoll - Flush retained pre-roll into the next chunks.
   */
  resumeCapture?(options?: { includePreRoll?: boolean }): Promise<void>;
  /** Pause capture without tearing down permission / hardware (optional). */
  pause?(): Promise<void>;
  /** Resume after {@link pause}. */
  resume?(): Promise<void>;
  /**
   * Subscribe to encoded / PCM chunks.
   *
   * @returns Unsubscribe function.
   */
  onChunk(cb: (chunk: AudioChunk) => void): () => void;
  /**
   * Subscribe to normalized volume levels in `0..1` for VAD.
   *
   * @returns Unsubscribe function.
   */
  onVolume?(cb: (level: number) => void): () => void;
  /**
   * Subscribe to capture failures.
   *
   * @returns Unsubscribe function.
   */
  onError(cb: (error: NormalizedVoiceError) => void): () => void;
}

/** Input for one-shot {@link AudioOutputAdapter.play}. */
export interface AudioPlaybackInput {
  /** Remote or blob URL to fetch and play. */
  audioUrl?: string;
  /** In-memory audio bytes (takes precedence when both are set, if supported). */
  audioBuffer?: ArrayBuffer;
  /** MIME type of the audio payload. */
  mimeType?: string;
  /** Playback gain in `[0, 1]`. */
  volume?: number;
}

/** Options for {@link AudioOutputAdapter.startPcmStream}. */
export interface PcmAudioStreamOptions {
  /** Always linear 16-bit PCM for incremental streams. */
  encoding: 'pcm_s16le';
  /** Sample rate of subsequent `write` payloads in Hz. */
  sampleRate: number;
  /** Channel count of subsequent `write` payloads. */
  channels: number;
  /** Playback gain in `[0, 1]`. */
  volume?: number;
}

/**
 * Incremental PCM writer returned by {@link AudioOutputAdapter.startPcmStream}.
 * Call {@link AudioOutputStream.write} for each contiguous block, then
 * {@link AudioOutputStream.close} when the utterance ends.
 */
export interface AudioOutputStream {
  /**
   * Queue another contiguous PCM block for playback.
   *
   * @param data - Interleaved PCM matching the stream's encoding / rate.
   */
  write(data: ArrayBuffer): Promise<void>;
  /** Signal end-of-stream and resolve after all queued audio has played. */
  close(): Promise<void>;
}

/**
 * Platform speaker / playback side injected via {@link RuntimeAdapter.audioOutput}.
 * Supports one-shot {@link AudioOutputAdapter.play} and optional gapless
 * {@link AudioOutputAdapter.startPcmStream} for streaming TTS / audio LLMs.
 */
export interface AudioOutputAdapter {
  /** Prime browser autoplay permission from a direct user gesture. */
  unlock?(): Promise<void>;
  /**
   * Play a complete encoded buffer or URL.
   *
   * @param input - URL and/or in-memory bytes plus optional MIME / volume.
   */
  play(input: AudioPlaybackInput): Promise<void>;
  /**
   * Begin incremental raw-PCM playback for low-latency speech streaming.
   *
   * @param options - Encoding, sample rate, and channel layout for subsequent writes.
   * @returns An {@link AudioOutputStream} that must be `close()`d.
   */
  startPcmStream?(options: PcmAudioStreamOptions): Promise<AudioOutputStream>;
  /** Stop current playback and cancel any open PCM stream. */
  stop(): Promise<void>;
  /** Pause playback without discarding the current utterance (optional). */
  pause?(): Promise<void>;
  /** Resume after {@link AudioOutputAdapter.pause}. */
  resume?(): Promise<void>;
  /**
   * Subscribe to normalized RMS of the assistant audio currently being played
   * (used as an acoustic echo reference for barge-in).
   *
   * @returns Unsubscribe function.
   */
  onVolume?(cb: (level: number, at?: number) => void): () => void;
  /**
   * Subscribe to playback start.
   *
   * @returns Unsubscribe function.
   */
  onStart(cb: () => void): () => void;
  /**
   * Subscribe to playback end (natural finish or stop).
   *
   * @returns Unsubscribe function.
   */
  onEnd(cb: () => void): () => void;
  /**
   * Subscribe to playback failures.
   *
   * @returns Unsubscribe function.
   */
  onError(cb: (error: NormalizedVoiceError) => void): () => void;
}

/**
 * Minimal WebSocket surface returned by {@link NetworkAdapter.createWebSocket}.
 * Keeps providers free of DOM/`ws` type coupling; subscribe via the `on*` helpers.
 */
export interface RuntimeWebSocket {
  /**
   * Send a text or binary frame.
   *
   * @param data - UTF-8 text or binary payload.
   */
  send(data: string | ArrayBuffer): void;
  /**
   * Close the socket.
   *
   * @param code - Optional WebSocket close code.
   * @param reason - Optional human-readable reason.
   */
  close(code?: number, reason?: string): void;
  /**
   * Subscribe to the open event.
   *
   * @returns Unsubscribe function.
   */
  onOpen(cb: () => void): () => void;
  /**
   * Subscribe to inbound frames.
   *
   * @returns Unsubscribe function.
   */
  onMessage(cb: (data: string | ArrayBuffer) => void): () => void;
  /**
   * Subscribe to socket-level errors.
   *
   * @returns Unsubscribe function.
   */
  onError(cb: (error: unknown) => void): () => void;
  /**
   * Subscribe to close.
   *
   * @returns Unsubscribe function.
   */
  onClose(cb: () => void): () => void;
}

/** Platform HTTP / WebSocket hooks used by providers that need them. */
export interface NetworkAdapter {
  /**
   * Fetch implementation (browser `fetch`, undici, etc.).
   *
   * @param input - Request URL or `RequestInfo`.
   * @param init - Optional fetch init.
   */
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
  /**
   * Open a WebSocket for streaming providers.
   *
   * @param url - WebSocket URL.
   * @param protocols - Optional subprotocol(s).
   */
  createWebSocket(url: string, protocols?: string | string[]): RuntimeWebSocket;
}

/** Optional key/value store for adapter caches (not required by core). */
export interface RuntimeStorageAdapter {
  /**
   * @param key - Storage key.
   * @returns Stored string or `null` when missing.
   */
  get(key: string): Promise<string | null>;
  /**
   * @param key - Storage key.
   * @param value - Value to persist.
   */
  set(key: string, value: string): Promise<void>;
  /**
   * @param key - Storage key to delete.
   */
  remove(key: string): Promise<void>;
}

/** Optional structured logger injected via {@link RuntimeAdapter.logger}. */
export interface LoggerAdapter {
  /** Verbose diagnostics (disabled in production by default). */
  debug(...args: unknown[]): void;
  /** Informational lifecycle messages. */
  info(...args: unknown[]): void;
  /** Recoverable anomalies. */
  warn(...args: unknown[]): void;
  /** Failures that typically surface as session errors. */
  error(...args: unknown[]): void;
}

/**
 * Platform boundary: microphone + playback (+ optional network/storage/logger).
 * Created by `@ottervoice/runtime-web`, `runtime-react-native`, `runtime-node`,
 * or {@link createMockRuntime}.
 */
export interface RuntimeAdapter {
  /** Microphone / capture side. */
  audioInput: AudioInputAdapter;
  /** Speaker / playback side. */
  audioOutput: AudioOutputAdapter;
  /** Optional HTTP/WebSocket hooks for providers. */
  network?: NetworkAdapter;
  /** Optional persistence for caches. */
  storage?: RuntimeStorageAdapter;
  /** Optional logger; core uses it sparingly. */
  logger?: LoggerAdapter;
}

// ---------------------------------------------------------------------------
// Agent plugin
// ---------------------------------------------------------------------------

/**
 * Arguments passed to {@link VoiceAgentPlugin.generateNextAssistantMessage}.
 * Contains the full turn history plus the latest user utterance for convenience.
 */
export interface AgentTurnInput {
  /** Completed turns in chronological order (includes the latest user turn). */
  turns: VoiceTurn[];
  /** Text of the most recent user turn. */
  lastUserText: string;
}

/**
 * Arguments passed to {@link VoiceAgentPlugin.shouldFinishSession} and
 * {@link VoiceAgentPlugin.generateReport}.
 */
export interface AgentSessionInput {
  /** Completed turns in chronological order. */
  turns: VoiceTurn[];
}

/**
 * Optional higher-level dialog controller (opening line, next line, finish rule).
 * When set, the session may call these instead of / in addition to a raw LLM.
 */
export interface VoiceAgentPlugin {
  /** Spoken (or displayed) opening line after {@link VoiceSession.start}. */
  getInitialAssistantMessage(): Promise<string>;
  /**
   * Produce the next assistant line after a completed user turn.
   *
   * @param input - Full history plus the latest user text.
   */
  generateNextAssistantMessage(input: AgentTurnInput): Promise<string>;
  /**
   * Return `true` to end the session after the latest turn.
   *
   * @param input - Full turn history.
   */
  shouldFinishSession(input: AgentSessionInput): boolean;
  /**
   * Optional end-of-session artifact (scores, summary, etc.).
   *
   * @param input - Full turn history.
   */
  generateReport?(input: AgentSessionInput): Promise<unknown>;
}

// ---------------------------------------------------------------------------
// Turn detection
// ---------------------------------------------------------------------------

/**
 * How end-of-utterance is decided while listening:
 * - `volume` — local RMS VAD ({@link TurnDetectionConfig.volumeThreshold})
 * - `asr_endpointing` — trust provider utterance-end signals
 * - `manual` — caller drives {@link VoiceSession.endUserTurn}
 * - `hybrid` — combine volume silence with ASR endpointing when available
 */
export type TurnDetectionStrategy =
  | 'volume'
  | 'asr_endpointing'
  | 'manual'
  | 'hybrid';

/**
 * Voice-activity and endpointing knobs while listening for the user.
 * Passed via {@link VoiceSessionConfig.turnDetection}; pair with
 * {@link VoiceSessionConfig.interruptionDetection} for barge-in thresholds.
 */
export interface TurnDetectionConfig {
  /** How end-of-utterance is decided. */
  strategy: TurnDetectionStrategy;
  /** Minimum voiced time before speech is considered started. */
  minSpeechMs?: number;
  /** Quiet time after speech before the turn is closed. */
  silenceTimeoutMs?: number;
  /** Hard cap on a single user turn length. */
  maxTurnMs?: number;
  /** RMS threshold when using volume-based strategies (≈0–1). */
  volumeThreshold?: number;
}

// ---------------------------------------------------------------------------
// Session config
// ---------------------------------------------------------------------------

/**
 * Conversation duplex mode:
 * - `half_duplex` — listen only after assistant playback finishes
 * - `full_duplex` — keep listening (and allow barge-in) while speaking
 * - `push_to_talk` — caller drives {@link VoiceSession.endUserTurn}
 * - `streaming_transcript` — captions without the full reply loop
 */
export type VoiceSessionMode =
  | 'half_duplex'
  | 'full_duplex'
  | 'push_to_talk'
  | 'streaming_transcript';

/** Session-level timers and barge-in recovery knobs. */
export interface VoiceSessionPolicy {
  /** Quiet time that ends a listening turn when no other detector wins. */
  silenceTimeoutMs?: number;
  /** Hard cap on one user turn. */
  maxTurnDurationMs?: number;
  /** Force-finish the session after this wall-clock duration. */
  maxSessionDurationMs?: number;
  /** After `start()`, automatically enter listening. Defaults to true. */
  autoStartListening?: boolean;
  /** Allow barge-in while the assistant is speaking. */
  allowInterruption?: boolean;
  /** Silence after a tentative pause before playback is resumed as a false interruption. */
  falseInterruptionSilenceMs?: number;
  /** Maximum time to keep playback tentatively paused without confirming speech. */
  falseInterruptionTimeoutMs?: number;
  /** Ignore microphone energy right after a tentative pause while speaker echo decays. Defaults to 200 ms. */
  interruptionTailIgnoreMs?: number;
  /** Ignore new barge-in candidates shortly after resuming a false interruption. */
  interruptionCooldownMs?: number;
  /** Maximum time to wait for a quiet microphone baseline after assistant playback. Defaults to 300 ms. */
  postPlaybackVadRearmMs?: number;
}

/**
 * Top-level configuration for {@link createVoiceSession} / {@link VoiceSession}.
 * Create at the application composition root; keep provider credentials out of UI code.
 */
export interface VoiceSessionConfig {
  /**
   * Duplex / PTT mode. See {@link VoiceSessionMode}.
   */
  mode: VoiceSessionMode;
  /** Defaults to the classic ASR -> LLM -> TTS cascade. */
  pipeline?: 'asr_llm_tts' | 'audio_llm';
  /**
   * Emit provisional `asr_partial` results. Defaults to true. Disabling this
   * does not affect the authoritative `asr_final` transcript.
   */
  asrPartial?: boolean;
  /** Optional system instruction forwarded to a native audio LLM. */
  audioLlmSystemPrompt?: string;
  /**
   * Cap native audio LLM output tokens (audio + transcript share this budget).
   * Omit to use the model's default maximum — required for long-form speech.
   */
  audioLlmMaxTokens?: number;
  /** Preferred ASR language; omit to let compatible providers auto-detect. */
  language?: string;
  /** Platform audio (and optional network/storage/logger) adapter. */
  runtime: RuntimeAdapter;
  providers: {
    /** Speech-to-text provider (required for live captions / classic pipeline). */
    asr: ASRProvider;
    /** Text LLM used by `asr_llm_tts` (and optional agents). */
    llm: LLMProvider;
    /** Text-to-speech; required when `pipeline` is `asr_llm_tts`. */
    tts?: TTSProvider;
    /** Required when `pipeline` is `audio_llm`; ASR partials provide captions and final confirms the turn before generation. */
    audioLlm?: AudioLLMProvider;
    /** Optional pronunciation scoring after a user turn. */
    pronunciation?: PronunciationProvider;
  };
  /** Optional higher-level dialog plugin (opening line, next line, finish rule). */
  agent?: VoiceAgentPlugin;
  /** VAD / endpointing while listening for the user. */
  turnDetection?: TurnDetectionConfig;
  /**
   * Stricter VAD used only while assistant audio is playing. Keeping this
   * separate prevents taps and playback echo from triggering barge-in without
   * making normal listening less sensitive.
   */
  interruptionDetection?: Partial<Omit<TurnDetectionConfig, 'strategy'>>;
  /** Session-level timers and barge-in recovery knobs. */
  policy?: VoiceSessionPolicy;
  /** Override id generation (useful for deterministic tests). */
  generateId?: () => string;
  /** Override the clock (useful for deterministic tests). */
  now?: () => number;
  /** Opaque app metadata (not interpreted by core). */
  metadata?: Record<string, unknown>;
}
