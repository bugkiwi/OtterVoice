import { createOpenRouterGateway } from '@ottervoice/provider-openrouter';

declare const process: {
  readonly env: {
    readonly OPENROUTER_API_KEY?: string;
    readonly OTTERVOICE_SYSTEM_PROMPT?: string;
  };
};

const systemPrompt = process.env.OTTERVOICE_SYSTEM_PROMPT ??
  '你是一个反应快、语气自然的语音对话助手。默认用中文回复；如果用户明显使用其他语言，则跟随用户。' +
  '每次只回复 1–2 个简短句子，不使用 Markdown，不列表，适合直接语音播放。';

export const proxyOpenRouter = createOpenRouterGateway({
  apiKey: process.env.OPENROUTER_API_KEY,
  policy: {
    asr: { model: 'qwen/qwen3-asr-flash-2026-02-10' },
    llm: {
      model: 'deepseek/deepseek-v4-flash:nitro',
      systemPrompt,
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
      systemPrompt,
      voice: 'alloy',
      temperature: 0.45,
      maxTokens: 512,
    },
  },
  authorize: ({ request, url }) => {
    const origin = request.headers.get('origin');
    // Demo showcase: same-origin browser requests only. Production apps must
    // replace this with user/session ownership and quota checks.
    return origin === url.origin;
  },
  maxRequestBodyBytes: 6 * 1024 * 1024,
  maxMessages: 24,
  maxTextCharacters: 20_000,
  ttsCacheEntries: 32,
  referer: 'https://ottervoice.vercel.app',
  title: 'OtterVoice Docs',
});
