import { createVoiceError } from '@ottervoice/core';
import type { ASRDecodeResult } from '@ottervoice/provider-utils';
import type { ASRSessionOptions } from '@ottervoice/core';

/** Default ElevenLabs realtime speech-to-text WebSocket endpoint. */
export const DEFAULT_BASE_URL = 'wss://api.elevenlabs.io/v1/speech-to-text/realtime';

/**
 * Query knobs mapped onto ElevenLabs realtime
 * `/v1/speech-to-text/realtime` WebSocket URL.
 */
export interface ElevenLabsQueryOptions {
  /** ElevenLabs STT model id (e.g. `scribe_v2_realtime`). */
  modelId?: string;
  /** BCP-47 language code; overridden by {@link ASRSessionOptions.language} when set. */
  language?: string;
}

/**
 * Build the realtime STT URL. NOTE: ElevenLabs' realtime ASR wire format is
 * evolving — verify parameter and message names against the current docs. In a
 * direct-client deployment, prefer a broker URL that returns a signed URL with
 * the route/model already locked by the server.
 *
 * @param baseUrl - Listen endpoint; usually {@link DEFAULT_BASE_URL} or a broker-signed URL.
 * @param options - Provider defaults for model / language.
 * @param asr - Per-session overrides from {@link ASRSessionOptions}.
 * @returns Fully qualified `wss://` URL including search params.
 */
export function buildElevenLabsUrl(
  baseUrl: string,
  options: ElevenLabsQueryOptions,
  asr: ASRSessionOptions,
): string {
  const url = new URL(baseUrl);
  if (options.modelId !== undefined) url.searchParams.set('model_id', options.modelId);
  const language = asr.language ?? options.language;
  if (language !== undefined) url.searchParams.set('language_code', language);
  const sampleRate = asr.sampleRate ?? 16_000;
  url.searchParams.set('audio_format', `pcm_${sampleRate}`);
  url.searchParams.set('commit_strategy', 'manual');
  return url.toString();
}

interface ElevenLabsMessage {
  message_type?: string;
  type?: string;
  error?: string;
  message?: string;
  text?: string;
  transcript?: string;
  is_final?: boolean;
  isFinal?: boolean;
  confidence?: number;
}

/**
 * Decode one ElevenLabs realtime STT event, keeping provisional and final
 * transcripts separate.
 *
 * @param data - One ElevenLabs WebSocket text frame.
 * @returns A decoded transcript/error, or `undefined` for unrelated frames.
 */
export function decodeElevenLabs(data: string): ASRDecodeResult | undefined {
  let msg: ElevenLabsMessage;
  try {
    msg = JSON.parse(data) as ElevenLabsMessage;
  } catch {
    return undefined;
  }
  const type = msg.message_type ?? msg.type;
  if (
    type === 'error' ||
    type?.endsWith('_error') ||
    type === 'rate_limited' ||
    type === 'quota_exceeded' ||
    msg.error !== undefined
  ) {
    return {
      error: createVoiceError(
        'asr_connection_failed',
        msg.error ?? msg.message ?? 'ElevenLabs error',
        { provider: 'elevenlabs' },
      ),
    };
  }
  const text = msg.text ?? msg.transcript ?? '';
  if (text.length === 0) return undefined;
  const result: { text: string; confidence?: number } = { text };
  if (typeof msg.confidence === 'number') result.confidence = msg.confidence;
  if (type === 'committed_transcript') return { final: result };
  if (type === 'final_transcript') return { partial: result };
  const isFinal = msg.is_final ?? msg.isFinal ?? type === 'final';
  return isFinal ? { final: result } : { partial: result };
}
