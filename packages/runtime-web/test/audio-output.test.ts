import { describe, expect, it, mock } from 'bun:test';
import { WebAudioOutput, type AudioElementLike } from '../src/audio-output';
import type { NormalizedVoiceError } from '@ottervoice/core';

class FakeAudio implements AudioElementLike {
  src = '';
  volume = 1;
  paused = false;
  playImpl: () => Promise<void> = async () => {};
  private listeners: Record<string, Set<() => void>> = {};
  play() {
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
