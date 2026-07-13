import { afterEach, describe, expect, it, mock } from 'bun:test';
import { createWebRuntime } from '../src/index';
import { WebAudioInput } from '../src/audio-input';
import { WebAudioOutput } from '../src/audio-output';
import type { AudioElementLike } from '../src/audio-output';
import type {
  AudioContextLike,
  MediaRecorderLike,
  MediaStreamLike,
} from '../src/audio-input';
import type { AudioChunk } from '@ottervoice/core';

class FakeRecorder implements MediaRecorderLike {
  started: number | undefined;
  options?: { mimeType?: string };
  private listeners: Record<string, Set<(e: any) => void>> = {};
  constructor(_stream: MediaStreamLike, options?: { mimeType?: string }) {
    this.options = options;
    captured = this;
  }
  start(t?: number) {
    this.started = t;
  }
  stop() {
    this.dispatch('stop');
  }
  pause() {}
  resume() {}
  addEventListener(t: string, l: (e: any) => void) {
    (this.listeners[t] ??= new Set()).add(l);
  }
  dispatch(t: string, e?: unknown) {
    this.listeners[t]?.forEach((l) => l(e));
  }
}
let captured: FakeRecorder | undefined;

class FakeAudioAuto implements AudioElementLike {
  src = '';
  volume = 1;
  private listeners: Record<string, Set<() => void>> = {};
  play() {
    queueMicrotask(() => this.listeners['ended']?.forEach((l) => l()));
    return Promise.resolve();
  }
  pause() {}
  addEventListener(t: string, l: () => void) {
    (this.listeners[t] ??= new Set()).add(l);
  }
}

const tick = () => new Promise((r) => setTimeout(r, 0));
const stream: MediaStreamLike = { getTracks: () => [{ stop: () => {} }] };

class FakeAudioContext implements AudioContextLike {
  createMediaStreamSource() {
    return { connect: () => {} };
  }
  createAnalyser() {
    return {
      fftSize: 0,
      frequencyBinCount: 1,
      getByteTimeDomainData: (data: Uint8Array) => data.fill(128),
    };
  }
  async close() {}
}

afterEach(() => {
  delete (globalThis as { Audio?: unknown }).Audio;
});

describe('createWebRuntime', () => {
  it('passes every override through to the adapters', async () => {
    const fake = new FakeAudioAuto();
    const createObjectURL = mock(() => 'blob:z');
    const runtime = createWebRuntime({
      getUserMedia: async () => stream,
      mediaRecorder: FakeRecorder,
      createAudio: () => fake,
      createObjectURL,
      revokeObjectURL: () => {},
      mimeType: 'audio/webm',
      timesliceMs: 200,
      volumePollMs: 10,
      audioContext: FakeAudioContext,
      now: () => 1234,
    });
    expect(runtime.audioInput).toBeInstanceOf(WebAudioInput);
    expect(runtime.audioOutput).toBeInstanceOf(WebAudioOutput);

    const chunks: AudioChunk[] = [];
    runtime.audioInput.onChunk((c) => chunks.push(c));
    await runtime.audioInput.start();
    expect(captured?.started).toBe(200);
    expect(captured?.options?.mimeType).toBe('audio/webm');
    captured!.dispatch('dataavailable', {
      data: { size: 1, arrayBuffer: async () => new Uint8Array([5]).buffer },
    });
    await tick();
    expect(chunks[0]).toMatchObject({ timestamp: 1234, encoding: 'audio/webm' });
    await runtime.audioInput.stop();

    await runtime.audioOutput.play({ audioBuffer: new ArrayBuffer(2) });
    expect(createObjectURL).toHaveBeenCalled();
  });

  it('falls back to browser globals (default Audio factory)', async () => {
    (globalThis as { Audio?: unknown }).Audio = FakeAudioAuto;
    const runtime = createWebRuntime();
    expect(runtime.audioInput).toBeInstanceOf(WebAudioInput);
    // Drives the default createAudio = () => new globalThis.Audio().
    await runtime.audioOutput.play({ audioUrl: 'http://x' });
  });
});
