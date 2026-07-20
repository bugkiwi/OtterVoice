import { describe, expect, it, mock } from 'bun:test';
import {
  ExpoAudioOutput,
  type ExpoPcmPlaylist,
  type ExpoPcmPlaylistStatus,
  type ExpoPlaybackStatus,
  type ExpoSound,
} from '../src/audio-output';
import { createExpoRuntime } from '../src/index';
import { ExpoAudioInput } from '../src/audio-input';
import type { NormalizedVoiceError } from '@ottervoice/core';

function sound(opts: { failPlay?: boolean } = {}) {
  let statusCb: ((s: ExpoPlaybackStatus) => void) | undefined;
  const s: ExpoSound & {
    unloaded: boolean;
    stopped: boolean;
    update: (status: Partial<ExpoPlaybackStatus>) => void;
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
      statusCb?.({ playing: false, ...status });
    },
    finish() {
      statusCb?.({ playing: false, didJustFinish: true });
    },
  };
  return s;
}

const tick = () => new Promise((r) => setTimeout(r, 0));

function pcmPlaylist() {
  let statusCb: ((status: ExpoPcmPlaylistStatus) => void) | undefined;
  const playlist: ExpoPcmPlaylist & {
    sources: string[];
    playCount: number;
    paused: boolean;
    destroyed: boolean;
    update(status: Partial<ExpoPcmPlaylistStatus>): void;
  } = {
    sources: [],
    playCount: 0,
    paused: false,
    destroyed: false,
    add(uri) {
      this.sources.push(uri);
    },
    next() {},
    play() {
      this.playCount += 1;
      this.paused = false;
    },
    pause() {
      this.paused = true;
    },
    clear() {
      this.sources = [];
    },
    destroy() {
      this.destroyed = true;
    },
    setOnPlaybackStatusUpdate(cb) {
      statusCb = cb;
      return () => {
        statusCb = undefined;
      };
    },
    update(status) {
      statusCb?.({
        currentIndex: 0,
        currentTime: 0,
        didJustFinish: false,
        playing: true,
        isBuffering: false,
        trackCount: this.sources.length,
        ...status,
      });
    },
  };
  return playlist;
}

describe('ExpoAudioOutput.play', () => {
  it('separates a native playback request from confirmed start and end', async () => {
    const s = sound();
    const output = new ExpoAudioOutput({ createSound: async () => s });
    const events: string[] = [];
    output.onPlaybackRequested(() => events.push('requested'));
    output.onStart(() => events.push('start'));
    output.onEnd(() => events.push('end'));

    const p = output.play({ audioUrl: 'file://a.mp3' });
    await tick();
    expect(events).toEqual(['requested']);
    s.update({ playing: true });
    s.update({ playing: true });
    expect(events).toEqual(['requested', 'start']);
    s.finish();
    await p;

    expect(events).toEqual(['requested', 'start', 'end']);
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
    const events: string[] = [];
    output.onError((e) => errors.push(e));
    output.onPlaybackRequested(() => events.push('requested'));
    output.onStart(() => events.push('start'));
    await expect(output.play({ audioUrl: 'u' })).rejects.toMatchObject({
      code: 'audio_playback_failed',
    });
    expect(errors[0]?.code).toBe('audio_playback_failed');
    expect(events).toEqual(['requested']);
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
    output.onPlaybackRequested(() => {})();
    output.onStart(() => {})();
    output.onEnd(() => {})();
    output.onError(() => {})();
  });
});

describe('ExpoAudioOutput.startPcmStream', () => {
  it('queues SSE PCM chunks in a gapless playlist and resolves after the last track', async () => {
    const playlist = pcmPlaylist();
    const writes: number[] = [];
    const deleted: string[] = [];
    const output = new ExpoAudioOutput({
      createSound: async () => sound(),
      createPcmPlaylist: () => playlist,
      writePcmChunk: async ({ index }) => {
        writes.push(index);
        return `file://chunk-${index}.wav`;
      },
      deleteAudioFile: async (uri) => {
        deleted.push(uri);
      },
    });
    const events: string[] = [];
    const levels: number[] = [];
    output.onPlaybackRequested(() => events.push('requested'));
    output.onStart(() => events.push('start'));
    output.onEnd(() => events.push('end'));
    output.onVolume((level) => levels.push(level));

    const stream = await output.startPcmStream?.({
      encoding: 'pcm_s16le',
      sampleRate: 24_000,
      channels: 1,
    });
    expect(stream).toBeDefined();
    await stream!.write(new Int16Array([16_384, -16_384]).buffer);
    await stream!.write(new Int16Array([8_192, -8_192]).buffer);
    expect(writes).toEqual([0, 1]);
    expect(playlist.sources).toEqual(['file://chunk-0.wav', 'file://chunk-1.wav']);
    expect(events).toEqual(['requested']);

    playlist.update({ currentIndex: 0, currentTime: 0, playing: true });
    expect(events).toEqual(['requested', 'start']);
    expect(levels[0]).toBeCloseTo(0.5, 3);
    const closing = stream!.close();
    await tick();
    playlist.update({
      currentIndex: 1,
      didJustFinish: true,
      playing: false,
      trackCount: 2,
    });
    await closing;

    expect(events).toEqual(['requested', 'start', 'end']);
    expect(playlist.destroyed).toBe(true);
    expect(deleted).toEqual(['file://chunk-0.wav', 'file://chunk-1.wav']);
  });

  it('rebuilds an exhausted native queue when a later SSE chunk arrives', async () => {
    const playlist = pcmPlaylist();
    const output = new ExpoAudioOutput({
      createSound: async () => sound(),
      createPcmPlaylist: () => playlist,
      writePcmChunk: async ({ index }) => `file://chunk-${index}.wav`,
    });
    const levels: number[] = [];
    output.onVolume((level) => levels.push(level));
    const stream = await output.startPcmStream?.({
      encoding: 'pcm_s16le',
      sampleRate: 24_000,
      channels: 1,
    });

    await stream!.write(new Int16Array([16_384, -16_384]).buffer);
    playlist.update({ didJustFinish: true, playing: false, trackCount: 1 });
    await stream!.write(new Int16Array([8_192, -8_192]).buffer);

    expect(playlist.sources).toEqual(['file://chunk-1.wav']);
    playlist.update({ currentTime: 0, trackCount: 1 });
    expect(levels.at(-1)).toBeCloseTo(0.25, 3);

    playlist.update({ didJustFinish: true, playing: false, trackCount: 1 });
    // Expo emits didJustFinish only once, then periodic callbacks reset it.
    playlist.update({ didJustFinish: false, playing: false, trackCount: 1 });
    await stream!.close();
    expect(playlist.destroyed).toBe(true);
  });

  it('closes after iOS replaces a missed finish event with an exhausted status', async () => {
    const playlist = pcmPlaylist();
    const output = new ExpoAudioOutput({
      createSound: async () => sound(),
      createPcmPlaylist: () => playlist,
      writePcmChunk: async ({ index }) => `file://chunk-${index}.wav`,
    });
    const stream = await output.startPcmStream?.({
      encoding: 'pcm_s16le',
      sampleRate: 24_000,
      channels: 1,
    });

    await stream!.write(new Int16Array([1, 2]).buffer);
    playlist.update({ currentTime: 0.005, playing: true, trackCount: 1 });
    // AVQueuePlayer has no current item after the last track, so Expo's next
    // periodic status is stopped even if didJustFinish was missed.
    playlist.update({ currentTime: 0.01, playing: false, trackCount: 1 });
    await stream!.close();

    expect(playlist.destroyed).toBe(true);
  });

  it('uses PCM duration as a final close fallback when iOS emits no terminal status', async () => {
    const playlist = pcmPlaylist();
    const output = new ExpoAudioOutput({
      createSound: async () => sound(),
      createPcmPlaylist: () => playlist,
      writePcmChunk: async ({ index }) => `file://chunk-${index}.wav`,
    });
    const stream = await output.startPcmStream?.({
      encoding: 'pcm_s16le',
      sampleRate: 24_000,
      channels: 1,
    });

    await stream!.write(new Int16Array([1, 2]).buffer);
    const startedAt = Date.now();
    await stream!.close();

    expect(Date.now() - startedAt).toBeLessThan(1_200);
    expect(playlist.destroyed).toBe(true);
  });

  it('does not treat a deliberately paused final track as exhausted', async () => {
    const playlist = pcmPlaylist();
    const output = new ExpoAudioOutput({
      createSound: async () => sound(),
      createPcmPlaylist: () => playlist,
      writePcmChunk: async ({ index }) => `file://chunk-${index}.wav`,
    });
    const stream = await output.startPcmStream?.({
      encoding: 'pcm_s16le',
      sampleRate: 24_000,
      channels: 1,
    });

    await stream!.write(new Int16Array([1, 2]).buffer);
    playlist.update({ currentTime: 0.005, playing: true, trackCount: 1 });
    await output.pause();
    const closing = stream!.close();
    playlist.update({ currentTime: 0.005, playing: false, trackCount: 1 });
    await tick();
    expect(playlist.destroyed).toBe(false);

    await output.resume();
    playlist.update({ currentTime: 0.01, playing: false, trackCount: 1 });
    await closing;
    expect(playlist.destroyed).toBe(true);
  });

  it('pauses, resumes, and cancels an active PCM queue', async () => {
    const playlist = pcmPlaylist();
    const output = new ExpoAudioOutput({
      createSound: async () => sound(),
      createPcmPlaylist: () => playlist,
      writePcmChunk: async ({ index }) => `file://chunk-${index}.wav`,
    });
    const stream = await output.startPcmStream?.({
      encoding: 'pcm_s16le',
      sampleRate: 24_000,
      channels: 1,
    });
    await stream!.write(new Int16Array([1, 2]).buffer);
    await output.pause();
    expect(playlist.paused).toBe(true);
    await output.resume();
    expect(playlist.paused).toBe(false);

    const closing = stream!.close();
    await output.stop();
    await closing;
    expect(playlist.destroyed).toBe(true);
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
