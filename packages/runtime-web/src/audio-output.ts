import {
  createVoiceError,
  type AudioOutputAdapter,
  type AudioPlaybackInput,
  type NormalizedVoiceError,
} from '@ottervoice/core';

export interface AudioElementLike {
  src: string;
  volume: number;
  play(): Promise<void>;
  pause(): void;
  addEventListener(type: string, listener: () => void): void;
}

export interface WebAudioOutputOptions {
  /** Create a playback element (default `() => new Audio()` in the browser). */
  createAudio: () => AudioElementLike;
  /** Required for `audioBuffer` playback; turns a Blob into a URL. */
  createObjectURL?: (blob: Blob) => string;
  revokeObjectURL?: (url: string) => void;
}

/**
 * Playback via an `HTMLAudioElement`. `audioUrl` plays directly; an
 * `audioBuffer` is wrapped in an object URL (which requires `createObjectURL`).
 */
export class WebAudioOutput implements AudioOutputAdapter {
  private readonly startCbs = new Set<() => void>();
  private readonly endCbs = new Set<() => void>();
  private readonly errorCbs = new Set<(error: NormalizedVoiceError) => void>();
  private current: AudioElementLike | undefined;

  constructor(private readonly options: WebAudioOutputOptions) {}

  async play(input: AudioPlaybackInput): Promise<void> {
    let objectUrl: string | undefined;
    let url: string;
    if (input.audioUrl !== undefined) {
      url = input.audioUrl;
    } else {
      if (!this.options.createObjectURL) {
        throw createVoiceError(
          'audio_playback_failed',
          'audioBuffer playback requires createObjectURL',
        );
      }
      const blob = new Blob([input.audioBuffer ?? new ArrayBuffer(0)], {
        type: input.mimeType ?? 'audio/mpeg',
      });
      objectUrl = this.options.createObjectURL(blob);
      url = objectUrl;
    }

    const el = this.options.createAudio();
    this.current = el;
    el.src = url;
    if (input.volume !== undefined) el.volume = input.volume;

    const finished = new Promise<void>((resolve, reject) => {
      el.addEventListener('ended', () => {
        this.fire(this.endCbs);
        resolve();
      });
      el.addEventListener('error', () => {
        const error = createVoiceError('audio_playback_failed', 'playback error');
        this.emitError(error);
        reject(error);
      });
    });

    try {
      try {
        await el.play();
      } catch (err) {
        const error = createVoiceError('audio_playback_failed', 'play() rejected', {
          raw: err,
        });
        this.emitError(error);
        throw error;
      }
      this.fire(this.startCbs);
      await finished;
    } finally {
      if (objectUrl !== undefined) this.options.revokeObjectURL?.(objectUrl);
      this.current = undefined;
    }
  }

  async stop(): Promise<void> {
    this.current?.pause();
    this.current = undefined;
  }

  private fire(cbs: Set<() => void>): void {
    for (const cb of [...cbs]) cb();
  }

  private emitError(error: NormalizedVoiceError): void {
    for (const cb of [...this.errorCbs]) cb(error);
  }

  onStart(cb: () => void): () => void {
    this.startCbs.add(cb);
    return () => this.startCbs.delete(cb);
  }

  onEnd(cb: () => void): () => void {
    this.endCbs.add(cb);
    return () => this.endCbs.delete(cb);
  }

  onError(cb: (error: NormalizedVoiceError) => void): () => void {
    this.errorCbs.add(cb);
    return () => this.errorCbs.delete(cb);
  }
}
