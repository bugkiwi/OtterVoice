import {
  createOpenRouterGateway,
  type OpenRouterGatewayOptions,
  type OpenRouterGatewayPolicy,
} from '@ottervoice/provider-openrouter';

declare const process: {
  readonly env: {
    readonly OPENROUTER_API_KEY?: string;
    readonly OTTERVOICE_SYSTEM_PROMPT?: string;
  };
};

const systemPrompt = process.env.OTTERVOICE_SYSTEM_PROMPT ??
  '你是一个反应快、语气自然的语音对话助手。默认用中文回复；如果用户明显使用其他语言，则跟随用户。' +
  '每次只回复 1–2 个简短句子，不使用 Markdown，不列表，适合直接语音播放。';
const llmPolicy = {
  model: 'deepseek/deepseek-v4-flash:nitro',
  systemPrompt,
  temperature: 0.45,
  maxTokens: 80,
  reasoningEnabled: false,
  provider: {
    sort: 'latency',
    preferredMaxLatency: { p90: 2 },
  },
} satisfies NonNullable<OpenRouterGatewayPolicy['llm']>;

const policy: OpenRouterGatewayPolicy = {
  asr: { model: 'qwen/qwen3-asr-flash-2026-02-10' },
  llm: llmPolicy,
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
};

const authorize: OpenRouterGatewayOptions['authorize'] = ({ request, url }) => {
  const origin = request.headers.get('origin');
  // Demo showcase: same-origin browser requests only. Production apps must
  // replace this with user/session ownership and quota checks.
  return origin === url.origin;
};

type GatewayFetch = NonNullable<OpenRouterGatewayOptions['fetch']>;
const upstreamFetch: GatewayFetch = (input, init) => globalThis.fetch(input, init);
const webSearchFetch: GatewayFetch = async (input, init) => {
  const upstreamUrl = input instanceof Request ? input.url : String(input);
  if (!new URL(upstreamUrl).pathname.endsWith('/chat/completions')) {
    return upstreamFetch(input, init);
  }
  const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
  return upstreamFetch(input, {
    ...init,
    body: JSON.stringify({
      ...body,
      tools: [{
        type: 'openrouter:web_search',
        parameters: {
          engine: 'auto',
          max_results: 3,
          max_uses: 1,
          max_total_results: 3,
          search_context_size: 'low',
        },
      }],
      max_tool_calls: 1,
    }),
  });
};

const standardGateway = createOpenRouterGateway({
  apiKey: process.env.OPENROUTER_API_KEY,
  policy,
  authorize,
  maxRequestBodyBytes: 6 * 1024 * 1024,
  maxMessages: 24,
  maxTextCharacters: 20_000,
  ttsCacheEntries: 32,
  referer: 'https://ottervoice.vercel.app',
  title: 'OtterVoice Docs',
});

const webSearchGateway = createOpenRouterGateway({
  apiKey: process.env.OPENROUTER_API_KEY,
  policy: {
    asr: policy.asr,
    llm: llmPolicy,
    tts: policy.tts,
  },
  authorize,
  gatewayPrefix: '/api/voice/online',
  maxRequestBodyBytes: 6 * 1024 * 1024,
  maxMessages: 24,
  maxTextCharacters: 20_000,
  referer: 'https://ottervoice.vercel.app',
  title: 'OtterVoice Docs',
  fetch: webSearchFetch,
});

export const proxyOpenRouter = (request: Request): Promise<Response> => {
  return new URL(request.url).pathname.startsWith('/api/voice/online/')
    ? webSearchGateway(request)
    : standardGateway(request);
};
