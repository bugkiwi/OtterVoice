import type { ASRDecodeResult } from '@ottervoice/provider-utils';
import type { ASRSessionOptions } from '@ottervoice/core';

/** Default Deepgram live listen WebSocket endpoint. */
export const DEFAULT_BASE_URL = 'wss://api.deepgram.com/v1/listen';

/** Query knobs mapped onto Deepgram's `/v1/listen` WebSocket URL. */
export interface DeepgramQueryOptions {
  /** Deepgram model id (e.g. `nova-2`, `nova-3`). */
  model?: string;
  /** BCP-47 language; overridden by {@link ASRSessionOptions.language} when set. */
  language?: string;
  /** Raw audio encoding when not inferred from the runtime (e.g. `linear16`). */
  encoding?: string;
  /** Sample rate in Hz for PCM encodings; overridden by session options when set. */
  sampleRate?: number;
  /** Request interim (`is_final: false`) Results; default from session options. */
  interimResults?: boolean;
  /** Ask Deepgram to add punctuation to transcripts. */
  punctuate?: boolean;
  /** Enable Deepgram smart formatting (numbers, dates, etc.). */
  smartFormat?: boolean;
}

/**
 * Build the Deepgram listen WebSocket URL with query parameters.
 *
 * @param baseUrl - Listen endpoint; usually {@link DEFAULT_BASE_URL} or a broker-signed URL.
 * @param options - Provider defaults for model / formatting.
 * @param asr - Per-session overrides from {@link ASRSessionOptions}.
 * @returns Fully qualified `wss://` URL including search params.
 */
export function buildDeepgramUrl(
  baseUrl: string,
  options: DeepgramQueryOptions,
  asr: ASRSessionOptions,
): string {
  const url = new URL(baseUrl);
  const params = url.searchParams;
  if (options.model !== undefined) params.set('model', options.model);
  const language = asr.language ?? options.language;
  if (language !== undefined) params.set('language', language);
  const encoding = asr.encoding ?? options.encoding;
  if (encoding !== undefined) params.set('encoding', encoding);
  const sampleRate = asr.sampleRate ?? options.sampleRate;
  if (sampleRate !== undefined) params.set('sample_rate', String(sampleRate));
  const interim = asr.interimResults ?? options.interimResults;
  if (interim !== undefined) params.set('interim_results', String(interim));
  if (options.punctuate !== undefined) params.set('punctuate', String(options.punctuate));
  if (options.smartFormat !== undefined) {
    params.set('smart_format', String(options.smartFormat));
  }
  return url.toString();
}

interface DeepgramMessage {
  type?: string;
  is_final?: boolean;
  channel?: { alternatives?: Array<{ transcript?: string; confidence?: number }> };
}

/** Decode a Deepgram `Results` message into a transcript result. */
export function decodeDeepgram(data: string): ASRDecodeResult | undefined {
  let msg: DeepgramMessage;
  try {
    msg = JSON.parse(data) as DeepgramMessage;
  } catch {
    return undefined;
  }
  if (msg.type !== 'Results') return undefined;
  const alt = msg.channel?.alternatives?.[0];
  const text = alt?.transcript ?? '';
  if (text.length === 0) return undefined;
  const result: { text: string; confidence?: number } = { text };
  if (typeof alt?.confidence === 'number') result.confidence = alt.confidence;
  return msg.is_final ? { final: result } : { partial: result };
}
