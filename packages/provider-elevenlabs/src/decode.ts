import { createVoiceError } from '@ottervoice/core';
import type { ASRDecodeResult } from '@ottervoice/provider-utils';
import type { ASRSessionOptions } from '@ottervoice/core';

export const DEFAULT_BASE_URL = 'wss://api.elevenlabs.io/v1/speech-to-text/realtime';

export interface ElevenLabsQueryOptions {
  modelId?: string;
  language?: string;
}

/**
 * Build the realtime STT URL. NOTE: ElevenLabs' realtime ASR wire format is
 * evolving — verify parameter and message names against the current docs and
 * prefer `tokenBrokerUrl` (which returns a fully signed URL) in production.
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
  return url.toString();
}

interface ElevenLabsMessage {
  type?: string;
  error?: string;
  message?: string;
  text?: string;
  transcript?: string;
  is_final?: boolean;
  isFinal?: boolean;
  confidence?: number;
}

/** Decode an ElevenLabs realtime message into a transcript result. */
export function decodeElevenLabs(data: string): ASRDecodeResult | undefined {
  let msg: ElevenLabsMessage;
  try {
    msg = JSON.parse(data) as ElevenLabsMessage;
  } catch {
    return undefined;
  }
  if (msg.type === 'error' || msg.error !== undefined) {
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
  const isFinal = msg.is_final ?? msg.isFinal ?? msg.type === 'final';
  return isFinal ? { final: result } : { partial: result };
}
