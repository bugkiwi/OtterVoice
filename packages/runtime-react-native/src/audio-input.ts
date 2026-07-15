import {
  createVoiceError,
  type AudioChunk,
  type AudioInputAdapter,
  type AudioInputOptions,
  type NormalizedVoiceError,
} from '@ottervoice/core';

/** An Expo file-recording handle, kept for backwards-compatible batch capture. */
export interface ExpoRecordingHandle {
  startAsync(): Promise<void>;
  stopAndUnloadAsync(): Promise<void>;
  getURI(): string | null;
}

/** A raw PCM block produced by Expo SDK 57's `useAudioStream`. */
export interface ExpoPcmInputBuffer {
  data: ArrayBuffer;
  encoding: 'pcm_s16le';
  sampleRate: number;
  channels: number;
}

/** The small part of Expo's native `AudioStream` used by the runtime. */
export interface ExpoPcmInputStream {
  start(): Promise<void>;
  stop(): void | Promise<void>;
}

/** Sample format requested when creating {@link ExpoPcmInputStream}. */
export interface ExpoPcmInputStreamOptions {
  /** Capture sample rate in Hz. */
  sampleRate: number;
  /** Channel count (typically `1`). */
  channels: number;
  /** Always linear 16-bit PCM little-endian for this runtime. */
  encoding: 'pcm_s16le';
}

/**
 * Injected mic / file helpers for {@link ExpoAudioInput}.
 * Prefer {@link ExpoAudioInputOptions.createPcmStream} for full-duplex VAD;
 * fall back to {@link ExpoAudioInputOptions.createRecording} for batch capture.
 * Wired by {@link createExpoRuntime} via {@link ExpoRuntimeOptions.input}.
 */
export interface ExpoAudioInputOptions {
  /** Legacy file recorder factory. Prefer `createPcmStream` for full duplex. */
  createRecording?: () => Promise<ExpoRecordingHandle>;
  /** Read a legacy recorded file URI into an ArrayBuffer. */
  readAudioFile?: (uri: string) => Promise<ArrayBuffer>;
  /**
   * Create a native PCM microphone stream. Expo SDK 57 `useAudioStream` can
   * supply this without custom native code, so it also works in Expo Go.
   */
  createPcmStream?: (
    options: ExpoPcmInputStreamOptions,
    onBuffer: (buffer: ExpoPcmInputBuffer) => void,
  ) => ExpoPcmInputStream | Promise<ExpoPcmInputStream>;
  /** Microphone permission (wrap `requestRecordingPermissionsAsync`). */
  requestPermission?: () => Promise<boolean>;
  /** Override clock used for chunk timestamps (tests). */
  now?: () => number;
}

function concatBytes(parts: readonly Uint8Array[], total: number): Uint8Array {
  const output = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.byteLength;
  }
  return output;
}

/**
 * Wrap interleaved little-endian PCM16 in a standard WAV container.
 *
 * @param pcm - Interleaved PCM16 samples.
 * @param sampleRate - Sample rate in Hz.
 * @param channels - Channel count (typically `1`).
 * @returns A standard WAV container buffer.
 */
export function pcm16ToWav(
  pcm: Uint8Array,
  sampleRate: number,
  channels: number,
): ArrayBuffer {
  const headerBytes = 44;
  const wav = new ArrayBuffer(headerBytes + pcm.byteLength);
  const view = new DataView(wav);
  const writeAscii = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };
  const blockAlign = channels * 2;
  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + pcm.byteLength, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeAscii(36, 'data');
  view.setUint32(40, pcm.byteLength, true);
  new Uint8Array(wav, headerBytes).set(pcm);
  return wav;
}

function pcm16Rms(data: ArrayBuffer): number {
  const sampleCount = Math.floor(data.byteLength / 2);
  if (sampleCount === 0) return 0;
  const view = new DataView(data);
  let sum = 0;
  for (let i = 0; i < sampleCount; i += 1) {
    const sample = view.getInt16(i * 2, true) / 32_768;
    sum += sample * sample;
  }
  return Math.sqrt(sum / sampleCount);
}

/**
 * Expo microphone capture with two modes:
 *
 * - Expo SDK 57 native PCM streaming: continuous RMS/VAD plus a complete WAV
 *   emitted at turn end. Encoded capture can be suspended during assistant
 *   playback while the volume stream stays active for barge-in.
 * - Legacy file recording: one recorded-file chunk per start/stop cycle.
 */
export class ExpoAudioInput implements AudioInputAdapter {
  private readonly chunkCbs = new Set<(chunk: AudioChunk) => void>();
  private readonly volumeCbs = new Set<(level: number) => void>();
  private readonly errorCbs = new Set<(error: NormalizedVoiceError) => void>();
  private readonly now: () => number;
  private recording: ExpoRecordingHandle | undefined;
  private pcmStream: ExpoPcmInputStream | undefined;
  private pcmParts: Uint8Array[] = [];
  private pcmByteLength = 0;
  private pcmSampleRate = 16_000;
  private pcmChannels = 1;
  private captureEnabled = true;

  constructor(private readonly options: ExpoAudioInputOptions) {
    this.now = options.now ?? Date.now;
  }

  async requestPermission(): Promise<boolean> {
    return (await this.options.requestPermission?.()) ?? true;
  }

  async start(options: AudioInputOptions = {}): Promise<void> {
    if (this.options.createPcmStream) {
      this.pcmParts = [];
      this.pcmByteLength = 0;
      this.pcmSampleRate = options.sampleRate ?? 16_000;
      this.pcmChannels = options.channels ?? 1;
      this.captureEnabled = true;
      const stream = await this.options.createPcmStream(
        {
          sampleRate: this.pcmSampleRate,
          channels: this.pcmChannels,
          encoding: 'pcm_s16le',
        },
        (buffer) => this.handlePcmBuffer(buffer),
      );
      this.pcmStream = stream;
      await stream.start();
      return;
    }

    if (!this.options.createRecording) {
      throw createVoiceError(
        'unsupported_runtime',
        'Expo audio input requires createPcmStream or createRecording',
      );
    }
    const recording = await this.options.createRecording();
    await recording.startAsync();
    this.recording = recording;
  }

  private handlePcmBuffer(buffer: ExpoPcmInputBuffer): void {
    this.pcmSampleRate = buffer.sampleRate;
    this.pcmChannels = buffer.channels;
    const level = pcm16Rms(buffer.data);
    for (const cb of [...this.volumeCbs]) cb(level);
    if (!this.captureEnabled || buffer.data.byteLength === 0) return;
    const copy = new Uint8Array(buffer.data.byteLength);
    copy.set(new Uint8Array(buffer.data));
    this.pcmParts.push(copy);
    this.pcmByteLength += copy.byteLength;
    const durationMs =
      buffer.sampleRate > 0 && buffer.channels > 0
        ? (copy.byteLength / (buffer.sampleRate * buffer.channels * 2)) * 1_000
        : 0;
    this.emitChunk({
      data: copy.slice().buffer,
      timestamp: this.now(),
      durationMs,
      sampleRate: buffer.sampleRate,
      channels: buffer.channels,
      encoding: 'pcm_s16le',
      delivery: 'stream',
    });
  }

  async stop(): Promise<void> {
    const pcmStream = this.pcmStream;
    this.pcmStream = undefined;
    if (pcmStream) {
      await pcmStream.stop();
      const pcm = concatBytes(this.pcmParts, this.pcmByteLength);
      const durationMs =
        this.pcmSampleRate > 0 && this.pcmChannels > 0
          ? (pcm.byteLength / (this.pcmSampleRate * this.pcmChannels * 2)) * 1_000
          : 0;
      this.pcmParts = [];
      this.pcmByteLength = 0;
      if (pcm.byteLength > 0) {
        this.emitChunk({
          data: pcm16ToWav(pcm, this.pcmSampleRate, this.pcmChannels),
          timestamp: this.now(),
          durationMs,
          sampleRate: this.pcmSampleRate,
          channels: this.pcmChannels,
          encoding: 'audio/wav',
          delivery: 'turn',
        });
      }
      return;
    }

    const recording = this.recording;
    this.recording = undefined;
    if (!recording) return;
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    if (uri === null) return;
    try {
      if (!this.options.readAudioFile) {
        throw new Error('readAudioFile is not configured');
      }
      const data = await this.options.readAudioFile(uri);
      this.emitChunk({ data, timestamp: this.now() });
    } catch (err) {
      const error = createVoiceError('microphone_unavailable', 'Failed to read recording', {
        raw: err,
      });
      for (const cb of [...this.errorCbs]) cb(error);
    }
  }

  async suspendCapture(): Promise<void> {
    this.captureEnabled = false;
    // Discard pre-roll and false interruption audio. RMS callbacks continue,
    // so the core can still detect a real barge-in over assistant playback.
    this.pcmParts = [];
    this.pcmByteLength = 0;
  }

  async resumeCapture(): Promise<void> {
    this.captureEnabled = true;
  }

  async pause(): Promise<void> {
    await this.suspendCapture();
  }

  async resume(): Promise<void> {
    await this.resumeCapture();
  }

  private emitChunk(chunk: AudioChunk): void {
    for (const cb of [...this.chunkCbs]) cb(chunk);
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
