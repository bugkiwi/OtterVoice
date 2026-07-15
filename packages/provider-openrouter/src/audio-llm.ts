import {
  normalizeError,
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
import { bytesToBase64 } from './audio.js';
import { buildHeaders, DEFAULT_BASE_URL, mapUsage, type HeaderOptions } from './chat.js';

const PROVIDER = 'openrouter';

/** WAV/MP3 bytes ready for OpenAI-compatible audio chat. */
export interface PreparedAudioInput {
  /** Encoded audio body. */
  audio: ArrayBuffer;
  /** Container accepted by the audio chat API. */
  format: 'wav' | 'mp3';
}

/** Options for the OpenRouter Audio LLM adapter (`pipeline: 'audio_llm'`). */
export interface OpenRouterAudioLLMOptions extends CredentialOptions, HeaderOptions {
  /** Audio-capable chat model id (e.g. OpenAI GPT-4o-audio via OpenRouter). */
  model: string;
  /** Output voice when the model returns spoken audio. */
  voice?: 'alloy' | 'ash' | 'ballad' | 'coral' | 'echo' | 'fable' | 'nova' | 'onyx' | 'sage' | 'shimmer' | 'verse';
  /** API root; defaults to OpenRouter's public `…/api/v1`. */
  baseUrl?: string;
  /**
   * Classify HTTP failures as direct provider or same-origin gateway errors.
   * Defaults to `gateway` when `baseUrl` is customized, otherwise `provider`.
   */
  requestStage?: 'gateway' | 'provider';
  /** Default sampling temperature when the session does not override. */
  defaultTemperature?: number;
  /**
   * OpenAI audio chat accepts WAV/MP3, while browsers normally record WebM.
   * Supply a runtime-specific decoder when WebM/Opus input is possible.
   */
  prepareAudio?: (
    audio: ArrayBuffer,
    format: AudioLLMInputFormat,
  ) => Promise<PreparedAudioInput>;
  /**
   * Require the SSE response to end with an explicit `[DONE]` sentinel.
   * Disabled by default for compatibility with gateways that close a complete stream cleanly.
   */
  requireDoneSentinel?: boolean;
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

class IncrementalPcm16Decoder {
  private base64Carry = '';
  private byteCarry: number | undefined;

  push(value: string): Uint8Array {
    this.base64Carry += value.replace(/\s/g, '');
    const completeChars = this.base64Carry.length - (this.base64Carry.length % 4);
    if (completeChars === 0) return new Uint8Array(0);
    const encoded = this.base64Carry.slice(0, completeChars);
    this.base64Carry = this.base64Carry.slice(completeChars);
    return this.alignSamples(base64ToBytes(encoded), false);
  }

  finish(): Uint8Array {
    let encoded = this.base64Carry;
    this.base64Carry = '';
    if (encoded.length % 4 !== 0) {
      encoded = encoded.padEnd(encoded.length + (4 - (encoded.length % 4)), '=');
    }
    const bytes = encoded.length > 0
      ? base64ToBytes(encoded)
      : new Uint8Array(0);
    return this.alignSamples(bytes, true);
  }

  private alignSamples(bytes: Uint8Array, final: boolean): Uint8Array {
    const prefix = this.byteCarry;
    const combined = new Uint8Array(bytes.byteLength + (prefix === undefined ? 0 : 1));
    if (prefix !== undefined) combined[0] = prefix;
    combined.set(bytes, prefix === undefined ? 0 : 1);
    this.byteCarry = undefined;

    const completeBytes = combined.byteLength - (combined.byteLength % 2);
    if (completeBytes < combined.byteLength && !final) {
      this.byteCarry = combined[combined.byteLength - 1];
    }
    // A dangling byte cannot form a PCM16 sample and is intentionally dropped
    // only at the terminal boundary.
    return combined.slice(0, completeBytes);
  }
}

function detachedBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
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

/**
 * Wrap OpenAI's 24 kHz mono PCM16 stream so browser audio elements can play it.
 *
 * @param pcm - Interleaved little-endian PCM16 bytes.
 * @param sampleRate - Sample rate in Hz (OpenAI audio chat defaults to 24_000).
 * @returns A standard WAV container buffer.
 */
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
 *
 * @param options - Model, voice, credentials, and optional WebM→WAV preparer.
 * @returns An {@link AudioLLMProvider} for `pipeline: 'audio_llm'`.
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
  const requestStage =
    options.requestStage ?? (options.baseUrl ? 'gateway' : 'provider');

  return {
    name: PROVIDER,
    async generate(input: AudioLLMGenerateInput): Promise<AudioLLMGenerateOutput> {
      let prepared: PreparedAudioInput;
      if (input.format === 'wav' || input.format === 'mp3') {
        prepared = { audio: input.audio, format: input.format };
      } else if (options.prepareAudio) {
        try {
          prepared = await options.prepareAudio(input.audio, input.format);
        } catch (error) {
          throw new VoiceError({
            ...normalizeError(error, 'llm_failed', PROVIDER, 'audio_prepare'),
            stage: 'audio_prepare',
            retryable: false,
            safeMessage: 'The recorded audio could not be decoded or converted.',
          });
        }
      } else {
        throw new VoiceError({
          code: 'unsupported_runtime',
          message: `Audio LLM input ${input.format} requires prepareAudio() to produce WAV or MP3`,
          provider: PROVIDER,
          stage: 'audio_prepare',
          retryable: false,
          safeMessage: 'The recorded audio format is not supported by this runtime.',
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

      let token: string;
      try {
        ({ token } = await resolveCredential());
      } catch (error) {
        throw new VoiceError(
          normalizeError(
            error,
            'network_error',
            PROVIDER,
            options.tokenBrokerUrl ? 'gateway' : requestStage,
          ),
        );
      }
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
      let res: Response;
      try {
        res = await fetchImpl(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: buildHeaders(token, options),
          body: JSON.stringify(body),
          signal: input.signal,
        });
      } catch (error) {
        throw new VoiceError(
          normalizeError(error, 'network_error', PROVIDER, requestStage),
        );
      }
      if (!res.ok || !res.body) {
        throw new VoiceError(
          normalizeHttpError(res.status, await readBody(res), {
            provider: PROVIDER,
            failureCode: 'llm_failed',
            stage: requestStage,
          }),
        );
      }

      const audioB64Parts: string[] = [];
      const incrementalDecoder = input.onAudioChunk
        ? new IncrementalPcm16Decoder()
        : undefined;
      let text = '';
      let usage;
      let rawUsage: Record<string, unknown> | undefined;
      let firstAudioAtMs: number | undefined;
      let completed = false;
      try {
        for await (const data of parseSSEStream(res.body)) {
          if (data === '[DONE]') {
            completed = true;
            break;
          }
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
            const pcm = incrementalDecoder?.push(audio.data);
            if (pcm && pcm.byteLength > 0) {
              await input.onAudioChunk?.({
                data: detachedBuffer(pcm),
                encoding: 'pcm_s16le',
                sampleRate: 24_000,
                channels: 1,
              });
            }
          }
          if (audio?.transcript) {
            text += audio.transcript;
            await input.onTranscriptDelta?.(audio.transcript);
          }
          const chunkUsage = (json as { usage?: Record<string, unknown> }).usage;
          if (chunkUsage) rawUsage = chunkUsage;
          usage = mapUsage(chunkUsage as never) ?? usage;
        }
      } catch (error) {
        throw new VoiceError({
          ...normalizeError(error, 'network_error', PROVIDER, 'stream'),
          stage: 'stream',
          retryable: true,
          safeMessage: 'The provider audio stream was interrupted.',
        });
      }
      if (options.requireDoneSentinel && !completed) {
        throw new VoiceError({
          code: 'network_error',
          message: 'Audio LLM SSE stream ended before [DONE]',
          provider: PROVIDER,
          stage: 'stream',
          retryable: true,
          safeMessage: 'The provider audio stream ended unexpectedly.',
        });
      }

      const finalPcm = incrementalDecoder?.finish();
      if (finalPcm && finalPcm.byteLength > 0) {
        await input.onAudioChunk?.({
          data: detachedBuffer(finalPcm),
          encoding: 'pcm_s16le',
          sampleRate: 24_000,
          channels: 1,
        });
      }

      const audioBytes = base64ToBytes(audioB64Parts.join(''));
      if (audioBytes.byteLength === 0) {
        throw new VoiceError({
          code: 'llm_failed',
          message: 'Audio LLM returned no audio',
          provider: PROVIDER,
          stage: 'provider',
          retryable: true,
          safeMessage: 'The provider returned no playable audio.',
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
