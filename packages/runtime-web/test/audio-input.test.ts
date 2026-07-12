import { describe, expect, it } from 'bun:test';
import {
  WebAudioInput,
  type BlobLike,
  type MediaRecorderLike,
  type MediaStreamLike,
} from '../src/audio-input';
import type { AudioChunk, NormalizedVoiceError } from '@ottervoice/core';

function fakeStream() {
  const stopped: boolean[] = [];
  const stream: MediaStreamLike = {
    getTracks: () => [{ stop: () => stopped.push(true) }],
  };
  return { stream, stopped };
}

class FakeRecorder implements MediaRecorderLike {
  started: number | undefined;
  stopped = false;
  paused = false;
  resumed = false;
  private listeners: Record<string, Set<(e: any) => void>> = {};
  constructor(
    public stream: MediaStreamLike,
    public options?: { mimeType?: string },
  ) {}
  start(timeslice?: number) {
    this.started = timeslice;
  }
  stop() {
    this.stopped = true;
  }
  pause() {
    this.paused = true;
  }
  resume() {
    this.resumed = true;
  }
  addEventListener(t: string, l: (e: any) => void) {
    (this.listeners[t] ??= new Set()).add(l);
  }
  dispatch(t: string, e?: unknown) {
    this.listeners[t]?.forEach((l) => l(e));
  }
}

function blob(bytes: number[]): BlobLike {
  return { size: bytes.length, arrayBuffer: async () => new Uint8Array(bytes).buffer };
}

const tick = () => new Promise((r) => setTimeout(r, 0));

describe('WebAudioInput.requestPermission', () => {
  it('returns true and releases the probe stream', async () => {
    const { stream, stopped } = fakeStream();
    const input = new WebAudioInput({
      getUserMedia: async () => stream,
      mediaRecorder: FakeRecorder,
    });
    expect(await input.requestPermission()).toBe(true);
    expect(stopped).toHaveLength(1);
  });

  it('returns false when permission is denied', async () => {
    const input = new WebAudioInput({
      getUserMedia: async () => {
        throw new Error('denied');
      },
      mediaRecorder: FakeRecorder,
    });
    expect(await input.requestPermission()).toBe(false);
  });
});

describe('WebAudioInput.start', () => {
  it('records and emits chunks with mime encoding and injected clock', async () => {
    const { stream } = fakeStream();
    let recorder!: FakeRecorder;
    const input = new WebAudioInput({
      getUserMedia: async () => stream,
      mediaRecorder: class extends FakeRecorder {
        constructor(s: MediaStreamLike, o?: { mimeType?: string }) {
          super(s, o);
          recorder = this;
        }
      },
      mimeType: 'audio/webm',
      timesliceMs: 250,
      now: () => 999,
    });
    const chunks: AudioChunk[] = [];
    input.onChunk((c) => chunks.push(c));
    await input.start({ echoCancellation: false });

    expect(recorder.options?.mimeType).toBe('audio/webm');
    expect(recorder.started).toBe(250);
    recorder.dispatch('dataavailable', { data: blob([1, 2, 3]) });
    recorder.dispatch('dataavailable', { data: blob([]) }); // empty → skipped
    recorder.dispatch('dataavailable', {}); // no data → skipped
    await tick();

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toMatchObject({ timestamp: 999, encoding: 'audio/webm' });
    expect(new Uint8Array(chunks[0]!.data)).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('records without a mime type and omits encoding', async () => {
    const { stream } = fakeStream();
    let recorder!: FakeRecorder;
    const input = new WebAudioInput({
      getUserMedia: async () => stream,
      mediaRecorder: class extends FakeRecorder {
        constructor(s: MediaStreamLike, o?: { mimeType?: string }) {
          super(s, o);
          recorder = this;
        }
      },
    });
    const chunks: AudioChunk[] = [];
    input.onChunk((c) => chunks.push(c));
    await input.start();
    expect(recorder.options).toBeUndefined();
    recorder.dispatch('dataavailable', { data: blob([7]) });
    await tick();
    expect(chunks[0]!.encoding).toBeUndefined();
  });

  it('throws when getUserMedia fails', async () => {
    const input = new WebAudioInput({
      getUserMedia: async () => {
        throw new Error('no mic');
      },
      mediaRecorder: FakeRecorder,
    });
    await expect(input.start()).rejects.toMatchObject({ code: 'microphone_unavailable' });
  });

  it('surfaces recorder errors', async () => {
    const { stream } = fakeStream();
    let recorder!: FakeRecorder;
    const input = new WebAudioInput({
      getUserMedia: async () => stream,
      mediaRecorder: class extends FakeRecorder {
        constructor(s: MediaStreamLike, o?: { mimeType?: string }) {
          super(s, o);
          recorder = this;
        }
      },
    });
    const errors: NormalizedVoiceError[] = [];
    input.onError((e) => errors.push(e));
    await input.start();
    recorder.dispatch('error');
    expect(errors[0]?.code).toBe('microphone_unavailable');
  });
});

describe('WebAudioInput lifecycle', () => {
  it('stops the recorder and tracks, and is safe before start', async () => {
    const { stream, stopped } = fakeStream();
    let recorder!: FakeRecorder;
    const input = new WebAudioInput({
      getUserMedia: async () => stream,
      mediaRecorder: class extends FakeRecorder {
        constructor(s: MediaStreamLike, o?: { mimeType?: string }) {
          super(s, o);
          recorder = this;
        }
      },
    });
    await input.pause(); // no recorder yet — safe
    await input.resume();
    await input.stop(); // nothing started — safe

    await input.start();
    await input.pause();
    await input.resume();
    expect(recorder.paused).toBe(true);
    expect(recorder.resumed).toBe(true);
    await input.stop();
    expect(recorder.stopped).toBe(true);
    expect(stopped).toHaveLength(1);
  });

  it('supports unsubscribing chunk and error listeners', async () => {
    const { stream } = fakeStream();
    let recorder!: FakeRecorder;
    const input = new WebAudioInput({
      getUserMedia: async () => stream,
      mediaRecorder: class extends FakeRecorder {
        constructor(s: MediaStreamLike, o?: { mimeType?: string }) {
          super(s, o);
          recorder = this;
        }
      },
    });
    const chunks: AudioChunk[] = [];
    const off = input.onChunk((c) => chunks.push(c));
    const offErr = input.onError(() => {});
    off();
    offErr();
    await input.start();
    recorder.dispatch('dataavailable', { data: blob([1]) });
    await tick();
    expect(chunks).toHaveLength(0);
  });
});
