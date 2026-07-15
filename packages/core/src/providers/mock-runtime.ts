import type {
  AudioChunk,
  AudioInputAdapter,
  AudioInputOptions,
  AudioOutputAdapter,
  AudioPlaybackInput,
  NormalizedVoiceError,
  RuntimeAdapter,
} from '../types.js';

/**
 * Options for {@link MockAudioInput}.
 * Use when constructing a mock mic for tests without a real capture device.
 */
export interface MockAudioInputOptions {
  /** Permission result returned by `requestPermission`. Default true. */
  permission?: boolean;
}

/**
 * In-memory audio input. Tests drive it by calling {@link MockAudioInput.emitChunk}
 * / {@link MockAudioInput.emitVolume}; nothing touches a real microphone.
 */
export class MockAudioInput implements AudioInputAdapter {
  private chunkCbs = new Set<(chunk: AudioChunk) => void>();
  private volumeCbs = new Set<(level: number) => void>();
  private errorCbs = new Set<(error: NormalizedVoiceError) => void>();
  private readonly permission: boolean;
  started = false;
  paused = false;
  lastOptions: AudioInputOptions | undefined;

  constructor(options: MockAudioInputOptions = {}) {
    this.permission = options.permission ?? true;
  }

  async requestPermission(): Promise<boolean> {
    return this.permission;
  }

  async start(options: AudioInputOptions): Promise<void> {
    this.started = true;
    this.paused = false;
    this.lastOptions = options;
  }

  async stop(): Promise<void> {
    this.started = false;
    this.paused = false;
  }

  async pause(): Promise<void> {
    this.paused = true;
  }

  async resume(): Promise<void> {
    this.paused = false;
  }

  emitChunk(chunk: AudioChunk): void {
    for (const cb of [...this.chunkCbs]) cb(chunk);
  }

  emitVolume(level: number): void {
    for (const cb of [...this.volumeCbs]) cb(level);
  }

  emitError(error: NormalizedVoiceError): void {
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

/**
 * Options for {@link MockAudioOutput}.
 * Use when tests need to control whether `play` auto-completes or fails.
 */
export interface MockAudioOutputOptions {
  /** Auto-fire start/end around `play`. Default true. */
  autoComplete?: boolean;
  /** When set, `play` rejects with this error. */
  failWith?: NormalizedVoiceError;
}

/** In-memory audio output. Records what was "played". */
export class MockAudioOutput implements AudioOutputAdapter {
  private startCbs = new Set<() => void>();
  private endCbs = new Set<() => void>();
  private errorCbs = new Set<(error: NormalizedVoiceError) => void>();
  private volumeCbs = new Set<(level: number) => void>();
  private readonly autoComplete: boolean;
  private readonly failWith: NormalizedVoiceError | undefined;
  played: AudioPlaybackInput[] = [];
  stopped = 0;
  paused = 0;
  resumed = 0;
  private playDone: (() => void) | undefined;

  constructor(options: MockAudioOutputOptions = {}) {
    this.autoComplete = options.autoComplete ?? true;
    this.failWith = options.failWith;
  }

  async play(input: AudioPlaybackInput): Promise<void> {
    if (this.failWith) {
      for (const cb of [...this.errorCbs]) cb(this.failWith);
      throw this.failWith;
    }
    this.played.push(input);
    for (const cb of [...this.startCbs]) cb();
    if (this.autoComplete) {
      for (const cb of [...this.endCbs]) cb();
      return;
    }
    await new Promise<void>((resolve) => {
      this.playDone = resolve;
    });
  }

  async stop(): Promise<void> {
    this.stopped += 1;
    this.playDone?.();
    this.playDone = undefined;
  }

  async pause(): Promise<void> {
    this.paused += 1;
  }

  async resume(): Promise<void> {
    this.resumed += 1;
  }

  fireEnd(): void {
    for (const cb of [...this.endCbs]) cb();
    this.playDone?.();
    this.playDone = undefined;
  }

  emitVolume(level: number): void {
    for (const cb of [...this.volumeCbs]) cb(level);
  }

  onVolume(cb: (level: number) => void): () => void {
    this.volumeCbs.add(cb);
    return () => this.volumeCbs.delete(cb);
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

/**
 * Options for {@link createMockRuntime}.
 * Forwards into {@link MockAudioInput} / {@link MockAudioOutput} constructors.
 */
export interface MockRuntimeOptions {
  /** Microphone mock options. See {@link MockAudioInputOptions}. */
  input?: MockAudioInputOptions;
  /** Speaker mock options. See {@link MockAudioOutputOptions}. */
  output?: MockAudioOutputOptions;
}

/**
 * In-memory {@link RuntimeAdapter} with typed mock input/output adapters.
 * Prefer {@link createMockRuntime} over constructing this shape by hand.
 */
export interface MockRuntime extends RuntimeAdapter {
  /** Controllable mock microphone. */
  audioInput: MockAudioInput;
  /** Controllable mock speaker. */
  audioOutput: MockAudioOutput;
}

/**
 * Assemble a fully in-memory {@link RuntimeAdapter} for tests and Node demos.
 *
 * @param options - Optional input/output mock knobs. See {@link MockRuntimeOptions}.
 * @returns A {@link MockRuntime} with {@link MockAudioInput} and {@link MockAudioOutput}.
 */
export function createMockRuntime(options: MockRuntimeOptions = {}): MockRuntime {
  return {
    audioInput: new MockAudioInput(options.input),
    audioOutput: new MockAudioOutput(options.output),
  };
}
