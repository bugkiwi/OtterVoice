import { describe, expect, it } from 'bun:test';
import { encodeMonoWav, measureBrowserAudioEnvelope } from '../src/audio-conversion';

describe('encodeMonoWav', () => {
  it('mixes channels and writes playable PCM16 WAV bytes', () => {
    const wav = encodeMonoWav({
      length: 2,
      numberOfChannels: 2,
      sampleRate: 48_000,
      getChannelData: (channel) =>
        channel === 0 ? new Float32Array([1, -1]) : new Float32Array([0, 0]),
    });
    const view = new DataView(wav);
    expect(new TextDecoder().decode(wav.slice(0, 4))).toBe('RIFF');
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint32(24, true)).toBe(48_000);
    expect(view.getInt16(44, true)).toBeGreaterThan(16_000);
    expect(view.getInt16(46, true)).toBeLessThan(-16_000);
  });

  it('downsamples and caps long captures from the newest audio', () => {
    const samples = new Float32Array(96_000);
    samples.fill(-0.5, 0, 48_000);
    samples.fill(0.5, 48_000);
    const wav = encodeMonoWav({
      length: samples.length,
      numberOfChannels: 1,
      sampleRate: 48_000,
      getChannelData: () => samples,
    }, {
      sampleRate: 16_000,
      maxDurationMs: 1_000,
    });
    const view = new DataView(wav);
    expect(view.getUint32(24, true)).toBe(16_000);
    expect(view.getUint32(40, true)).toBe(32_000);
    expect(wav.byteLength).toBe(44 + 32_000);
    expect(view.getInt16(44, true)).toBeGreaterThan(16_000);
  });
});

describe('measureBrowserAudioEnvelope', () => {
  it('returns an empty envelope when decode fails', async () => {
    const envelope = await measureBrowserAudioEnvelope(new TextEncoder().encode('<html>').buffer);
    expect(envelope).toEqual({ levels: [], frameMs: 50 });
  });
});
