import {
  createOpenRouterGateway,
  type OpenRouterGatewayOptions,
} from '@ottervoice/provider-openrouter';
import { parseSSEStream } from '@ottervoice/provider-utils';
import {
  createDemoOpenRouterPolicy,
  DEMO_VOICE_PROFILE,
} from './voice-profile';
import {
  demoVoiceLanguageFromRequest,
  type DemoVoiceLanguage,
} from './voice-language';
import {
  createDemoVoiceSystemPrompt,
  demoSearchOutputInstruction,
} from './voice-prompts';
type GatewayFetch = NonNullable<OpenRouterGatewayOptions['fetch']>;

type SearchMessage = { role?: unknown; content?: unknown };
type OpenRouterStreamPayload = {
  choices?: Array<{
    delta?: {
      content?: unknown;
    };
  }>;
};

function addSearchOutputInstruction(
  body: Record<string, unknown>,
  language: DemoVoiceLanguage,
): Record<string, unknown> {
  const messages = Array.isArray(body.messages)
    ? (body.messages as SearchMessage[]).map((message) => ({ ...message }))
    : [];
  const instruction = demoSearchOutputInstruction(language);
  const systemMessage = messages.find(
    (message) => message.role === 'system' && typeof message.content === 'string',
  );
  if (systemMessage && typeof systemMessage.content === 'string') {
    systemMessage.content = `${systemMessage.content}\n${instruction}`;
  } else {
    messages.unshift({ role: 'system', content: instruction });
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

const withWebSearch = (
  fetchImpl: GatewayFetch,
  language: DemoVoiceLanguage,
): GatewayFetch => async (input, init) => {
  const upstreamUrl = input instanceof Request ? input.url : String(input);
  if (!new URL(upstreamUrl).pathname.endsWith('/chat/completions')) {
    return fetchImpl(input, init);
  }
  const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
  const response = await fetchImpl(input, {
    ...init,
    body: JSON.stringify({
      ...addSearchOutputInstruction(body, language),
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

function configuredSystemPrompt(language: DemoVoiceLanguage): string {
  if (language === 'en') {
    return process.env.OTTERVOICE_SYSTEM_PROMPT_EN ?? createDemoVoiceSystemPrompt('en');
  }
  return process.env.OTTERVOICE_SYSTEM_PROMPT_ZH ??
    process.env.OTTERVOICE_SYSTEM_PROMPT ??
    createDemoVoiceSystemPrompt('zh');
}

/** Server-owned OpenRouter policies keyed by the allowlisted interface language. */
export const demoVoiceGatewayPolicies = {
  zh: createDemoOpenRouterPolicy(configuredSystemPrompt('zh')),
  en: createDemoOpenRouterPolicy(configuredSystemPrompt('en')),
} as const;

/** Chinese policy retained as the default for clients that omit the language header. */
export const demoVoiceGatewayPolicy = demoVoiceGatewayPolicies.zh;

export function createDemoVoiceGateway(
  apiKey = process.env.OPENROUTER_API_KEY,
  overrides: Pick<OpenRouterGatewayOptions, 'fetch' | 'referer' | 'title'> = {},
): (request: Request) => Promise<Response> {
  const fetchImpl: GatewayFetch = overrides.fetch ?? ((input, init) => globalThis.fetch(input, init));
  const authorize: OpenRouterGatewayOptions['authorize'] = ({ request, url }) => {
    const origin = request.headers.get('origin');
    // Local loopback demo only. Production must validate the authenticated
    // application user, conversation ownership, profile, and quota here.
    return origin === url.origin;
  };
  const createLanguageGateways = (language: DemoVoiceLanguage) => {
    const policy = demoVoiceGatewayPolicies[language];
    const sharedOptions = {
      apiKey,
      maxRequestBodyBytes: 6 * 1024 * 1024,
      maxMessages: 24,
      maxTextCharacters: 20_000,
      ...(overrides.referer ? { referer: overrides.referer } : {}),
      title: overrides.title ?? 'OtterVoice Web Example',
      authorize,
    };
    return {
      standard: createOpenRouterGateway({
        ...sharedOptions,
        policy,
        ttsCacheEntries: 32,
        fetch: fetchImpl,
      }),
      online: createOpenRouterGateway({
        ...sharedOptions,
        policy: {
          asr: policy.asr,
          llm: policy.llm,
          tts: policy.tts,
        },
        gatewayPrefix: DEMO_VOICE_PROFILE.prefixes.online,
        fetch: withWebSearch(fetchImpl, language),
      }),
    };
  };
  const gateways = {
    zh: createLanguageGateways('zh'),
    en: createLanguageGateways('en'),
  } as const;

  return (request) => {
    const language = demoVoiceLanguageFromRequest(request);
    const online = new URL(request.url).pathname.startsWith(
      `${DEMO_VOICE_PROFILE.prefixes.online}/`,
    );
    return gateways[language][online ? 'online' : 'standard'](request);
  };
}
