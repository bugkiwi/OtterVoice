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

export interface WebAudioInputOptions {
  getUserMedia: GetUserMedia;
  mediaRecorder: MediaRecorderCtor;
  /** MIME type for the recorder, e.g. `audio/webm`. */
  mimeType?: string;
  /** Emit a chunk every N ms (MediaRecorder timeslice). Default 100. */
  timesliceMs?: number;
  now?: () => number;
}

/**
 * Microphone capture via `getUserMedia` + `MediaRecorder` timeslices. Suitable
 * for near-real-time ASR; streaming PCM (AudioWorklet) is a future enhancement,
 * so this adapter intentionally exposes no `onVolume`.
 *
 * Platform primitives are injected; {@link createWebRuntime} supplies the
 * browser globals by default.
 */
export class WebAudioInput implements AudioInputAdapter {
  private readonly chunkCbs = new Set<(chunk: AudioChunk) => void>();
  private readonly errorCbs = new Set<(error: NormalizedVoiceError) => void>();
  private readonly now: () => number;
  private readonly timesliceMs: number;
  private stream: MediaStreamLike | undefined;
  private recorder: MediaRecorderLike | undefined;

  constructor(private readonly options: WebAudioInputOptions) {
    this.now = options.now ?? Date.now;
    this.timesliceMs = options.timesliceMs ?? 100;
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
  }

  private async handleData(blob: BlobLike | undefined): Promise<void> {
    if (!blob || blob.size === 0) return;
    const data = await blob.arrayBuffer();
    const chunk: AudioChunk = { data, timestamp: this.now() };
    if (this.options.mimeType !== undefined) chunk.encoding = this.options.mimeType;
    for (const cb of [...this.chunkCbs]) cb(chunk);
  }

  async stop(): Promise<void> {
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

  onError(cb: (error: NormalizedVoiceError) => void): () => void {
    this.errorCbs.add(cb);
    return () => this.errorCbs.delete(cb);
  }
}
