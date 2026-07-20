import {
  createVoiceError,
  type AudioChunk,
  type AudioInputAdapter,
  type AudioInputOptions,
  type AudioOutputAdapter,
  type AudioPlaybackInput,
  type NormalizedVoiceError,
} from '@ottervoice/core';

function toArrayBuffer(chunk: Uint8Array | ArrayBuffer): ArrayBuffer {
  if (chunk instanceof ArrayBuffer) return chunk;
  return chunk.buffer.slice(
    chunk.byteOffset,
    chunk.byteOffset + chunk.byteLength,
  ) as ArrayBuffer;
}

/**
 * Options for {@link NodeAudioInput}. Pass a {@link NodeAudioInputOptions.source}
 * to stream bytes from a subprocess or file; omit it for a no-op / caller-driven
 * input under {@link createNodeRuntime}.
 */
export interface NodeAudioInputOptions {
  /**
   * The PCM/byte source — e.g. a child process stdout exposed as an async
   * iterable. When omitted, the input produces nothing (caller-driven).
   */
  source?: AsyncIterable<Uint8Array | ArrayBuffer>;
  /** Override clock used for {@link AudioChunk.timestamp} (tests). */
  now?: () => number;
  /** Default sample rate stamped on chunks when `start` does not override. */
  sampleRate?: number;
  /** Default encoding stamped on chunks when `start` does not override. */
  encoding?: string;
}

/**
 * Reads audio bytes from an async iterable (a mic subprocess, a file stream, …)
 * and emits {@link AudioChunk}s. Node has no permission model, so
 * `requestPermission` always resolves `true`.
 */
export class NodeAudioInput implements AudioInputAdapter {
  private readonly chunkCbs = new Set<(chunk: AudioChunk) => void>();
  private readonly errorCbs = new Set<(error: NormalizedVoiceError) => void>();
  private readonly now: () => number;
  private running = false;
  private paused = false;
  /** Resolves when the source has been fully consumed (or stopped). */
  whenDrained: Promise<void> = Promise.resolve();

  constructor(private readonly options: NodeAudioInputOptions = {}) {
    this.now = options.now ?? Date.now;
  }

  async requestPermission(): Promise<boolean> {
    return true;
  }

  async start(startOptions: AudioInputOptions = {}): Promise<void> {
    this.running = true;
    this.paused = false;
    const source = this.options.source;
    if (!source) return;
    const sampleRate = startOptions.sampleRate ?? this.options.sampleRate;
    const encoding = startOptions.encoding ?? this.options.encoding;
    this.whenDrained = this.pump(source, sampleRate, encoding);
  }

  private async pump(
    source: AsyncIterable<Uint8Array | ArrayBuffer>,
    sampleRate: number | undefined,
    encoding: string | undefined,
  ): Promise<void> {
    try {
      for await (const raw of source) {
        if (!this.running) break;
        if (this.paused) continue;
        const chunk: AudioChunk = {
          data: toArrayBuffer(raw),
          timestamp: this.now(),
        };
        if (sampleRate !== undefined) chunk.sampleRate = sampleRate;
        if (encoding !== undefined) chunk.encoding = encoding;
        for (const cb of [...this.chunkCbs]) cb(chunk);
      }
    } catch (err) {
      const error = createVoiceError('microphone_unavailable', 'Audio source failed', {
        raw: err,
      });
      for (const cb of [...this.errorCbs]) cb(error);
    }
  }

  async stop(): Promise<void> {
    this.running = false;
  }

  async pause(): Promise<void> {
    this.paused = true;
  }

  async resume(): Promise<void> {
    this.paused = false;
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

/**
 * Options for {@link NodeAudioOutput}. Supply a {@link NodeAudioOutputOptions.sink}
 * to emit audio; otherwise played inputs accumulate in
 * {@link NodeAudioOutput.played} for inspection.
 */
export interface NodeAudioOutputOptions {
  /**
   * Where to send synthesized audio — write a file, pipe to a speaker process,
   * etc. When omitted, audio is collected in {@link NodeAudioOutput.played}.
   */
  sink?: (input: AudioPlaybackInput) => Promise<void> | void;
}

/**
 * Node has no built-in UI playback. By default this records what would have
 * played; supply a `sink` to actually emit audio (file/speaker subprocess).
 */
export class NodeAudioOutput implements AudioOutputAdapter {
  private readonly playbackRequestedCbs = new Set<() => void>();
  private readonly startCbs = new Set<() => void>();
  private readonly endCbs = new Set<() => void>();
  private readonly errorCbs = new Set<(error: NormalizedVoiceError) => void>();
  played: AudioPlaybackInput[] = [];

  constructor(private readonly options: NodeAudioOutputOptions = {}) {}

  async play(input: AudioPlaybackInput): Promise<void> {
    for (const cb of [...this.playbackRequestedCbs]) cb();
    try {
      await this.options.sink?.(input);
    } catch (err) {
      const error = createVoiceError('audio_playback_failed', 'Audio sink failed', {
        raw: err,
      });
      for (const cb of [...this.errorCbs]) cb(error);
      throw error;
    }
    this.played.push(input);
    for (const cb of [...this.startCbs]) cb();
    for (const cb of [...this.endCbs]) cb();
  }

  async stop(): Promise<void> {
    this.played = [];
  }

  /**
   * Subscribe when an input is about to be passed to the configured sink.
   *
   * @param cb - Called once for every call to {@link NodeAudioOutput.play}.
   * @returns Unsubscribe function.
   */
  onPlaybackRequested(cb: () => void): () => void {
    this.playbackRequestedCbs.add(cb);
    return () => this.playbackRequestedCbs.delete(cb);
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
