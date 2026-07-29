import { fetch as expoFetch } from 'expo/fetch';
import type { VoiceSessionConfig } from '@ottervoice/core';
import {
  createOpenRouterGatewayASR,
  createOpenRouterGatewayAudioLLM,
  createOpenRouterGatewayVoiceTurn,
} from '@ottervoice/provider-openrouter';

const OTTERVOICE_API_URL = process.env.EXPO_PUBLIC_OTTERVOICE_API_URL?.replace(/\/$/, '');
const OTTERVOICE_BACKEND = process.env.EXPO_PUBLIC_OTTERVOICE_BACKEND ?? 'composite';

export type MobileVoiceBackend = 'composite' | 'native';

const proxyOptions = {
  fetch: expoFetch as unknown as typeof globalThis.fetch,
};

/**
 * Bind the mobile example to the unified audio-turn contract.
 *
 * The composite route performs ASR → LLM → TTS on the server in one request.
 * The native route uses an upstream audio model and a separate ASR only for
 * user captions. Both choices expose the same `providers.audioLlm` interface
 * to {@link createVoiceSession}.
 */
export function createMobileProviders(
  applicationHeaders: Record<string, string> = {},
  backend: MobileVoiceBackend = OTTERVOICE_BACKEND as MobileVoiceBackend,
): VoiceSessionConfig['providers'] {
  if (!OTTERVOICE_API_URL) {
    throw new Error('Set EXPO_PUBLIC_OTTERVOICE_API_URL to your authenticated voice gateway.');
  }
  if (backend === 'composite') {
    return {
      audioLlm: createOpenRouterGatewayVoiceTurn({
        ...proxyOptions,
        headers: applicationHeaders,
        baseUrl: `${OTTERVOICE_API_URL}/asr-llm-tts`,
        requireDoneSentinel: true,
      }),
    };
  }
  if (backend !== 'native') {
    throw new Error(
      `EXPO_PUBLIC_OTTERVOICE_BACKEND must be "composite" or "native"; received "${backend}".`,
    );
  }
  return {
    asr: createOpenRouterGatewayASR({
      ...proxyOptions,
      headers: applicationHeaders,
      baseUrl: `${OTTERVOICE_API_URL}/asr`,
      format: 'wav',
    }),
    audioLlm: createOpenRouterGatewayAudioLLM({
      ...proxyOptions,
      headers: applicationHeaders,
      baseUrl: `${OTTERVOICE_API_URL}/audio-llm`,
      requireDoneSentinel: true,
    }),
  };
}
