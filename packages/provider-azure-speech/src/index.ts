import {
  VoiceError,
  type TTSCapabilities,
  type TTSFormat,
  type TTSInput,
  type TTSOutput,
  type TTSProvider,
} from '@ottervoice/core';
import {
  createCredentialResolver,
  normalizeHttpError,
  readBody,
  resolveFetch,
  type CredentialOptions,
} from '@ottervoice/provider-utils';
import {
  azureOutputFormat,
  buildSSML,
  mimeTypeForFormat,
} from './ssml.js';

export * from './ssml.js';

/**
 * Options for {@link createAzureTTS}. Region and neural voice are required;
 * authenticate with `subscriptionKey` (server) or `tokenBrokerUrl` (client-safe).
 * Shares broker/`fetch` fields from {@link CredentialOptions} (use `subscriptionKey`
 * instead of `apiKey`).
 */
export interface AzureTTSOptions extends Omit<CredentialOptions, 'apiKey'> {
  /** Azure region, e.g. `eastus`. */
  region: string;
  /** Subscription key (server-side). Mutually exclusive with `tokenBrokerUrl`. */
  subscriptionKey?: string;
  /** Neural voice name, e.g. `zh-CN-XiaoxiaoNeural`. */
  voice: string;
  /** BCP-47 language tag for SSML. Defaults to `en-US`. */
  language?: string;
  /** Default audio container when the request omits `format`. */
  defaultFormat?: TTSFormat;
  /** Override the synthesis endpoint (defaults to the region host). */
  endpoint?: string;
}

const PROVIDER = 'azure_speech';

const CAPABILITIES: TTSCapabilities = {
  streaming: false,
  voices: [],
  formats: ['mp3', 'wav', 'pcm', 'ogg', 'opus'],
  languages: [],
};

/**
 * Azure Cognitive Services Text-to-Speech provider (REST + SSML).
 *
 * @param options - Region, voice, and credentials (`subscriptionKey` or broker).
 */
export function createAzureTTS(options: AzureTTSOptions): TTSProvider {
  const fetchImpl = resolveFetch(options.fetch);
  const language = options.language ?? 'en-US';
  const defaultFormat = options.defaultFormat ?? 'mp3';
  const endpoint =
    options.endpoint ??
    `https://${options.region}.tts.speech.microsoft.com/cognitiveservices/v1`;

  // A subscription key authenticates directly; otherwise mint a token.
  const resolveCredential = createCredentialResolver(
    { ...options, apiKey: options.subscriptionKey },
    { provider: PROVIDER, purpose: 'tts' },
  );

  return {
    name: PROVIDER,
    capabilities: CAPABILITIES,

    async synthesize(input: TTSInput): Promise<TTSOutput> {
      const format = input.format ?? defaultFormat;
      const { token } = await resolveCredential();
      const headers: Record<string, string> = {
        'content-type': 'application/ssml+xml',
        'x-microsoft-outputformat': azureOutputFormat(format),
        'user-agent': 'ottervoice',
      };
      // A short token goes in Authorization; a raw subscription key in its header.
      if (options.subscriptionKey !== undefined) {
        headers['ocp-apim-subscription-key'] = token;
      } else {
        headers['authorization'] = `Bearer ${token}`;
      }

      const res = await fetchImpl(endpoint, {
        method: 'POST',
        headers,
        body: buildSSML(input, { voice: options.voice, language }),
      });
      if (!res.ok) {
        throw new VoiceError(
          normalizeHttpError(res.status, await readBody(res), {
            provider: PROVIDER,
            failureCode: 'tts_failed',
          }),
        );
      }

      const audioBuffer = await res.arrayBuffer();
      const output: TTSOutput = {
        audioBuffer,
        mimeType: mimeTypeForFormat(format),
        cached: input.cacheKey !== undefined,
      };
      return output;
    },
  };
}
