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
 * {@link ElevenLabsQueryOptions}; prefer `tokenBrokerUrl` on clients over a static key.
 */
export interface ElevenLabsASROptions extends CredentialOptions, ElevenLabsQueryOptions {
  /** Override the realtime listen endpoint. */
  baseUrl?: string;
  /** Inject a WebSocket constructor (defaults to the global). */
  webSocket?: WebSocketCtor;
}

const PROVIDER = 'elevenlabs';

const CAPABILITIES: ASRCapabilities = {
  streaming: true,
  batch: false,
  partialResults: true,
  confidence: true,
  endpointing: true,
  languages: [],
};

/**
 * ElevenLabs Scribe realtime ASR provider over WebSocket. Prefer a
 * `tokenBrokerUrl` so the signed URL/credential is minted server-side.
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
        encodeAudio: (chunk) => chunk,
        decode: decodeElevenLabs,
        finishMessage: JSON.stringify({ type: 'flush' }),
      });
    },
  };
}
