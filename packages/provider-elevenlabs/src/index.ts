import type { ASRCapabilities, ASRProvider, ASRSession } from '@ottervoice/core';
import {
  createCredentialResolver,
  createWebSocketASRSession,
  resolveWebSocket,
  type CredentialOptions,
  type WebSocketCtor,
} from '@ottervoice/provider-utils';
import {
  buildElevenLabsUrl,
  decodeElevenLabs,
  DEFAULT_BASE_URL,
  type ElevenLabsQueryOptions,
} from './decode.js';

export * from './decode.js';

/**
 * Options for {@link createElevenLabsASR}. Extends {@link CredentialOptions} and
 * {@link ElevenLabsQueryOptions}. Direct-client broker use is appropriate only
 * for a short-lived scoped credential or a server-locked signed URL.
 */
export interface ElevenLabsASROptions extends CredentialOptions, ElevenLabsQueryOptions {
  /** Override the realtime listen endpoint. */
  baseUrl?: string;
  /** Inject a WebSocket constructor (defaults to the global). */
  webSocket?: WebSocketCtor;
}

const PROVIDER = 'elevenlabs';

function bytesToBase64(bytes: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index] ?? 0;
    const b = bytes[index + 1] ?? 0;
    const c = bytes[index + 2] ?? 0;
    const value = (a << 16) | (b << 8) | c;
    output += alphabet[(value >> 18) & 63];
    output += alphabet[(value >> 12) & 63];
    output += index + 1 < bytes.length ? alphabet[(value >> 6) & 63] : '=';
    output += index + 2 < bytes.length ? alphabet[value & 63] : '=';
  }
  return output;
}

const CAPABILITIES: ASRCapabilities = {
  streaming: true,
  batch: false,
  partialResults: true,
  confidence: true,
  languages: [],
};

/**
 * ElevenLabs Scribe realtime ASR provider over WebSocket. A broker-signed URL
 * may be used when it locks the route/model policy server-side.
 *
 * @param options - Credentials and optional listen endpoint / query overrides.
 */
export function createElevenLabsASR(options: ElevenLabsASROptions): ASRProvider {
  const WS = resolveWebSocket(options.webSocket);
  const resolveCredential = createCredentialResolver(options, {
    provider: PROVIDER,
    purpose: 'asr',
  });
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;

  return {
    name: PROVIDER,
    capabilities: CAPABILITIES,

    async createSession(asrOptions): Promise<ASRSession> {
      const { token, url: brokerUrl } = await resolveCredential();
      const url = brokerUrl ?? buildElevenLabsUrl(baseUrl, options, asrOptions);
      const ws = new WS(url, ['xi-api-key', token]);
      return createWebSocketASRSession({
        ws,
        provider: PROVIDER,
        encodeAudio: (chunk) => JSON.stringify({
          message_type: 'input_audio_chunk',
          audio_base_64: bytesToBase64(new Uint8Array(chunk)),
        }),
        decode: decodeElevenLabs,
        finishMessage: JSON.stringify({
          message_type: 'input_audio_chunk',
          audio_base_64: '',
          commit: true,
        }),
        stopTimeoutMs: 1_500,
      });
    },
  };
}
