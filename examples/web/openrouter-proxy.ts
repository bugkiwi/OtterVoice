import {
  createOpenRouterGateway,
  type OpenRouterGatewayOptions,
  type OpenRouterGatewayPolicy,
} from '@ottervoice/provider-openrouter';

const DEFAULT_SYSTEM_PROMPT =
  '你是一个反应快、语气自然的语音对话助手。默认用中文回复；如果用户明显使用其他语言，则跟随用户。' +
  '第一句立即给出结论；每次只回复 1–5 个简短句子，不使用 Markdown，不列表，适合直接语音播放。';
type GatewayFetch = NonNullable<OpenRouterGatewayOptions['fetch']>;

const withWebSearch = (fetchImpl: GatewayFetch): GatewayFetch => async (input, init) => {
  const upstreamUrl = input instanceof Request ? input.url : String(input);
  if (!new URL(upstreamUrl).pathname.endsWith('/chat/completions')) {
    return fetchImpl(input, init);
  }
  const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
  return fetchImpl(input, {
    ...init,
    body: JSON.stringify({
      ...body,
      tools: [{
        type: 'openrouter:web_search',
        parameters: {
          engine: 'auto',
          max_results: 10,
          max_uses: 3,
          max_total_results: 3,
          search_context_size: 'low',
        },
      }],
      max_tool_calls: 3,
    }),
  });
};

export const demoVoiceGatewayPolicy: OpenRouterGatewayPolicy = {
  asr: { model: 'qwen/qwen3-asr-flash-2026-02-10' },
  llm: {
    model: 'deepseek/deepseek-v4-pro',
    systemPrompt: process.env.OTTERVOICE_SYSTEM_PROMPT ?? DEFAULT_SYSTEM_PROMPT,
    temperature: 0.45,
    maxTokens: 512,
    reasoningEnabled: false,
    provider: {
      sort: 'latency',
      preferredMaxLatency: { p90: 2 },
    },
  },
  tts: {
    model: 'minimax/speech-2.8-turbo',
    voice: 'alloy',
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
  const fetchImpl: GatewayFetch = overrides.fetch ?? ((input, init) => globalThis.fetch(input, init));
  const authorize: OpenRouterGatewayOptions['authorize'] = ({ request, url }) => {
    const origin = request.headers.get('origin');
    // Local loopback demo only. Production must validate the authenticated
    // application user, conversation ownership, profile, and quota here.
    return origin === url.origin;
  };
  const standardGateway = createOpenRouterGateway({
    apiKey,
    policy: demoVoiceGatewayPolicy,
    maxRequestBodyBytes: 6 * 1024 * 1024,
    maxMessages: 24,
    maxTextCharacters: 20_000,
    ttsCacheEntries: 32,
    title: 'OtterVoice Web Example',
    authorize,
    fetch: fetchImpl,
  });
  const webSearchGateway = createOpenRouterGateway({
    apiKey,
    policy: {
      asr: demoVoiceGatewayPolicy.asr,
      llm: demoVoiceGatewayPolicy.llm,
      tts: demoVoiceGatewayPolicy.tts,
    },
    gatewayPrefix: '/api/voice/online',
    maxRequestBodyBytes: 6 * 1024 * 1024,
    maxMessages: 24,
    maxTextCharacters: 20_000,
    title: 'OtterVoice Web Example',
    authorize,
    fetch: withWebSearch(fetchImpl),
  });

  return (request) => new URL(request.url).pathname.startsWith('/api/voice/online/')
    ? webSearchGateway(request)
    : standardGateway(request);
}
