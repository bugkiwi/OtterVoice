import { describe, expect, it } from 'bun:test';
import { NodeAudioInput, NodeAudioOutput } from '../src/audio';
import type { AudioChunk, NormalizedVoiceError } from '@ottervoice/core';

const u8 = (...bytes: number[]) => new Uint8Array(bytes);
async function* gen(items: Array<Uint8Array | ArrayBuffer>) {
  for (const i of items) yield i;
}

describe('NodeAudioInput', () => {
  it('grants permission and produces nothing without a source', async () => {
    const input = new NodeAudioInput();
    expect(await input.requestPermission()).toBe(true);
    const chunks: AudioChunk[] = [];
    input.onChunk((c) => chunks.push(c));
    await input.start();
    await input.whenDrained;
    expect(chunks).toHaveLength(0);
  });

  it('emits chunks with metadata from start options and an injected clock', async () => {
    const input = new NodeAudioInput({ source: gen([u8(1, 2)]), now: () => 4242 });
    const chunks: AudioChunk[] = [];
    input.onChunk((c) => chunks.push(c));
    await input.start({ sampleRate: 16000, encoding: 'pcm_s16le' });
    await input.whenDrained;
    expect(chunks[0]).toMatchObject({
      timestamp: 4242,
      sampleRate: 16000,
      encoding: 'pcm_s16le',
    });
    expect(new Uint8Array(chunks[0]!.data)).toEqual(u8(1, 2));
  });

  it('falls back to constructor metadata, then omits when neither is set', async () => {
    const withCtor = new NodeAudioInput({
      source: gen([u8(5)]),
      sampleRate: 8000,
      encoding: 'opus',
    });
    const a: AudioChunk[] = [];
    withCtor.onChunk((c) => a.push(c));
    await withCtor.start({});
    await withCtor.whenDrained;
    expect(a[0]).toMatchObject({ sampleRate: 8000, encoding: 'opus' });

    const bare = new NodeAudioInput({ source: gen([u8(5)]) });
    const b: AudioChunk[] = [];
    bare.onChunk((c) => b.push(c));
    await bare.start();
    await bare.whenDrained;
    expect(b[0]!.sampleRate).toBeUndefined();
    expect(b[0]!.encoding).toBeUndefined();
  });

  it('passes an ArrayBuffer source through unchanged', async () => {
    const buf = new Uint8Array([7, 8, 9]).buffer;
    const input = new NodeAudioInput({ source: gen([buf]) });
    const chunks: AudioChunk[] = [];
    input.onChunk((c) => chunks.push(c));
    await input.start();
    await input.whenDrained;
    expect(new Uint8Array(chunks[0]!.data)).toEqual(u8(7, 8, 9));
  });

  it('breaks out of the stream when stopped mid-flight', async () => {
    const input = new NodeAudioInput({ source: gen([u8(1), u8(2), u8(3)]) });
    const chunks: AudioChunk[] = [];
    input.onChunk((c) => {
      chunks.push(c);
      if (chunks.length === 1) void input.stop();
    });
    await input.start();
    await input.whenDrained;
    expect(chunks).toHaveLength(1);
  });

  it('skips chunks while paused, then can resume', async () => {
    const input = new NodeAudioInput({ source: gen([u8(1), u8(2)]) });
    const chunks: AudioChunk[] = [];
    input.onChunk((c) => {
      chunks.push(c);
      if (chunks.length === 1) void input.pause();
    });
    await input.start();
    await input.whenDrained;
    expect(chunks).toHaveLength(1);
    await input.resume();
  });

  it('surfaces a source failure as a normalized error', async () => {
    async function* bad(): AsyncIterable<Uint8Array> {
      throw new Error('stream exploded');
    }
    const input = new NodeAudioInput({ source: bad() });
    const errors: NormalizedVoiceError[] = [];
    input.onError((e) => errors.push(e));
    await input.start();
    await input.whenDrained;
    expect(errors[0]?.code).toBe('microphone_unavailable');
  });

  it('supports unsubscribing chunk and error listeners', async () => {
    const input = new NodeAudioInput({ source: gen([u8(1)]) });
    const chunks: AudioChunk[] = [];
    const off = input.onChunk((c) => chunks.push(c));
    const offErr = input.onError(() => {});
    off();
    offErr();
    await input.start();
    await input.whenDrained;
    expect(chunks).toHaveLength(0);
  });
});

describe('NodeAudioOutput', () => {
  it('records playback and fires start/end without a sink', async () => {
    const output = new NodeAudioOutput();
    const events: string[] = [];
    output.onStart(() => events.push('start'));
    output.onEnd(() => events.push('end'));
    await output.play({ audioUrl: 'http://a' });
    expect(output.played).toHaveLength(1);
    expect(events).toEqual(['start', 'end']);
  });

  it('routes audio to a sink', async () => {
    const seen: unknown[] = [];
    const output = new NodeAudioOutput({ sink: (i) => void seen.push(i) });
    await output.play({ audioBuffer: new ArrayBuffer(2), mimeType: 'audio/mp3' });
    expect(seen).toHaveLength(1);
    expect(output.played).toHaveLength(1);
  });

  it('emits an error and rejects when the sink throws', async () => {
    const errors: NormalizedVoiceError[] = [];
    const output = new NodeAudioOutput({
      sink: () => {
        throw new Error('no speaker');
      },
    });
    output.onError((e) => errors.push(e));
    await expect(output.play({})).rejects.toMatchObject({ code: 'audio_playback_failed' });
    expect(errors[0]?.code).toBe('audio_playback_failed');
    expect(output.played).toHaveLength(0);
  });

  it('clears recorded playback on stop and supports unsubscribe', async () => {
    const output = new NodeAudioOutput();
    const offStart = output.onStart(() => {});
    const offEnd = output.onEnd(() => {});
    const offErr = output.onError(() => {});
    offStart();
    offEnd();
    offErr();
    await output.play({});
    await output.stop();
    expect(output.played).toHaveLength(0);
  });
});
