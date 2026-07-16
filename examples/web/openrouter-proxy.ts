import {
  createOpenRouterGateway,
  type OpenRouterGatewayOptions,
  type OpenRouterGatewayPolicy,
} from '@ottervoice/provider-openrouter';

const DEFAULT_SYSTEM_PROMPT =
  '你是一个反应快、语气自然的语音对话助手。默认用中文回复；如果用户明显使用其他语言，则跟随用户。' +
  '每次只回复 1–2 个简短句子，不使用 Markdown，不列表，适合直接语音播放。';

export const demoVoiceGatewayPolicy: OpenRouterGatewayPolicy = {
  asr: { model: 'qwen/qwen3-asr-flash-2026-02-10' },
  llm: {
    model: 'deepseek/deepseek-v4-flash:nitro',
    systemPrompt: process.env.OTTERVOICE_SYSTEM_PROMPT ?? DEFAULT_SYSTEM_PROMPT,
    temperature: 0.45,
    maxTokens: 80,
    reasoningEnabled: false,
  },
  tts: {
    model: 'hexgrad/kokoro-82m',
    voice: 'zf_xiaoxiao',
    speed: 1.05,
    responseFormat: 'mp3',
  },
  audioLlm: {
    model: 'openai/gpt-audio-mini',
    systemPrompt: process.env.OTTERVOICE_SYSTEM_PROMPT ?? DEFAULT_SYSTEM_PROMPT,
    voice: 'alloy',
    temperature: 0.45,
    maxTokens: 512,
  },
};

export function createDemoVoiceGateway(
  apiKey = process.env.OPENROUTER_API_KEY,
  overrides: Pick<OpenRouterGatewayOptions, 'fetch'> = {},
): (request: Request) => Promise<Response> {
  return createOpenRouterGateway({
    apiKey,
    policy: demoVoiceGatewayPolicy,
    maxRequestBodyBytes: 6 * 1024 * 1024,
    maxMessages: 24,
    maxTextCharacters: 20_000,
    ttsCacheEntries: 32,
    title: 'OtterVoice Web Example',
    authorize: ({ request, url }) => {
      const origin = request.headers.get('origin');
      // Local loopback demo only. Production must validate the authenticated
      // application user, conversation ownership, profile, and quota here.
      return origin === url.origin;
    },
    ...overrides,
  });
}
