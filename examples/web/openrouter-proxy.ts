import {
  createOpenRouterGateway,
  pcm16ToWav,
  type OpenRouterGatewayOptions,
  type OpenRouterGatewayPolicy,
} from '@ottervoice/provider-openrouter';
import { parseSSEStream } from '@ottervoice/provider-utils';

const DEFAULT_SYSTEM_PROMPT =
  `当前日期是 ${new Date().toISOString().slice(0, 10)}。对时效性信息，在可用时必须使用联网搜索核实。` +
  '你是一个反应快、语气自然的语音对话助手。默认用中文回复；如果用户明显使用其他语言，则跟随用户。' +
  '第一句立即给出结论；每次只回复 1–5 个简短句子，不使用 Markdown，不列表，适合直接语音播放。';
const SEARCH_OUTPUT_INSTRUCTION =
  '联网搜索结果只用于内部核实。最终回答只输出适合朗读的自然语言正文；' +
  '禁止输出引用编号、脚注、URL、域名、Markdown 链接、来源或参考资料列表。';
const GPT_AUDIO_TTS_PROMPT =
  '你是文字转语音引擎。逐字朗读用户提供的文本，保持原语言和自然语气；' +
  '不得回答、改写、解释、添加开场白或朗读指令本身。';
type GatewayFetch = NonNullable<OpenRouterGatewayOptions['fetch']>;

type SearchMessage = { role?: unknown; content?: unknown };
type OpenRouterStreamPayload = {
  choices?: Array<{
    delta?: {
      content?: unknown;
      audio?: { data?: unknown };
    };
    message?: { audio?: { data?: unknown } };
  }>;
};

function base64ToBytes(value: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = value.replace(/\s/g, '');
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  const output = new Uint8Array(Math.max(0, (clean.length / 4) * 3 - padding));
  let offset = 0;
  for (let index = 0; index < clean.length; index += 4) {
    const a = alphabet.indexOf(clean[index] ?? 'A');
    const b = alphabet.indexOf(clean[index + 1] ?? 'A');
    const c = clean[index + 2] === '=' ? 0 : alphabet.indexOf(clean[index + 2] ?? 'A');
    const d = clean[index + 3] === '=' ? 0 : alphabet.indexOf(clean[index + 3] ?? 'A');
    const bits = (a << 18) | (b << 12) | (c << 6) | d;
    if (offset < output.length) output[offset++] = (bits >> 16) & 255;
    if (offset < output.length) output[offset++] = (bits >> 8) & 255;
    if (offset < output.length) output[offset++] = bits & 255;
  }
  return output;
}

function audioData(payload: OpenRouterStreamPayload): string | undefined {
  const choice = payload.choices?.[0];
  const data = choice?.delta?.audio?.data ?? choice?.message?.audio?.data;
  return typeof data === 'string' ? data : undefined;
}

/**
 * Adapt OpenAI-compatible `/audio/speech` calls to GPT Audio chat output.
 *
 * `openai/gpt-audio-mini` generates audio through streaming chat completions,
 * so the web demo translates its locked TTS request without exposing provider
 * policy to the browser.
 *
 * @param fetchImpl - Upstream fetch implementation used by the web gateway.
 * @returns A fetch implementation that translates GPT Audio TTS requests.
 */
export function createGptAudioTtsFetch(fetchImpl: GatewayFetch): GatewayFetch {
  return async (input, init) => {
    const upstreamUrl = input instanceof Request ? input.url : String(input);
    const url = new URL(upstreamUrl);
    if (!url.pathname.endsWith('/audio/speech')) return fetchImpl(input, init);

    const speechBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    if (speechBody.model !== 'openai/gpt-audio-mini' || typeof speechBody.input !== 'string') {
      return fetchImpl(input, init);
    }
    url.pathname = url.pathname.replace(/\/audio\/speech$/, '/chat/completions');
    const upstream = await fetchImpl(url, {
      ...init,
      body: JSON.stringify({
        model: speechBody.model,
        messages: [
          { role: 'system', content: GPT_AUDIO_TTS_PROMPT },
          { role: 'user', content: speechBody.input },
        ],
        modalities: ['text', 'audio'],
        audio: {
          voice: typeof speechBody.voice === 'string' ? speechBody.voice : 'alloy',
          format: 'pcm16',
        },
        stream: true,
        stream_options: { include_usage: true },
        temperature: 0.1,
      }),
    });
    if (!upstream.ok || !upstream.body) return upstream;

    const parts: string[] = [];
    let providerCost: number | undefined;
    for await (const data of parseSSEStream(upstream.body)) {
      if (data === '[DONE]') break;
      try {
        const payload = JSON.parse(data) as OpenRouterStreamPayload & {
          usage?: { cost?: unknown };
        };
        const part = audioData(payload);
        if (part) parts.push(part);
        if (typeof payload.usage?.cost === 'number') providerCost = payload.usage.cost;
      } catch {
        // Ignore malformed chunks; an empty result becomes a sanitized 502.
      }
    }
    const pcm = base64ToBytes(parts.join(''));
    if (pcm.byteLength === 0) {
      return Response.json({ error: 'GPT Audio returned no speech' }, { status: 502 });
    }
    const returnRawPcm = speechBody.response_format === 'pcm';
    const headers = new Headers({
      'content-type': returnRawPcm ? 'audio/pcm' : 'audio/wav',
    });
    const generationId = upstream.headers.get('x-generation-id');
    if (generationId) headers.set('x-generation-id', generationId);
    if (providerCost !== undefined) {
      headers.set('x-ottervoice-provider-cost', String(providerCost));
    }
    return new Response(returnRawPcm ? pcm : pcm16ToWav(pcm), { headers });
  };
}

function addSearchOutputInstruction(body: Record<string, unknown>): Record<string, unknown> {
  const messages = Array.isArray(body.messages)
    ? (body.messages as SearchMessage[]).map((message) => ({ ...message }))
    : [];
  const systemMessage = messages.find(
    (message) => message.role === 'system' && typeof message.content === 'string',
  );
  if (systemMessage && typeof systemMessage.content === 'string') {
    systemMessage.content = `${systemMessage.content}\n${SEARCH_OUTPUT_INSTRUCTION}`;
  } else {
    messages.unshift({ role: 'system', content: SEARCH_OUTPUT_INSTRUCTION });
  }
  return { ...body, messages };
}

/** Remove source citations and URLs that should not be shown or spoken by the voice demo. */
export function stripSearchCitations(text: string): string {
  const withoutSourceLines = text.replace(
    /(^|\n)\s*(?:来源|参考资料|参考链接|sources?|references?)\s*[:：][^\n]*/gi,
    '$1',
  );
  const cleaned = withoutSourceLines
    .replace(/\[\[?\d+\]?\]\(\s*(?:https?:\/\/|www\.)[^)]*\)/gi, '')
    .replace(/\[[^\]]*\]\(\s*(?:https?:\/\/|www\.)[^)]*\)/gi, '')
    .replace(/\[\[?\d+\]?\]/g, '')
    .replace(/https?:\/\/[^\s<>"'，。！？；、]+/gi, '')
    .replace(/\bwww\.[^\s<>"'，。！？；、]+/gi, '')
    .replace(/\(\s*\)/g, '')
    .replace(/[ \t]+([，。！？；、,.!?;:])/g, '$1')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ');
  return cleaned.trim().length > 0 ? cleaned : '';
}

function urlEnd(text: string, start: number): number {
  let index = start;
  while (index < text.length && !/[\s<>"'，。！？；、)]/.test(text[index]!)) index += 1;
  return index;
}

function firstSpeakableBoundary(text: string): number {
  for (let index = 0; index < text.length; index += 1) {
    const suffix = text.slice(index).toLowerCase();
    if (suffix.startsWith('https://') || suffix.startsWith('http://') || suffix.startsWith('www.')) {
      index = urlEnd(text, index) - 1;
      continue;
    }
    const char = text[index]!;
    if ('。！？；!?\n'.includes(char)) return index + 1;
    if (char === '.' && (index === text.length - 1 || /\s|[\)\]"'”’]/.test(text[index + 1]!))) {
      return index + 1;
    }
  }
  return -1;
}

class SearchCitationStreamFilter {
  private pending = '';

  push(delta: string): string {
    this.pending += delta;
    let output = '';
    let boundary = firstSpeakableBoundary(this.pending);
    while (boundary !== -1) {
      output += stripSearchCitations(this.pending.slice(0, boundary));
      this.pending = this.pending.slice(boundary);
      boundary = firstSpeakableBoundary(this.pending);
    }
    return output;
  }

  flush(): string {
    const output = stripSearchCitations(this.pending);
    this.pending = '';
    return output;
  }
}

function setDeltaContent(payload: OpenRouterStreamPayload, content: string): void {
  const delta = payload.choices?.[0]?.delta;
  if (delta) delta.content = content;
}

async function* filterWebSearchSSE(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<Uint8Array> {
  const encoder = new TextEncoder();
  const filter = new SearchCitationStreamFilter();
  let completed = false;
  const encodeEvent = (data: string) => encoder.encode(`data: ${data}\n\n`);

  for await (const data of parseSSEStream(stream)) {
    if (data === '[DONE]') {
      const tail = filter.flush();
      if (tail.length > 0) {
        yield encodeEvent(JSON.stringify({ choices: [{ delta: { content: tail } }] }));
      }
      yield encodeEvent('[DONE]');
      completed = true;
      continue;
    }

    let payload: OpenRouterStreamPayload;
    try {
      payload = JSON.parse(data) as OpenRouterStreamPayload;
    } catch {
      yield encodeEvent(data);
      continue;
    }
    const content = payload.choices?.[0]?.delta?.content;
    if (typeof content === 'string') setDeltaContent(payload, filter.push(content));
    yield encodeEvent(JSON.stringify(payload));
  }

  if (!completed) {
    const tail = filter.flush();
    if (tail.length > 0) {
      yield encodeEvent(JSON.stringify({ choices: [{ delta: { content: tail } }] }));
    }
  }
}

function streamFromGenerator(generator: AsyncGenerator<Uint8Array>): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const next = await generator.next();
        if (next.done) controller.close();
        else controller.enqueue(next.value);
      } catch (error) {
        controller.error(error);
      }
    },
    async cancel() {
      await generator.return(undefined);
    },
  });
}

function filterWebSearchResponse(response: Response): Response {
  if (!response.body || !response.headers.get('content-type')?.includes('text/event-stream')) {
    return response;
  }
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  return new Response(streamFromGenerator(filterWebSearchSSE(response.body)), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

const withWebSearch = (fetchImpl: GatewayFetch): GatewayFetch => async (input, init) => {
  const upstreamUrl = input instanceof Request ? input.url : String(input);
  if (!new URL(upstreamUrl).pathname.endsWith('/chat/completions')) {
    return fetchImpl(input, init);
  }
  const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
  const response = await fetchImpl(input, {
    ...init,
    body: JSON.stringify({
      ...addSearchOutputInstruction(body),
      tools: [{
        type: 'openrouter:web_search',
        parameters: {
          engine: 'auto',
          max_results: 10,
          max_uses: 2,
          max_total_results: 2,
          search_context_size: 'low',
        },
      }],
      max_tool_calls: 2,
    }),
  });
  return filterWebSearchResponse(response);
};

export const demoVoiceGatewayPolicy: OpenRouterGatewayPolicy = {
  asr: { model: 'qwen/qwen3-asr-flash-2026-02-10' },
  llm: {
    model: 'google/gemini-3.5-flash-lite',
    systemPrompt: process.env.OTTERVOICE_SYSTEM_PROMPT ?? DEFAULT_SYSTEM_PROMPT,
    temperature: 0.45,
    maxTokens: 512,
    provider: {
      sort: 'latency',
      preferredMaxLatency: { p90: 2 },
    },
  },
  tts: {
    model: 'openai/gpt-audio-mini',
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
  const gptAudioTtsFetch = createGptAudioTtsFetch(fetchImpl);
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
    fetch: gptAudioTtsFetch,
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
    fetch: withWebSearch(gptAudioTtsFetch),
  });

  return (request) => new URL(request.url).pathname.startsWith('/api/voice/online/')
    ? webSearchGateway(request)
    : standardGateway(request);
}
