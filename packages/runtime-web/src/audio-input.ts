import {
  createVoiceError,
  type AudioChunk,
  type AudioInputAdapter,
  type AudioInputOptions,
  type NormalizedVoiceError,
} from '@ottervoice/core';

/** Minimal `MediaStreamTrack` surface used to stop capture. */
export interface MediaTrackLike {
  /** End this track (releases the microphone). */
  stop(): void;
}

/** Minimal `MediaStream` surface used by {@link WebAudioInput}. */
export interface MediaStreamLike {
  /** Tracks belonging to the stream (mic, etc.). */
  getTracks(): MediaTrackLike[];
}

/** Minimal `Blob` surface for MediaRecorder `dataavailable` payloads. */
export interface BlobLike {
  /** Byte length of the blob. */
  size: number;
  /** Copy blob contents into an ArrayBuffer. */
  arrayBuffer(): Promise<ArrayBuffer>;
}

/**
 * Minimal `MediaRecorder` surface for chunked mic encoding.
 * Injected via {@link WebAudioInputOptions.mediaRecorder} / browser global.
 */
export interface MediaRecorderLike {
  /** Begin encoding; optional timeslice (ms) for periodic `dataavailable` events. */
  start(timeslice?: number): void;
  /** Stop encoding and release the recorder. */
  stop(): void;
  /** Pause encoding without ending the recording. */
  pause(): void;
  /** Resume after {@link MediaRecorderLike.pause}. */
  resume(): void;
  /** Subscribe to recorder events (e.g. `dataavailable`, `error`, `stop`). */
  addEventListener(type: string, listener: (event: any) => void): void;
}

/** Constructor for {@link MediaRecorderLike} (browser `MediaRecorder`). */
export type MediaRecorderCtor = new (
  stream: MediaStreamLike,
  options?: { mimeType?: string },
) => MediaRecorderLike;

/** `navigator.mediaDevices.getUserMedia`-compatible capture entry point. */
export type GetUserMedia = (constraints: unknown) => Promise<MediaStreamLike>;

/** Minimal `AnalyserNode` surface for time-domain RMS metering. */
export interface AnalyserNodeLike {
  /** FFT size controlling analyser resolution. */
  fftSize: number;
  /** Number of bins available from {@link AnalyserNodeLike.getByteTimeDomainData}. */
  frequencyBinCount: number;
  /** Fill `array` with uint8 time-domain samples. */
  getByteTimeDomainData(array: Uint8Array): void;
}

/** Minimal `AudioContext` surface for mic metering (not full Web Audio). */
export interface AudioContextLike {
  createMediaStreamSource(stream: MediaStreamLike): { connect(node: AnalyserNodeLike): void };
  createAnalyser(): AnalyserNodeLike;
  close(): Promise<void>;
}

/** Constructor for {@link AudioContextLike} (browser `AudioContext`). */
export type AudioContextCtor = new () => AudioContextLike;

/**
 * Injected primitives and timing knobs for {@link WebAudioInput}.
 * Prefer {@link createWebRuntime} to wire browser globals; construct directly
 * only when substituting stubs or a custom capture stack.
 */
export interface WebAudioInputOptions {
  /** Microphone permission + stream factory (`getUserMedia`). */
  getUserMedia: GetUserMedia;
  /** Encoder constructor (`MediaRecorder`). */
  mediaRecorder: MediaRecorderCtor;
  /** MIME type for the recorder, e.g. `audio/webm`. */
  mimeType?: string;
  /** Emit a chunk every N ms (MediaRecorder timeslice). Default 100. */
  timesliceMs?: number;
  /** Poll microphone RMS level every N ms for VAD. Default 50. */
  volumePollMs?: number;
  /** Encoded audio retained while playback is filtered for barge-in. Default 500 ms. */
  bargeInPreRollMs?: number;
  /** Override AudioContext (defaults to the browser global). */
  audioContext?: AudioContextCtor;
  /** Override clock used for chunk timestamps and timers (tests). */
  now?: () => number;
}

/**
 * Microphone capture via `getUserMedia` + `MediaRecorder` timeslices. Suitable
 * for near-real-time ASR; streaming PCM (AudioWorklet) is a future enhancement.
 *
 * When an {@link AudioContext} is available, {@link WebAudioInput.onVolume}
 * reports RMS levels for rule-based turn detection.
 *
 * Platform primitives are injected; {@link createWebRuntime} supplies the
 * browser globals by default.
 */
export class WebAudioInput implements AudioInputAdapter {
  private readonly chunkCbs = new Set<(chunk: AudioChunk) => void>();
  private readonly volumeCbs = new Set<(level: number) => void>();
  private readonly errorCbs = new Set<(error: NormalizedVoiceError) => void>();
  private readonly now: () => number;
  private readonly timesliceMs: number;
  private readonly volumePollMs: number;
  private readonly bargeInPreRollChunks: number;
  private stream: MediaStreamLike | undefined;
  private recorder: MediaRecorderLike | undefined;
  private recorderStopped: Promise<void> | undefined;
  private pendingData = Promise.resolve();
  private audioContext: AudioContextLike | undefined;
  private volumeTimer: ReturnType<typeof setInterval> | undefined;
  private captureSuspended = false;
  private hasDeliveredChunk = false;
  private suspendedContainerHeader: AudioChunk | undefined;
  private suspendedPreRoll: AudioChunk[] = [];

  constructor(private readonly options: WebAudioInputOptions) {
    this.now = options.now ?? Date.now;
    this.timesliceMs = options.timesliceMs ?? 100;
    this.volumePollMs = options.volumePollMs ?? 50;
    this.bargeInPreRollChunks = Math.max(
      1,
      Math.ceil((options.bargeInPreRollMs ?? 500) / this.timesliceMs),
    );
  }

  async requestPermission(): Promise<boolean> {
    try {
      const stream = await this.options.getUserMedia({ audio: true });
      for (const track of stream.getTracks()) track.stop();
      return true;
    } catch {
      return false;
    }
  }

  async start(options: AudioInputOptions = {}): Promise<void> {
    this.captureSuspended = false;
    this.hasDeliveredChunk = false;
    this.suspendedContainerHeader = undefined;
    this.suspendedPreRoll = [];
    this.pendingData = Promise.resolve();
    let stream: MediaStreamLike;
    try {
      stream = await this.options.getUserMedia({
        audio: {
          echoCancellation: options.echoCancellation ?? true,
          noiseSuppression: options.noiseSuppression ?? true,
          autoGainControl: options.autoGainControl ?? true,
        },
      });
    } catch (err) {
      throw createVoiceError('microphone_unavailable', 'getUserMedia failed', {
        raw: err,
      });
    }
    this.stream = stream;
    this.startRecorder(stream);
    this.startVolumeMonitor(stream);
  }

  private startRecorder(stream: MediaStreamLike): void {
    this.pendingData = Promise.resolve();
    const recorder = this.options.mimeType
      ? new this.options.mediaRecorder(stream, { mimeType: this.options.mimeType })
      : new this.options.mediaRecorder(stream);
    let resolveRecorderStopped!: () => void;
    this.recorderStopped = new Promise<void>((resolve) => {
      resolveRecorderStopped = resolve;
    });

    recorder.addEventListener('dataavailable', (event: { data?: BlobLike }) => {
      // Blob.arrayBuffer() completion order is not guaranteed. Reading each
      // timeslice concurrently can therefore reorder an otherwise valid WebM
      // stream, which is much easier to trigger on resource-constrained mobile
      // browsers. Serialize conversion in event order and remember whether the
      // chunk arrived while capture delivery was suspended.
      const capturedWhileSuspended = this.captureSuspended;
      this.pendingData = this.pendingData
        .then(() => this.handleData(event.data, capturedWhileSuspended))
        .catch((err) => {
          this.emitError(
            createVoiceError('microphone_unavailable', 'failed to read recorded audio', {
              raw: err,
            }),
          );
        });
    });
    recorder.addEventListener('stop', () => {
      resolveRecorderStopped();
    });
    recorder.addEventListener('error', () => {
      this.emitError(createVoiceError('microphone_unavailable', 'recorder error'));
      resolveRecorderStopped();
    });
    recorder.start(this.timesliceMs);
    this.recorder = recorder;
  }

  private async stopRecorder(): Promise<void> {
    const recorder = this.recorder;
    const recorderStopped = this.recorderStopped;
    this.recorder = undefined;
    this.recorderStopped = undefined;
    recorder?.stop();
    await recorderStopped;
    await this.pendingData;
  }

  private startVolumeMonitor(stream: MediaStreamLike): void {
    const AC =
      this.options.audioContext ??
      (globalThis as unknown as { AudioContext?: AudioContextCtor }).AudioContext;
    if (!AC) return;

    const ctx = new AC();
    this.audioContext = ctx;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);

    this.volumeTimer = setInterval(() => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i += 1) {
        const sample = (data[i]! - 128) / 128;
        sum += sample * sample;
      }
      const level = Math.sqrt(sum / data.length);
      for (const cb of [...this.volumeCbs]) cb(level);
    }, this.volumePollMs);
  }

  private async handleData(
    blob: BlobLike | undefined,
    capturedWhileSuspended: boolean,
  ): Promise<void> {
    if (!blob || blob.size === 0) return;
    const data = await blob.arrayBuffer();
    const chunk: AudioChunk = { data, timestamp: this.now() };
    if (this.options.mimeType !== undefined) chunk.encoding = this.options.mimeType;
    if (capturedWhileSuspended) {
      // MediaRecorder.pause() drops the beginning of a barge-in because VAD
      // needs several foreground frames before it can confirm the user. Keep
      // recording, but withhold a bounded tail until the core decides whether
      // this was real speech or loudspeaker echo.
      if (!this.hasDeliveredChunk && !this.suspendedContainerHeader) {
        this.suspendedContainerHeader = chunk;
        return;
      }
      this.suspendedPreRoll.push(chunk);
      if (this.suspendedPreRoll.length > this.bargeInPreRollChunks) {
        this.suspendedPreRoll.shift();
      }
      return;
    }
    this.emitChunk(chunk);
  }

  async stop(): Promise<void> {
    if (this.volumeTimer !== undefined) {
      clearInterval(this.volumeTimer);
      this.volumeTimer = undefined;
    }
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = undefined;
    }
    const stream = this.stream;
    this.stream = undefined;
    // MediaRecorder emits its last dataavailable event before stop. Wait for
    // that event and every ordered Blob.arrayBuffer() before stopping the
    // source tracks. Closing tracks first can truncate the final WebM cluster
    // on mobile Chrome.
    await this.stopRecorder();
    if (stream) {
      for (const track of stream.getTracks()) track.stop();
    }
    this.captureSuspended = false;
    this.suspendedContainerHeader = undefined;
    this.suspendedPreRoll = [];
  }

  async pause(): Promise<void> {
    await this.suspendCapture();
  }

  async resume(): Promise<void> {
    await this.resumeCapture();
  }

  async suspendCapture(): Promise<void> {
    // Soft-suspend delivery rather than MediaRecorder itself. RMS monitoring
    // and a short encoded pre-roll stay alive so confirmed barge-in speech
    // includes its opening syllables.
    this.captureSuspended = true;
    this.suspendedContainerHeader = undefined;
    this.suspendedPreRoll = [];
  }

  async resumeCapture(options: { includePreRoll?: boolean } = {}): Promise<void> {
    if (!this.captureSuspended) return;
    if (!options.includePreRoll) {
      // Dropping encoded clusters recorded during assistant playback leaves a
      // timestamp hole after the original WebM header. Desktop Chromium often
      // tolerates that splice, while Android Chrome's decoder may reject it.
      // Finalize and discard the suspended recorder, then resume with a fresh,
      // independently decodable WebM container on the same microphone stream.
      await this.stopRecorder();
      this.suspendedContainerHeader = undefined;
      this.suspendedPreRoll = [];
      this.hasDeliveredChunk = false;
      this.captureSuspended = false;
      if (this.stream) this.startRecorder(this.stream);
      return;
    }
    // A confirmed barge-in keeps the current container header and bounded
    // pre-roll so the user's opening syllables are not lost.
    const buffered = [
      ...(this.suspendedContainerHeader ? [this.suspendedContainerHeader] : []),
      ...this.suspendedPreRoll,
    ];
    this.captureSuspended = false;
    this.suspendedContainerHeader = undefined;
    this.suspendedPreRoll = [];
    for (const chunk of buffered) this.emitChunk(chunk);
  }

  private emitChunk(chunk: AudioChunk): void {
    this.hasDeliveredChunk = true;
    for (const cb of [...this.chunkCbs]) cb(chunk);
  }

  private emitError(error: NormalizedVoiceError): void {
    for (const cb of [...this.errorCbs]) cb(error);
  }

  onChunk(cb: (chunk: AudioChunk) => void): () => void {
    this.chunkCbs.add(cb);
    return () => this.chunkCbs.delete(cb);
  }

  onVolume(cb: (level: number) => void): () => void {
    this.volumeCbs.add(cb);
    return () => this.volumeCbs.delete(cb);
  }

  onError(cb: (error: NormalizedVoiceError) => void): () => void {
    this.errorCbs.add(cb);
    return () => this.errorCbs.delete(cb);
  }
}
