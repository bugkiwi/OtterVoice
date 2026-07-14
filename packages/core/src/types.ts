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

export type VoiceSessionState =
  | 'idle'
  | 'starting'
  | 'assistant_speaking'
  | 'listening'
  | 'user_speaking'
  | 'processing'
  | 'scoring'
  | 'paused'
  | 'finished'
  | 'error';

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

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

export interface NormalizedVoiceError {
  code: VoiceErrorCode;
  message: string;
  provider?: string;
  retryable?: boolean;
  raw?: unknown;
}

// ---------------------------------------------------------------------------
// Turns & usage
// ---------------------------------------------------------------------------

export type TurnRole = 'user' | 'assistant' | 'system';

export interface VoiceTurn {
  id: string;
  role: TurnRole;
  text: string;
  audioUrl?: string;
  startedAt: number;
  endedAt?: number;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

export interface VoiceUsageSnapshot {
  sessionDurationMs: number;
  userSpeechMs: number;
  assistantSpeechChars: number;
  asrAudioMs: number;
  ttsChars: number;
  llmInputTokens?: number;
  llmOutputTokens?: number;
  providerCosts?: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export type VoiceSessionEventMap = {
  statechange: {
    from: VoiceSessionState;
    to: VoiceSessionState;
    reason?: string;
  };
  asr_partial: {
    text: string;
    turnId: string;
    confidence?: number;
  };
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
  assistant_audio_start: {
    turnId: string;
  };
  assistant_audio_end: {
    turnId: string;
  };
  turn: {
    turn: VoiceTurn;
  };
  usage: VoiceUsageSnapshot;
  finished: {
    turns: VoiceTurn[];
  };
  error: NormalizedVoiceError;
};

// ---------------------------------------------------------------------------
// ASR provider
// ---------------------------------------------------------------------------

export type AudioEncoding = 'pcm_s16le' | 'opus' | 'webm' | 'wav' | 'mp3';

export interface ASRCapabilities {
  streaming: boolean;
  batch: boolean;
  partialResults: boolean;
  wordTimestamps?: boolean;
  confidence?: boolean;
  endpointing?: boolean;
  languages: string[];
}

export interface ASRSessionOptions {
  language?: string;
  sampleRate?: number;
  channels?: number;
  encoding?: AudioEncoding;
  interimResults?: boolean;
  endpointing?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ASRWord {
  text: string;
  startMs?: number;
  endMs?: number;
  confidence?: number;
}

export interface ASRResult {
  text: string;
  confidence?: number;
  startMs?: number;
  endMs?: number;
  words?: ASRWord[];
  raw?: unknown;
}

export interface ASRSession {
  sendAudio(chunk: ArrayBuffer): void | Promise<void>;
  /** Drop buffered non-user audio while keeping the session connected. */
  resetAudio?(): void | Promise<void>;
  stop(): Promise<void>;
  close(): Promise<void>;
  onPartial(cb: (result: ASRResult) => void): () => void;
  onFinal(cb: (result: ASRResult) => void): () => void;
  onError(cb: (error: NormalizedVoiceError) => void): () => void;
}

export interface ASRProvider {
  name: string;
  capabilities: ASRCapabilities;
  createSession(options: ASRSessionOptions): Promise<ASRSession>;
}

// ---------------------------------------------------------------------------
// LLM provider
// ---------------------------------------------------------------------------

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface LLMGenerateInput {
  system?: string;
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
  metadata?: Record<string, unknown>;
}

export interface LLMGenerateOutput {
  text: string;
  json?: unknown;
  usage?: LLMUsage;
  raw?: unknown;
}

export interface LLMStreamChunk {
  type: 'text_delta' | 'usage' | 'done' | 'error';
  text?: string;
  usage?: LLMUsage;
  error?: NormalizedVoiceError;
}

export interface LLMProvider {
  name: string;
  generate(input: LLMGenerateInput): Promise<LLMGenerateOutput>;
  stream?(input: LLMGenerateInput): AsyncIterable<LLMStreamChunk>;
}

// ---------------------------------------------------------------------------
// Native audio LLM provider
// ---------------------------------------------------------------------------

export type AudioLLMInputFormat = 'webm' | 'wav' | 'mp3' | 'opus';

export interface AudioLLMAudioChunk {
  /** Raw interleaved PCM bytes for immediate playback. */
  data: ArrayBuffer;
  encoding: 'pcm_s16le';
  sampleRate: number;
  channels: number;
}

export interface AudioLLMGenerateInput {
  /** Complete audio for the current VAD-delimited user turn. */
  audio: ArrayBuffer;
  format: AudioLLMInputFormat;
  /** Text history from completed earlier turns. */
  messages: LLMMessage[];
  system?: string;
  temperature?: number;
  maxTokens?: number;
  metadata?: Record<string, unknown>;
  /** Receives decoded output audio while the model response is still streaming. */
  onAudioChunk?: (chunk: AudioLLMAudioChunk) => void | Promise<void>;
  /** Receives the model's spoken transcript while output audio is streaming. */
  onTranscriptDelta?: (text: string) => void | Promise<void>;
}

export interface AudioLLMGenerateOutput {
  /** Transcript of the generated assistant audio. */
  text: string;
  audioBuffer: ArrayBuffer;
  mimeType: string;
  usage?: LLMUsage;
  /** Provider timing/cost metadata, when available. */
  raw?: unknown;
}

/** A single model that consumes audio and directly generates speech. */
export interface AudioLLMProvider {
  name: string;
  generate(input: AudioLLMGenerateInput): Promise<AudioLLMGenerateOutput>;
}

// ---------------------------------------------------------------------------
// TTS provider
// ---------------------------------------------------------------------------

export type TTSFormat = 'mp3' | 'wav' | 'ogg' | 'opus' | 'pcm';

export interface TTSVoice {
  id: string;
  name: string;
  language: string;
  gender?: 'male' | 'female' | 'neutral';
  style?: string[];
}

export interface TTSCapabilities {
  streaming: boolean;
  voices: TTSVoice[];
  formats: TTSFormat[];
  languages: string[];
}

export interface TTSInput {
  text: string;
  voice?: string;
  language?: string;
  speed?: number;
  pitch?: number;
  format?: TTSFormat;
  cacheKey?: string;
  metadata?: Record<string, unknown>;
}

export interface TTSOutput {
  audioUrl?: string;
  audioBuffer?: ArrayBuffer;
  mimeType: string;
  durationMs?: number;
  cached?: boolean;
  raw?: unknown;
}

export interface TTSProvider {
  name: string;
  capabilities: TTSCapabilities;
  synthesize(input: TTSInput): Promise<TTSOutput>;
}

// ---------------------------------------------------------------------------
// Pronunciation provider
// ---------------------------------------------------------------------------

export interface PronunciationInput {
  audio?: ArrayBuffer | string;
  transcript: string;
  referenceText?: string;
  language?: string;
  durationMs?: number;
  words?: ASRWord[];
  metadata?: Record<string, unknown>;
}

export interface PronunciationResult {
  overall?: number;
  accuracy?: number;
  fluency?: number;
  completeness?: number;
  prosody?: number;
  words?: Array<{
    text: string;
    score?: number;
    errorType?: string;
  }>;
  raw?: unknown;
}

export interface PronunciationProvider {
  name: string;
  assess(input: PronunciationInput): Promise<PronunciationResult>;
}

// ---------------------------------------------------------------------------
// Runtime adapter
// ---------------------------------------------------------------------------

export interface AudioInputOptions {
  sampleRate?: number;
  channels?: number;
  encoding?: 'pcm_s16le' | 'opus' | 'webm';
  chunkMs?: number;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
}

export interface AudioChunk {
  data: ArrayBuffer;
  timestamp: number;
  durationMs?: number;
  sampleRate?: number;
  channels?: number;
  encoding?: string;
  /**
   * `stream` is a low-latency fragment for streaming ASR; `turn` is the
   * complete VAD-delimited recording for batch ASR and audio-LLM input.
   * Omitted keeps the legacy behavior and makes the chunk available to both.
   */
  delivery?: 'stream' | 'turn';
}

export interface AudioInputAdapter {
  requestPermission(): Promise<boolean>;
  start(options: AudioInputOptions): Promise<void>;
  stop(): Promise<void>;
  /** Pause encoded chunk capture while leaving volume/VAD monitoring active. */
  suspendCapture?(): Promise<void>;
  /** Resume encoded chunk capture after {@link suspendCapture}. */
  resumeCapture?(): Promise<void>;
  pause?(): Promise<void>;
  resume?(): Promise<void>;
  onChunk(cb: (chunk: AudioChunk) => void): () => void;
  onVolume?(cb: (level: number) => void): () => void;
  onError(cb: (error: NormalizedVoiceError) => void): () => void;
}

export interface AudioPlaybackInput {
  audioUrl?: string;
  audioBuffer?: ArrayBuffer;
  mimeType?: string;
  volume?: number;
}

export interface PcmAudioStreamOptions {
  encoding: 'pcm_s16le';
  sampleRate: number;
  channels: number;
  volume?: number;
}

export interface AudioOutputStream {
  /** Queue another contiguous PCM block for playback. */
  write(data: ArrayBuffer): Promise<void>;
  /** Signal end-of-stream and resolve after all queued audio has played. */
  close(): Promise<void>;
}

export interface AudioOutputAdapter {
  /** Prime browser autoplay permission from a direct user gesture. */
  unlock?(): Promise<void>;
  play(input: AudioPlaybackInput): Promise<void>;
  /** Incremental raw-PCM playback for low-latency speech streaming. */
  startPcmStream?(options: PcmAudioStreamOptions): Promise<AudioOutputStream>;
  stop(): Promise<void>;
  pause?(): Promise<void>;
  resume?(): Promise<void>;
  /** Normalized RMS of the assistant audio currently being played. */
  onVolume?(cb: (level: number, at?: number) => void): () => void;
  onStart(cb: () => void): () => void;
  onEnd(cb: () => void): () => void;
  onError(cb: (error: NormalizedVoiceError) => void): () => void;
}

export interface RuntimeWebSocket {
  send(data: string | ArrayBuffer): void;
  close(code?: number, reason?: string): void;
  onOpen(cb: () => void): () => void;
  onMessage(cb: (data: string | ArrayBuffer) => void): () => void;
  onError(cb: (error: unknown) => void): () => void;
  onClose(cb: () => void): () => void;
}

export interface NetworkAdapter {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
  createWebSocket(url: string, protocols?: string | string[]): RuntimeWebSocket;
}

export interface RuntimeStorageAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export interface LoggerAdapter {
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

export interface RuntimeAdapter {
  audioInput: AudioInputAdapter;
  audioOutput: AudioOutputAdapter;
  network?: NetworkAdapter;
  storage?: RuntimeStorageAdapter;
  logger?: LoggerAdapter;
}

// ---------------------------------------------------------------------------
// Agent plugin
// ---------------------------------------------------------------------------

export interface AgentTurnInput {
  turns: VoiceTurn[];
  lastUserText: string;
}

export interface AgentSessionInput {
  turns: VoiceTurn[];
}

export interface VoiceAgentPlugin {
  getInitialAssistantMessage(): Promise<string>;
  generateNextAssistantMessage(input: AgentTurnInput): Promise<string>;
  shouldFinishSession(input: AgentSessionInput): boolean;
  generateReport?(input: AgentSessionInput): Promise<unknown>;
}

// ---------------------------------------------------------------------------
// Turn detection
// ---------------------------------------------------------------------------

export type TurnDetectionStrategy =
  | 'volume'
  | 'asr_endpointing'
  | 'manual'
  | 'hybrid';

export interface TurnDetectionConfig {
  strategy: TurnDetectionStrategy;
  minSpeechMs?: number;
  silenceTimeoutMs?: number;
  maxTurnMs?: number;
  volumeThreshold?: number;
}

// ---------------------------------------------------------------------------
// Session config
// ---------------------------------------------------------------------------

export type VoiceSessionMode =
  | 'half_duplex'
  | 'full_duplex'
  | 'push_to_talk'
  | 'streaming_transcript';

export interface VoiceSessionPolicy {
  silenceTimeoutMs?: number;
  maxTurnDurationMs?: number;
  maxSessionDurationMs?: number;
  autoStartListening?: boolean;
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

export interface VoiceSessionConfig {
  mode: VoiceSessionMode;
  /** Defaults to the classic ASR -> LLM -> TTS cascade. */
  pipeline?: 'asr_llm_tts' | 'audio_llm';
  /** Optional system instruction forwarded to a native audio LLM. */
  audioLlmSystemPrompt?: string;
  /**
   * Cap native audio LLM output tokens (audio + transcript share this budget).
   * Omit to use the model's default maximum — required for long-form speech.
   */
  audioLlmMaxTokens?: number;
  /** Preferred ASR language; omit to let compatible providers auto-detect. */
  language?: string;
  runtime: RuntimeAdapter;
  providers: {
    asr: ASRProvider;
    llm: LLMProvider;
    tts?: TTSProvider;
    /** Required when `pipeline` is `audio_llm`; ASR still runs in parallel for captions. */
    audioLlm?: AudioLLMProvider;
    pronunciation?: PronunciationProvider;
  };
  agent?: VoiceAgentPlugin;
  turnDetection?: TurnDetectionConfig;
  /**
   * Stricter VAD used only while assistant audio is playing. Keeping this
   * separate prevents taps and playback echo from triggering barge-in without
   * making normal listening less sensitive.
   */
  interruptionDetection?: Partial<Omit<TurnDetectionConfig, 'strategy'>>;
  policy?: VoiceSessionPolicy;
  /** Override id generation (useful for deterministic tests). */
  generateId?: () => string;
  /** Override the clock (useful for deterministic tests). */
  now?: () => number;
  metadata?: Record<string, unknown>;
}
