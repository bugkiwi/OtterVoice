import { TypedEmitter } from './emitter.js';
import { normalizeError, VoiceError } from './errors.js';
import { StateMachine } from './state-machine.js';
import { TranscriptBuffer } from './transcript-buffer.js';
import { TurnDetector } from './turn-detector.js';
import { UsageMeter } from './usage-meter.js';
import { BargeInSpeechGate, PlaybackEchoFilter } from './playback-echo-filter.js';
import { createIdGenerator, defaultNow } from './internal/ids.js';
import type {
  AudioLLMAudioChunk,
  AudioLLMInputFormat,
  AudioLLMGenerateOutput,
  AudioLLMOnlyVoiceSessionConfig,
  AudioOutputStream,
  ASRResult,
  ASRSession,
  LLMMessage,
  NormalizedVoiceError,
  VoiceSessionConfig,
  VoiceSessionEventMap,
  VoiceSessionState,
  VoiceTurn,
  VoiceUsageSnapshot,
} from './types.js';

interface StreamingAssistantPlayback {
  output: AudioOutputStream;
  turnId: string;
  generation: number;
}

interface TurnCapture {
  id: string;
  asrSession: ASRSession;
  inputCleanups: Array<() => void>;
  asrCleanups: Array<() => void>;
  audioChunks: ArrayBuffer[];
  audioFormat?: AudioLLMInputFormat;
  recordingFormat?: string;
  audioDurationMs: number;
  asrContainerHeaderForwarded: boolean;
  ended: boolean;
  finalResult?: ASRResult;
  processingScheduled: boolean;
  interruptedAssistant: boolean;
  interimResultsGated: boolean;
  verifiedSpeechText: boolean;
  interruptionVoicedFrames: number;
  generation?: number;
  replyAbort?: AbortController;
  audioReply?: Promise<AudioLLMGenerateOutput>;
  streamingPlayback?: StreamingAssistantPlayback;
  streamingPlaybackDisabled: boolean;
  streamingTranscript: string;
  streamingAssistantTurnId?: string;
  nextCaptureReady?: Promise<void>;
  stopPromise?: Promise<void>;
  cancelled: boolean;
  cancelPromise: Promise<void>;
  cancel(): void;
}

/**
 * Voice conversation session with automatic turn-taking and optional
 * full-duplex barge-in.
 *
 * Drives the loop: assistant speaks → listen → user speaks → ASR → LLM →
 * assistant speaks → … It is platform-agnostic; audio I/O comes from the
 * {@link RuntimeAdapter} and cloud capabilities from the providers, both
 * supplied through {@link VoiceSessionConfig}.
 */
export class VoiceSession {
  private readonly emitter = new TypedEmitter<VoiceSessionEventMap>();
  private readonly machine = new StateMachine('idle');
  private readonly transcript: TranscriptBuffer;
  private readonly usage: UsageMeter;
  private readonly detector: TurnDetector;
  private readonly interruptionDetector: TurnDetector;
  private readonly playbackEchoFilter = new PlaybackEchoFilter();
  private readonly bargeInSpeechGate: BargeInSpeechGate;
  private readonly shortInterruptionGate: BargeInSpeechGate;
  private readonly loudInterruptionGate: BargeInSpeechGate;
  private readonly generateId: () => string;
  private readonly now: () => number;

  private asrSession: ASRSession | undefined;
  private activeCapture: TurnCapture | undefined;
  private activeUserTurnId: string | undefined;
  private userSpeaking = false;
  private assistantPlaybackActive = false;
  /** Incremented to cancel an in-flight {@link speakAssistant}. */
  private speakGeneration = 0;
  /** Incremented to cancel a stale {@link handleUserFinalTranscript}. */
  private turnGeneration = 0;
  private disposed = false;
  private finishing = false;
  private processingChain: Promise<void> = Promise.resolve();
  private readonly pendingCaptures = new Set<TurnCapture>();
  private interruptionTurnActive = false;
  private outputVolumeCleanup: (() => void) | undefined;
  private outputEventCleanups: Array<() => void> = [];
  private tentativeInterruptionStartedAt: number | undefined;
  private tentativeInterruptionSilenceSince: number | undefined;
  private activeAssistantText: string | undefined;
  private interruptionCooldownUntil: number | undefined;
  private postPlaybackVadRearmStartedAt: number | undefined;
  private postPlaybackSilentFrames = 0;
  private inputCaptureSuspended = false;

  constructor(private readonly config: VoiceSessionConfig) {
    this.generateId = config.generateId ?? createIdGenerator('turn');
    this.now = config.now ?? defaultNow;
    this.transcript = new TranscriptBuffer(this.generateId, this.now);
    this.usage = new UsageMeter(this.now);
    this.detector = new TurnDetector(config.turnDetection);
    this.interruptionDetector = new TurnDetector({
      ...config.turnDetection,
      ...config.interruptionDetection,
      strategy: 'volume',
    });
    this.bargeInSpeechGate = new BargeInSpeechGate();
    const loudThreshold = Math.max(
      0.055,
      this.interruptionDetector.options.volumeThreshold * 3,
    );
    // The normal residual gate needs four voiced 50 ms frames. When callers
    // explicitly choose an equally short interruption duration, let a strong
    // foreground signal confirm on that first gate instead of starting a
    // second confirmation window after the word has already ended.
    const shortSpeechFrames = Math.max(
      3,
      Math.ceil(this.interruptionDetector.options.minSpeechMs / 50),
    );
    this.shortInterruptionGate = new BargeInSpeechGate({
      volumeThreshold: loudThreshold,
      windowFrames: Math.max(shortSpeechFrames + 2, 6),
      requiredVoicedFrames: shortSpeechFrames,
    });
    this.loudInterruptionGate = new BargeInSpeechGate({
      volumeThreshold: loudThreshold,
      windowFrames: 6,
      requiredVoicedFrames: 3,
    });
    this.outputVolumeCleanup = config.runtime.audioOutput.onVolume?.((level, at) => {
      this.playbackEchoFilter.pushOutput(level, at ?? this.now());
    });
    this.outputEventCleanups.push(
      config.runtime.audioOutput.onStart(() => this.playbackEchoFilter.start(this.now())),
      config.runtime.audioOutput.onEnd(() => {
        this.clearTentativeInterruption();
        this.playbackEchoFilter.stop();
      }),
    );
  }

  // -- public observation -------------------------------------------------

  /** Current finite-state machine value (see {@link VoiceSessionState}). */
  get state(): VoiceSessionState {
    return this.machine.state;
  }

  /**
   * Subscribe to a session event. Returns an unsubscribe function.
   *
   * @param event - Event name from {@link VoiceSessionEventMap}.
   * @param cb - Handler invoked with the typed payload for that event.
   */
  on<K extends keyof VoiceSessionEventMap>(
    event: K,
    cb: (payload: VoiceSessionEventMap[K]) => void,
  ): () => void {
    return this.emitter.on(event, cb);
  }

  /**
   * Subscribe for a single delivery, then auto-unsubscribe.
   *
   * @param event - Event name from {@link VoiceSessionEventMap}.
   * @param cb - Handler invoked once with the typed payload.
   */
  once<K extends keyof VoiceSessionEventMap>(
    event: K,
    cb: (payload: VoiceSessionEventMap[K]) => void,
  ): () => void {
    return this.emitter.once(event, cb);
  }

  /**
   * Remove a previously registered handler.
   *
   * @param event - Event name from {@link VoiceSessionEventMap}.
   * @param cb - The same function reference passed to {@link VoiceSession.on}.
   */
  off<K extends keyof VoiceSessionEventMap>(
    event: K,
    cb: (payload: VoiceSessionEventMap[K]) => void,
  ): void {
    this.emitter.off(event, cb);
  }

  /** Committed user/assistant turns recorded so far. */
  getTurns(): VoiceTurn[] {
    return this.transcript.all();
  }

  /** Aggregate usage meters for the active (or last) session. */
  getUsage(): VoiceUsageSnapshot {
    return this.usage.snapshot();
  }

  // -- lifecycle ----------------------------------------------------------

  /**
   * Begin the session. Speaks the initial assistant message (from the agent
   * plugin or `initialPrompt`) and then, unless disabled, opens the mic.
   *
   * @param initialPrompt - Optional opening line when no agent plugin supplies one.
   */
  async start(initialPrompt?: string): Promise<void> {
    if (this.state !== 'idle') {
      throw new VoiceError({
        code: 'invalid_state',
        message: `start() can only be called from "idle" (was "${this.state}")`,
        retryable: false,
      });
    }
    this.transition('starting');
    this.usage.startSession();

    try {
      const opener = await this.resolveOpeningMessage(initialPrompt);
      if (opener) await this.speakAssistant(opener);

      // Open the mic automatically unless the caller opts to drive turns
      // manually (autoStartListening: false), e.g. a push-to-talk UI.
      if (
        this.config.policy?.autoStartListening !== false &&
        !this.asrSession
      ) {
        await this.startListening();
      }
    } catch (err) {
      this.fail(err);
    }
  }

  /** Open the microphone and wire ASR for the next user turn. */
  async startListening(): Promise<void> {
    await this.startListeningInternal(false);
  }

  private async startListeningInternal(preserveState: boolean): Promise<void> {
    if (this.disposed || this.state === 'finished' || this.state === 'error') {
      return;
    }
    this.cleanupListening();
    this.activeUserTurnId = this.generateId();
    this.userSpeaking = false;
    this.detector.reset();
    this.interruptionDetector.reset();
    this.playbackEchoFilter.reset();
    this.interruptionTurnActive = false;
    this.bargeInSpeechGate.reset();
    this.shortInterruptionGate.reset();
    this.clearTentativeInterruption();
    this.inputCaptureSuspended = false;

    // Create and fully wire the ASR + audio listeners *before* announcing the
    // `listening` state, so a chunk that arrives the instant we are listening
    // cannot race ahead of the wiring.
    let session: ASRSession;
    try {
      session = await this.config.providers.asr.createSession({
        ...(this.config.language !== undefined
          ? { language: this.config.language }
          : {}),
        interimResults: this.config.asrPartial !== false,
        endpointing: true,
        sampleRate: 16_000,
        channels: 1,
        encoding: 'pcm_s16le',
      });
    } catch (err) {
      this.fail(
        err,
        'asr_connection_failed',
        'provider',
        this.config.providers.asr.name,
      );
      return;
    }
    let resolveCancel!: () => void;
    const cancelPromise = new Promise<void>((resolve) => {
      resolveCancel = resolve;
    });
    const capture: TurnCapture = {
      id: this.activeUserTurnId,
      asrSession: session,
      inputCleanups: [],
      asrCleanups: [],
      audioChunks: [],
      audioDurationMs: 0,
      asrContainerHeaderForwarded: false,
      ended: false,
      processingScheduled: false,
      interruptedAssistant: false,
      interimResultsGated:
        this.config.asrPartial !== false &&
        this.detector.options.strategy === 'volume' &&
        this.config.mode !== 'push_to_talk' &&
        this.config.runtime.audioInput.onVolume !== undefined,
      verifiedSpeechText: false,
      interruptionVoicedFrames: 0,
      streamingPlaybackDisabled: false,
      streamingTranscript: '',
      cancelled: false,
      cancelPromise,
      cancel() {
        if (capture.cancelled) return;
        capture.cancelled = true;
        capture.replyAbort?.abort();
        void Promise.resolve(capture.asrSession.close()).catch(() => {});
        resolveCancel();
      },
    };
    this.activeCapture = capture;
    this.asrSession = session;
    if (capture.interimResultsGated) {
      void Promise.resolve(session.setInterimResultsEnabled?.(false)).catch((e) =>
        this.fail(
          e,
          'asr_connection_failed',
          'provider',
          this.config.providers.asr.name,
        ),
      );
    }

    capture.asrCleanups.push(
      session.onPartial((r) => this.onAsrPartial(r, capture)),
      session.onFinal((r) => {
        this.onAsrFinal(r, capture);
      }),
      session.onError((e) => {
        if (this.activeCapture === capture && !capture.ended) {
          this.fail(
            e,
            'asr_connection_failed',
            'provider',
            this.config.providers.asr.name,
          );
        }
      }),
    );

    const { audioInput } = this.config.runtime;
    capture.inputCleanups.push(
      audioInput.onChunk((chunk) => {
        const streamOnly = chunk.delivery === 'stream';
        const turnOnly = chunk.delivery === 'turn';
        const startsNewWebmContainer = this.isWebmContainerHeader(chunk.data);
        if (!streamOnly && chunk.data.byteLength > 0) {
          // Web runtimes may restart MediaRecorder after assistant playback so
          // Android receives a fresh container instead of a WebM timeline with
          // dropped clusters. A new EBML header supersedes the preserved header
          // and any pre-playback bytes already buffered for this capture.
          if (
            startsNewWebmContainer &&
            capture.audioChunks.length > 0
          ) {
            capture.audioChunks = [];
            capture.audioDurationMs = 0;
            capture.asrContainerHeaderForwarded = false;
          }
          capture.audioChunks.push(chunk.data.slice(0));
          capture.audioFormat ??= this.audioLlmFormat(chunk.encoding);
          capture.recordingFormat ??= chunk.encoding ?? capture.audioFormat;
          if (chunk.durationMs !== undefined) {
            capture.audioDurationMs += chunk.durationMs;
          }
        }
        const isWebmHeader =
          !capture.asrContainerHeaderForwarded &&
          (startsNewWebmContainer || this.isWebmEncoding(chunk.encoding));
        if (isWebmHeader) capture.asrContainerHeaderForwarded = true;
        // A MediaRecorder WebM stream only contains its container header in
        // the first chunk. Preserve that one chunk for batch ASR even while
        // assistant playback is being filtered; later assistant chunks remain
        // suppressed so the model does not transcribe loudspeaker echo.
        const streamingAsr = this.config.providers.asr.capabilities.streaming;
        const matchesAsrMode = streamOnly
          ? streamingAsr
          : turnOnly
            ? !streamingAsr
            : true;
        if (!matchesAsrMode) return;
        if (!this.shouldForwardAsrAudio() && !isWebmHeader) return;
        void Promise.resolve(capture.asrSession.sendAudio(chunk.data)).catch((e) =>
          this.fail(
            e,
            'asr_connection_failed',
            'provider',
            this.config.providers.asr.name,
          ),
        );
        if (chunk.durationMs) this.usage.addAsrAudioMs(chunk.durationMs);
      }),
      audioInput.onError((e) => this.fail(e, 'microphone_unavailable', 'capture')),
    );
    if (audioInput.onVolume) {
      capture.inputCleanups.push(
        audioInput.onVolume((level) => this.onVolume(level)),
      );
    }

    try {
      await audioInput.start({
        sampleRate: 16_000,
        encoding: 'pcm_s16le',
        chunkMs: 100,
      });
      if (!preserveState && this.state !== 'listening') {
        this.transition('listening');
      }
    } catch (err) {
      this.fail(err, 'microphone_unavailable', 'capture');
    }
  }

  /**
   * Manually end the current user turn (push-to-talk release, or a UI "done"
   * button). Flushes the ASR session so its final result drives the loop.
   */
  async endUserTurn(): Promise<void> {
    const capture = this.activeCapture;
    if (
      !capture ||
      (this.state !== 'listening' &&
        this.state !== 'user_speaking' &&
        this.state !== 'processing') ||
      capture.ended
    ) {
      return;
    }
    await this.finalizeCapture(capture);
  }

  /**
   * Inject user text directly, bypassing audio/ASR. Useful for text fallback
   * and deterministic flows.
   */
  async submitUserText(text: string): Promise<void> {
    if (this.disposed) return;
    await this.handleUserFinalTranscript(text);
  }

  /**
   * Pause the session: cancel in-flight replies, stop mic/ASR/playback, and
   * enter the `paused` state. No-op if the transition is illegal.
   */
  async pause(): Promise<void> {
    if (!this.machine.can('paused')) return;
    this.transition('paused');
    this.cancelPendingResponses();
    this.cleanupListening();
    await this.safeStopAudioInput();
    await this.safeCloseAsr();
    await this.safeStopAudioOutput();
  }

  /** Resume from `paused` by reopening the microphone for the next user turn. */
  async resume(): Promise<void> {
    if (this.state !== 'paused') return;
    await this.startListening();
  }

  /**
   * End the session normally, emitting a final usage snapshot and `finished`.
   *
   * @param reason - Opaque reason string forwarded on the state transition.
   */
  async finish(reason = 'finished'): Promise<void> {
    await this.finishInternal(reason);
  }

  /**
   * Tear everything down and drop all listeners. Safe to call multiple times.
   * Prefer {@link VoiceSession.finish} for a graceful end that emits `finished`.
   */
  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    this.cancelPendingResponses();
    this.cleanupListening();
    await this.safeCloseAsr();
    await this.safeStopAudioInput();
    await this.safeStopAudioOutput();
    this.outputVolumeCleanup?.();
    this.outputVolumeCleanup = undefined;
    for (const off of this.outputEventCleanups) off();
    this.outputEventCleanups = [];
    this.emitter.removeAllListeners();
  }

  // -- internal: assistant ------------------------------------------------

  private async resolveOpeningMessage(
    initialPrompt?: string,
  ): Promise<string | undefined> {
    if (this.config.agent) {
      return this.config.agent.getInitialAssistantMessage();
    }
    return initialPrompt;
  }

  private async speakAssistant(
    text: string,
    turnId = this.generateId(),
  ): Promise<void> {
    const generation = ++this.speakGeneration;
    if (
      this.config.mode === 'full_duplex' &&
      this.config.policy?.autoStartListening !== false &&
      !this.asrSession
    ) {
      await this.startListening();
    }
    if (generation !== this.speakGeneration || !this.isActive()) return;
    this.transcript.add({ id: turnId, role: 'assistant', text });
    this.emitTurnAdded();
    this.emit('assistant_text', { text, turnId });
    this.usage.addAssistantSpeechChars(text.length);
    this.activeAssistantText = text;
    await this.prepareAssistantPlayback();
    this.transition('assistant_speaking');

    const tts = this.config.providers.tts;
    if (!tts) {
      if (
        this.config.mode === 'full_duplex' &&
        this.state === 'assistant_speaking'
      ) {
        await this.finishAssistantCapture(false);
        this.transition('listening');
      }
      return;
    }

    const audio = await tts.synthesize({ text, format: 'mp3' });
    if (generation !== this.speakGeneration || !this.isActive()) return;
    this.usage.addTtsChars(text.length);

    this.emit('assistant_audio_start', { turnId });
    const playInput =
      audio.audioUrl !== undefined
        ? { audioUrl: audio.audioUrl, mimeType: audio.mimeType }
        : { audioBuffer: audio.audioBuffer, mimeType: audio.mimeType };
    this.emit('assistant_audio', {
      turnId,
      mimeType: audio.mimeType,
      ...(audio.audioBuffer !== undefined
        ? { audio: audio.audioBuffer.slice(0) }
        : {}),
      ...(audio.audioUrl !== undefined ? { audioUrl: audio.audioUrl } : {}),
      ...(audio.durationMs !== undefined ? { durationMs: audio.durationMs } : {}),
    });
    this.assistantPlaybackActive = true;
    try {
      await this.config.runtime.audioOutput.play(playInput);
    } catch (error) {
      throw new VoiceError(
        normalizeError(error, 'tts_failed', undefined, 'playback'),
      );
    } finally {
      this.assistantPlaybackActive = false;
    }
    if (generation !== this.speakGeneration || !this.isActive()) return;
    this.emit('assistant_audio_end', { turnId });
    this.activeAssistantText = undefined;
    if (this.config.mode === 'full_duplex' && this.state === 'assistant_speaking') {
      await this.finishAssistantCapture();
      this.transition('listening');
    }
  }

  // -- internal: ASR / turn detection ------------------------------------

  private onAsrPartial(result: ASRResult, capture: TurnCapture): void {
    if (this.activeCapture !== capture || capture.ended) return;
    if (this.config.asrPartial === false || result.text.trim().length === 0) return;
    if (this.state === 'assistant_speaking') {
      if (
        this.tentativeInterruptionStartedAt === undefined ||
        !this.shouldConfirmInterruptionFromAsr(result.text, this.now())
      ) {
        return;
      }
      this.confirmInterruption(this.now());
    }
    capture.verifiedSpeechText = true;
    if (
      this.detector.options.strategy === 'hybrid' &&
      !capture.interruptedAssistant &&
      !this.detector.isSpeaking
    ) {
      // Hybrid detection lets ASR rescue quiet speech that never crosses the
      // local RMS threshold. Once text confirms speech, local silence still
      // closes the turn without waiting for provider endpointing.
      this.detector.forceSpeechStart(this.now());
    }
    this.beginUserSpeech();
    this.emit('asr_partial', {
      text: result.text,
      turnId: capture.id,
      ...(result.confidence !== undefined
        ? { confidence: result.confidence }
        : {}),
    });
  }

  private onAsrFinal(result: ASRResult, capture: TurnCapture): void {
    if (capture.finalResult) return;
    if (this.activeCapture === capture && this.state === 'assistant_speaking') {
      if (
        this.tentativeInterruptionStartedAt === undefined ||
        !this.shouldConfirmInterruptionFromAsr(result.text, this.now())
      ) {
        return;
      }
      this.confirmInterruption(this.now());
    }
    if (result.text.trim().length > 0) capture.verifiedSpeechText = true;
    capture.finalResult = result;
    if (this.activeCapture !== capture || capture.ended) return;
    this.beginUserSpeech();
    void this.finalizeCapture(capture);
  }

  private onVolume(level: number): void {
    if (this.detector.options.strategy === 'manual') return;
    if (this.config.mode === 'push_to_talk') return;
    const now = this.now();

    // Playback uses a deliberately stricter detector. Do not feed assistant
    // audio or incidental knocks into the normal user-turn detector.
    if (this.state === 'assistant_speaking') {
      if (this.config.policy?.allowInterruption === false) return;
      if (this.tentativeInterruptionStartedAt !== undefined) {
        this.evaluateTentativeInterruption(level, now);
        return;
      }
      if (
        this.interruptionCooldownUntil !== undefined &&
        now < this.interruptionCooldownUntil
      ) {
        return;
      }
      const residual = this.playbackEchoFilter.filter(level, now);
      if (!this.playbackEchoFilter.isReady(now)) return;
      const shortInterruption = this.shortInterruptionGate.push(residual);
      if (this.bargeInSpeechGate.push(residual)) {
        this.bargeInSpeechGate.reset();
        if (shortInterruption) {
          this.confirmInterruption(now);
        } else {
          this.beginTentativeInterruption(now);
        }
      }
      return;
    }

    if (this.shouldWaitForPostPlaybackVadRearm(level, now)) return;

    const activeDetector = this.interruptionTurnActive
      ? this.interruptionDetector
      : this.detector;
    if (
      this.interruptionTurnActive &&
      level >= activeDetector.options.volumeThreshold &&
      this.activeCapture
    ) {
      this.activeCapture.interruptionVoicedFrames += 1;
    }
    const event = activeDetector.pushVolume(level, now);
    if (!event) return;
    if (event === 'speech_start') {
      this.beginUserSpeech();
      return;
    }
    // speech_end | max_turn → flush ASR for endpointing.
    this.interruptionTurnActive = false;
    this.bargeInSpeechGate.reset();
    this.shortInterruptionGate.reset();
    void this.endUserTurn();
  }

  private beginUserSpeech(): void {
    if (this.userSpeaking) return;
    if (this.state !== 'listening' && this.state !== 'processing') return;
    if (this.state === 'processing') {
      this.cancelPendingResponses();
      this.turnGeneration += 1;
    }
    this.setInterimResultsEnabled(this.activeCapture, true);
    this.userSpeaking = true;
    this.transition('user_speaking');
  }

  private cancelPendingResponses(): void {
    for (const capture of this.pendingCaptures) capture.cancel();
  }

  private async finalizeCapture(capture: TurnCapture): Promise<void> {
    if (capture.ended || this.activeCapture !== capture) return;
    if (this.state === 'processing') this.beginUserSpeech();
    capture.ended = true;
    this.emit('user_audio_end', { turnId: capture.id, at: this.now() });

    try {
      // Finalize the current WebM before handing its bytes to either model.
      // The next recorder opens immediately while caption ASR confirms the
      // turn. Low-latency audio-LLM sessions may start their reply in parallel.
      await this.config.runtime.audioInput.stop();
    } catch (err) {
      this.fail(err, 'microphone_unavailable', 'capture');
      return;
    }

    this.emit('user_audio_final', {
      turnId: capture.id,
      audio: this.joinAudioChunks(capture.audioChunks),
      format: capture.recordingFormat ?? capture.audioFormat ?? 'unknown',
      ...(capture.audioDurationMs > 0
        ? { durationMs: capture.audioDurationMs }
        : {}),
    });

    for (const off of capture.inputCleanups) off();
    capture.inputCleanups = [];
    if (this.activeCapture === capture) {
      this.activeCapture = undefined;
      this.asrSession = undefined;
    }
    this.inputCaptureSuspended = false;

    capture.generation = ++this.turnGeneration;
    this.pendingCaptures.add(capture);

    if (this.state !== 'processing') this.transition('processing');

    const shouldKeepListening =
      this.config.mode === 'full_duplex' &&
      this.config.policy?.autoStartListening !== false;
    const nextCaptureReady = shouldKeepListening
      ? this.startListeningInternal(true)
      : Promise.resolve();
    capture.nextCaptureReady = nextCaptureReady;
    if (
      this.config.pipeline === 'audio_llm' &&
      this.config.audioLlmStartTiming === 'after_audio' &&
      capture.audioChunks.length > 0 &&
      this.hasReliableInterruptedSpeech(capture)
    ) {
      capture.replyAbort = new AbortController();
      capture.audioReply = this.generateAudioReply(
        capture.audioChunks,
        capture,
        capture.replyAbort.signal,
      );
      void capture.audioReply.catch(() => {});
    }
    const stopPromise = Promise.resolve(capture.asrSession.stop());
    capture.stopPromise = stopPromise;
    this.scheduleCaptureProcessing(capture);

    await nextCaptureReady;
    await stopPromise.catch(() => {});
  }

  private scheduleCaptureProcessing(capture: TurnCapture): void {
    if (capture.processingScheduled) return;
    capture.processingScheduled = true;
    this.processingChain = this.processingChain.then(async () => {
      try {
        await capture.stopPromise;
        await capture.nextCaptureReady;
        await this.processFinalizedCapture(
          capture,
          capture.finalResult ?? { text: '' },
        );
      } catch (err) {
        if (
          !capture.cancelled &&
          capture.generation === this.turnGeneration &&
          this.isActive()
        ) {
          this.fail(
            err,
            'asr_connection_failed',
            'provider',
            this.config.providers.asr.name,
          );
        }
      } finally {
        for (const off of capture.asrCleanups) off();
        capture.asrCleanups = [];
        try {
          await capture.asrSession.close();
        } catch {
          /* best-effort */
        }
        this.pendingCaptures.delete(capture);
      }
    });
    void this.processingChain.catch(() => {});
  }

  private beginTentativeInterruption(now: number): void {
    const { audioOutput } = this.config.runtime;
    if (!audioOutput.pause || !audioOutput.resume) {
      this.confirmInterruption(now);
      return;
    }

    this.tentativeInterruptionStartedAt = now;
    this.tentativeInterruptionSilenceSince = undefined;
    this.loudInterruptionGate.reset();
    this.playbackEchoFilter.stop();
    this.setInterimResultsEnabled(this.activeCapture, true);
    void this.resumeInputCapture(true).catch((error) => {
      this.fail(error, 'microphone_unavailable', 'capture');
    });
    void audioOutput.pause().catch(() => {
      if (
        this.tentativeInterruptionStartedAt === now &&
        this.state === 'assistant_speaking'
      ) {
        this.clearTentativeInterruption();
      }
    });
  }

  private evaluateTentativeInterruption(level: number, now: number): void {
    const startedAt = this.tentativeInterruptionStartedAt;
    if (startedAt === undefined) return;
    const elapsed = now - startedAt;

    const tailIgnoreMs = this.interruptionTailIgnoreMs();
    if (elapsed < tailIgnoreMs) return;

    const threshold = this.interruptionDetector.options.volumeThreshold;
    if (level >= threshold) {
      this.tentativeInterruptionSilenceSince = undefined;
    } else if (this.tentativeInterruptionSilenceSince === undefined) {
      this.tentativeInterruptionSilenceSince = now;
    }

    if (this.loudInterruptionGate.push(level)) {
      this.confirmInterruption(now);
      return;
    }

    const falseSilenceMs = this.config.policy?.falseInterruptionSilenceMs ?? 400;
    const falseTimeoutMs = this.config.policy?.falseInterruptionTimeoutMs ?? 2_000;
    if (
      (this.tentativeInterruptionSilenceSince !== undefined &&
        now - this.tentativeInterruptionSilenceSince >= falseSilenceMs) ||
      elapsed >= falseTimeoutMs
    ) {
      this.resumeFalseInterruption(now);
    }
  }

  private confirmInterruption(now: number): void {
    this.clearPostPlaybackVadRearm();
    if (this.activeCapture) this.activeCapture.interruptedAssistant = true;
    this.clearTentativeInterruption();
    this.interruptionTurnActive = true;
    this.interruptionDetector.forceSpeechStart(now);
    // Announce the user turn before a runtime synchronously flushes its
    // barge-in pre-roll. Otherwise shouldForwardAsrAudio() still sees
    // assistant_speaking and drops those opening syllables from captions.
    this.interruptAssistant();
    void this.resumeInputCapture(true).catch((error) => {
      this.fail(error, 'microphone_unavailable', 'capture');
    });
  }

  private resumeFalseInterruption(now: number): void {
    const resume = this.config.runtime.audioOutput.resume;
    this.clearTentativeInterruption();
    this.bargeInSpeechGate.reset();
    this.shortInterruptionGate.reset();
    this.interruptionCooldownUntil =
      now + (this.config.policy?.interruptionCooldownMs ?? 800);
    this.playbackEchoFilter.start(now);
    this.setInterimResultsEnabled(this.activeCapture, false);
    if (!resume) return;
    if (!this.supportsCaptureSuspension()) {
      void resume.call(this.config.runtime.audioOutput).catch(() => {
        this.clearTentativeInterruption();
      });
      return;
    }
    void (async () => {
      try {
        await this.suspendInputCapture();
        await this.asrSession?.resetAudio?.();
        this.resetTurnAudio();
        await resume.call(this.config.runtime.audioOutput);
      } catch {
        this.clearTentativeInterruption();
      }
    })();
  }

  private clearTentativeInterruption(): void {
    this.tentativeInterruptionStartedAt = undefined;
    this.tentativeInterruptionSilenceSince = undefined;
    this.shortInterruptionGate.reset();
    this.loudInterruptionGate.reset();
  }

  private async prepareAssistantPlayback(): Promise<void> {
    this.shortInterruptionGate.reset();
    this.loudInterruptionGate.reset();
    this.setInterimResultsEnabled(this.activeCapture, false);
    if (await this.suspendInputCapture()) {
      await this.asrSession?.resetAudio?.();
      this.resetTurnAudio();
      return;
    }
    await this.asrSession?.resetAudio?.();
  }

  private supportsCaptureSuspension(): boolean {
    const { audioInput } = this.config.runtime;
    return Boolean(audioInput.suspendCapture && audioInput.resumeCapture);
  }

  private setInterimResultsEnabled(
    capture: TurnCapture | undefined,
    enabled: boolean,
  ): void {
    if (!capture?.interimResultsGated) return;
    void Promise.resolve(
      capture.asrSession.setInterimResultsEnabled?.(enabled),
    ).catch((error) =>
      this.fail(
        error,
        'asr_connection_failed',
        'provider',
        this.config.providers.asr.name,
      ),
    );
  }

  private async suspendInputCapture(): Promise<boolean> {
    const { audioInput } = this.config.runtime;
    if (!audioInput.suspendCapture || !audioInput.resumeCapture) return false;
    if (this.inputCaptureSuspended) return true;
    await audioInput.suspendCapture();
    this.inputCaptureSuspended = true;
    return true;
  }

  private async resumeInputCapture(includePreRoll = false): Promise<boolean> {
    const { audioInput } = this.config.runtime;
    if (!audioInput.suspendCapture || !audioInput.resumeCapture) return false;
    if (!this.inputCaptureSuspended) return true;
    this.inputCaptureSuspended = false;
    await audioInput.resumeCapture({ includePreRoll });
    return true;
  }

  private async finishAssistantCapture(playedAudio = true): Promise<void> {
    if (this.supportsCaptureSuspension()) {
      await this.resumeInputCapture();
    } else {
      await this.asrSession?.resetAudio?.();
      this.resetTurnAudio();
    }
    if (playedAudio) this.armPostPlaybackVadRearm();
    else this.clearPostPlaybackVadRearm();
  }

  private armPostPlaybackVadRearm(): void {
    this.postPlaybackVadRearmStartedAt = this.now();
    this.postPlaybackSilentFrames = 0;
    this.detector.reset();
  }

  private clearPostPlaybackVadRearm(): void {
    this.postPlaybackVadRearmStartedAt = undefined;
    this.postPlaybackSilentFrames = 0;
  }

  private shouldWaitForPostPlaybackVadRearm(level: number, now: number): boolean {
    const startedAt = this.postPlaybackVadRearmStartedAt;
    if (startedAt === undefined) return false;
    if (level < this.detector.options.volumeThreshold) {
      this.postPlaybackSilentFrames += 1;
    } else {
      this.postPlaybackSilentFrames = 0;
    }
    const maxWaitMs = this.config.policy?.postPlaybackVadRearmMs ?? 300;
    if (this.postPlaybackSilentFrames >= 2 || now - startedAt >= maxWaitMs) {
      this.clearPostPlaybackVadRearm();
      this.detector.reset();
    }
    // Consume the frame that establishes the new baseline. The next sample is
    // the first one eligible to start a user turn.
    return true;
  }

  private hasReliableInterruptedSpeech(capture: TurnCapture): boolean {
    if (!capture.interruptedAssistant) return true;
    if (capture.verifiedSpeechText) return true;
    // Six post-interruption voiced frames are about 300 ms at the web
    // runtime's 50 ms cadence. This keeps long native-audio questions working
    // when caption ASR is empty without turning a short echo tail into a turn.
    return capture.interruptionVoicedFrames >= 6;
  }

  private shouldForwardAsrAudio(): boolean {
    if (this.state !== 'assistant_speaking') return true;
    return this.tentativeInterruptionStartedAt !== undefined;
  }

  private isWebmEncoding(encoding: string | undefined): boolean {
    return encoding?.toLowerCase().includes('webm') ?? false;
  }

  private isWebmContainerHeader(data: ArrayBuffer): boolean {
    const bytes = new Uint8Array(data);
    return (
      bytes.length >= 4 &&
      bytes[0] === 0x1a &&
      bytes[1] === 0x45 &&
      bytes[2] === 0xdf &&
      bytes[3] === 0xa3
    );
  }

  private audioLlmFormat(encoding: string | undefined): AudioLLMInputFormat {
    const normalized = encoding?.toLowerCase() ?? '';
    if (normalized.includes('wav')) return 'wav';
    if (normalized.includes('mpeg') || normalized.includes('mp3')) return 'mp3';
    // A browser MediaRecorder commonly reports `audio/webm;codecs=opus`.
    // WebM is the container and must win over its Opus codec so resetTurnAudio
    // keeps the first container chunk for the next Audio LLM turn.
    if (normalized.includes('webm')) return 'webm';
    if (normalized.includes('opus')) return 'opus';
    return 'webm';
  }

  private interruptionTailIgnoreMs(): number {
    return this.config.policy?.interruptionTailIgnoreMs ?? 200;
  }

  private normalizeSpeechText(text: string): string {
    return text.replace(/[\s\p{P}\p{S}]/gu, '').toLowerCase();
  }

  private isAssistantPlaybackEcho(candidate: string): boolean {
    const assistant = this.activeAssistantText;
    if (!assistant) return false;
    const normalized = this.normalizeSpeechText(candidate);
    if (normalized.length < 2) return false;
    return this.normalizeSpeechText(assistant).includes(normalized);
  }

  private shouldConfirmInterruptionFromAsr(text: string, now: number): boolean {
    const startedAt = this.tentativeInterruptionStartedAt;
    if (startedAt === undefined) return false;
    if (now - startedAt < this.interruptionTailIgnoreMs()) return false;
    if (!this.isMeaningfulInterruptionText(text)) return false;
    return !this.isAssistantPlaybackEcho(text);
  }

  private isMeaningfulInterruptionText(rawText: string): boolean {
    const text = this.normalizeSpeechText(rawText);
    if (!text) return false;
    // A single CJK character can be a complete interruption command (for
    // example “停”). For alphabetic languages, keep a two-character floor so
    // one-letter ASR noise does not stop playback.
    if (/\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}|\p{Script=Hangul}/u.test(text)) {
      return true;
    }
    return Array.from(text).length >= 2;
  }

  private async handleUserFinalTranscript(rawText: string): Promise<void> {
    this.cancelPendingResponses();
    const turnGen = ++this.turnGeneration;
    const text = rawText.trim();
    const turnId = this.currentUserTurnId();
    this.cleanupListening();
    await this.safeStopAudioInput();
    await this.safeCloseAsr();

    // The session may have been finished/disposed/errored while we awaited.
    if (turnGen !== this.turnGeneration || !this.isActive()) return;

    if (text.length === 0) {
      // Heard nothing meaningful — listen again rather than calling the LLM.
      await this.startListening();
      return;
    }

    if (this.state !== 'processing') this.transition('processing');
    this.transcript.add({
      id: turnId,
      role: 'user',
      text,
    });
    this.emitTurnAdded();

    if (this.isSessionExpired()) {
      await this.finishInternal('max_session_duration');
      return;
    }

    const keepListening =
      this.config.mode === 'full_duplex' &&
      this.config.policy?.autoStartListening !== false;
    const nextCaptureReady = keepListening
      ? this.startListeningInternal(true)
      : Promise.resolve();

    if (this.config.pipeline === 'audio_llm') {
      const replyPromise = this.generateAudioReply([]);
      void replyPromise.catch(() => {});
      await nextCaptureReady;
      try {
        const reply = await replyPromise;
        if (turnGen !== this.turnGeneration || !this.isActive()) return;
        this.usage.addLlmUsage(reply.usage);
        await this.speakAudioAssistant(reply);
      } catch (err) {
        if (!(await this.recoverAudioLlmFailure(err))) {
          this.fail(
            err,
            'llm_failed',
            'provider',
            this.config.providers.audioLlm?.name,
          );
        }
        return;
      }
    } else {
      const assistantTurnId = this.generateId();
      const replyPromise = this.generateReply(text, assistantTurnId);
      void replyPromise.catch(() => {});
      await nextCaptureReady;
      let reply: string;
      try {
        reply = await replyPromise;
      } catch (err) {
        this.fail(err, 'llm_failed', 'provider', this.config.providers.llm?.name);
        return;
      }
      if (turnGen !== this.turnGeneration || !this.isActive()) return;

      try {
        await this.speakAssistant(reply, assistantTurnId);
      } catch (err) {
        this.fail(err, 'tts_failed', 'provider', this.config.providers.tts?.name);
        return;
      }
    }
    if (turnGen !== this.turnGeneration || !this.isActive()) return;

    if (this.shouldFinishAfterTurn()) {
      await this.finishInternal('agent_finished');
      return;
    }

    if (
      this.config.policy?.autoStartListening !== false &&
      !this.asrSession
    ) {
      await this.startListening();
    }
  }

  private async processFinalizedCapture(
    capture: TurnCapture,
    result: ASRResult,
  ): Promise<void> {
    const text = result.text.trim();
    const durationMs = this.resultDurationMs(result);
    this.emit('asr_final', {
      text: result.text,
      turnId: capture.id,
      ...(result.confidence !== undefined
        ? { confidence: result.confidence }
        : {}),
      ...(durationMs !== undefined ? { durationMs } : {}),
    });
    if (durationMs !== undefined) this.usage.addUserSpeechMs(durationMs);
    if (text.length > 0) {
      this.transcript.add({ id: capture.id, role: 'user', text });
      this.emitTurnAdded();
    }

    const generation = capture.generation;
    if (
      generation === undefined ||
      capture.cancelled ||
      generation !== this.turnGeneration ||
      !this.isActive()
    ) {
      return;
    }

    if (
      text.length === 0 &&
      (this.config.pipeline !== 'audio_llm' ||
        !this.hasReliableInterruptedSpeech(capture))
    ) {
      await this.ensureListeningAfterTurn();
      return;
    }
    if (this.isSessionExpired()) {
      await this.finishInternal('max_session_duration');
      return;
    }

    if (this.config.pipeline === 'audio_llm') {
      // The compatible default starts here, after authoritative caption ASR.
      // Low-latency sessions may already have a request running from
      // finalizeCapture; both paths share the same cancellation signal.
      if (!capture.audioReply) {
        capture.replyAbort = new AbortController();
        capture.audioReply = this.generateAudioReply(
          capture.audioChunks,
          capture,
          capture.replyAbort.signal,
        );
      }
      const replyPromise = capture.audioReply;
      const outcome = await this.waitForCaptureReply(capture, replyPromise);
      if (outcome.kind === 'cancelled') return;
      if (outcome.kind === 'error') {
        if (generation === this.turnGeneration && this.isActive()) {
          if (!(await this.recoverAudioLlmFailure(outcome.error, capture))) {
            this.fail(
              outcome.error,
              'llm_failed',
              'provider',
              this.config.providers.audioLlm?.name,
            );
          }
        }
        return;
      }
      if (
        capture.cancelled ||
        generation !== this.turnGeneration ||
        !this.isActive()
      ) {
        return;
      }
      this.usage.addLlmUsage(outcome.value.usage);
      if (
        !(await this.finishStreamingAudioAssistant(capture, outcome.value))
      ) {
        await this.speakAudioAssistant(
          outcome.value,
          capture.streamingAssistantTurnId,
        );
      }
    } else {
      const assistantTurnId =
        capture.streamingAssistantTurnId ??= this.generateId();
      capture.replyAbort = new AbortController();
      const outcome = await this.waitForCaptureReply(
        capture,
        this.generateReply(text, assistantTurnId, capture.replyAbort.signal),
      );
      if (outcome.kind === 'cancelled') return;
      if (outcome.kind === 'error') {
        if (generation === this.turnGeneration && this.isActive()) {
          this.fail(
            outcome.error,
            'llm_failed',
            'provider',
            this.config.providers.llm?.name,
          );
        }
        return;
      }
      if (
        capture.cancelled ||
        generation !== this.turnGeneration ||
        !this.isActive()
      ) {
        return;
      }
      try {
        await this.speakAssistant(outcome.value, assistantTurnId);
      } catch (err) {
        this.fail(err, 'tts_failed', 'provider', this.config.providers.tts?.name);
        return;
      }
    }

    if (
      capture.cancelled ||
      generation !== this.turnGeneration ||
      !this.isActive()
    ) {
      return;
    }
    if (this.shouldFinishAfterTurn()) {
      await this.finishInternal('agent_finished');
      return;
    }
    await this.ensureListeningAfterTurn();
  }

  private async waitForCaptureReply<T>(
    capture: TurnCapture,
    promise: Promise<T>,
  ): Promise<
    | { kind: 'reply'; value: T }
    | { kind: 'error'; error: unknown }
    | { kind: 'cancelled' }
  > {
    return Promise.race([
      promise.then(
        (value) => ({ kind: 'reply' as const, value }),
        (error: unknown) => ({ kind: 'error' as const, error }),
      ),
      capture.cancelPromise.then(() => ({ kind: 'cancelled' as const })),
    ]);
  }

  private async ensureListeningAfterTurn(): Promise<void> {
    if (this.config.policy?.autoStartListening === false) return;
    if (this.asrSession) {
      if (this.state === 'processing') this.transition('listening');
      return;
    }
    await this.startListening();
  }

  private async generateReply(
    lastUserText: string,
    turnId: string,
    signal?: AbortSignal,
  ): Promise<string> {
    if (this.config.agent) {
      return this.config.agent.generateNextAssistantMessage({
        turns: this.transcript.all(),
        lastUserText,
      });
    }
    const input: { system?: string; messages: LLMMessage[]; signal?: AbortSignal } = {
      messages: this.transcript.toMessages(),
      ...(signal ? { signal } : {}),
    };
    const provider = this.config.providers.llm;
    if (!provider) {
      throw new VoiceError({
        code: 'invalid_state',
        message: 'pipeline "asr_llm_tts" requires providers.llm',
        stage: 'session',
        retryable: false,
      });
    }
    if (provider.stream) {
      let text = '';
      for await (const chunk of provider.stream(input)) {
        if (signal?.aborted) break;
        if (chunk.type === 'text_delta' && chunk.text) {
          text += chunk.text;
          this.emit('assistant_text_delta', {
            delta: chunk.text,
            text,
            turnId,
          });
        } else if (chunk.type === 'usage') {
          this.usage.addLlmUsage(chunk.usage);
        } else if (chunk.type === 'error' && chunk.error) {
          throw new VoiceError(chunk.error);
        }
      }
      return text.trim();
    }
    const result = await provider.generate(input);
    this.usage.addLlmUsage(result.usage);
    return result.text;
  }

  private async generateAudioReply(
    audioChunks: readonly ArrayBuffer[],
    capture?: TurnCapture,
    signal?: AbortSignal,
  ): Promise<AudioLLMGenerateOutput> {
    const provider = this.config.providers.audioLlm;
    if (!provider) {
      throw new VoiceError({
        code: 'invalid_state',
        message: 'pipeline "audio_llm" requires providers.audioLlm',
        retryable: false,
      });
    }
    const total = audioChunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
    const joined = new Uint8Array(total);
    let offset = 0;
    for (const chunk of audioChunks) {
      joined.set(new Uint8Array(chunk), offset);
      offset += chunk.byteLength;
    }
    const messages = this.transcript.toMessages();
    const retry = this.config.audioLlmRetry;
    const configuredAttempts = retry?.maxAttempts;
    const maxAttempts = typeof configuredAttempts === 'number' &&
      Number.isFinite(configuredAttempts) && configuredAttempts > 0
      ? Math.min(10, Math.floor(configuredAttempts))
      : 1;
    let attempt = 0;
    while (attempt < maxAttempts) {
      attempt += 1;
      let streamedOutput = false;
      try {
        return await provider.generate({
          audio: joined.buffer,
          format: capture?.audioFormat ?? 'webm',
          messages,
          ...(this.config.audioLlmSystemPrompt
            ? { system: this.config.audioLlmSystemPrompt }
            : {}),
          ...(this.config.audioLlmMaxTokens !== undefined
            ? { maxTokens: this.config.audioLlmMaxTokens }
            : {}),
          ...(signal ? { signal } : {}),
          ...(capture
            ? {
                onTranscriptDelta: (text: string) => {
                  streamedOutput = true;
                  if (
                    capture.cancelled ||
                    capture.generation !== this.turnGeneration ||
                    !this.isActive()
                  ) {
                    return;
                  }
                  capture.streamingTranscript += text;
                  const turnId =
                    capture.streamingAssistantTurnId ??= this.generateId();
                  this.emit('assistant_text_delta', {
                    delta: text,
                    text: capture.streamingTranscript,
                    turnId,
                  });
                  if (
                    capture.streamingPlayback &&
                    capture.streamingPlayback.generation === this.speakGeneration
                  ) {
                    this.activeAssistantText = capture.streamingTranscript;
                  }
                },
                ...(this.config.runtime.audioOutput.startPcmStream
                  ? {
                      onAudioChunk: (chunk: AudioLLMAudioChunk) => {
                        streamedOutput = true;
                        return this.onAudioReplyChunk(capture, chunk);
                      },
                    }
                  : {}),
              }
            : {}),
        });
      } catch (error) {
        const normalized = normalizeError(
          error,
          'llm_failed',
          provider.name,
          'provider',
        );
        const retryable =
          retry?.retryableOnly === false || normalized.retryable === true;
        if (
          attempt >= maxAttempts ||
          signal?.aborted ||
          streamedOutput ||
          !retryable
        ) {
          throw new VoiceError(normalized);
        }
        const configuredBackoff = retry?.backoffMs;
        const base = typeof configuredBackoff === 'number' &&
          Number.isFinite(configuredBackoff) && configuredBackoff >= 0
          ? configuredBackoff
          : 250;
        const delay = Math.min(30_000, retry?.exponentialBackoff === false
          ? base
          : base * 2 ** (attempt - 1));
        await this.waitForRetry(delay, signal);
      }
    }
    throw new VoiceError({
      code: 'llm_failed',
      message: 'Audio LLM retry loop exhausted',
      provider: provider.name,
      stage: 'provider',
      retryable: false,
    });
  }

  private async onAudioReplyChunk(
    capture: TurnCapture,
    chunk: AudioLLMAudioChunk,
  ): Promise<void> {
    const startPcmStream = this.config.runtime.audioOutput.startPcmStream;
    if (
      !startPcmStream ||
      capture.streamingPlaybackDisabled ||
      capture.cancelled ||
      capture.generation !== this.turnGeneration ||
      !this.isActive()
    ) {
      return;
    }

    try {
      if (!capture.streamingPlayback) {
        // The provider request is intentionally started before the next mic
        // capture is assigned. Yield once so an unusually fast/mock first
        // chunk still waits for that capture to be ready before playback.
        await Promise.resolve();
        await capture.nextCaptureReady;
        if (
          capture.cancelled ||
          capture.generation !== this.turnGeneration ||
          !this.isActive()
        ) {
          return;
        }
        const generation = ++this.speakGeneration;
        const turnId =
          capture.streamingAssistantTurnId ??= this.generateId();
        this.activeAssistantText = capture.streamingTranscript;
        await this.prepareAssistantPlayback();
        if (
          generation !== this.speakGeneration ||
          capture.cancelled ||
          capture.generation !== this.turnGeneration ||
          !this.isActive()
        ) {
          return;
        }
        if (this.state !== 'assistant_speaking') {
          this.transition('assistant_speaking');
        }
        const output = await startPcmStream.call(
          this.config.runtime.audioOutput,
          {
            encoding: chunk.encoding,
            sampleRate: chunk.sampleRate,
            channels: chunk.channels,
          },
        );
        capture.streamingPlayback = { output, turnId, generation };
        this.emit('assistant_audio_start', { turnId });
        this.assistantPlaybackActive = true;
      }
      await capture.streamingPlayback.output.write(chunk.data);
    } catch {
      capture.streamingPlaybackDisabled = true;
      capture.streamingPlayback = undefined;
      await this.safeStopAudioOutput();
      if (this.state === 'assistant_speaking' && this.isActive()) {
        await this.finishAssistantCapture(false);
        this.transition('processing');
      }
    }
  }

  private async finishStreamingAudioAssistant(
    capture: TurnCapture,
    reply: AudioLLMGenerateOutput,
  ): Promise<boolean> {
    const playback = capture.streamingPlayback;
    if (!playback) return false;
    const text = reply.text || capture.streamingTranscript;
    if (
      playback.generation !== this.speakGeneration ||
      capture.cancelled ||
      capture.generation !== this.turnGeneration ||
      !this.isActive()
    ) {
      return true;
    }

    this.transcript.add({ id: playback.turnId, role: 'assistant', text });
    this.emitTurnAdded();
    this.emit('assistant_text', { text, turnId: playback.turnId });
    this.emit('assistant_audio', {
      turnId: playback.turnId,
      audio: reply.audioBuffer.slice(0),
      mimeType: reply.mimeType,
    });
    this.usage.addAssistantSpeechChars(text.length);
    this.activeAssistantText = text;
    try {
      await playback.output.close();
    } catch (error) {
      throw new VoiceError(
        normalizeError(error, 'llm_failed', undefined, 'playback'),
      );
    } finally {
      this.assistantPlaybackActive = false;
    }
    if (
      playback.generation !== this.speakGeneration ||
      capture.cancelled ||
      capture.generation !== this.turnGeneration ||
      !this.isActive()
    ) {
      return true;
    }
    this.emit('assistant_audio_end', { turnId: playback.turnId });
    this.activeAssistantText = undefined;
    if (this.config.mode === 'full_duplex' && this.state === 'assistant_speaking') {
      await this.finishAssistantCapture();
      this.transition('listening');
    }
    return true;
  }

  private async speakAudioAssistant(
    reply: AudioLLMGenerateOutput,
    turnId = this.generateId(),
  ): Promise<void> {
    const generation = ++this.speakGeneration;
    if (
      this.config.mode === 'full_duplex' &&
      this.config.policy?.autoStartListening !== false &&
      !this.asrSession
    ) {
      await this.startListening();
    }
    if (generation !== this.speakGeneration || !this.isActive()) return;
    this.transcript.add({ id: turnId, role: 'assistant', text: reply.text });
    this.emitTurnAdded();
    this.emit('assistant_text', { text: reply.text, turnId });
    this.emit('assistant_audio', {
      turnId,
      audio: reply.audioBuffer.slice(0),
      mimeType: reply.mimeType,
    });
    this.usage.addAssistantSpeechChars(reply.text.length);
    this.activeAssistantText = reply.text;
    await this.prepareAssistantPlayback();
    this.transition('assistant_speaking');
    this.emit('assistant_audio_start', { turnId });
    this.assistantPlaybackActive = true;
    try {
      await this.config.runtime.audioOutput.play({
        audioBuffer: reply.audioBuffer,
        mimeType: reply.mimeType,
      });
    } catch (error) {
      throw new VoiceError(
        normalizeError(error, 'llm_failed', undefined, 'playback'),
      );
    } finally {
      this.assistantPlaybackActive = false;
    }
    if (generation !== this.speakGeneration || !this.isActive()) return;
    this.emit('assistant_audio_end', { turnId });
    this.activeAssistantText = undefined;
    if (this.config.mode === 'full_duplex' && this.state === 'assistant_speaking') {
      await this.finishAssistantCapture();
      this.transition('listening');
    }
  }

  private resetTurnAudio(): void {
    const capture = this.activeCapture;
    if (!capture) return;
    const containerHeader =
      capture.audioFormat === 'webm' ? capture.audioChunks[0] : undefined;
    capture.audioChunks = containerHeader ? [containerHeader] : [];
    capture.audioDurationMs = 0;
  }

  private joinAudioChunks(audioChunks: readonly ArrayBuffer[]): ArrayBuffer {
    const total = audioChunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
    const joined = new Uint8Array(total);
    let offset = 0;
    for (const chunk of audioChunks) {
      joined.set(new Uint8Array(chunk), offset);
      offset += chunk.byteLength;
    }
    return joined.buffer;
  }

  private async waitForRetry(
    delayMs: number,
    signal?: AbortSignal,
  ): Promise<void> {
    if (signal?.aborted) {
      throw new VoiceError({
        code: 'aborted',
        message: 'Audio LLM retry cancelled',
        stage: 'session',
        retryable: false,
      });
    }
    if (delayMs <= 0) return;
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        signal?.removeEventListener('abort', onAbort);
        resolve();
      }, delayMs);
      const onAbort = () => {
        clearTimeout(timer);
        reject(
          new VoiceError({
            code: 'aborted',
            message: 'Audio LLM retry cancelled',
            stage: 'session',
            retryable: false,
          }),
        );
      };
      signal?.addEventListener('abort', onAbort, { once: true });
    });
  }

  private shouldFinishAfterTurn(): boolean {
    if (!this.config.agent) return false;
    return this.config.agent.shouldFinishSession({
      turns: this.transcript.all(),
    });
  }

  private isSessionExpired(): boolean {
    const max = this.config.policy?.maxSessionDurationMs;
    if (max === undefined) return false;
    return this.usage.snapshot().sessionDurationMs >= max;
  }

  private async recoverAudioLlmFailure(
    error: unknown,
    capture?: TurnCapture,
  ): Promise<boolean> {
    if (this.config.audioLlmRetry?.continueSessionOnFailure !== true) {
      return false;
    }
    const normalized = normalizeError(
      error,
      'llm_failed',
      this.config.providers.audioLlm?.name,
      'provider',
    );
    this.emit('error', { ...normalized, fatal: false });
    if (capture) {
      capture.streamingPlaybackDisabled = true;
      capture.streamingPlayback = undefined;
    }
    this.activeAssistantText = undefined;
    if (this.assistantPlaybackActive || this.state === 'assistant_speaking') {
      await this.safeStopAudioOutput();
      if (this.state === 'assistant_speaking' && this.machine.can('processing')) {
        this.transition('processing', 'audio_llm_failed');
      }
    }
    await this.ensureListeningAfterTurn();
    return true;
  }

  // -- internal: teardown -------------------------------------------------

  private async finishInternal(reason: string): Promise<void> {
    if (this.finishing || this.state === 'finished') return;
    if (!this.machine.can('finished')) return;
    this.finishing = true;
    this.cancelPendingResponses();
    this.cleanupListening();
    await this.safeStopAudioInput();
    await this.safeCloseAsr();
    await this.safeStopAudioOutput();
    this.transition('finished', reason);
    this.usage.endSession();
    this.emit('usage', this.usage.snapshot());
    this.emit('finished', { turns: this.transcript.all() });
    this.finishing = false;
  }

  private fail(
    error: unknown,
    fallbackCode: NormalizedVoiceError['code'] = 'unknown',
    stage?: NormalizedVoiceError['stage'],
    provider?: string,
  ): void {
    const normalized = normalizeError(error, fallbackCode, provider, stage);
    this.emit('error', { ...normalized, fatal: true });
    this.cancelPendingResponses();
    this.cleanupListening();
    void this.safeStopAudioInput();
    void this.safeCloseAsr();
    if (this.machine.can('error')) this.transition('error', normalized.message);
  }

  private cleanupListening(): void {
    const capture = this.activeCapture;
    if (!capture) return;
    for (const off of capture.inputCleanups) off();
    for (const off of capture.asrCleanups) off();
    capture.inputCleanups = [];
    capture.asrCleanups = [];
  }

  private async safeStopAudioInput(): Promise<void> {
    try {
      await this.config.runtime.audioInput.stop();
    } catch {
      /* best-effort */
    } finally {
      this.inputCaptureSuspended = false;
    }
  }

  private async safeStopAudioOutput(): Promise<void> {
    this.clearTentativeInterruption();
    try {
      await this.config.runtime.audioOutput.stop();
    } catch {
      /* best-effort */
    } finally {
      this.assistantPlaybackActive = false;
      this.playbackEchoFilter.stop();
    }
  }

  private interruptAssistant(): void {
    if (
      this.config.mode !== 'full_duplex' ||
      this.config.policy?.allowInterruption === false ||
      this.state !== 'assistant_speaking'
    ) {
      return;
    }
    this.clearTentativeInterruption();
    this.activeAssistantText = undefined;
    this.speakGeneration += 1;
    this.cancelPendingResponses();
    this.turnGeneration += 1;
    if (this.assistantPlaybackActive) {
      void this.safeStopAudioOutput();
    }
    this.userSpeaking = true;
    this.transition('user_speaking', 'interrupted');
  }

  private async safeCloseAsr(): Promise<void> {
    const capture = this.activeCapture;
    const session = this.asrSession;
    this.activeCapture = undefined;
    this.asrSession = undefined;
    if (!session) return;
    if (capture) {
      for (const off of capture.inputCleanups) off();
      for (const off of capture.asrCleanups) off();
      capture.inputCleanups = [];
      capture.asrCleanups = [];
    }
    try {
      await session.close();
    } catch {
      /* best-effort */
    }
  }

  // -- internal: helpers --------------------------------------------------

  /** True while the session can still legitimately advance the conversation. */
  private isActive(): boolean {
    return (
      !this.disposed &&
      this.state !== 'finished' &&
      this.state !== 'error' &&
      this.state !== 'paused'
    );
  }

  private currentUserTurnId(): string {
    if (!this.activeUserTurnId) this.activeUserTurnId = this.generateId();
    return this.activeUserTurnId;
  }

  private resultDurationMs(result: ASRResult): number | undefined {
    if (result.startMs !== undefined && result.endMs !== undefined) {
      return Math.max(0, result.endMs - result.startMs);
    }
    return undefined;
  }

  private emitTurnAdded(): void {
    const turn = this.transcript.last();
    if (turn) this.emit('turn', { turn });
  }

  private emit<K extends keyof VoiceSessionEventMap>(
    event: K,
    payload: VoiceSessionEventMap[K],
  ): void {
    this.emitter.emit(event, payload);
  }

  private transition(to: VoiceSessionState, reason?: string): void {
    const from = this.machine.transition(to);
    this.emit('statechange', {
      from,
      to,
      ...(reason !== undefined ? { reason } : {}),
    });
  }
}

/**
 * Create a {@link VoiceSession} from a fully wired {@link VoiceSessionConfig}.
 *
 * @param config - Runtime adapter, providers, mode/pipeline, VAD, and policy.
 * @returns A session that must be {@link VoiceSession.dispose | dispose()}d when finished.
 */
export function createVoiceSession(config: VoiceSessionConfig): VoiceSession {
  return new VoiceSession(config);
}

/**
 * Create an OtterVoice session using an explicit, collision-resistant factory name.
 * This is an alias of {@link createVoiceSession}; use it when an application also
 * has a database-level `createVoiceSession` function.
 *
 * @param config - Runtime adapter, providers, mode/pipeline, VAD, and policy.
 * @returns A session that must be {@link VoiceSession.dispose | dispose()}d when finished.
 */
export function createOtterVoiceSession(
  config: VoiceSessionConfig | AudioLLMOnlyVoiceSessionConfig,
): VoiceSession {
  // The audio-only branch never reads providers.llm; keep the original
  // VoiceSession/createVoiceSession public contract unchanged for compatibility.
  return createVoiceSession(config as VoiceSessionConfig);
}
