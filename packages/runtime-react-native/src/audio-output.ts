import {
  createVoiceError,
  type AudioOutputAdapter,
  type AudioPlaybackInput,
  type NormalizedVoiceError,
} from '@ottervoice/core';

export interface ExpoPlaybackStatus {
  didJustFinish?: boolean;
}

/** An Expo `Audio.Sound`-like handle (abstracted for injection/testing). */
export interface ExpoSound {
  playAsync(): Promise<void>;
  stopAsync(): Promise<void>;
  unloadAsync(): Promise<void>;
  setOnPlaybackStatusUpdate(cb: (status: ExpoPlaybackStatus) => void): void;
}

export interface ExpoAudioOutputOptions {
  /** Load a sound from a URI (wrap `Audio.Sound.createAsync`). */
  createSound: (uri: string) => Promise<ExpoSound>;
  /** Persist an audio buffer to a file URI (wrap `expo-file-system`). */
  writeAudioFile?: (buffer: ArrayBuffer, mimeType: string) => Promise<string>;
}

/** Expo sound playback. `audioUrl` plays directly; an `audioBuffer` is written
 * to a file first (which requires `writeAudioFile`). */
export class ExpoAudioOutput implements AudioOutputAdapter {
  private readonly startCbs = new Set<() => void>();
  private readonly endCbs = new Set<() => void>();
  private readonly errorCbs = new Set<(error: NormalizedVoiceError) => void>();
  private current: ExpoSound | undefined;

  constructor(private readonly options: ExpoAudioOutputOptions) {}

  async play(input: AudioPlaybackInput): Promise<void> {
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
    this.current = sound;
    const finished = new Promise<void>((resolve) => {
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          this.fire(this.endCbs);
          resolve();
        }
      });
    });

    try {
      this.fire(this.startCbs);
      await sound.playAsync();
      await finished;
    } catch (err) {
      const error = createVoiceError('audio_playback_failed', 'playback failed', {
        raw: err,
      });
      this.emitError(error);
      throw error;
    } finally {
      await sound.unloadAsync();
      this.current = undefined;
    }
  }

  async stop(): Promise<void> {
    if (!this.current) return;
    await this.current.stopAsync();
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
