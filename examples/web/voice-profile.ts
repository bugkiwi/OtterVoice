import type { OpenRouterGatewayPolicy } from '@ottervoice/provider-openrouter';

const voiceGatewayPrefix = '/api/voice';

/**
 * Single source of truth for the web demo's public routes, provider models,
 * and voices. This object is safe to compile into the browser bundle: it must
 * never contain credentials or other server-only values.
 */
export const DEMO_VOICE_PROFILE = {
  prefixes: {
    voice: voiceGatewayPrefix,
    online: `${voiceGatewayPrefix}/online`,
    google: `${voiceGatewayPrefix}/google`,
  },
  routes: {
    captionAsr: `${voiceGatewayPrefix}/asr`,
    openAiAudio: `${voiceGatewayPrefix}/audio-llm`,
    geminiLive: `${voiceGatewayPrefix}/google/audio-llm`,
    geminiLiveOnline: `${voiceGatewayPrefix}/google/online/audio-llm`,
    cascade: `${voiceGatewayPrefix}/asr-llm-tts`,
    cascadeOnline: `${voiceGatewayPrefix}/online/asr-llm-tts`,
  },
  models: {
    asr: 'qwen/qwen3-asr-flash-2026-02-10',
    cascadeLlm: 'google/gemini-3.5-flash-lite',
    cascadeTts: 'minimax/speech-2.8-turbo',
    openAiAudio: 'openai/gpt-audio-mini',
    geminiLive: 'gemini-3.1-flash-live-preview',
  },
  voices: {
    cascadeTts: 'alloy',
    openAiAudio: 'alloy',
    geminiLive: 'Charon',
  },
} as const;

/** Build the locked OpenRouter policy from the shared demo profile. */
export function createDemoOpenRouterPolicy(
  systemPrompt: string,
): OpenRouterGatewayPolicy {
  return {
    asr: { model: DEMO_VOICE_PROFILE.models.asr },
    llm: {
      model: DEMO_VOICE_PROFILE.models.cascadeLlm,
      systemPrompt,
      temperature: 0.45,
      maxTokens: 512,
      provider: {
        sort: 'latency',
        preferredMaxLatency: { p90: 2 },
      },
    },
    tts: {
      model: DEMO_VOICE_PROFILE.models.cascadeTts,
      voice: DEMO_VOICE_PROFILE.voices.cascadeTts,
      speed: 1.05,
      responseFormat: 'mp3',
    },
    audioLlm: {
      model: DEMO_VOICE_PROFILE.models.openAiAudio,
      systemPrompt,
      voice: DEMO_VOICE_PROFILE.voices.openAiAudio,
      temperature: 0.45,
      maxTokens: 512,
    },
  };
}
