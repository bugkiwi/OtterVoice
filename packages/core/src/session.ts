import { TypedEmitter } from './emitter';
import { normalizeError, VoiceError } from './errors';
import { StateMachine } from './state-machine';
import { TranscriptBuffer } from './transcript-buffer';
import { TurnDetector } from './turn-detector';
import { UsageMeter } from './usage-meter';
import { createIdGenerator, defaultNow } from './internal/ids';
import type {
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
 * Half-duplex voice conversation session.
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
  private readonly generateId: () => string;
  private readonly now: () => number;

  private asrSession: ASRSession | undefined;
  private listenCleanups: Array<() => void> = [];
  private activeUserTurnId: string | undefined;
  private turnHandled = false;
  private userSpeaking = false;
  private disposed = false;
  private finishing = false;

  constructor(private readonly config: VoiceSessionConfig) {
    this.generateId = config.generateId ?? createIdGenerator('turn');
    this.now = config.now ?? defaultNow;
    this.transcript = new TranscriptBuffer(this.generateId, this.now);
    this.usage = new UsageMeter(this.now);
    this.detector = new TurnDetector(config.turnDetection);
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
      if (this.config.policy?.autoStartListening !== false) {
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

    // Create and fully wire the ASR + audio listeners *before* announcing the
    // `listening` state, so a chunk that arrives the instant we are listening
    // cannot race ahead of the wiring.
    let session: ASRSession;
    try {
      session = await this.config.providers.asr.createSession({
        language: 'en',
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

    if (this.state !== 'listening') this.transition('listening');

    try {
      await audioInput.start({
        sampleRate: 16_000,
        encoding: 'pcm_s16le',
        chunkMs: 100,
      });
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
    this.transition('assistant_speaking');
    const turnId = this.generateId();
    this.transcript.add({ id: turnId, role: 'assistant', text });
    this.emitTurnAdded();
    this.emit('assistant_text', { text, turnId });
    this.usage.addAssistantSpeechChars(text.length);

    const tts = this.config.providers.tts;
    if (!tts) return;

    const audio = await tts.synthesize({ text, format: 'mp3' });
    this.usage.addTtsChars(text.length);

    this.emit('assistant_audio_start', { turnId });
    const playInput =
      audio.audioUrl !== undefined
        ? { audioUrl: audio.audioUrl, mimeType: audio.mimeType }
        : { audioBuffer: audio.audioBuffer, mimeType: audio.mimeType };
    await this.config.runtime.audioOutput.play(playInput);
    this.emit('assistant_audio_end', { turnId });
  }

  // -- internal: ASR / turn detection ------------------------------------

  private onAsrPartial(result: ASRResult): void {
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
    const event = this.detector.pushVolume(level, this.now());
    if (!event) return;
    if (event === 'speech_start') {
      if (!this.userSpeaking && this.state === 'listening') {
        this.userSpeaking = true;
        this.transition('user_speaking');
      }
      return;
    }
    // speech_end | max_turn → flush ASR for endpointing.
    void this.endUserTurn();
  }

  private async handleUserFinalTranscript(rawText: string): Promise<void> {
    const text = rawText.trim();
    this.cleanupListening();
    await this.safeStopAudioInput();
    await this.safeCloseAsr();

    // The session may have been finished/disposed/errored while we awaited.
    if (!this.isActive()) return;

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
    if (!this.isActive()) return;

    if (this.shouldFinishAfterTurn()) {
      await this.finishInternal('agent_finished');
      return;
    }

    if (this.config.policy?.autoStartListening !== false) {
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
    try {
      await this.config.runtime.audioOutput.stop();
    } catch {
      /* best-effort */
    }
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
