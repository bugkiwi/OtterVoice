import {
  normalizeError,
  VoiceError,
  type AudioLLMGenerateInput,
  type AudioLLMGenerateOutput,
  type AudioLLMInputFormat,
  type AudioLLMProvider,
  type LLMUsage,
  type NormalizedVoiceError,
} from '@ottervoice/core';
import {
  normalizeHttpError,
  parseSSEStream,
  readBody,
  resolveFetch,
  type FetchLike,
} from '@ottervoice/provider-utils';
import { bytesToBase64 } from './audio.js';
import type { PreparedAudioInput } from './audio-llm.js';

const PROVIDER = 'openrouter-cascaded-voice';

/** Client options for the server-orchestrated ASR → LLM → TTS voice-turn route. */
export interface OpenRouterGatewayVoiceTurnOptions {
  /** Application route prefix, such as `/api/voice/asr-llm-tts`. */
  baseUrl: string;
  /** Application-gateway headers, for example a short-lived session token. */
  headers?: Record<string, string>;
  /** Custom Fetch implementation for browser, native, or test runtimes. */
  fetch?: FetchLike;
  /** Runtime conversion from browser/native capture to WAV or MP3. */
  prepareAudio?: (
    audio: ArrayBuffer,
    format: AudioLLMInputFormat,
  ) => Promise<PreparedAudioInput>;
  /** Require the composite SSE response to end with `[DONE]`. */
  requireDoneSentinel?: boolean;
}

function base64ToBytes(value: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = value.replace(/\s/g, '');
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  const output = new Uint8Array(Math.max(0, (clean.length / 4) * 3 - padding));
  let offset = 0;
  for (let index = 0; index < clean.length; index += 4) {
    const a = alphabet.indexOf(clean[index] ?? 'A');
    const b = alphabet.indexOf(clean[index + 1] ?? 'A');
    const c = clean[index + 2] === '=' ? 0 : alphabet.indexOf(clean[index + 2] ?? 'A');
    const d = clean[index + 3] === '=' ? 0 : alphabet.indexOf(clean[index + 3] ?? 'A');
    const bits = (a << 18) | (b << 12) | (c << 6) | d;
    if (offset < output.length) output[offset++] = (bits >> 16) & 255;
    if (offset < output.length) output[offset++] = (bits >> 8) & 255;
    if (offset < output.length) output[offset++] = bits & 255;
  }
  return output;
}

function detachedBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function joinBuffers(buffers: readonly ArrayBuffer[]): ArrayBuffer {
  const total = buffers.reduce((sum, value) => sum + value.byteLength, 0);
  const joined = new Uint8Array(total);
  let offset = 0;
  for (const value of buffers) {
    joined.set(new Uint8Array(value), offset);
    offset += value.byteLength;
  }
  return joined.buffer;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Create a client-safe voice-turn provider backed by one server-orchestrated
 * ASR → LLM → MP3 TTS SSE request.
 *
 * Use this for cascaded voice applications that should expose the same client
 * lifecycle as a native audio model while keeping every vendor call and model
 * policy on the server.
 *
 * @param options - Composite route, audio preparation, and transport options.
 * @returns An {@link AudioLLMProvider} that also supplies the input transcript.
 */
export function createOpenRouterGatewayVoiceTurn(
  options: OpenRouterGatewayVoiceTurnOptions,
): AudioLLMProvider {
  const fetchImpl = resolveFetch(options.fetch);
  const url = `${options.baseUrl.replace(/\/$/, '')}/chat/completions`;

  return {
    name: PROVIDER,
    transcribesInput: true,
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
          message: `Voice-turn input ${input.format} requires prepareAudio() to produce WAV or MP3`,
          provider: PROVIDER,
          stage: 'audio_prepare',
          retryable: false,
          safeMessage: 'The recorded audio format is not supported by this runtime.',
        });
      }

      const messages: Array<Record<string, unknown>> = input.messages
        .filter((message) => message.role === 'user' || message.role === 'assistant')
        .map((message) => ({ role: message.role, content: message.content }));
      messages.push({
        role: 'user',
        content: [
          {
            type: 'input_audio',
            input_audio: {
              data: bytesToBase64(new Uint8Array(prepared.audio)),
              format: prepared.format,
            },
          },
        ],
      });

      let response: Response;
      try {
        response = await fetchImpl(url, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...options.headers,
          },
          body: JSON.stringify({ messages }),
          signal: input.signal,
        });
      } catch (error) {
        throw new VoiceError(
          normalizeError(error, 'network_error', PROVIDER, 'gateway'),
        );
      }
      if (!response.ok || response.body === null) {
        throw new VoiceError(
          normalizeHttpError(response.status, await readBody(response), {
            provider: PROVIDER,
            failureCode: 'llm_failed',
            stage: 'gateway',
          }),
        );
      }

      let inputText = '';
      let text = '';
      let usage: LLMUsage | undefined;
      let sequence = 0;
      let completed = false;
      const audioSegments: ArrayBuffer[] = [];
      const startedAt = performance.now();
      let firstAudioAtMs: number | undefined;
      try {
        for await (const data of parseSSEStream(response.body)) {
          if (data === '[DONE]') {
            completed = true;
            break;
          }
          let event: Record<string, unknown>;
          try {
            event = JSON.parse(data) as Record<string, unknown>;
          } catch {
            continue;
          }
          if (event.type === 'input_text' && typeof event.text === 'string') {
            inputText = event.text;
            await input.onInputTranscript?.(inputText);
          } else if (
            event.type === 'output_text_delta' &&
            typeof event.delta === 'string'
          ) {
            text += event.delta;
            await input.onTranscriptDelta?.(event.delta);
          } else if (
            event.type === 'output_audio_segment' &&
            typeof event.data === 'string'
          ) {
            firstAudioAtMs ??= performance.now() - startedAt;
            const bytes = base64ToBytes(event.data);
            const audio = detachedBuffer(bytes);
            const mimeType = typeof event.mimeType === 'string'
              ? event.mimeType
              : 'audio/mpeg';
            const eventSequence = typeof event.sequence === 'number'
              ? event.sequence
              : sequence;
            sequence = Math.max(sequence, eventSequence + 1);
            audioSegments.push(audio.slice(0));
            await input.onAudioSegment?.({
              data: audio,
              mimeType,
              sequence: eventSequence,
            });
          } else if (event.type === 'usage' && isRecord(event.usage)) {
            usage = {
              ...(typeof event.usage.inputTokens === 'number'
                ? { inputTokens: event.usage.inputTokens }
                : {}),
              ...(typeof event.usage.outputTokens === 'number'
                ? { outputTokens: event.usage.outputTokens }
                : {}),
              ...(typeof event.usage.totalTokens === 'number'
                ? { totalTokens: event.usage.totalTokens }
                : {}),
            };
          } else if (event.type === 'error' && isRecord(event.error)) {
            const error = event.error as unknown as NormalizedVoiceError;
            throw new VoiceError({
              code: error.code ?? 'llm_failed',
              message: error.message ?? 'Composite voice turn failed',
              provider: PROVIDER,
              stage: error.stage ?? 'gateway',
              retryable: error.retryable ?? true,
            });
          }
        }
      } catch (error) {
        if (error instanceof VoiceError) throw error;
        throw new VoiceError({
          ...normalizeError(error, 'network_error', PROVIDER, 'stream'),
          stage: 'stream',
          retryable: true,
          safeMessage: 'The composite voice stream was interrupted.',
        });
      }
      if (options.requireDoneSentinel && !completed) {
        throw new VoiceError({
          code: 'network_error',
          message: 'Composite voice SSE stream ended before [DONE]',
          provider: PROVIDER,
          stage: 'stream',
          retryable: true,
          safeMessage: 'The composite voice stream ended unexpectedly.',
        });
      }
      if (text.trim().length > 0 && audioSegments.length === 0) {
        throw new VoiceError({
          code: 'tts_failed',
          message: 'Composite voice turn returned text without audio',
          provider: PROVIDER,
          stage: 'gateway',
          retryable: true,
          safeMessage: 'The server returned no playable speech.',
        });
      }

      return {
        inputText,
        text,
        audioBuffer: joinBuffers(audioSegments),
        mimeType: 'audio/mpeg',
        ...(usage ? { usage } : {}),
        raw: {
          firstAudioAtMs,
          totalMs: performance.now() - startedAt,
          audioSegmentCount: audioSegments.length,
        },
      };
    },
  };
}
