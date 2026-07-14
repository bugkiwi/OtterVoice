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
    this.dispatch('stop');
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
    await input.suspendCapture();
    await input.resumeCapture();
    expect(recorder.paused).toBe(false);
    expect(recorder.resumed).toBe(false);
    await input.stop();
    expect(recorder.stopped).toBe(true);
    expect(stopped).toHaveLength(1);
  });

  it('retains a bounded encoded pre-roll for a confirmed barge-in', async () => {
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
      timesliceMs: 100,
      bargeInPreRollMs: 200,
    });
    const chunks: number[][] = [];
    input.onChunk((chunk) => chunks.push([...new Uint8Array(chunk.data)]));
    await input.start();
    await input.suspendCapture();

    // Capture begins while playback is filtered. Keep the WebM header plus
    // only the newest 200 ms, which contains the user's opening syllables.
    recorder.dispatch('dataavailable', { data: blob([0x1a, 0x45, 0xdf, 0xa3]) });
    recorder.dispatch('dataavailable', { data: blob([1]) });
    recorder.dispatch('dataavailable', { data: blob([2]) });
    recorder.dispatch('dataavailable', { data: blob([3]) });
    await tick();
    expect(chunks).toEqual([]);

    await input.resumeCapture({ includePreRoll: true });
    expect(chunks).toEqual([[0x1a, 0x45, 0xdf, 0xa3], [2], [3]]);
    await input.stop();
  });

  it('discards filtered playback audio when no barge-in was confirmed', async () => {
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
    });
    const chunks: number[][] = [];
    input.onChunk((chunk) => chunks.push([...new Uint8Array(chunk.data)]));
    await input.start();
    recorder.dispatch('dataavailable', { data: blob([0x1a, 0x45, 0xdf, 0xa3]) });
    await tick();

    await input.suspendCapture();
    recorder.dispatch('dataavailable', { data: blob([8]) });
    await tick();
    await input.resumeCapture();
    recorder.dispatch('dataavailable', { data: blob([9]) });
    await tick();

    expect(chunks).toEqual([[0x1a, 0x45, 0xdf, 0xa3], [9]]);
    await input.stop();
  });

  it('keeps an initial WebM header even when filtered pre-roll is discarded', async () => {
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
    });
    const chunks: number[][] = [];
    input.onChunk((chunk) => chunks.push([...new Uint8Array(chunk.data)]));
    await input.start();
    await input.suspendCapture();

    recorder.dispatch('dataavailable', { data: blob([0x1a, 0x45, 0xdf, 0xa3]) });
    recorder.dispatch('dataavailable', { data: blob([8]) });
    await tick();
    await input.resumeCapture();

    expect(chunks).toEqual([[0x1a, 0x45, 0xdf, 0xa3]]);
    await input.stop();
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

  it('preserves MediaRecorder event order when Blob reads resolve out of order', async () => {
    const { stream } = fakeStream();
    let recorder!: FakeRecorder;
    let releaseFirst!: () => void;
    const input = new WebAudioInput({
      getUserMedia: async () => stream,
      mediaRecorder: class extends FakeRecorder {
        constructor(s: MediaStreamLike, o?: { mimeType?: string }) {
          super(s, o);
          recorder = this;
        }
      },
      mimeType: 'audio/webm;codecs=opus',
    });
    const chunks: number[][] = [];
    input.onChunk((chunk) => chunks.push([...new Uint8Array(chunk.data)]));
    await input.start();

    recorder.dispatch('dataavailable', {
      data: {
        size: 1,
        arrayBuffer: () => new Promise<ArrayBuffer>((resolve) => {
          releaseFirst = () => resolve(new Uint8Array([1]).buffer);
        }),
      },
    });
    recorder.dispatch('dataavailable', { data: blob([2]) });
    await tick();
    expect(chunks).toEqual([]);

    releaseFirst();
    await input.stop();
    expect(chunks).toEqual([[1], [2]]);
  });

  it('uses the delivery state from the dataavailable event, not Blob read completion', async () => {
    const { stream } = fakeStream();
    let recorder!: FakeRecorder;
    let releaseChunk!: () => void;
    const input = new WebAudioInput({
      getUserMedia: async () => stream,
      mediaRecorder: class extends FakeRecorder {
        constructor(s: MediaStreamLike, o?: { mimeType?: string }) {
          super(s, o);
          recorder = this;
        }
      },
      mimeType: 'audio/webm;codecs=opus',
    });
    const chunks: number[][] = [];
    input.onChunk((chunk) => chunks.push([...new Uint8Array(chunk.data)]));
    await input.start();
    recorder.dispatch('dataavailable', {
      data: {
        size: 1,
        arrayBuffer: () => new Promise<ArrayBuffer>((resolve) => {
          releaseChunk = () => resolve(new Uint8Array([7]).buffer);
        }),
      },
    });
    await tick();
    await input.suspendCapture();

    releaseChunk();
    await input.stop();
    expect(chunks).toEqual([[7]]);
  });

  it('waits for the final recorder chunk before stop resolves', async () => {
    const { stream, stopped } = fakeStream();
    let releaseFinalChunk!: () => void;
    const finalBlob: BlobLike = {
      size: 3,
      arrayBuffer: () =>
        new Promise<ArrayBuffer>((resolve) => {
          releaseFinalChunk = () => resolve(new Uint8Array([4, 5, 6]).buffer);
        }),
    };
    const input = new WebAudioInput({
      getUserMedia: async () => stream,
      mediaRecorder: class extends FakeRecorder {
        override stop() {
          this.stopped = true;
          this.dispatch('dataavailable', { data: finalBlob });
          this.dispatch('stop');
        }
      },
    });
    const chunks: AudioChunk[] = [];
    input.onChunk((chunk) => chunks.push(chunk));
    await input.start();

    let stopResolved = false;
    const stopping = input.stop().then(() => {
      stopResolved = true;
    });
    await tick();
    expect(stopResolved).toBe(false);
    expect(stopped).toHaveLength(0);

    releaseFinalChunk();
    await stopping;
    expect(new Uint8Array(chunks[0]!.data)).toEqual(new Uint8Array([4, 5, 6]));
    expect(stopped).toHaveLength(1);
  });
});

describe('WebAudioInput.onVolume', () => {
  it('emits RMS levels when an AudioContext is available', async () => {
    const { stream } = fakeStream();
    const analyser = {
      fftSize: 256,
      frequencyBinCount: 4,
      getByteTimeDomainData(array: Uint8Array) {
        array[0] = 200; // loud sample
        array[1] = 56;
        array[2] = 128;
        array[3] = 128;
      },
    };
    const input = new WebAudioInput({
      getUserMedia: async () => stream,
      mediaRecorder: FakeRecorder,
      audioContext: class {
        createAnalyser() {
          return analyser;
        }
        createMediaStreamSource() {
          return { connect: () => {} };
        }
        async close() {}
      },
      volumePollMs: 1,
    });
    const levels: number[] = [];
    input.onVolume((v) => levels.push(v));
    await input.start();
    await new Promise((r) => setTimeout(r, 5));
    await input.stop();
    expect(levels.length).toBeGreaterThan(0);
    expect(levels[0]).toBeGreaterThan(0);
  });
});
