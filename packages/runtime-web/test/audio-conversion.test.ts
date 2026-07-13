import { describe, expect, it } from 'bun:test';
import { encodeMonoWav } from '../src/audio-conversion';

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
});
