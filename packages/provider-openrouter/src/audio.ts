import {
  VoiceError,
  type ASRProvider,
  type ASRResult,
  type AudioEncoding,
  type NormalizedVoiceError,
  type TTSFormat,
  type TTSProvider,
} from '@ottervoice/core';
import {
  createCredentialResolver,
  normalizeHttpError,
  readBody,
  resolveFetch,
  type CredentialOptions,
} from '@ottervoice/provider-utils';
import { buildHeaders, DEFAULT_BASE_URL, type HeaderOptions } from './chat';

const PROVIDER = 'openrouter';

export interface OpenRouterASROptions extends CredentialOptions, HeaderOptions {
  model: string;
  /** Browser MediaRecorder defaults to WebM. */
  format?: Extract<AudioEncoding, 'webm' | 'wav' | 'mp3' | 'opus'>;
  language?: string;
  baseUrl?: string;
}

export interface OpenRouterTTSOptions extends CredentialOptions, HeaderOptions {
  model: string;
  voice: string;
  baseUrl?: string;
  speed?: number;
}

function joinChunks(chunks: readonly ArrayBuffer[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const joined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(new Uint8Array(chunk), offset);
    offset += chunk.byteLength;
  }
  return joined;
}

/** Browser- and Node-safe base64 without relying on Buffer. */
export function bytesToBase64(bytes: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0;
    const b = bytes[i + 1] ?? 0;
    const c = bytes[i + 2] ?? 0;
    const value = (a << 16) | (b << 8) | c;
    output += alphabet[(value >> 18) & 63];
    output += alphabet[(value >> 12) & 63];
    output += i + 1 < bytes.length ? alphabet[(value >> 6) & 63] : '=';
    output += i + 2 < bytes.length ? alphabet[value & 63] : '=';
  }
  return output;
}

/**
 * Batch transcription through OpenRouter's `/audio/transcriptions` endpoint.
 * Audio chunks are collected during a VAD-delimited turn and sent when the
 * session is stopped.
 */
export function createOpenRouterASR(options: OpenRouterASROptions): ASRProvider {
  const fetchImpl = resolveFetch(options.fetch);
  const resolveCredential = createCredentialResolver(options, {
    provider: PROVIDER,
    purpose: 'asr',
  });
  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
  const format = options.format ?? 'webm';

  return {
    name: PROVIDER,
    capabilities: {
      streaming: false,
      batch: true,
      partialResults: false,
      endpointing: false,
      languages: ['auto'],
    },
    async createSession(sessionOptions) {
      const chunks: ArrayBuffer[] = [];
      const finalCbs = new Set<(result: ASRResult) => void>();
      const errorCbs = new Set<(error: NormalizedVoiceError) => void>();
      let closed = false;
      let stopped = false;

      return {
        sendAudio(chunk) {
          if (!closed && !stopped && chunk.byteLength > 0) chunks.push(chunk.slice(0));
        },
        resetAudio() {
          // Preserve the first WebM chunk because it contains the container
          // header; discard assistant playback/silence accumulated after it.
          const containerHeader = chunks[0];
          chunks.length = 0;
          if (containerHeader) chunks.push(containerHeader);
        },
        async stop() {
          if (closed || stopped) return;
          stopped = true;
          if (chunks.length === 0) {
            for (const cb of [...finalCbs]) cb({ text: '' });
            return;
          }
          try {
            const { token } = await resolveCredential();
            const res = await fetchImpl(`${baseUrl}/audio/transcriptions`, {
              method: 'POST',
              headers: buildHeaders(token, options),
              body: JSON.stringify({
                model: options.model,
                input_audio: {
                  data: bytesToBase64(joinChunks(chunks)),
                  format,
                },
                language: sessionOptions.language ?? options.language,
                temperature: 0,
              }),
            });
            if (!res.ok) {
              throw new VoiceError(
                normalizeHttpError(res.status, await readBody(res), {
                  provider: PROVIDER,
                  failureCode: 'asr_connection_failed',
                }),
              );
            }
            const json = (await res.json()) as { text?: unknown };
            const result = { text: typeof json.text === 'string' ? json.text : '', raw: json };
            for (const cb of [...finalCbs]) cb(result);
          } catch (error) {
            const normalized =
              error instanceof VoiceError
                ? error.toNormalized()
                : {
                    code: 'asr_connection_failed' as const,
                    message: error instanceof Error ? error.message : String(error),
                    provider: PROVIDER,
                    retryable: true,
                  };
            for (const cb of [...errorCbs]) cb(normalized);
            throw error;
          }
        },
        async close() {
          closed = true;
          chunks.length = 0;
        },
        onPartial() {
          return () => {};
        },
        onFinal(cb) {
          finalCbs.add(cb);
          return () => finalCbs.delete(cb);
        },
        onError(cb) {
          errorCbs.add(cb);
          return () => errorCbs.delete(cb);
        },
      };
    },
  };
}

function resolveSpeechFormat(format: TTSFormat | undefined): 'mp3' | 'pcm' {
  return format === 'pcm' ? 'pcm' : 'mp3';
}

/** OpenRouter TTS through the OpenAI-compatible `/audio/speech` endpoint. */
export function createOpenRouterTTS(options: OpenRouterTTSOptions): TTSProvider {
  const fetchImpl = resolveFetch(options.fetch);
  const resolveCredential = createCredentialResolver(options, {
    provider: PROVIDER,
    purpose: 'tts',
  });
  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');

  return {
    name: PROVIDER,
    capabilities: {
      streaming: false,
      voices: [{ id: options.voice, name: options.voice, language: 'multilingual' }],
      formats: ['mp3', 'pcm'],
      languages: ['multilingual'],
    },
    async synthesize(input) {
      const { token } = await resolveCredential();
      const responseFormat = resolveSpeechFormat(input.format);
      const res = await fetchImpl(`${baseUrl}/audio/speech`, {
        method: 'POST',
        headers: buildHeaders(token, options),
        body: JSON.stringify({
          model: options.model,
          input: input.text,
          voice: input.voice ?? options.voice,
          response_format: responseFormat,
          speed: input.speed ?? options.speed ?? 1,
        }),
      });
      if (!res.ok) {
        throw new VoiceError(
          normalizeHttpError(res.status, await readBody(res), {
            provider: PROVIDER,
            failureCode: 'tts_failed',
          }),
        );
      }
      return {
        audioBuffer: await res.arrayBuffer(),
        mimeType:
          res.headers.get('content-type') ??
          (responseFormat === 'mp3' ? 'audio/mpeg' : 'audio/pcm'),
        raw: { generationId: res.headers.get('x-generation-id') },
      };
    },
  };
}
