import type { AudioLLMInputFormat } from '@ottervoice/core';

interface DecodedAudioLike {
  length: number;
  numberOfChannels: number;
  sampleRate: number;
  getChannelData(channel: number): Float32Array;
}

interface DecodeAudioContextLike {
  decodeAudioData(data: ArrayBuffer): Promise<DecodedAudioLike>;
  close(): Promise<void>;
}

type DecodeAudioContextCtor = new () => DecodeAudioContextLike;

export interface AudioEnvelope {
  levels: number[];
  frameMs: number;
}

function encodeMonoWav(audio: DecodedAudioLike): ArrayBuffer {
  const dataBytes = audio.length * 2;
  const wav = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(wav);
  const write = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i));
  };
  write(0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, audio.sampleRate, true);
  view.setUint32(28, audio.sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, dataBytes, true);

  const channels = Array.from(
    { length: audio.numberOfChannels },
    (_, channel) => audio.getChannelData(channel),
  );
  let offset = 44;
  for (let frame = 0; frame < audio.length; frame += 1) {
    let sample = 0;
    for (const channel of channels) sample += channel[frame] ?? 0;
    sample = Math.max(-1, Math.min(1, sample / Math.max(1, channels.length)));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }
  return wav;
}

/** Decode browser-recorded WebM/Opus and return a WAV accepted by audio LLMs. */
export async function prepareBrowserAudio(
  input: ArrayBuffer,
  format: AudioLLMInputFormat,
): Promise<{ audio: ArrayBuffer; format: 'wav' | 'mp3' }> {
  if (format === 'wav' || format === 'mp3') return { audio: input, format };
  const AC = (globalThis as unknown as { AudioContext?: DecodeAudioContextCtor }).AudioContext;
  if (!AC) throw new Error('AudioContext is unavailable; cannot convert recorded audio to WAV');
  const context = new AC();
  try {
    const decoded = await context.decodeAudioData(input.slice(0));
    return { audio: encodeMonoWav(decoded), format: 'wav' };
  } finally {
    await context.close();
  }
}

/** Decode an encoded assistant reply into short RMS frames for echo-aware VAD. */
export async function measureBrowserAudioEnvelope(
  input: ArrayBuffer,
  frameMs = 50,
): Promise<AudioEnvelope> {
  const AC = (globalThis as unknown as { AudioContext?: DecodeAudioContextCtor }).AudioContext;
  if (!AC) return { levels: [], frameMs };
  const context = new AC();
  try {
    const decoded = await context.decodeAudioData(input.slice(0));
    const frameSamples = Math.max(1, Math.round((decoded.sampleRate * frameMs) / 1_000));
    const channels = Array.from(
      { length: decoded.numberOfChannels },
      (_, channel) => decoded.getChannelData(channel),
    );
    const levels: number[] = [];
    for (let start = 0; start < decoded.length; start += frameSamples) {
      const end = Math.min(decoded.length, start + frameSamples);
      let sum = 0;
      let count = 0;
      for (let frame = start; frame < end; frame += 1) {
        let sample = 0;
        for (const channel of channels) sample += channel[frame] ?? 0;
        sample /= Math.max(1, channels.length);
        sum += sample * sample;
        count += 1;
      }
      levels.push(count > 0 ? Math.sqrt(sum / count) : 0);
    }
    return { levels, frameMs };
  } finally {
    await context.close();
  }
}

export { encodeMonoWav };
