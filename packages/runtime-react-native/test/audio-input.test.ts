import { describe, expect, it } from 'bun:test';
import {
  ExpoAudioInput,
  type ExpoPcmInputBuffer,
  type ExpoRecordingHandle,
} from '../src/audio-input';
import type { AudioChunk, NormalizedVoiceError } from '@ottervoice/core';

function recording(uri: string | null): ExpoRecordingHandle & { started: boolean; stopped: boolean } {
  return {
    started: false,
    stopped: false,
    async startAsync() {
      this.started = true;
    },
    async stopAndUnloadAsync() {
      this.stopped = true;
    },
    getURI() {
      return uri;
    },
  };
}

describe('ExpoAudioInput.requestPermission', () => {
  it('delegates to the injected permission check', async () => {
    const granted = new ExpoAudioInput({
      createRecording: async () => recording('f'),
      readAudioFile: async () => new ArrayBuffer(0),
      requestPermission: async () => false,
    });
    expect(await granted.requestPermission()).toBe(false);
  });

  it('defaults to granted when no check is supplied', async () => {
    const input = new ExpoAudioInput({
      createRecording: async () => recording('f'),
      readAudioFile: async () => new ArrayBuffer(0),
    });
    expect(await input.requestPermission()).toBe(true);
  });
});

describe('ExpoAudioInput capture cycle', () => {
  it('emits one chunk per record/stop cycle', async () => {
    const rec = recording('file://audio.m4a');
    const input = new ExpoAudioInput({
      createRecording: async () => rec,
      readAudioFile: async () => new Uint8Array([1, 2, 3]).buffer,
      now: () => 555,
    });
    const chunks: AudioChunk[] = [];
    input.onChunk((c) => chunks.push(c));

    await input.start();
    expect(rec.started).toBe(true);
    await input.stop();
    expect(rec.stopped).toBe(true);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toMatchObject({ timestamp: 555 });
    expect(new Uint8Array(chunks[0]!.data)).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('is a no-op to stop when not recording', async () => {
    const input = new ExpoAudioInput({
      createRecording: async () => recording('f'),
      readAudioFile: async () => new ArrayBuffer(0),
    });
    const chunks: AudioChunk[] = [];
    input.onChunk((c) => chunks.push(c));
    await input.stop();
    expect(chunks).toHaveLength(0);
  });

  it('skips emission when the recording has no URI', async () => {
    const input = new ExpoAudioInput({
      createRecording: async () => recording(null),
      readAudioFile: async () => new ArrayBuffer(4),
    });
    const chunks: AudioChunk[] = [];
    input.onChunk((c) => chunks.push(c));
    await input.start();
    await input.stop();
    expect(chunks).toHaveLength(0);
  });

  it('surfaces a read failure as a normalized error', async () => {
    const input = new ExpoAudioInput({
      createRecording: async () => recording('f'),
      readAudioFile: async () => {
        throw new Error('fs error');
      },
    });
    const errors: NormalizedVoiceError[] = [];
    input.onError((e) => errors.push(e));
    await input.start();
    await input.stop();
    expect(errors[0]?.code).toBe('microphone_unavailable');
  });

  it('supports unsubscribing listeners', async () => {
    const input = new ExpoAudioInput({
      createRecording: async () => recording('f'),
      readAudioFile: async () => new ArrayBuffer(1),
    });
    const chunks: AudioChunk[] = [];
    const off = input.onChunk((c) => chunks.push(c));
    const offErr = input.onError(() => {});
    off();
    offErr();
    await input.start();
    await input.stop();
    expect(chunks).toHaveLength(0);
  });
});

describe('ExpoAudioInput native PCM stream', () => {
  it('keeps VAD active while suspended and emits live PCM plus a complete WAV turn', async () => {
    let onBuffer: ((buffer: ExpoPcmInputBuffer) => void) | undefined;
    let started = false;
    let stopped = false;
    const input = new ExpoAudioInput({
      createPcmStream: (_options, cb) => {
        onBuffer = cb;
        return {
          async start() {
            started = true;
          },
          stop() {
            stopped = true;
          },
        };
      },
      now: () => 777,
    });
    const levels: number[] = [];
    const chunks: AudioChunk[] = [];
    input.onVolume((level) => levels.push(level));
    input.onChunk((chunk) => chunks.push(chunk));

    await input.start({ sampleRate: 16_000, channels: 1, encoding: 'pcm_s16le' });
    expect(started).toBe(true);
    onBuffer?.({
      data: new Int16Array([1_000, -1_000]).buffer,
      encoding: 'pcm_s16le',
      sampleRate: 16_000,
      channels: 1,
    });
    await input.suspendCapture();
    onBuffer?.({
      data: new Int16Array([2_000, -2_000]).buffer,
      encoding: 'pcm_s16le',
      sampleRate: 16_000,
      channels: 1,
    });
    await input.resumeCapture();
    onBuffer?.({
      data: new Int16Array([16_384, -16_384]).buffer,
      encoding: 'pcm_s16le',
      sampleRate: 16_000,
      channels: 1,
    });
    await input.stop();

    expect(stopped).toBe(true);
    expect(levels).toHaveLength(3);
    expect(levels[2]).toBeCloseTo(0.5, 3);
    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toMatchObject({
      timestamp: 777,
      encoding: 'pcm_s16le',
      sampleRate: 16_000,
      channels: 1,
      durationMs: 0.125,
      delivery: 'stream',
    });
    expect(new Int16Array(chunks[0]!.data)).toEqual(new Int16Array([1_000, -1_000]));
    expect(chunks[1]).toMatchObject({
      encoding: 'pcm_s16le',
      delivery: 'stream',
    });
    expect(new Int16Array(chunks[1]!.data)).toEqual(
      new Int16Array([16_384, -16_384]),
    );
    expect(chunks[2]).toMatchObject({
      timestamp: 777,
      encoding: 'audio/wav',
      sampleRate: 16_000,
      channels: 1,
      durationMs: 0.125,
      delivery: 'turn',
    });
    const wav = new Uint8Array(chunks[2]!.data);
    expect(new TextDecoder().decode(wav.slice(0, 4))).toBe('RIFF');
    expect(new Int16Array(wav.slice(44).buffer)).toEqual(
      new Int16Array([16_384, -16_384]),
    );
  });
});
