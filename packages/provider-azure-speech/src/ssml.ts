import type { TTSFormat, TTSInput } from '@ottervoice/core';

/** Map a core {@link TTSFormat} to an Azure `X-Microsoft-OutputFormat` value. */
const FORMAT_MAP: Record<TTSFormat, string> = {
  mp3: 'audio-24khz-48kbitrate-mono-mp3',
  wav: 'riff-24khz-16bit-mono-pcm',
  pcm: 'raw-24khz-16bit-mono-pcm',
  ogg: 'ogg-24khz-16bit-mono-opus',
  opus: 'ogg-24khz-16bit-mono-opus',
};

const MIME_MAP: Record<TTSFormat, string> = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  pcm: 'audio/basic',
  ogg: 'audio/ogg',
  opus: 'audio/ogg',
};

/**
 * Map a core {@link TTSFormat} to an Azure `X-Microsoft-OutputFormat` value.
 *
 * @param format - OtterVoice TTS format.
 * @returns Azure output-format header value.
 */
export function azureOutputFormat(format: TTSFormat): string {
  return FORMAT_MAP[format];
}

/**
 * MIME type for a synthesized {@link TTSFormat}.
 *
 * @param format - OtterVoice TTS format.
 */
export function mimeTypeForFormat(format: TTSFormat): string {
  return MIME_MAP[format];
}

/** Escape the five XML predefined entities so user text is SSML-safe. */
export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Convert a 0.5–2.0 multiplier into an Azure prosody `rate` percentage. */
export function ratePercent(speed: number): string {
  const pct = Math.round((speed - 1) * 100);
  return `${pct >= 0 ? '+' : ''}${pct}%`;
}

/** Default voice / language when {@link TTSInput} omits them. */
export interface SSMLOptions {
  /** Azure neural voice name (e.g. `zh-CN-XiaoxiaoNeural`). */
  voice: string;
  /** BCP-47 language for the `<voice xml:lang>` attribute. */
  language: string;
}

/**
 * Build an SSML document for a synthesis request.
 *
 * @param input - Text plus optional voice / rate / pitch overrides.
 * @param defaults - Adapter defaults when `input` omits voice or language.
 */
export function buildSSML(input: TTSInput, defaults: SSMLOptions): string {
  const voice = input.voice ?? defaults.voice;
  const language = input.language ?? defaults.language;
  const inner = escapeXml(input.text);
  const body =
    input.speed !== undefined || input.pitch !== undefined
      ? `<prosody${input.speed !== undefined ? ` rate="${ratePercent(input.speed)}"` : ''}${
          input.pitch !== undefined ? ` pitch="${ratePercent(input.pitch)}"` : ''
        }>${inner}</prosody>`
      : inner;
  return (
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${language}">` +
    `<voice name="${voice}">${body}</voice></speak>`
  );
}
