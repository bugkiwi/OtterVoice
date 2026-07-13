import {
  VoiceError,
  type AudioLLMGenerateInput,
  type AudioLLMGenerateOutput,
  type AudioLLMInputFormat,
  type AudioLLMProvider,
} from '@ottervoice/core';
import {
  createCredentialResolver,
  normalizeHttpError,
  parseSSEStream,
  readBody,
  resolveFetch,
  type CredentialOptions,
} from '@ottervoice/provider-utils';
import { bytesToBase64 } from './audio';
import { buildHeaders, DEFAULT_BASE_URL, mapUsage, type HeaderOptions } from './chat';

const PROVIDER = 'openrouter';

export interface PreparedAudioInput {
  audio: ArrayBuffer;
  format: 'wav' | 'mp3';
}

export interface OpenRouterAudioLLMOptions extends CredentialOptions, HeaderOptions {
  model: string;
  voice?: 'alloy' | 'ash' | 'ballad' | 'coral' | 'echo' | 'fable' | 'nova' | 'onyx' | 'sage' | 'shimmer' | 'verse';
  baseUrl?: string;
  defaultTemperature?: number;
  /**
   * OpenAI audio chat accepts WAV/MP3, while browsers normally record WebM.
   * Supply a runtime-specific decoder when WebM/Opus input is possible.
   */
  prepareAudio?: (
    audio: ArrayBuffer,
    format: AudioLLMInputFormat,
  ) => Promise<PreparedAudioInput>;
}

function base64ToBytes(value: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = value.replace(/\s/g, '');
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  const output = new Uint8Array(Math.max(0, (clean.length / 4) * 3 - padding));
  let offset = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const a = alphabet.indexOf(clean[i] ?? 'A');
    const b = alphabet.indexOf(clean[i + 1] ?? 'A');
    const c = clean[i + 2] === '=' ? 0 : alphabet.indexOf(clean[i + 2] ?? 'A');
    const d = clean[i + 3] === '=' ? 0 : alphabet.indexOf(clean[i + 3] ?? 'A');
    const bits = (a << 18) | (b << 12) | (c << 6) | d;
    if (offset < output.length) output[offset++] = (bits >> 16) & 255;
    if (offset < output.length) output[offset++] = (bits >> 8) & 255;
    if (offset < output.length) output[offset++] = bits & 255;
  }
  return output;
}

function extractStreamAudioDelta(json: Record<string, unknown>):
  | { data?: string; transcript?: string }
  | undefined {
  const choice = (json.choices as Array<Record<string, unknown>> | undefined)?.[0];
  const delta = choice?.delta as { audio?: { data?: string; transcript?: string } } | undefined;
  if (delta?.audio) return delta.audio;
  const message = choice?.message as { audio?: { data?: string; transcript?: string } } | undefined;
  return message?.audio;
}

/** Wrap OpenAI's 24 kHz mono PCM16 stream so browser audio elements can play it. */
export function pcm16ToWav(pcm: Uint8Array, sampleRate = 24_000): ArrayBuffer {
  const wav = new ArrayBuffer(44 + pcm.byteLength);
  const view = new DataView(wav);
  const write = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i));
  };
  write(0, 'RIFF');
  view.setUint32(4, 36 + pcm.byteLength, true);
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
  view.setUint32(40, pcm.byteLength, true);
  new Uint8Array(wav, 44).set(pcm);
  return wav;
}

/**
 * OpenRouter chat-completions adapter for models such as
 * `openai/gpt-audio-mini` that understand speech and generate speech directly.
 */
export function createOpenRouterAudioLLM(
  options: OpenRouterAudioLLMOptions,
): AudioLLMProvider {
  const fetchImpl = resolveFetch(options.fetch);
  const resolveCredential = createCredentialResolver(options, {
    provider: PROVIDER,
    purpose: 'llm',
  });
  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');

  return {
    name: PROVIDER,
    async generate(input: AudioLLMGenerateInput): Promise<AudioLLMGenerateOutput> {
      let prepared: PreparedAudioInput;
      if (input.format === 'wav' || input.format === 'mp3') {
        prepared = { audio: input.audio, format: input.format };
      } else if (options.prepareAudio) {
        prepared = await options.prepareAudio(input.audio, input.format);
      } else {
        throw new VoiceError({
          code: 'unsupported_runtime',
          message: `Audio LLM input ${input.format} requires prepareAudio() to produce WAV or MP3`,
          provider: PROVIDER,
          retryable: false,
        });
      }

      const messages: Array<Record<string, unknown>> = [];
      if (input.system) messages.push({ role: 'system', content: input.system });
      for (const message of input.messages) {
        messages.push({ role: message.role, content: message.content });
      }
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: 'Respond naturally to this voice message.' },
          {
            type: 'input_audio',
            input_audio: {
              data: bytesToBase64(new Uint8Array(prepared.audio)),
              format: prepared.format,
            },
          },
        ],
      });

      const { token } = await resolveCredential();
      const startedAt = performance.now();
      const body: Record<string, unknown> = {
        model: options.model,
        messages,
        modalities: ['text', 'audio'],
        audio: { voice: options.voice ?? 'alloy', format: 'pcm16' },
        stream: true,
        stream_options: { include_usage: true },
        temperature: input.temperature ?? options.defaultTemperature,
      };
      if (input.maxTokens !== undefined) body.max_tokens = input.maxTokens;
      const res = await fetchImpl(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: buildHeaders(token, options),
        body: JSON.stringify(body),
      });
      if (!res.ok || !res.body) {
        throw new VoiceError(
          normalizeHttpError(res.status, await readBody(res), {
            provider: PROVIDER,
            failureCode: 'llm_failed',
          }),
        );
      }

      const audioB64Parts: string[] = [];
      let text = '';
      let usage;
      let rawUsage: Record<string, unknown> | undefined;
      let firstAudioAtMs: number | undefined;
      for await (const data of parseSSEStream(res.body)) {
        if (data === '[DONE]') break;
        let json: Record<string, unknown>;
        try {
          json = JSON.parse(data) as Record<string, unknown>;
        } catch {
          continue;
        }
        const audio = extractStreamAudioDelta(json);
        if (audio?.data) {
          firstAudioAtMs ??= performance.now() - startedAt;
          audioB64Parts.push(audio.data);
        }
        if (audio?.transcript) text += audio.transcript;
        const chunkUsage = (json as { usage?: Record<string, unknown> }).usage;
        if (chunkUsage) rawUsage = chunkUsage;
        usage = mapUsage(chunkUsage as never) ?? usage;
      }

      const audioBytes = base64ToBytes(audioB64Parts.join(''));
      if (audioBytes.byteLength === 0) {
        throw new VoiceError({
          code: 'llm_failed',
          message: 'Audio LLM returned no audio',
          provider: PROVIDER,
          retryable: true,
        });
      }
      const wav = pcm16ToWav(audioBytes);
      return {
        text,
        audioBuffer: wav,
        mimeType: 'audio/wav',
        ...(usage ? { usage } : {}),
        raw: {
          firstAudioAtMs,
          totalMs: performance.now() - startedAt,
          generationId: res.headers.get('x-generation-id'),
          usage: rawUsage,
          audioChunkCount: audioB64Parts.length,
          audioByteLength: audioBytes.byteLength,
        },
      };
    },
  };
}
