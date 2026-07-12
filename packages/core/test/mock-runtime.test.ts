import { describe, expect, it } from 'bun:test';
import {
  createMockRuntime,
  MockAudioInput,
  MockAudioOutput,
} from '../src/providers/mock-runtime';
import type { AudioChunk, NormalizedVoiceError } from '../src/types';

const chunk: AudioChunk = { data: new ArrayBuffer(4), timestamp: 1 };
const err: NormalizedVoiceError = { code: 'network_error', message: 'x' };

describe('MockAudioInput', () => {
  it('defaults permission to true and records start options', async () => {
    const input = new MockAudioInput();
    expect(await input.requestPermission()).toBe(true);
    await input.start({ sampleRate: 16000 });
    expect(input.started).toBe(true);
    expect(input.lastOptions?.sampleRate).toBe(16000);
  });

  it('honours a denied permission', async () => {
    expect(await new MockAudioInput({ permission: false }).requestPermission()).toBe(
      false,
    );
  });

  it('tracks pause/resume/stop flags', async () => {
    const input = new MockAudioInput();
    await input.start({});
    await input.pause();
    expect(input.paused).toBe(true);
    await input.resume();
    expect(input.paused).toBe(false);
    await input.stop();
    expect(input.started).toBe(false);
  });

  it('fans out chunk/volume/error events and supports unsubscribe', () => {
    const input = new MockAudioInput();
    const chunks: AudioChunk[] = [];
    const vols: number[] = [];
    const errs: NormalizedVoiceError[] = [];
    const offC = input.onChunk((c) => chunks.push(c));
    input.onVolume((v) => vols.push(v));
    input.onError((e) => errs.push(e));

    input.emitChunk(chunk);
    input.emitVolume(0.3);
    input.emitError(err);
    offC();
    input.emitChunk(chunk);

    expect(chunks).toHaveLength(1);
    expect(vols).toEqual([0.3]);
    expect(errs).toEqual([err]);
  });
});

describe('MockAudioOutput', () => {
  it('records playback and auto-fires start/end', async () => {
    const output = new MockAudioOutput();
    const events: string[] = [];
    output.onStart(() => events.push('start'));
    output.onEnd(() => events.push('end'));
    await output.play({ audioUrl: 'http://a' });
    expect(output.played).toHaveLength(1);
    expect(events).toEqual(['start', 'end']);
  });

  it('does not auto-complete when disabled, but fireEnd works', async () => {
    const output = new MockAudioOutput({ autoComplete: false });
    const events: string[] = [];
    const off = output.onEnd(() => events.push('end'));
    await output.play({});
    expect(events).toEqual([]);
    output.fireEnd();
    expect(events).toEqual(['end']);
    off();
    output.fireEnd();
    expect(events).toEqual(['end']);
  });

  it('throws and notifies on failure, and supports error unsubscribe', async () => {
    const output = new MockAudioOutput({ failWith: err });
    const errs: NormalizedVoiceError[] = [];
    const off = output.onError((e) => errs.push(e));
    await expect(output.play({})).rejects.toBe(err);
    off();
    await expect(output.play({})).rejects.toBe(err);
    expect(errs).toEqual([err]); // second failure no longer delivered
  });

  it('counts stop calls and supports start unsubscribe', async () => {
    const output = new MockAudioOutput();
    const off = output.onStart(() => {});
    off();
    await output.stop();
    await output.stop();
    expect(output.stopped).toBe(2);
  });
});

describe('createMockRuntime', () => {
  it('assembles input and output adapters', () => {
    const runtime = createMockRuntime({
      input: { permission: false },
      output: { autoComplete: false },
    });
    expect(runtime.audioInput).toBeInstanceOf(MockAudioInput);
    expect(runtime.audioOutput).toBeInstanceOf(MockAudioOutput);
  });
});
