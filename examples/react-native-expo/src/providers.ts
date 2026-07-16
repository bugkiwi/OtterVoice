import { fetch as expoFetch } from 'expo/fetch';
import {
  createOpenRouterGatewayASR,
  createOpenRouterGatewayAudioLLM,
  createOpenRouterGatewayLLM,
} from '@ottervoice/provider-openrouter';

const OTTERVOICE_API_URL = process.env.EXPO_PUBLIC_OTTERVOICE_API_URL?.replace(/\/$/, '');

const proxyOptions = {
  fetch: expoFetch as unknown as typeof globalThis.fetch,
};

export function createMobileProviders(applicationHeaders: Record<string, string> = {}) {
  if (!OTTERVOICE_API_URL) {
    throw new Error('Set EXPO_PUBLIC_OTTERVOICE_API_URL to your authenticated voice gateway.');
  }
  return {
    asr: createOpenRouterGatewayASR({
      ...proxyOptions,
      headers: applicationHeaders,
      baseUrl: `${OTTERVOICE_API_URL}/asr`,
      format: 'wav',
    }),
    llm: createOpenRouterGatewayLLM({
      ...proxyOptions,
      headers: applicationHeaders,
      baseUrl: `${OTTERVOICE_API_URL}/llm`,
    }),
    audioLlm: createOpenRouterGatewayAudioLLM({
      ...proxyOptions,
      headers: applicationHeaders,
      baseUrl: `${OTTERVOICE_API_URL}/audio-llm`,
    }),
  };
}
