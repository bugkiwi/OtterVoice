import {
  createVoiceError,
  type AudioOutputAdapter,
  type AudioOutputStream,
  type AudioPlaybackInput,
  type NormalizedVoiceError,
  type PcmAudioStreamOptions,
} from '@ottervoice/core';

/** Status callback payload from an {@link ExpoSound} player. */
export interface ExpoPlaybackStatus {
  /** Whether the native player reports that audio is actively playing. */
  playing: boolean;
  /** `true` when playback completed successfully. */
  didJustFinish?: boolean;
  /** Native error string when playback failed. */
  error?: string | null;
}

/** An Expo `AudioPlayer`-like handle (abstracted for injection/testing). */
export interface ExpoSound {
  playAsync(): Promise<void>;
  pauseAsync?(): Promise<void>;
  stopAsync(): Promise<void>;
  unloadAsync(): Promise<void>;
  setOnPlaybackStatusUpdate(cb: (status: ExpoPlaybackStatus) => void): void;
}

/** Status callback payload from an {@link ExpoPcmPlaylist}. */
export interface ExpoPcmPlaylistStatus {
  /** Index of the track currently playing or last finished. */
  currentIndex: number;
  /** Playback position of the current track, in seconds. */
  currentTime: number;
  /** `true` when the playlist reached its end. */
  didJustFinish: boolean;
  /** Whether audio is currently audible. */
  playing: boolean;
  /** Whether playback is waiting for the current local track to become ready. */
  isBuffering?: boolean;
  /** Number of URIs queued in the playlist. */
  trackCount: number;
  /** Native error string when playback failed. */
  error?: string | null;
}

/** Gapless Expo AudioPlaylist surface used for incremental PCM playback. */
export interface ExpoPcmPlaylist {
  add(uri: string): void;
  next(): void;
  play(): void | Promise<void>;
  pause(): void | Promise<void>;
  clear(): void;
  destroy(): void;
  setOnPlaybackStatusUpdate(cb: (status: ExpoPcmPlaylistStatus) => void): () => void;
}

/** One PCM16 fragment to persist as a WAV URI for playlist playback. */
export interface ExpoPcmChunkFileInput extends PcmAudioStreamOptions {
  /** Interleaved PCM16 bytes for this chunk. */
  data: ArrayBuffer;
  /** Monotonic chunk index used for temp filenames. */
  index: number;
}

/**
 * Injected playback / file helpers for {@link ExpoAudioOutput}.
 * Provide {@link ExpoAudioOutputOptions.createPcmPlaylist} plus
 * {@link ExpoAudioOutputOptions.writePcmChunk} for streaming assistant audio;
 * {@link ExpoAudioOutputOptions.createSound} covers one-shot URI playback.
 * Wired by {@link createExpoRuntime} via {@link ExpoRuntimeOptions.output}.
 */
export interface ExpoAudioOutputOptions {
  /** Load a sound from a URI (wrap `createAudioPlayer`). */
  createSound: (uri: string) => Promise<ExpoSound>;
  /** Persist a complete audio buffer to a file URI. */
  writeAudioFile?: (buffer: ArrayBuffer, mimeType: string) => Promise<string>;
  /** Create an Expo `AudioPlaylist` configured for frequent status updates. */
  createPcmPlaylist?: () => ExpoPcmPlaylist | Promise<ExpoPcmPlaylist>;
  /** Wrap and persist one PCM16 response chunk as a small WAV file. */
  writePcmChunk?: (input: ExpoPcmChunkFileInput) => Promise<string>;
  /** Best-effort cleanup for temporary response chunk files. */
  deleteAudioFile?: (uri: string) => void | Promise<void>;
}

interface CurrentSound {
  sound: ExpoSound;
  resolve(): void;
}

interface ActivePcmPlayback {
  stop(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
}

function pcm16Envelope(
  data: ArrayBuffer,
  sampleRate: number,
  channels: number,
  frameMs = 50,
): number[] {
  const view = new DataView(data);
  const totalSamples = Math.floor(data.byteLength / 2);
  const samplesPerFrame = Math.max(1, Math.round((sampleRate * channels * frameMs) / 1_000));
  const levels: number[] = [];
  for (let offset = 0; offset < totalSamples; offset += samplesPerFrame) {
    const end = Math.min(totalSamples, offset + samplesPerFrame);
    let sum = 0;
    for (let sampleIndex = offset; sampleIndex < end; sampleIndex += 1) {
      const sample = view.getInt16(sampleIndex * 2, true) / 32_768;
      sum += sample * sample;
    }
    levels.push(Math.sqrt(sum / Math.max(1, end - offset)));
  }
  return levels;
}

/**
 * Expo audio playback with an optional gapless PCM response queue. The latter
 * lets React Native start speaking as soon as OpenRouter's first SSE audio
 * delta arrives instead of waiting for the complete WAV response.
 */
export class ExpoAudioOutput implements AudioOutputAdapter {
  private readonly playbackRequestedCbs = new Set<() => void>();
  private readonly startCbs = new Set<() => void>();
  private readonly endCbs = new Set<() => void>();
  private readonly volumeCbs = new Set<(level: number, at?: number) => void>();
  private readonly errorCbs = new Set<(error: NormalizedVoiceError) => void>();
  private current: CurrentSound | undefined;
  private activePcm: ActivePcmPlayback | undefined;
  readonly startPcmStream?: (
    options: PcmAudioStreamOptions,
  ) => Promise<AudioOutputStream>;

  constructor(private readonly options: ExpoAudioOutputOptions) {
    if (options.createPcmPlaylist && options.writePcmChunk) {
      this.startPcmStream = (streamOptions) => this.openPcmStream(streamOptions);
    }
  }

  async play(input: AudioPlaybackInput): Promise<void> {
    await this.stop();
    let uri: string;
    if (input.audioUrl !== undefined) {
      uri = input.audioUrl;
    } else {
      if (!this.options.writeAudioFile) {
        throw createVoiceError(
          'audio_playback_failed',
          'audioBuffer playback requires writeAudioFile',
        );
      }
      uri = await this.options.writeAudioFile(
        input.audioBuffer ?? new ArrayBuffer(0),
        input.mimeType ?? 'audio/mpeg',
      );
    }

    const sound = await this.options.createSound(uri);
    let resolveFinished!: () => void;
    const finished = new Promise<void>((resolve) => {
      resolveFinished = resolve;
    });
    const current: CurrentSound = { sound, resolve: resolveFinished };
    this.current = current;
    let started = false;
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.error) {
        current.resolve();
      } else {
        if (!started && status.playing) {
          started = true;
          this.fire(this.startCbs);
        }
        if (!status.didJustFinish) return;
        this.fire(this.endCbs);
        current.resolve();
      }
    });

    try {
      this.fire(this.playbackRequestedCbs);
      await sound.playAsync();
      await finished;
      if (this.current === current) this.current = undefined;
    } catch (err) {
      const error = createVoiceError('audio_playback_failed', 'playback failed', {
        raw: err,
      });
      this.emitError(error);
      throw error;
    } finally {
      if (this.current === current) this.current = undefined;
      await sound.unloadAsync();
    }
  }

  private async openPcmStream(
    streamOptions: PcmAudioStreamOptions,
  ): Promise<AudioOutputStream> {
    const createPlaylist = this.options.createPcmPlaylist;
    const writePcmChunk = this.options.writePcmChunk;
    if (!createPlaylist || !writePcmChunk) {
      throw createVoiceError(
        'unsupported_runtime',
        'Expo PCM playback requires createPcmPlaylist and writePcmChunk',
      );
    }
    await this.stop();
    const playlist = await createPlaylist();
    const files: string[] = [];
    const envelopes: number[][] = [];
    const durationStartsMs: number[] = [];
    let playbackRequested = false;
    let started = false;
    let closing = false;
    let finished = false;
    let waitingAtEnd = false;
    let paused = false;
    let lastObservedFileIndex = -1;
    let playlistFileOffset = 0;
    let queuedDurationMs = 0;
    let playedThroughMs = 0;
    let lastStatus: ExpoPcmPlaylistStatus | undefined;
    let closeTimer: ReturnType<typeof setTimeout> | undefined;
    let resolveDone!: () => void;
    let rejectDone!: (error: unknown) => void;
    const done = new Promise<void>((resolve, reject) => {
      resolveDone = resolve;
      rejectDone = reject;
    });
    let offStatus = () => {};
    let control!: ActivePcmPlayback;

    const cleanFiles = async () => {
      if (!this.options.deleteAudioFile) return;
      await Promise.all(
        files.map((uri) => Promise.resolve(this.options.deleteAudioFile?.(uri)).catch(() => {})),
      );
    };
    const finish = async (natural: boolean, error?: unknown) => {
      if (finished) return;
      finished = true;
      if (closeTimer !== undefined) clearTimeout(closeTimer);
      offStatus();
      playlist.clear();
      playlist.destroy();
      if (this.activePcm === control) this.activePcm = undefined;
      await cleanFiles();
      if (natural && started) this.fire(this.endCbs);
      if (error) rejectDone(error);
      else resolveDone();
    };
    const scheduleCloseFallback = () => {
      if (finished || !closing || paused || closeTimer !== undefined) return;
      const remainingMs = Math.max(0, queuedDurationMs - playedThroughMs);
      closeTimer = setTimeout(() => {
        void finish(true);
      }, Math.ceil(remainingMs + 750));
    };
    offStatus = playlist.setOnPlaybackStatusUpdate((status) => {
      lastStatus = status;
      const globalFileIndex = playlistFileOffset + status.currentIndex;
      if (status.playing || status.currentTime > 0) {
        lastObservedFileIndex = Math.max(
          lastObservedFileIndex,
          globalFileIndex,
        );
        const durationStartMs = durationStartsMs[globalFileIndex];
        if (durationStartMs !== undefined) {
          playedThroughMs = Math.max(
            playedThroughMs,
            durationStartMs + status.currentTime * 1_000,
          );
        }
      }
      if (status.error) {
        const error = createVoiceError('audio_playback_failed', status.error);
        this.emitError(error);
        void finish(false, error);
        return;
      }
      if (!started && status.playing) {
        started = true;
        this.fire(this.startCbs);
      }
      const envelope = envelopes[playlistFileOffset + status.currentIndex];
      if (envelope) {
        const frame = Math.min(
          envelope.length - 1,
          Math.max(0, Math.floor(status.currentTime / 0.05)),
        );
        const level = envelope[frame] ?? 0;
        for (const cb of [...this.volumeCbs]) cb(level, Date.now());
      }
      // Expo's iOS AudioPlaylist can publish the one-shot didJustFinish event
      // before JavaScript starts closing the stream. A later periodic update
      // then reports the exhausted AVQueuePlayer as stopped at time zero. Keep
      // that terminal state observable so close() cannot wait forever.
      if (
        closing &&
        lastObservedFileIndex >= files.length - 1 &&
        !status.playing &&
        !status.isBuffering &&
        !paused &&
        status.trackCount > 0
      ) {
        void finish(true);
        return;
      }
      if (!status.didJustFinish) return;
      const atQueueEnd = status.currentIndex >= status.trackCount - 1;
      if (closing && atQueueEnd) void finish(true);
      else if (atQueueEnd) waitingAtEnd = true;
    });

    control = {
      stop: async () => {
        await finish(false);
      },
      pause: async () => {
        paused = true;
        await playlist.pause();
      },
      resume: async () => {
        paused = false;
        await playlist.play();
        scheduleCloseFallback();
      },
    };
    this.activePcm = control;

    return {
      write: async (data) => {
        if (finished || closing || data.byteLength === 0) return;
        const index = files.length;
        const uri = await writePcmChunk({ ...streamOptions, data, index });
        if (finished) {
          await this.options.deleteAudioFile?.(uri);
          return;
        }
        files.push(uri);
        durationStartsMs.push(queuedDurationMs);
        queuedDurationMs +=
          (data.byteLength * 1_000) /
          (2 * streamOptions.sampleRate * streamOptions.channels);
        envelopes.push(
          pcm16Envelope(data, streamOptions.sampleRate, streamOptions.channels),
        );
        if (waitingAtEnd) {
          // AVQueuePlayer has already removed its final item. Appending and
          // calling next() would discard the newly inserted item on iOS, so
          // rebuild the exhausted native queue around the new chunk instead.
          waitingAtEnd = false;
          playlist.clear();
          playlistFileOffset = index;
        }
        playlist.add(uri);
        if (!playbackRequested) {
          playbackRequested = true;
          this.fire(this.playbackRequestedCbs);
        }
        await playlist.play();
      },
      close: async () => {
        if (finished) return done;
        closing = true;
        if (!playbackRequested) {
          await finish(false);
        } else if (
          waitingAtEnd ||
          (lastStatus?.didJustFinish &&
            lastStatus.currentIndex >= lastStatus.trackCount - 1) ||
          (lastObservedFileIndex >= files.length - 1 &&
            lastStatus !== undefined &&
            !lastStatus.playing &&
            !lastStatus.isBuffering &&
            !paused &&
            lastStatus.trackCount > 0)
        ) {
          await finish(true);
        } else {
          // AudioPlaylist's terminal callback is not reliable on iOS when a
          // rapidly changing AVQueuePlayer reaches its last short PCM file.
          // The PCM byte count gives us a conservative upper bound for the
          // remaining local playback, so never leave the session waiting on a
          // native event forever.
          scheduleCloseFallback();
        }
        await done;
      },
    };
  }

  async stop(): Promise<void> {
    const activePcm = this.activePcm;
    this.activePcm = undefined;
    if (activePcm) await activePcm.stop();
    const current = this.current;
    this.current = undefined;
    if (!current) return;
    await current.sound.stopAsync();
    current.resolve();
  }

  async pause(): Promise<void> {
    if (this.activePcm) {
      await this.activePcm.pause();
      return;
    }
    await this.current?.sound.pauseAsync?.();
  }

  async resume(): Promise<void> {
    if (this.activePcm) {
      await this.activePcm.resume();
      return;
    }
    await this.current?.sound.playAsync();
  }

  private fire(cbs: Set<() => void>): void {
    for (const cb of [...cbs]) cb();
  }

  private emitError(error: NormalizedVoiceError): void {
    for (const cb of [...this.errorCbs]) cb(error);
  }

  onVolume(cb: (level: number, at?: number) => void): () => void {
    this.volumeCbs.add(cb);
    return () => this.volumeCbs.delete(cb);
  }

  /**
   * Subscribe when native one-shot or playlist playback is requested.
   *
   * @param cb - Called once immediately before the native play primitive.
   * @returns Unsubscribe function.
   */
  onPlaybackRequested(cb: () => void): () => void {
    this.playbackRequestedCbs.add(cb);
    return () => this.playbackRequestedCbs.delete(cb);
  }

  /**
   * Subscribe to the first native status confirming active playback.
   *
   * @param cb - Called once when `playing` first becomes `true`.
   * @returns Unsubscribe function.
   */
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
