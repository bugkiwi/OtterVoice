import {
  createVoiceError,
  type AudioOutputAdapter,
  type AudioOutputStream,
  type AudioPlaybackInput,
  type NormalizedVoiceError,
  type PcmAudioStreamOptions,
} from '@ottervoice/core';
import type { AudioEnvelope } from './audio-conversion';

export interface AudioElementLike {
  src: string;
  volume: number;
  play(): Promise<void>;
  pause(): void;
  addEventListener(type: string, listener: () => void): void;
}

export interface PcmAudioBufferLike {
  getChannelData(channel: number): Float32Array;
}

export interface PcmAudioBufferSourceLike {
  buffer: PcmAudioBufferLike | null;
  connect(destination: unknown): unknown;
  start(when?: number): void;
  stop(): void;
  addEventListener(type: 'ended', listener: () => void): void;
}

export interface PcmAudioContextLike {
  currentTime: number;
  destination: unknown;
  resume(): Promise<void>;
  suspend(): Promise<void>;
  createBuffer(
    numberOfChannels: number,
    length: number,
    sampleRate: number,
  ): PcmAudioBufferLike;
  createBufferSource(): PcmAudioBufferSourceLike;
}

export interface WebAudioOutputOptions {
  /** Create a playback element (default `() => new Audio()` in the browser). */
  createAudio: () => AudioElementLike;
  /** Required for `audioBuffer` playback; turns a Blob into a URL. */
  createObjectURL?: (blob: Blob) => string;
  revokeObjectURL?: (url: string) => void;
  /** Decode encoded audio into RMS frames used as an acoustic echo reference. */
  measureAudio?: (audio: ArrayBuffer) => Promise<AudioEnvelope>;
  /** Create a Web Audio context used for gapless incremental PCM playback. */
  createPcmAudioContext?: () => PcmAudioContextLike;
  now?: () => number;
}

interface PcmEnvelopeSegment {
  startAt: number;
  duration: number;
  levels: number[];
}

interface ActivePcmStream {
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): void;
}

/**
 * Playback via an `HTMLAudioElement`. `audioUrl` plays directly; an
 * `audioBuffer` is wrapped in an object URL (which requires `createObjectURL`).
 */
export class WebAudioOutput implements AudioOutputAdapter {
  private readonly startCbs = new Set<() => void>();
  private readonly endCbs = new Set<() => void>();
  private readonly errorCbs = new Set<(error: NormalizedVoiceError) => void>();
  private readonly volumeCbs = new Set<(level: number, at?: number) => void>();
  private current: AudioElementLike | undefined;
  private playDone: (() => void) | undefined;
  private volumeTimer: ReturnType<typeof setInterval> | undefined;
  private playToken = 0;
  private activeEnvelope: AudioEnvelope | undefined;
  private activeVolume = 1;
  private playbackStartedAt: number | undefined;
  private pausedElapsedMs = 0;
  private playbackPaused = false;
  private lastEnvelopeIndex = -1;
  private pcmContext: PcmAudioContextLike | undefined;
  private activePcmStream: ActivePcmStream | undefined;

  constructor(private readonly options: WebAudioOutputOptions) {}

  async unlock(): Promise<void> {
    const el = this.options.createAudio();
    const pcmContext = this.getPcmContext();
    // Start both unlock operations in the original click task so the browser's
    // transient user activation is still available to AudioContext.resume().
    const pcmUnlock = pcmContext?.resume();
    // 44-byte WAV header with an empty PCM data section.
    el.src =
      'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAgD4AAIA+AAACABAAZGF0YQAAAAA=';
    el.volume = 0;
    await el.play();
    el.pause();
    await pcmUnlock;
  }

  async play(input: AudioPlaybackInput): Promise<void> {
    this.activePcmStream?.stop();
    this.activePcmStream = undefined;
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
        void envelope
          .then((value) => {
            if (token === this.playToken && this.current === el) {
              this.activeEnvelope = value;
              this.activeVolume = el.volume;
              if (!this.playbackPaused) {
                this.startVolumeMeter(value, el.volume, playbackStartedAt);
              }
            }
          })
          .catch(() => {
            // Echo-aware VAD is optional; playback should still continue.
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

  async startPcmStream(options: PcmAudioStreamOptions): Promise<AudioOutputStream> {
    const context = this.getPcmContext();
    if (!context) {
      throw createVoiceError(
        'audio_playback_failed',
        'streaming PCM playback requires AudioContext',
      );
    }

    await this.stop();
    await context.resume();
    const token = ++this.playToken;
    const volume = options.volume ?? 1;
    const sources = new Set<PcmAudioBufferSourceLike>();
    const segments: PcmEnvelopeSegment[] = [];
    let nextStartAt = context.currentTime + 0.06;
    let started = false;
    let closed = false;
    let settled = false;
    let resolveDone!: () => void;
    const done = new Promise<void>((resolve) => {
      resolveDone = resolve;
    });

    const finish = (natural: boolean) => {
      if (settled) return;
      settled = true;
      if (token === this.playToken) {
        this.activePcmStream = undefined;
        this.stopVolumeMeter();
        if (natural && started) this.fire(this.endCbs);
      }
      resolveDone();
    };

    const control: ActivePcmStream = {
      pause: async () => {
        if (settled) return;
        await context.suspend();
        this.stopVolumeMeter();
      },
      resume: async () => {
        if (settled) return;
        await context.resume();
        if (started) this.startPcmVolumeMeter(context, segments);
      },
      stop: () => {
        for (const source of sources) {
          try {
            source.stop();
          } catch {
            // A source that already ended is harmless during cancellation.
          }
        }
        sources.clear();
        finish(false);
      },
    };
    this.activePcmStream = control;

    const write = async (data: ArrayBuffer) => {
      if (closed || settled || token !== this.playToken || data.byteLength < 2) {
        return;
      }
      const channels = Math.max(1, options.channels);
      const sampleCount = Math.floor(data.byteLength / 2);
      const frameCount = Math.floor(sampleCount / channels);
      if (frameCount === 0) return;

      const audioBuffer = context.createBuffer(
        channels,
        frameCount,
        options.sampleRate,
      );
      const channelData = Array.from(
        { length: channels },
        (_, channel) => audioBuffer.getChannelData(channel),
      );
      const view = new DataView(data);
      const mono = new Float32Array(frameCount);
      for (let frame = 0; frame < frameCount; frame += 1) {
        let sum = 0;
        for (let channel = 0; channel < channels; channel += 1) {
          const byteOffset = (frame * channels + channel) * 2;
          const sample = (view.getInt16(byteOffset, true) / 32_768) * volume;
          channelData[channel]![frame] = sample;
          sum += sample;
        }
        mono[frame] = sum / channels;
      }

      const source = context.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(context.destination);
      const startAt = Math.max(
        nextStartAt,
        context.currentTime + (started ? 0.01 : 0.06),
      );
      const duration = frameCount / options.sampleRate;
      nextStartAt = startAt + duration;
      segments.push({
        startAt,
        duration,
        levels: this.measurePcmLevels(mono, options.sampleRate),
      });
      sources.add(source);
      source.addEventListener('ended', () => {
        sources.delete(source);
        if (closed && sources.size === 0) finish(true);
      });
      source.start(startAt);

      if (!started) {
        started = true;
        this.fire(this.startCbs);
        this.startPcmVolumeMeter(context, segments);
      }
    };

    return {
      write,
      close: async () => {
        if (!closed) {
          closed = true;
          if (sources.size === 0) finish(true);
        }
        await done;
      },
    };
  }

  async pause(): Promise<void> {
    if (this.activePcmStream) {
      await this.activePcmStream.pause();
      return;
    }
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
    if (this.activePcmStream) {
      await this.activePcmStream.resume();
      return;
    }
    if (!this.current || !this.playbackPaused) return;
    try {
      await this.current.play();
    } catch {
      return;
    }
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
    this.activePcmStream?.stop();
    this.activePcmStream = undefined;
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
    this.lastEnvelopeIndex = -1;
  }

  private emitEnvelopeFrames(
    envelope: AudioEnvelope,
    volume: number,
    playbackStartedAt: number,
    fromIndex: number,
    toIndex: number,
  ): void {
    const start = Math.max(0, fromIndex);
    const end = Math.min(envelope.levels.length - 1, toIndex);
    for (let index = start; index <= end; index += 1) {
      this.emitVolume(
        (envelope.levels[index] ?? 0) * volume,
        playbackStartedAt + index * envelope.frameMs,
      );
    }
    this.lastEnvelopeIndex = end;
  }

  private startVolumeMeter(
    envelope: AudioEnvelope,
    volume: number,
    playbackStartedAt: number,
  ): void {
    this.stopVolumeMeter();
    if (envelope.levels.length === 0) return;
    this.lastEnvelopeIndex = -1;
    const nowFn = this.options.now ?? Date.now;
    const currentIndex = Math.min(
      envelope.levels.length - 1,
      Math.max(0, Math.floor((nowFn() - playbackStartedAt) / envelope.frameMs)),
    );
    // Backfill the echo reference so correlation stays aligned when decoding
    // finishes after audible playback has already started.
    this.emitEnvelopeFrames(envelope, volume, playbackStartedAt, 0, currentIndex);
    const emitFrame = () => {
      const index = Math.min(
        envelope.levels.length - 1,
        Math.max(0, Math.floor((nowFn() - playbackStartedAt) / envelope.frameMs)),
      );
      if (index > this.lastEnvelopeIndex) {
        this.emitEnvelopeFrames(
          envelope,
          volume,
          playbackStartedAt,
          this.lastEnvelopeIndex + 1,
          index,
        );
      }
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

  private getPcmContext(): PcmAudioContextLike | undefined {
    if (!this.pcmContext && this.options.createPcmAudioContext) {
      this.pcmContext = this.options.createPcmAudioContext();
    }
    return this.pcmContext;
  }

  private measurePcmLevels(samples: Float32Array, sampleRate: number): number[] {
    const frameSamples = Math.max(1, Math.round(sampleRate * 0.05));
    const levels: number[] = [];
    for (let start = 0; start < samples.length; start += frameSamples) {
      const end = Math.min(samples.length, start + frameSamples);
      let sum = 0;
      for (let index = start; index < end; index += 1) {
        const sample = samples[index] ?? 0;
        sum += sample * sample;
      }
      levels.push(Math.sqrt(sum / Math.max(1, end - start)));
    }
    return levels;
  }

  private startPcmVolumeMeter(
    context: PcmAudioContextLike,
    segments: PcmEnvelopeSegment[],
  ): void {
    this.stopVolumeMeter();
    const emitCurrentLevel = () => {
      const currentTime = context.currentTime;
      let level = 0;
      for (const segment of segments) {
        if (
          currentTime < segment.startAt ||
          currentTime >= segment.startAt + segment.duration
        ) {
          continue;
        }
        const index = Math.min(
          segment.levels.length - 1,
          Math.floor((currentTime - segment.startAt) / 0.05),
        );
        level = segment.levels[Math.max(0, index)] ?? 0;
        break;
      }
      this.emitVolume(level, this.options.now?.() ?? Date.now());
    };
    emitCurrentLevel();
    this.volumeTimer = setInterval(emitCurrentLevel, 50);
  }

  private emitVolume(level: number, at?: number): void {
    for (const cb of [...this.volumeCbs]) cb(level, at);
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

  onVolume(cb: (level: number, at?: number) => void): () => void {
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
