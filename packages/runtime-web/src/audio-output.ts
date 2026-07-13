import {
  createVoiceError,
  type AudioOutputAdapter,
  type AudioPlaybackInput,
  type NormalizedVoiceError,
} from '@ottervoice/core';
import type { AudioEnvelope } from './audio-conversion';

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
  /** Decode encoded audio into RMS frames used as an acoustic echo reference. */
  measureAudio?: (audio: ArrayBuffer) => Promise<AudioEnvelope>;
  now?: () => number;
}

/**
 * Playback via an `HTMLAudioElement`. `audioUrl` plays directly; an
 * `audioBuffer` is wrapped in an object URL (which requires `createObjectURL`).
 */
export class WebAudioOutput implements AudioOutputAdapter {
  private readonly startCbs = new Set<() => void>();
  private readonly endCbs = new Set<() => void>();
  private readonly errorCbs = new Set<(error: NormalizedVoiceError) => void>();
  private readonly volumeCbs = new Set<(level: number) => void>();
  private current: AudioElementLike | undefined;
  private playDone: (() => void) | undefined;
  private volumeTimer: ReturnType<typeof setInterval> | undefined;
  private playToken = 0;
  private activeEnvelope: AudioEnvelope | undefined;
  private activeVolume = 1;
  private playbackStartedAt: number | undefined;
  private pausedElapsedMs = 0;
  private playbackPaused = false;

  constructor(private readonly options: WebAudioOutputOptions) {}

  async unlock(): Promise<void> {
    const el = this.options.createAudio();
    // 44-byte WAV header with an empty PCM data section.
    el.src =
      'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAgD4AAIA+AAACABAAZGF0YQAAAAA=';
    el.volume = 0;
    await el.play();
    el.pause();
  }

  async play(input: AudioPlaybackInput): Promise<void> {
    const token = ++this.playToken;
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
    const envelope =
      input.audioBuffer && this.options.measureAudio
        ? this.options.measureAudio(input.audioBuffer.slice(0))
        : undefined;

    const finished = new Promise<void>((resolve, reject) => {
      this.playDone = () => {
        this.playDone = undefined;
        resolve();
      };
      el.addEventListener('ended', () => {
        this.playDone = undefined;
        this.fire(this.endCbs);
        resolve();
      });
      el.addEventListener('error', () => {
        this.playDone = undefined;
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
      const playbackStartedAt = this.options.now?.() ?? Date.now();
      this.playbackStartedAt = playbackStartedAt;
      this.pausedElapsedMs = 0;
      this.playbackPaused = false;
      this.fire(this.startCbs);
      if (envelope) {
        void envelope.then((value) => {
          if (token === this.playToken && this.current === el) {
            this.activeEnvelope = value;
            this.activeVolume = el.volume;
            if (!this.playbackPaused) {
              this.startVolumeMeter(value, el.volume, playbackStartedAt);
            }
          }
        });
      }
      await finished;
    } finally {
      if (token === this.playToken) this.stopVolumeMeter();
      if (objectUrl !== undefined) this.options.revokeObjectURL?.(objectUrl);
      this.current = undefined;
      this.clearPlaybackState();
    }
  }

  async pause(): Promise<void> {
    if (!this.current || this.playbackPaused) return;
    const now = this.options.now?.() ?? Date.now();
    if (this.playbackStartedAt !== undefined) {
      this.pausedElapsedMs = Math.max(0, now - this.playbackStartedAt);
    }
    this.playbackPaused = true;
    this.current.pause();
    this.stopVolumeMeter();
  }

  async resume(): Promise<void> {
    if (!this.current || !this.playbackPaused) return;
    await this.current.play();
    const now = this.options.now?.() ?? Date.now();
    this.playbackStartedAt = now - this.pausedElapsedMs;
    this.playbackPaused = false;
    if (this.activeEnvelope) {
      this.startVolumeMeter(
        this.activeEnvelope,
        this.activeVolume,
        this.playbackStartedAt,
      );
    }
  }

  async stop(): Promise<void> {
    this.playToken += 1;
    this.stopVolumeMeter();
    this.current?.pause();
    this.current = undefined;
    this.playDone?.();
    this.playDone = undefined;
    this.clearPlaybackState();
  }

  private clearPlaybackState(): void {
    this.activeEnvelope = undefined;
    this.playbackStartedAt = undefined;
    this.pausedElapsedMs = 0;
    this.playbackPaused = false;
  }

  private startVolumeMeter(
    envelope: AudioEnvelope,
    volume: number,
    playbackStartedAt: number,
  ): void {
    this.stopVolumeMeter();
    if (envelope.levels.length === 0) return;
    const emitFrame = () => {
      const elapsed = (this.options.now?.() ?? Date.now()) - playbackStartedAt;
      const index = Math.min(
        envelope.levels.length - 1,
        Math.max(0, Math.floor(elapsed / envelope.frameMs)),
      );
      this.emitVolume((envelope.levels[index] ?? 0) * volume);
    };
    emitFrame();
    this.volumeTimer = setInterval(emitFrame, envelope.frameMs);
  }

  private stopVolumeMeter(): void {
    if (this.volumeTimer !== undefined) {
      clearInterval(this.volumeTimer);
      this.volumeTimer = undefined;
    }
    this.emitVolume(0);
  }

  private emitVolume(level: number): void {
    for (const cb of [...this.volumeCbs]) cb(level);
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

  onVolume(cb: (level: number) => void): () => void {
    this.volumeCbs.add(cb);
    return () => this.volumeCbs.delete(cb);
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
