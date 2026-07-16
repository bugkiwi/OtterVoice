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
import { buildHeaders, DEFAULT_BASE_URL, type HeaderOptions } from './chat.js';

const PROVIDER = 'openrouter';

/**
 * Options for direct OpenRouter HTTP transcription in trusted server/CLI
 * runtimes. Browser/app integrations should use `OpenRouterGatewayASROptions`.
 */
export interface OpenRouterASROptions extends CredentialOptions, HeaderOptions {
  /** OpenRouter / OpenAI-compatible transcription model id. Keep server-owned. */
  model: string;
  /** Browser MediaRecorder defaults to WebM. */
  format?: Extract<AudioEncoding, 'webm' | 'wav' | 'mp3' | 'opus'>;
  /**
   * Re-transcribe the accumulated live PCM at this interval to provide
   * best-effort partial results before the turn ends. Omit for batch-only ASR.
   */
  partialIntervalMs?: number;
  /**
   * Delay the next rolling request after an empty provisional transcript.
   * Defaults to the greater of 3x `partialIntervalMs` and 3 seconds.
   */
  emptyPartialBackoffMs?: number;
  /** BCP-47 language hint sent to the transcription API when supported. Keep server-owned in standard mode. */
  language?: string;
  /** API root; defaults to OpenRouter's chat-compatible base URL. */
  baseUrl?: string;
  /** Classify HTTP failures as gateway/provider errors. Defaults from whether `baseUrl` is customized. */
  requestStage?: 'gateway' | 'provider';
  /** Test hook for partial-result scheduling. */
  now?: () => number;
  /** Omit provider policy fields because a trusted gateway reconstructs the request. */
  serverManaged?: boolean;
}

/**
 * Options for direct OpenRouter HTTP speech synthesis in trusted server/CLI
 * runtimes. Browser/app integrations should use `OpenRouterGatewayClientOptions`.
 */
export interface OpenRouterTTSOptions extends CredentialOptions, HeaderOptions {
  /** OpenRouter / OpenAI-compatible TTS model id. Keep server-owned. */
  model: string;
  /** Voice name accepted by the selected model. Keep server-owned. */
  voice: string;
  /** API root; defaults to OpenRouter's chat-compatible base URL. */
  baseUrl?: string;
  /** Classify HTTP failures as gateway/provider errors. Defaults from whether `baseUrl` is customized. */
  requestStage?: 'gateway' | 'provider';
  /** Speaking rate multiplier when the upstream model supports it. Keep server-owned. */
  speed?: number;
  /** Omit provider policy fields because a trusted gateway reconstructs the request. */
  serverManaged?: boolean;
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

function detectContainerFormat(
  bytes: Uint8Array,
): Extract<AudioEncoding, 'webm' | 'wav' | 'mp3' | 'opus'> | undefined {
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3
  ) {
    return 'webm';
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x41 &&
    bytes[10] === 0x56 &&
    bytes[11] === 0x45
  ) {
    return 'wav';
  }
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x4f &&
    bytes[1] === 0x67 &&
    bytes[2] === 0x67 &&
    bytes[3] === 0x53
  ) {
    return 'opus';
  }
  if (
    bytes.length >= 3 &&
    bytes[0] === 0x49 &&
    bytes[1] === 0x44 &&
    bytes[2] === 0x33
  ) {
    return 'mp3';
  }
  if (
    bytes.length >= 2 &&
    bytes[0] === 0xff &&
    (bytes[1]! & 0xe0) === 0xe0
  ) {
    return 'mp3';
  }
  return undefined;
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
 * Direct transcription through OpenRouter's `/audio/transcriptions` endpoint
 * for trusted server/CLI runtimes.
 * The default remains one request at turn end. Setting `partialIntervalMs`
 * adds rolling, best-effort snapshots for low-latency partial text while the
 * final request still covers the complete turn.
 *
 * @param options - Model, credentials, and optional rolling-partial interval.
 * @returns An {@link ASRProvider} for {@link VoiceSessionConfig.providers.asr}.
 */
export function createOpenRouterASR(options: OpenRouterASROptions): ASRProvider {
  const fetchImpl = resolveFetch(options.fetch);
  const resolveCredential = createCredentialResolver(options, {
    provider: PROVIDER,
    purpose: 'asr',
  });
  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
  const requestStage = options.requestStage ?? (options.baseUrl ? 'gateway' : 'provider');
  const format = options.format ?? 'webm';
  const partialIntervalMs = options.partialIntervalMs;
  const incremental = partialIntervalMs !== undefined;
  const now = options.now ?? Date.now;
  const partialDelayMs = Math.max(0, partialIntervalMs ?? 0);
  const emptyPartialBackoffMs =
    options.emptyPartialBackoffMs ?? Math.max(partialDelayMs * 3, 3_000);

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
      let partialAbort: AbortController | undefined;
      let finalAbort: AbortController | undefined;
      let interimResultsEnabled = sessionOptions.interimResults !== false;
      let nextPartialAt = now() + partialDelayMs;

      const toUpload = (source: readonly ArrayBuffer[]) => {
        const joined = joinChunks(source);
        // VoiceSession requests PCM16 as its cross-platform preference, but a
        // Web MediaRecorder emits its actual WebM container on each turn. Trust
        // a recognizable container header before falling back to the requested
        // PCM encoding so browser audio is never wrapped in a bogus WAV file.
        const containerFormat = detectContainerFormat(joined);
        if (containerFormat) {
          return { bytes: joined, uploadFormat: containerFormat };
        }
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

      const transcribe = async (
        source: readonly ArrayBuffer[],
        signal?: AbortSignal,
      ): Promise<ASRResult> => {
        const { bytes, uploadFormat } = toUpload(source);
        const { token } = await resolveCredential();
        const res = await fetchImpl(`${baseUrl}/audio/transcriptions`, {
          method: 'POST',
          headers: buildHeaders(token, options),
          body: JSON.stringify(options.serverManaged
            ? {
                input_audio: {
                  data: bytesToBase64(bytes),
                  format: uploadFormat,
                },
              }
            : {
                model: options.model,
                input_audio: {
                  data: bytesToBase64(bytes),
                  format: uploadFormat,
                },
                language: sessionOptions.language ?? options.language,
                temperature: 0,
              }),
          signal,
        });
        if (!res.ok) {
          throw new VoiceError(
            normalizeHttpError(res.status, await readBody(res), {
              provider: PROVIDER,
              failureCode: 'asr_connection_failed',
              stage: requestStage,
            }),
          );
        }
        const json = (await res.json()) as { text?: unknown };
        return { text: typeof json.text === 'string' ? json.text : '', raw: json };
      };

      const requestPartial = async () => {
        if (
          !interimResultsEnabled ||
          partialInFlight ||
          closed ||
          stopped ||
          chunks.length === 0
        ) {
          return;
        }
        partialInFlight = true;
        const controller = new AbortController();
        partialAbort = controller;
        nextPartialAt = now() + partialDelayMs;
        const requestGeneration = generation;
        const snapshot = chunks.map((chunk) => chunk.slice(0));
        try {
          const result = await transcribe(snapshot, controller.signal);
          if (requestGeneration !== generation || closed || stopped) {
            return;
          }
          if (result.text.trim().length === 0) {
            nextPartialAt = Math.max(
              nextPartialAt,
              now() + Math.max(0, emptyPartialBackoffMs),
            );
            return;
          }
          for (const cb of [...partialCbs]) cb(result);
        } catch {
          // A short rolling snapshot may be rejected by a batch ASR model.
          // The complete final request remains authoritative and reports errors.
        } finally {
          if (partialAbort === controller) partialAbort = undefined;
          partialInFlight = false;
        }
      };

      return {
        sendAudio(chunk) {
          if (closed || stopped || chunk.byteLength === 0) return;
          // A Web runtime can rotate MediaRecorder after assistant playback.
          // The fresh EBML header starts a replacement WebM container; keeping
          // the older header would create two concatenated containers and make
          // final ASR decoding unreliable on Android Chrome.
          if (
            chunks.length > 0 &&
            detectContainerFormat(new Uint8Array(chunk)) === 'webm'
          ) {
            chunks.length = 0;
            generation += 1;
            nextPartialAt = now() + partialDelayMs;
          }
          chunks.push(chunk.slice(0));
          if (
            incremental &&
            interimResultsEnabled &&
            now() >= nextPartialAt
          ) {
            return requestPartial();
          }
        },
        setInterimResultsEnabled(enabled) {
          if (closed || stopped || interimResultsEnabled === enabled) return;
          interimResultsEnabled = enabled;
          generation += 1;
          // Enabling after VAD speech_start creates a fresh minimum window.
          // This prevents a long idle session from firing a paid snapshot on
          // the first tiny audio chunk of a new utterance.
          nextPartialAt = now() + partialDelayMs;
        },
        resetAudio() {
          generation += 1;
          // Preserve the first WebM chunk because it contains the container
          // header; discard assistant playback/silence accumulated after it.
          // VoiceSession asks for PCM16 cross-platform, while Web
          // MediaRecorder still sends WebM, so inspect the actual bytes before
          // falling back to the requested encoding.
          const firstChunk = chunks[0];
          const hasContainerHeader = firstChunk
            ? detectContainerFormat(new Uint8Array(firstChunk)) !== undefined
            : false;
          const containerHeader =
            hasContainerHeader || sessionOptions.encoding !== 'pcm_s16le'
              ? firstChunk
              : undefined;
          chunks.length = 0;
          if (containerHeader) chunks.push(containerHeader);
          nextPartialAt = now() + partialDelayMs;
        },
        async stop() {
          if (closed || stopped) return;
          stopped = true;
          generation += 1;
          partialAbort?.abort();
          partialAbort = undefined;
          if (chunks.length === 0) {
            for (const cb of [...finalCbs]) cb({ text: '' });
            return;
          }
          const controller = new AbortController();
          finalAbort = controller;
          try {
            const result = await transcribe(chunks, controller.signal);
            for (const cb of [...finalCbs]) cb(result);
          } catch (error) {
            if (closed && controller.signal.aborted) throw error;
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
          } finally {
            if (finalAbort === controller) finalAbort = undefined;
          }
        },
        async close() {
          closed = true;
          generation += 1;
          partialAbort?.abort();
          finalAbort?.abort();
          partialAbort = undefined;
          finalAbort = undefined;
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

/**
 * Direct OpenRouter TTS for trusted server/CLI runtimes through the
 * OpenAI-compatible `/audio/speech` endpoint.
 *
 * @param options - Model, voice, credentials, and optional speed.
 * @returns A {@link TTSProvider} for the classic `asr_llm_tts` pipeline.
 */
export function createOpenRouterTTS(options: OpenRouterTTSOptions): TTSProvider {
  const fetchImpl = resolveFetch(options.fetch);
  const resolveCredential = createCredentialResolver(options, {
    provider: PROVIDER,
    purpose: 'tts',
  });
  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
  const requestStage = options.requestStage ?? (options.baseUrl ? 'gateway' : 'provider');

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
        body: JSON.stringify(options.serverManaged
          ? { input: input.text }
          : {
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
            stage: requestStage,
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
