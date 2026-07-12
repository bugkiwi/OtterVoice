import { describe, expect, it } from 'bun:test';
import { ExpoAudioInput, type ExpoRecordingHandle } from '../src/audio-input';
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
