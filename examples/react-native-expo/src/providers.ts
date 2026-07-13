import { fetch as expoFetch } from 'expo/fetch';
import {
  createOpenRouterASR,
  createOpenRouterAudioLLM,
  createOpenRouterLLM,
} from '@ottervoice/provider-openrouter';

export const OTTERVOICE_API_URL =
  process.env.EXPO_PUBLIC_OTTERVOICE_API_URL ??
  'https://ottervoice.vercel.app/api/openrouter';

const MODELS = {
  asr: 'qwen/qwen3-asr-flash-2026-02-10',
  audioLlm: 'openai/gpt-audio-mini',
} as const;

const proxyOptions = {
  apiKey: 'ottervoice-mobile-proxy',
  baseUrl: OTTERVOICE_API_URL,
  fetch: expoFetch as unknown as typeof globalThis.fetch,
  referer: 'https://ottervoice.vercel.app',
  title: 'OtterVoice Expo Demo',
};

export function createMobileProviders() {
  return {
    asr: createOpenRouterASR({
      ...proxyOptions,
      model: MODELS.asr,
      format: 'wav',
    }),
    llm: createOpenRouterLLM({
      ...proxyOptions,
      model: 'deepseek/deepseek-v4-flash:nitro',
      reasoningEnabled: false,
      defaultTemperature: 0.45,
    }),
    audioLlm: createOpenRouterAudioLLM({
      ...proxyOptions,
      model: MODELS.audioLlm,
      voice: 'alloy',
      defaultTemperature: 0.45,
    }),
  };
}
