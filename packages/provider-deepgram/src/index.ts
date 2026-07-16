import type { ASRCapabilities, ASRProvider, ASRSession } from '@ottervoice/core';
import {
  createCredentialResolver,
  createWebSocketASRSession,
  resolveWebSocket,
  type CredentialOptions,
  type WebSocketCtor,
} from '@ottervoice/provider-utils';
import {
  buildDeepgramUrl,
  decodeDeepgram,
  DEFAULT_BASE_URL,
  type DeepgramQueryOptions,
} from './decode.js';

export * from './decode.js';

/**
 * Options for {@link createDeepgramASR}. Extends {@link CredentialOptions} and
 * {@link DeepgramQueryOptions}. Direct-client broker use is appropriate only
 * for a short-lived scoped credential or a server-locked signed URL.
 */
export interface DeepgramOptions extends CredentialOptions, DeepgramQueryOptions {
  /** Override the listen endpoint. */
  baseUrl?: string;
  /** Inject a WebSocket constructor (defaults to the global). */
  webSocket?: WebSocketCtor;
}

const PROVIDER = 'deepgram';

const CAPABILITIES: ASRCapabilities = {
  streaming: true,
  batch: false,
  partialResults: true,
  confidence: true,
  endpointing: true,
  languages: [],
};

/** Deepgram streaming ASR provider over WebSocket.
 *
 * @param options - Credentials plus listen URL / query options. Keep query
 *   policy server-owned unless a broker-signed URL locks it.
 */
export function createDeepgramASR(options: DeepgramOptions): ASRProvider {
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
      const url = brokerUrl ?? buildDeepgramUrl(baseUrl, options, asrOptions);
      const ws = new WS(url, ['token', token]);
      return createWebSocketASRSession({
        ws,
        provider: PROVIDER,
        encodeAudio: (chunk) => chunk,
        decode: decodeDeepgram,
        finishMessage: JSON.stringify({ type: 'CloseStream' }),
      });
    },
  };
}
