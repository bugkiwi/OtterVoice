import {
  createVoiceError,
  type AudioChunk,
  type AudioInputAdapter,
  type NormalizedVoiceError,
} from '@ottervoice/core';

/** An Expo `Audio.Recording`-like handle (abstracted for injection/testing). */
export interface ExpoRecordingHandle {
  startAsync(): Promise<void>;
  stopAndUnloadAsync(): Promise<void>;
  getURI(): string | null;
}

export interface ExpoAudioInputOptions {
  /** Create + prepare a recording (wrap `Audio.Recording.createAsync`). */
  createRecording: () => Promise<ExpoRecordingHandle>;
  /** Read a recorded file URI into an ArrayBuffer (wrap `expo-file-system`). */
  readAudioFile: (uri: string) => Promise<ArrayBuffer>;
  /** Microphone permission (wrap `Audio.requestPermissionsAsync`). */
  requestPermission?: () => Promise<boolean>;
  now?: () => number;
}

/**
 * Expo recording capture. Because Expo records to a file rather than a PCM
 * stream, one {@link AudioChunk} is emitted per `start()`/`stop()` cycle — a
 * push-to-talk / batch flow. Streaming PCM is a later phase (see the package
 * README).
 */
export class ExpoAudioInput implements AudioInputAdapter {
  private readonly chunkCbs = new Set<(chunk: AudioChunk) => void>();
  private readonly errorCbs = new Set<(error: NormalizedVoiceError) => void>();
  private readonly now: () => number;
  private recording: ExpoRecordingHandle | undefined;

  constructor(private readonly options: ExpoAudioInputOptions) {
    this.now = options.now ?? Date.now;
  }

  async requestPermission(): Promise<boolean> {
    return (await this.options.requestPermission?.()) ?? true;
  }

  async start(): Promise<void> {
    const recording = await this.options.createRecording();
    await recording.startAsync();
    this.recording = recording;
  }

  async stop(): Promise<void> {
    const recording = this.recording;
    this.recording = undefined;
    if (!recording) return;
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    if (uri === null) return;
    try {
      const data = await this.options.readAudioFile(uri);
      const chunk: AudioChunk = { data, timestamp: this.now() };
      for (const cb of [...this.chunkCbs]) cb(chunk);
    } catch (err) {
      const error = createVoiceError('microphone_unavailable', 'Failed to read recording', {
        raw: err,
      });
      for (const cb of [...this.errorCbs]) cb(error);
    }
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
