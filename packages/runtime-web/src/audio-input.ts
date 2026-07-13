import {
  createVoiceError,
  type AudioChunk,
  type AudioInputAdapter,
  type AudioInputOptions,
  type NormalizedVoiceError,
} from '@ottervoice/core';

export interface MediaTrackLike {
  stop(): void;
}
export interface MediaStreamLike {
  getTracks(): MediaTrackLike[];
}
export interface BlobLike {
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}
export interface MediaRecorderLike {
  start(timeslice?: number): void;
  stop(): void;
  pause(): void;
  resume(): void;
  addEventListener(type: string, listener: (event: any) => void): void;
}
export type MediaRecorderCtor = new (
  stream: MediaStreamLike,
  options?: { mimeType?: string },
) => MediaRecorderLike;
export type GetUserMedia = (constraints: unknown) => Promise<MediaStreamLike>;

export interface AnalyserNodeLike {
  fftSize: number;
  frequencyBinCount: number;
  getByteTimeDomainData(array: Uint8Array): void;
}

export interface AudioContextLike {
  createMediaStreamSource(stream: MediaStreamLike): { connect(node: AnalyserNodeLike): void };
  createAnalyser(): AnalyserNodeLike;
  close(): Promise<void>;
}

export type AudioContextCtor = new () => AudioContextLike;

export interface WebAudioInputOptions {
  getUserMedia: GetUserMedia;
  mediaRecorder: MediaRecorderCtor;
  /** MIME type for the recorder, e.g. `audio/webm`. */
  mimeType?: string;
  /** Emit a chunk every N ms (MediaRecorder timeslice). Default 100. */
  timesliceMs?: number;
  /** Poll microphone RMS level every N ms for VAD. Default 50. */
  volumePollMs?: number;
  /** Override AudioContext (defaults to the browser global). */
  audioContext?: AudioContextCtor;
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
  private stream: MediaStreamLike | undefined;
  private recorder: MediaRecorderLike | undefined;
  private audioContext: AudioContextLike | undefined;
  private volumeTimer: ReturnType<typeof setInterval> | undefined;

  constructor(private readonly options: WebAudioInputOptions) {
    this.now = options.now ?? Date.now;
    this.timesliceMs = options.timesliceMs ?? 100;
    this.volumePollMs = options.volumePollMs ?? 50;
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
    const recorder = this.options.mimeType
      ? new this.options.mediaRecorder(stream, { mimeType: this.options.mimeType })
      : new this.options.mediaRecorder(stream);

    recorder.addEventListener('dataavailable', (event: { data?: BlobLike }) => {
      void this.handleData(event.data);
    });
    recorder.addEventListener('error', () => {
      this.emitError(createVoiceError('microphone_unavailable', 'recorder error'));
    });
    recorder.start(this.timesliceMs);
    this.recorder = recorder;
    this.startVolumeMonitor(stream);
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

  private async handleData(blob: BlobLike | undefined): Promise<void> {
    if (!blob || blob.size === 0) return;
    const data = await blob.arrayBuffer();
    const chunk: AudioChunk = { data, timestamp: this.now() };
    if (this.options.mimeType !== undefined) chunk.encoding = this.options.mimeType;
    for (const cb of [...this.chunkCbs]) cb(chunk);
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
    this.recorder?.stop();
    this.recorder = undefined;
    if (this.stream) {
      for (const track of this.stream.getTracks()) track.stop();
      this.stream = undefined;
    }
  }

  async pause(): Promise<void> {
    this.recorder?.pause();
  }

  async resume(): Promise<void> {
    this.recorder?.resume();
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
