import { describe, expect, it, mock } from 'bun:test';
import { WebAudioOutput, type AudioElementLike } from '../src/audio-output';
import type { NormalizedVoiceError } from '@ottervoice/core';

class FakeAudio implements AudioElementLike {
  src = '';
  volume = 1;
  paused = false;
  playCalls = 0;
  playImpl: () => Promise<void> = async () => {};
  private listeners: Record<string, Set<() => void>> = {};
  play() {
    this.playCalls += 1;
    this.paused = false;
    return this.playImpl();
  }
  pause() {
    this.paused = true;
  }
  addEventListener(t: string, l: () => void) {
    (this.listeners[t] ??= new Set()).add(l);
  }
  dispatch(t: string) {
    this.listeners[t]?.forEach((l) => l());
  }
}

const tick = () => new Promise((r) => setTimeout(r, 0));

describe('WebAudioOutput.play', () => {
  it('primes browser autoplay from a direct user gesture', async () => {
    const fake = new FakeAudio();
    const output = new WebAudioOutput({ createAudio: () => fake });
    await output.unlock();
    expect(fake.src).toStartWith('data:audio/wav;base64,');
    expect(fake.volume).toBe(0);
    expect(fake.paused).toBe(true);
  });

  it('emits a synchronized output envelope for echo-aware VAD', async () => {
    const fake = new FakeAudio();
    const output = new WebAudioOutput({
      createAudio: () => fake,
      createObjectURL: () => 'blob:meter',
      measureAudio: async () => ({ levels: [0.2, 0.4], frameMs: 5 }),
    });
    const levels: number[] = [];
    output.onVolume((level) => levels.push(level));
    const playing = output.play({ audioBuffer: new ArrayBuffer(4), mimeType: 'audio/wav' });
    await tick();
    expect(levels).toContain(0.2);
    fake.dispatch('ended');
    await playing;
    expect(levels.at(-1)).toBe(0);
  });

  it('aligns a delayed decoded envelope to the actual playback position', async () => {
    const fake = new FakeAudio();
    let now = 0;
    let resolveEnvelope!: (value: { levels: number[]; frameMs: number }) => void;
    const envelope = new Promise<{ levels: number[]; frameMs: number }>((resolve) => {
      resolveEnvelope = resolve;
    });
    const output = new WebAudioOutput({
      createAudio: () => fake,
      createObjectURL: () => 'blob:delayed-meter',
      measureAudio: () => envelope,
      now: () => now,
    });
    const levels: number[] = [];
    output.onVolume((level) => levels.push(level));
    const playing = output.play({ audioBuffer: new ArrayBuffer(4) });
    await tick();

    now = 60;
    resolveEnvelope({ levels: [0.1, 0.2, 0.3], frameMs: 50 });
    await tick();
    expect(levels).toContain(0.2);
    expect(levels).not.toContain(0.1);

    fake.dispatch('ended');
    await playing;
  });

  it('pauses tentatively and resumes the same in-flight playback', async () => {
    const fake = new FakeAudio();
    let now = 0;
    const output = new WebAudioOutput({
      createAudio: () => fake,
      createObjectURL: () => 'blob:resumable',
      measureAudio: async () => ({ levels: [0.1, 0.2, 0.3], frameMs: 50 }),
      now: () => now,
    });
    const levels: number[] = [];
    output.onVolume((level) => levels.push(level));
    const playing = output.play({ audioBuffer: new ArrayBuffer(4) });
    await tick();

    now = 75;
    await output.pause();
    expect(fake.paused).toBe(true);
    expect(levels.at(-1)).toBe(0);

    now = 275;
    await output.resume();
    expect(fake.paused).toBe(false);
    expect(fake.playCalls).toBe(2);
    expect(levels).toContain(0.2);

    fake.dispatch('ended');
    await playing;
  });

  it('plays an audioUrl and fires start then end', async () => {
    const fake = new FakeAudio();
    const output = new WebAudioOutput({ createAudio: () => fake });
    const events: string[] = [];
    output.onStart(() => events.push('start'));
    output.onEnd(() => events.push('end'));

    const p = output.play({ audioUrl: 'http://a.mp3', volume: 0.5 });
    await tick();
    fake.dispatch('ended');
    await p;

    expect(events).toEqual(['start', 'end']);
    expect(fake.src).toBe('http://a.mp3');
    expect(fake.volume).toBe(0.5);
  });

  it('plays an audioBuffer via an object URL and revokes it', async () => {
    const fake = new FakeAudio();
    const createObjectURL = mock(() => 'blob:xyz');
    const revokeObjectURL = mock(() => {});
    const output = new WebAudioOutput({
      createAudio: () => fake,
      createObjectURL,
      revokeObjectURL,
    });
    const p = output.play({ audioBuffer: new ArrayBuffer(4), mimeType: 'audio/mp3' });
    await tick();
    fake.dispatch('ended');
    await p;

    expect(createObjectURL).toHaveBeenCalled();
    expect(fake.src).toBe('blob:xyz');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:xyz');
  });

  it('plays an object URL even when no revoke is provided', async () => {
    const fake = new FakeAudio();
    const output = new WebAudioOutput({
      createAudio: () => fake,
      createObjectURL: () => 'blob:y',
    });
    const p = output.play({ audioBuffer: new ArrayBuffer(1) });
    await tick();
    fake.dispatch('ended');
    await p; // no throw despite missing revokeObjectURL
  });

  it('rejects when audioBuffer playback lacks createObjectURL', async () => {
    const output = new WebAudioOutput({ createAudio: () => new FakeAudio() });
    await expect(output.play({ audioBuffer: new ArrayBuffer(1) })).rejects.toMatchObject({
      code: 'audio_playback_failed',
    });
  });

  it('rejects and reports a playback error event', async () => {
    const fake = new FakeAudio();
    const output = new WebAudioOutput({ createAudio: () => fake });
    const errors: NormalizedVoiceError[] = [];
    output.onError((e) => errors.push(e));
    const p = output.play({ audioUrl: 'u' });
    await tick();
    fake.dispatch('error');
    await expect(p).rejects.toMatchObject({ code: 'audio_playback_failed' });
    expect(errors[0]?.code).toBe('audio_playback_failed');
  });

  it('rejects when play() itself rejects (e.g. autoplay blocked)', async () => {
    const fake = new FakeAudio();
    fake.playImpl = () => Promise.reject(new Error('blocked'));
    const output = new WebAudioOutput({ createAudio: () => fake });
    const errors: NormalizedVoiceError[] = [];
    const starts: number[] = [];
    output.onError((e) => errors.push(e));
    output.onStart(() => starts.push(1));
    await expect(output.play({ audioUrl: 'u' })).rejects.toMatchObject({
      code: 'audio_playback_failed',
    });
    expect(errors).toHaveLength(1);
    expect(starts).toHaveLength(0); // start never fires on failure
  });
});

describe('WebAudioOutput.stop', () => {
  it('stop() resolves an in-flight play (barge-in)', async () => {
    const fake = new FakeAudio();
    const output = new WebAudioOutput({ createAudio: () => fake });
    const p = output.play({ audioUrl: 'u' });
    await tick();
    await output.stop();
    await p; // must not hang after stop()
    expect(fake.paused).toBe(true);
  });

  it('pauses the current element and is safe when idle', async () => {
    const fake = new FakeAudio();
    const output = new WebAudioOutput({ createAudio: () => fake });
    await output.stop(); // nothing playing — safe

    const p = output.play({ audioUrl: 'u' });
    await tick();
    await output.stop();
    expect(fake.paused).toBe(true);
    fake.dispatch('ended');
    await p;
  });

  it('supports unsubscribing listeners', async () => {
    const output = new WebAudioOutput({ createAudio: () => new FakeAudio() });
    const offS = output.onStart(() => {});
    const offE = output.onEnd(() => {});
    const offErr = output.onError(() => {});
    offS();
    offE();
    offErr();
    expect(typeof offS).toBe('function');
  });
});
