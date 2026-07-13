import { TypedEmitter } from './emitter';
import { normalizeError, VoiceError } from './errors';
import { StateMachine } from './state-machine';
import { TranscriptBuffer } from './transcript-buffer';
import { TurnDetector } from './turn-detector';
import { UsageMeter } from './usage-meter';
import { BargeInSpeechGate, PlaybackEchoFilter } from './playback-echo-filter';
import { createIdGenerator, defaultNow } from './internal/ids';
import type {
  AudioLLMGenerateOutput,
  ASRResult,
  ASRSession,
  LLMMessage,
  NormalizedVoiceError,
  VoiceSessionConfig,
  VoiceSessionEventMap,
  VoiceSessionState,
  VoiceTurn,
  VoiceUsageSnapshot,
} from './types';

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
  private readonly loudInterruptionGate: BargeInSpeechGate;
  private readonly generateId: () => string;
  private readonly now: () => number;

  private asrSession: ASRSession | undefined;
  private listenCleanups: Array<() => void> = [];
  private activeUserTurnId: string | undefined;
  private turnHandled = false;
  private userSpeaking = false;
  private assistantPlaybackActive = false;
  /** Incremented to cancel an in-flight {@link speakAssistant}. */
  private speakGeneration = 0;
  /** Incremented to cancel a stale {@link handleUserFinalTranscript}. */
  private turnGeneration = 0;
  private disposed = false;
  private finishing = false;
  private turnAudioChunks: ArrayBuffer[] = [];
  private pendingAudioReply: Promise<AudioLLMGenerateOutput> | undefined;
  private turnEndEmitted = false;
  private interruptionTurnActive = false;
  private outputVolumeCleanup: (() => void) | undefined;
  private outputEventCleanups: Array<() => void> = [];
  private tentativeInterruptionStartedAt: number | undefined;
  private tentativeInterruptionSilenceSince: number | undefined;
  private activeAssistantText: string | undefined;
  private interruptionCooldownUntil: number | undefined;

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
    this.loudInterruptionGate = new BargeInSpeechGate({
      volumeThreshold: loudThreshold,
      windowFrames: 10,
      requiredVoicedFrames: 6,
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

  get state(): VoiceSessionState {
    return this.machine.state;
  }

  on<K extends keyof VoiceSessionEventMap>(
    event: K,
    cb: (payload: VoiceSessionEventMap[K]) => void,
  ): () => void {
    return this.emitter.on(event, cb);
  }

  once<K extends keyof VoiceSessionEventMap>(
    event: K,
    cb: (payload: VoiceSessionEventMap[K]) => void,
  ): () => void {
    return this.emitter.once(event, cb);
  }

  off<K extends keyof VoiceSessionEventMap>(
    event: K,
    cb: (payload: VoiceSessionEventMap[K]) => void,
  ): void {
    this.emitter.off(event, cb);
  }

  getTurns(): VoiceTurn[] {
    return this.transcript.all();
  }

  getUsage(): VoiceUsageSnapshot {
    return this.usage.snapshot();
  }

  // -- lifecycle ----------------------------------------------------------

  /**
   * Begin the session. Speaks the initial assistant message (from the agent
   * plugin or `initialPrompt`) and then, unless disabled, opens the mic.
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
    if (this.disposed || this.state === 'finished' || this.state === 'error') {
      return;
    }
    this.cleanupListening();
    this.activeUserTurnId = this.generateId();
    this.turnHandled = false;
    this.userSpeaking = false;
    this.detector.reset();
    this.interruptionDetector.reset();
    this.playbackEchoFilter.reset();
    this.interruptionTurnActive = false;
    this.bargeInSpeechGate.reset();
    this.clearTentativeInterruption();
    this.turnAudioChunks = [];
    this.pendingAudioReply = undefined;
    this.turnEndEmitted = false;

    // Create and fully wire the ASR + audio listeners *before* announcing the
    // `listening` state, so a chunk that arrives the instant we are listening
    // cannot race ahead of the wiring.
    let session: ASRSession;
    try {
      session = await this.config.providers.asr.createSession({
        ...(this.config.language !== undefined
          ? { language: this.config.language }
          : {}),
        interimResults: true,
        endpointing: true,
      });
    } catch (err) {
      this.fail(err, 'asr_connection_failed');
      return;
    }
    this.asrSession = session;

    this.listenCleanups.push(
      session.onPartial((r) => this.onAsrPartial(r)),
      session.onFinal((r) => {
        void this.onAsrFinal(r);
      }),
      session.onError((e) => this.fail(e)),
    );

    const { audioInput } = this.config.runtime;
    this.listenCleanups.push(
      audioInput.onChunk((chunk) => {
        if (this.config.pipeline === 'audio_llm' && chunk.data.byteLength > 0) {
          this.turnAudioChunks.push(chunk.data.slice(0));
        }
        if (!this.shouldForwardAsrAudio()) return;
        void Promise.resolve(this.asrSession?.sendAudio(chunk.data)).catch((e) =>
          this.fail(e),
        );
        if (chunk.durationMs) this.usage.addAsrAudioMs(chunk.durationMs);
      }),
      audioInput.onError((e) => this.fail(e)),
    );
    if (audioInput.onVolume) {
      this.listenCleanups.push(
        audioInput.onVolume((level) => this.onVolume(level)),
      );
    }

    try {
      await audioInput.start({
        sampleRate: 16_000,
        encoding: 'pcm_s16le',
        chunkMs: 100,
      });
      if (this.state !== 'listening') this.transition('listening');
    } catch (err) {
      this.fail(err, 'microphone_unavailable');
    }
  }

  /**
   * Manually end the current user turn (push-to-talk release, or a UI "done"
   * button). Flushes the ASR session so its final result drives the loop.
   */
  async endUserTurn(): Promise<void> {
    if (this.state !== 'listening' && this.state !== 'user_speaking') return;
    try {
      if (!this.turnEndEmitted) {
        this.turnEndEmitted = true;
        this.emit('user_audio_end', { turnId: this.currentUserTurnId(), at: this.now() });
      }
      if (
        this.config.pipeline === 'audio_llm' &&
        !this.pendingAudioReply &&
        this.turnAudioChunks.length > 0
      ) {
        // Start the speech-to-speech request before waiting for caption ASR.
        // The two providers now run in parallel instead of serially.
        this.pendingAudioReply = this.generateAudioReply();
      }
      await this.asrSession?.stop();
    } catch (err) {
      this.fail(err);
    }
  }

  /**
   * Inject user text directly, bypassing audio/ASR. Useful for text fallback
   * and deterministic flows.
   */
  async submitUserText(text: string): Promise<void> {
    if (this.disposed) return;
    this.turnHandled = true;
    await this.handleUserFinalTranscript(text);
  }

  async pause(): Promise<void> {
    if (!this.machine.can('paused')) return;
    this.transition('paused');
    this.cleanupListening();
    await this.safeStopAudioInput();
    await this.safeStopAudioOutput();
  }

  async resume(): Promise<void> {
    if (this.state !== 'paused') return;
    await this.startListening();
  }

  /** End the session normally, emitting a final usage snapshot. */
  async finish(reason = 'finished'): Promise<void> {
    await this.finishInternal(reason);
  }

  /** Tear everything down and drop all listeners. */
  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
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

  private async speakAssistant(text: string): Promise<void> {
    const generation = ++this.speakGeneration;
    if (
      this.config.mode === 'full_duplex' &&
      this.config.policy?.autoStartListening !== false &&
      !this.asrSession
    ) {
      await this.startListening();
    }
    if (generation !== this.speakGeneration || !this.isActive()) return;
    const turnId = this.generateId();
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
    this.assistantPlaybackActive = true;
    try {
      await this.config.runtime.audioOutput.play(playInput);
    } finally {
      this.assistantPlaybackActive = false;
    }
    if (generation !== this.speakGeneration || !this.isActive()) return;
    this.emit('assistant_audio_end', { turnId });
    this.activeAssistantText = undefined;
    if (this.config.mode === 'full_duplex' && this.state === 'assistant_speaking') {
      await this.asrSession?.resetAudio?.();
      this.resetTurnAudio();
      this.transition('listening');
    }
  }

  // -- internal: ASR / turn detection ------------------------------------

  private onAsrPartial(result: ASRResult): void {
    if (this.state === 'assistant_speaking') {
      if (
        this.tentativeInterruptionStartedAt === undefined ||
        !this.shouldConfirmInterruptionFromAsr(result.text, this.now())
      ) {
        return;
      }
      this.confirmInterruption(this.now());
    }
    if (!this.userSpeaking && this.state === 'listening') {
      this.userSpeaking = true;
      this.transition('user_speaking');
    }
    this.emit('asr_partial', {
      text: result.text,
      turnId: this.currentUserTurnId(),
      ...(result.confidence !== undefined
        ? { confidence: result.confidence }
        : {}),
    });
  }

  private async onAsrFinal(result: ASRResult): Promise<void> {
    if (this.turnHandled) return;
    if (this.state === 'assistant_speaking') {
      if (
        this.tentativeInterruptionStartedAt === undefined ||
        !this.shouldConfirmInterruptionFromAsr(result.text, this.now())
      ) {
        return;
      }
      this.confirmInterruption(this.now());
    }
    this.turnHandled = true;
    const durationMs = this.resultDurationMs(result);
    this.emit('asr_final', {
      text: result.text,
      turnId: this.currentUserTurnId(),
      ...(result.confidence !== undefined
        ? { confidence: result.confidence }
        : {}),
      ...(durationMs !== undefined ? { durationMs } : {}),
    });
    if (durationMs !== undefined) this.usage.addUserSpeechMs(durationMs);
    await this.handleUserFinalTranscript(result.text);
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
      if (
        this.playbackEchoFilter.isReady(now) &&
        this.bargeInSpeechGate.push(residual)
      ) {
        this.bargeInSpeechGate.reset();
        this.beginTentativeInterruption(now);
      }
      return;
    }

    const activeDetector = this.interruptionTurnActive
      ? this.interruptionDetector
      : this.detector;
    const event = activeDetector.pushVolume(level, now);
    if (!event) return;
    if (event === 'speech_start') {
      if (!this.userSpeaking && this.state === 'listening') {
        this.userSpeaking = true;
        this.transition('user_speaking');
      }
      return;
    }
    // speech_end | max_turn → flush ASR for endpointing.
    this.interruptionTurnActive = false;
    this.bargeInSpeechGate.reset();
    void this.endUserTurn();
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
    this.clearTentativeInterruption();
    this.interruptionTurnActive = true;
    this.interruptionDetector.forceSpeechStart(now);
    this.interruptAssistant();
  }

  private resumeFalseInterruption(now: number): void {
    const resume = this.config.runtime.audioOutput.resume;
    this.clearTentativeInterruption();
    this.bargeInSpeechGate.reset();
    this.interruptionCooldownUntil =
      now + (this.config.policy?.interruptionCooldownMs ?? 800);
    this.playbackEchoFilter.start(now);
    if (!resume) return;
    void resume.call(this.config.runtime.audioOutput).catch(() => {
      this.clearTentativeInterruption();
    });
  }

  private clearTentativeInterruption(): void {
    this.tentativeInterruptionStartedAt = undefined;
    this.tentativeInterruptionSilenceSince = undefined;
    this.loudInterruptionGate.reset();
  }

  private async prepareAssistantPlayback(): Promise<void> {
    this.loudInterruptionGate.reset();
    await this.asrSession?.resetAudio?.();
  }

  private shouldForwardAsrAudio(): boolean {
    if (this.state !== 'assistant_speaking') return true;
    return this.tentativeInterruptionStartedAt !== undefined;
  }

  private interruptionTailIgnoreMs(): number {
    return this.config.policy?.interruptionTailIgnoreMs ?? 600;
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
    const text = rawText.trim();
    if (!text) return false;
    const words = text.split(/\s+/u).filter(Boolean);
    if (words.length >= 2) return true;
    // Languages commonly written without spaces need two visible characters.
    return !text.includes(' ') && Array.from(text).length >= 2;
  }

  private async handleUserFinalTranscript(rawText: string): Promise<void> {
    const turnGen = ++this.turnGeneration;
    const text = rawText.trim();
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

    this.transition('processing');
    this.transcript.add({
      id: this.currentUserTurnId(),
      role: 'user',
      text,
    });
    this.emitTurnAdded();

    if (this.isSessionExpired()) {
      await this.finishInternal('max_session_duration');
      return;
    }

    if (this.config.pipeline === 'audio_llm') {
      try {
        const reply = await (this.pendingAudioReply ?? this.generateAudioReply());
        this.usage.addLlmUsage(reply.usage);
        await this.speakAudioAssistant(reply);
      } catch (err) {
        this.fail(err, 'llm_failed');
        return;
      }
    } else {
      let reply: string;
      try {
        reply = await this.generateReply(text);
      } catch (err) {
        this.fail(err, 'llm_failed');
        return;
      }
      if (!this.isActive()) return;

      try {
        await this.speakAssistant(reply);
      } catch (err) {
        this.fail(err, 'tts_failed');
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

  private async generateReply(lastUserText: string): Promise<string> {
    if (this.config.agent) {
      return this.config.agent.generateNextAssistantMessage({
        turns: this.transcript.all(),
        lastUserText,
      });
    }
    const input: { system?: string; messages: LLMMessage[] } = {
      messages: this.transcript.toMessages(),
    };
    const result = await this.config.providers.llm.generate(input);
    this.usage.addLlmUsage(result.usage);
    return result.text;
  }

  private async generateAudioReply(): Promise<AudioLLMGenerateOutput> {
    const provider = this.config.providers.audioLlm;
    if (!provider) {
      throw new VoiceError({
        code: 'invalid_state',
        message: 'pipeline "audio_llm" requires providers.audioLlm',
        retryable: false,
      });
    }
    const total = this.turnAudioChunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
    const joined = new Uint8Array(total);
    let offset = 0;
    for (const chunk of this.turnAudioChunks) {
      joined.set(new Uint8Array(chunk), offset);
      offset += chunk.byteLength;
    }
    return provider.generate({
      audio: joined.buffer,
      format: 'webm',
      messages: this.transcript.toMessages(),
      ...(this.config.audioLlmSystemPrompt
        ? { system: this.config.audioLlmSystemPrompt }
        : {}),
      ...(this.config.audioLlmMaxTokens !== undefined
        ? { maxTokens: this.config.audioLlmMaxTokens }
        : {}),
      temperature: 0.45,
    });
  }

  private async speakAudioAssistant(reply: AudioLLMGenerateOutput): Promise<void> {
    const generation = ++this.speakGeneration;
    if (
      this.config.mode === 'full_duplex' &&
      this.config.policy?.autoStartListening !== false &&
      !this.asrSession
    ) {
      await this.startListening();
    }
    if (generation !== this.speakGeneration || !this.isActive()) return;
    const turnId = this.generateId();
    this.transcript.add({ id: turnId, role: 'assistant', text: reply.text });
    this.emitTurnAdded();
    this.emit('assistant_text', { text: reply.text, turnId });
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
    } finally {
      this.assistantPlaybackActive = false;
    }
    if (generation !== this.speakGeneration || !this.isActive()) return;
    this.emit('assistant_audio_end', { turnId });
    this.activeAssistantText = undefined;
    if (this.config.mode === 'full_duplex' && this.state === 'assistant_speaking') {
      await this.asrSession?.resetAudio?.();
      this.resetTurnAudio();
      this.transition('listening');
    }
  }

  private resetTurnAudio(): void {
    const containerHeader = this.turnAudioChunks[0];
    this.turnAudioChunks = containerHeader ? [containerHeader] : [];
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

  // -- internal: teardown -------------------------------------------------

  private async finishInternal(reason: string): Promise<void> {
    if (this.finishing || this.state === 'finished') return;
    if (!this.machine.can('finished')) return;
    this.finishing = true;
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
  ): void {
    const normalized = normalizeError(error, fallbackCode);
    this.emit('error', normalized);
    this.cleanupListening();
    void this.safeStopAudioInput();
    void this.safeCloseAsr();
    if (this.machine.can('error')) this.transition('error', normalized.message);
  }

  private cleanupListening(): void {
    for (const off of this.listenCleanups) off();
    this.listenCleanups = [];
  }

  private async safeStopAudioInput(): Promise<void> {
    try {
      await this.config.runtime.audioInput.stop();
    } catch {
      /* best-effort */
    }
  }

  private async safeStopAudioOutput(): Promise<void> {
    this.clearTentativeInterruption();
    try {
      await this.config.runtime.audioOutput.stop();
    } catch {
      /* best-effort */
    } finally {
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
    this.turnGeneration += 1;
    this.turnHandled = false;
    if (this.assistantPlaybackActive) {
      void this.safeStopAudioOutput();
    }
    this.userSpeaking = true;
    this.transition('user_speaking', 'interrupted');
  }

  private async safeCloseAsr(): Promise<void> {
    const session = this.asrSession;
    this.asrSession = undefined;
    if (!session) return;
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

/** Factory mirroring the documented public API. */
export function createVoiceSession(config: VoiceSessionConfig): VoiceSession {
  return new VoiceSession(config);
}
