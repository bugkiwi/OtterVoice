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
  /**
   * Re-transcribe the accumulated live PCM at this interval to provide
   * best-effort partial results before the turn ends. Omit for batch-only ASR.
   */
  partialIntervalMs?: number;
  language?: string;
  baseUrl?: string;
  /** Test hook for partial-result scheduling. */
  now?: () => number;
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

function pcm16ToWavBytes(pcm: Uint8Array, sampleRate: number, channels: number): Uint8Array {
  const headerBytes = 44;
  const wav = new Uint8Array(headerBytes + pcm.byteLength);
  const view = new DataView(wav.buffer);
  const writeAscii = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };
  const blockAlign = channels * 2;
  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + pcm.byteLength, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeAscii(36, 'data');
  view.setUint32(40, pcm.byteLength, true);
  wav.set(pcm, headerBytes);
  return wav;
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
 * Transcription through OpenRouter's `/audio/transcriptions` endpoint.
 * The default remains one request at turn end. Setting `partialIntervalMs`
 * adds rolling, best-effort snapshots for low-latency partial text while the
 * final request still covers the complete turn.
 */
export function createOpenRouterASR(options: OpenRouterASROptions): ASRProvider {
  const fetchImpl = resolveFetch(options.fetch);
  const resolveCredential = createCredentialResolver(options, {
    provider: PROVIDER,
    purpose: 'asr',
  });
  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
  const format = options.format ?? 'webm';
  const partialIntervalMs = options.partialIntervalMs;
  const incremental = partialIntervalMs !== undefined;
  const now = options.now ?? Date.now;

  return {
    name: PROVIDER,
    capabilities: {
      streaming: incremental,
      batch: true,
      partialResults: incremental,
      endpointing: false,
      languages: ['auto'],
    },
    async createSession(sessionOptions) {
      const chunks: ArrayBuffer[] = [];
      const partialCbs = new Set<(result: ASRResult) => void>();
      const finalCbs = new Set<(result: ASRResult) => void>();
      const errorCbs = new Set<(error: NormalizedVoiceError) => void>();
      let closed = false;
      let stopped = false;
      let generation = 0;
      let partialInFlight = false;
      let lastPartialAt = now();

      const toUpload = (source: readonly ArrayBuffer[]) => {
        const joined = joinChunks(source);
        if (sessionOptions.encoding === 'pcm_s16le') {
          return {
            bytes: pcm16ToWavBytes(
              joined,
              sessionOptions.sampleRate ?? 16_000,
              sessionOptions.channels ?? 1,
            ),
            uploadFormat: 'wav' as const,
          };
        }
        return { bytes: joined, uploadFormat: format };
      };

      const transcribe = async (source: readonly ArrayBuffer[]): Promise<ASRResult> => {
        const { bytes, uploadFormat } = toUpload(source);
        const { token } = await resolveCredential();
        const res = await fetchImpl(`${baseUrl}/audio/transcriptions`, {
          method: 'POST',
          headers: buildHeaders(token, options),
          body: JSON.stringify({
            model: options.model,
            input_audio: {
              data: bytesToBase64(bytes),
              format: uploadFormat,
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
        return { text: typeof json.text === 'string' ? json.text : '', raw: json };
      };

      const requestPartial = async () => {
        if (partialInFlight || closed || stopped || chunks.length === 0) return;
        partialInFlight = true;
        lastPartialAt = now();
        const requestGeneration = generation;
        const snapshot = chunks.map((chunk) => chunk.slice(0));
        try {
          const result = await transcribe(snapshot);
          if (requestGeneration !== generation || closed || stopped || result.text.length === 0) {
            return;
          }
          for (const cb of [...partialCbs]) cb(result);
        } catch {
          // A short rolling snapshot may be rejected by a batch ASR model.
          // The complete final request remains authoritative and reports errors.
        } finally {
          partialInFlight = false;
        }
      };

      return {
        sendAudio(chunk) {
          if (closed || stopped || chunk.byteLength === 0) return;
          chunks.push(chunk.slice(0));
          if (
            incremental &&
            now() - lastPartialAt >= Math.max(0, partialIntervalMs)
          ) {
            return requestPartial();
          }
        },
        resetAudio() {
          generation += 1;
          // Preserve the first WebM chunk because it contains the container
          // header; discard assistant playback/silence accumulated after it.
          const containerHeader = sessionOptions.encoding === 'pcm_s16le' ? undefined : chunks[0];
          chunks.length = 0;
          if (containerHeader) chunks.push(containerHeader);
          lastPartialAt = now();
        },
        async stop() {
          if (closed || stopped) return;
          stopped = true;
          generation += 1;
          if (chunks.length === 0) {
            for (const cb of [...finalCbs]) cb({ text: '' });
            return;
          }
          try {
            const result = await transcribe(chunks);
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
          generation += 1;
          chunks.length = 0;
        },
        onPartial(cb) {
          partialCbs.add(cb);
          return () => partialCbs.delete(cb);
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
