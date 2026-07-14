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

export interface PrepareBrowserAudioOptions {
  /** PCM sample rate written to the WAV. Defaults to the decoded source rate. */
  sampleRate?: number;
  /** Keep only the newest portion of a long capture. */
  maxDurationMs?: number;
}

function encodeMonoWav(
  audio: DecodedAudioLike,
  options: PrepareBrowserAudioOptions = {},
): ArrayBuffer {
  const requestedSampleRate = options.sampleRate ?? audio.sampleRate;
  if (!Number.isFinite(requestedSampleRate) || requestedSampleRate <= 0) {
    throw new Error('sampleRate must be a positive finite number');
  }
  if (
    options.maxDurationMs !== undefined &&
    (!Number.isFinite(options.maxDurationMs) || options.maxDurationMs <= 0)
  ) {
    throw new Error('maxDurationMs must be a positive finite number');
  }

  // Upsampling only increases the request payload without recovering detail.
  const sampleRate = Math.min(
    audio.sampleRate,
    Math.max(1, Math.round(requestedSampleRate)),
  );
  const maxSourceFrames = options.maxDurationMs === undefined
    ? audio.length
    : Math.ceil((audio.sampleRate * options.maxDurationMs) / 1_000);
  const sourceStart = Math.max(0, audio.length - maxSourceFrames);
  const sourceLength = audio.length - sourceStart;
  const outputLength = Math.ceil((sourceLength * sampleRate) / audio.sampleRate);
  const dataBytes = outputLength * 2;
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
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, dataBytes, true);

  const channels = Array.from(
    { length: audio.numberOfChannels },
    (_, channel) => audio.getChannelData(channel),
  );
  const sourceFramesPerOutput = audio.sampleRate / sampleRate;
  let offset = 44;
  for (let frame = 0; frame < outputLength; frame += 1) {
    const windowStart = sourceStart + frame * sourceFramesPerOutput;
    const windowEnd = Math.min(
      audio.length,
      sourceStart + (frame + 1) * sourceFramesPerOutput,
    );
    let sample = 0;
    let weight = 0;
    for (
      let sourceFrame = Math.floor(windowStart);
      sourceFrame < Math.ceil(windowEnd);
      sourceFrame += 1
    ) {
      const frameWeight = Math.max(
        0,
        Math.min(windowEnd, sourceFrame + 1) - Math.max(windowStart, sourceFrame),
      );
      if (frameWeight === 0) continue;
      let mixed = 0;
      for (const channel of channels) mixed += channel[sourceFrame] ?? 0;
      sample += (mixed / Math.max(1, channels.length)) * frameWeight;
      weight += frameWeight;
    }
    sample = Math.max(-1, Math.min(1, weight > 0 ? sample / weight : 0));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }
  return wav;
}

/** Decode browser-recorded WebM/Opus and return a WAV accepted by audio LLMs. */
export async function prepareBrowserAudio(
  input: ArrayBuffer,
  format: AudioLLMInputFormat,
  options: PrepareBrowserAudioOptions = {},
): Promise<{ audio: ArrayBuffer; format: 'wav' | 'mp3' }> {
  if (format === 'wav' || format === 'mp3') return { audio: input, format };
  const AC = (globalThis as unknown as { AudioContext?: DecodeAudioContextCtor }).AudioContext;
  if (!AC) throw new Error('AudioContext is unavailable; cannot convert recorded audio to WAV');
  const context = new AC();
  try {
    const decoded = await context.decodeAudioData(input.slice(0));
    return { audio: encodeMonoWav(decoded, options), format: 'wav' };
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
    let decoded: DecodedAudioLike;
    try {
      decoded = await context.decodeAudioData(input.slice(0));
    } catch {
      return { levels: [], frameMs };
    }
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
