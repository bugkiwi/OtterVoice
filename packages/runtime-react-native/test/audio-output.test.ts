import { describe, expect, it, mock } from 'bun:test';
import { ExpoAudioOutput, type ExpoPlaybackStatus, type ExpoSound } from '../src/audio-output';
import { createExpoRuntime } from '../src/index';
import { ExpoAudioInput } from '../src/audio-input';
import type { NormalizedVoiceError } from '@ottervoice/core';

function sound(opts: { failPlay?: boolean } = {}) {
  let statusCb: ((s: ExpoPlaybackStatus) => void) | undefined;
  const s: ExpoSound & {
    unloaded: boolean;
    stopped: boolean;
    update: (status: ExpoPlaybackStatus) => void;
    finish: () => void;
  } = {
    unloaded: false,
    stopped: false,
    async playAsync() {
      if (opts.failPlay) throw new Error('play failed');
    },
    async stopAsync() {
      this.stopped = true;
    },
    async unloadAsync() {
      this.unloaded = true;
    },
    setOnPlaybackStatusUpdate(cb) {
      statusCb = cb;
    },
    update(status) {
      statusCb?.(status);
    },
    finish() {
      statusCb?.({ didJustFinish: true });
    },
  };
  return s;
}

const tick = () => new Promise((r) => setTimeout(r, 0));

describe('ExpoAudioOutput.play', () => {
  it('plays an audioUrl, firing start then end, and unloads', async () => {
    const s = sound();
    const output = new ExpoAudioOutput({ createSound: async () => s });
    const events: string[] = [];
    output.onStart(() => events.push('start'));
    output.onEnd(() => events.push('end'));

    const p = output.play({ audioUrl: 'file://a.mp3' });
    await tick();
    s.finish();
    await p;

    expect(events).toEqual(['start', 'end']);
    expect(s.unloaded).toBe(true);
  });

  it('ignores non-final status updates', async () => {
    const s = sound();
    const output = new ExpoAudioOutput({ createSound: async () => s });
    let ended = 0;
    output.onEnd(() => (ended += 1));
    const p = output.play({ audioUrl: 'u' });
    await tick();
    s.update({}); // interim status → ignored
    s.update({ didJustFinish: false }); // still not final
    s.finish(); // final → ends
    await p;
    expect(ended).toBe(1);
  });

  it('writes an audioBuffer to a file first', async () => {
    const s = sound();
    const writeAudioFile = mock(async () => 'file://written.mp3');
    const output = new ExpoAudioOutput({ createSound: async () => s, writeAudioFile });
    const p = output.play({ audioBuffer: new ArrayBuffer(3), mimeType: 'audio/mp3' });
    await tick();
    s.finish();
    await p;
    expect(writeAudioFile).toHaveBeenCalled();
  });

  it('rejects when audioBuffer playback lacks writeAudioFile', async () => {
    const output = new ExpoAudioOutput({ createSound: async () => sound() });
    await expect(output.play({ audioBuffer: new ArrayBuffer(1) })).rejects.toMatchObject({
      code: 'audio_playback_failed',
    });
  });

  it('reports and rethrows a playback failure, still unloading', async () => {
    const s = sound({ failPlay: true });
    const output = new ExpoAudioOutput({ createSound: async () => s });
    const errors: NormalizedVoiceError[] = [];
    output.onError((e) => errors.push(e));
    await expect(output.play({ audioUrl: 'u' })).rejects.toMatchObject({
      code: 'audio_playback_failed',
    });
    expect(errors[0]?.code).toBe('audio_playback_failed');
    expect(s.unloaded).toBe(true);
  });
});

describe('ExpoAudioOutput.stop', () => {
  it('stops the current sound and is safe when idle', async () => {
    const s = sound();
    const output = new ExpoAudioOutput({ createSound: async () => s });
    await output.stop(); // idle — safe

    const p = output.play({ audioUrl: 'u' });
    await tick();
    await output.stop();
    expect(s.stopped).toBe(true);
    s.finish();
    await p;
  });

  it('supports unsubscribing listeners', () => {
    const output = new ExpoAudioOutput({ createSound: async () => sound() });
    output.onStart(() => {})();
    output.onEnd(() => {})();
    output.onError(() => {})();
  });
});

describe('createExpoRuntime', () => {
  it('assembles the input and output adapters', () => {
    const runtime = createExpoRuntime({
      input: {
        createRecording: async () => ({
          startAsync: async () => {},
          stopAndUnloadAsync: async () => {},
          getURI: () => null,
        }),
        readAudioFile: async () => new ArrayBuffer(0),
      },
      output: { createSound: async () => sound() },
    });
    expect(runtime.audioInput).toBeInstanceOf(ExpoAudioInput);
    expect(runtime.audioOutput).toBeInstanceOf(ExpoAudioOutput);
  });
});
