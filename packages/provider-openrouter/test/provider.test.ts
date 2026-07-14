import { describe, expect, it, mock } from 'bun:test';
import { createOpenRouterLLM } from '../src/index';
import { streamFromStrings } from '@ottervoice/provider-utils';
import type { LLMStreamChunk } from '@ottervoice/core';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function completion(content: string, usage?: unknown): unknown {
  return { choices: [{ message: { content } }], ...(usage ? { usage } : {}) };
}

async function drain(it: AsyncIterable<LLMStreamChunk>): Promise<LLMStreamChunk[]> {
  const out: LLMStreamChunk[] = [];
  for await (const c of it) out.push(c);
  return out;
}

describe('createOpenRouterLLM.generate', () => {
  it('sends a well-formed request and maps the response', async () => {
    let captured: { url: string; init: RequestInit } | undefined;
    const fetchImpl = mock(async (url: any, init: any) => {
      captured = { url, init };
      return jsonResponse(
        completion('Hello!', { prompt_tokens: 4, completion_tokens: 2, total_tokens: 6 }),
      );
    });
    const llm = createOpenRouterLLM({ apiKey: 'sk-test', model: 'g/flash', fetch: fetchImpl });
    const controller = new AbortController();

    const out = await llm.generate({
      system: 'be brief',
      messages: [{ role: 'user', content: 'hi' }],
      signal: controller.signal,
    });

    expect(out.text).toBe('Hello!');
    expect(out.usage).toEqual({ inputTokens: 4, outputTokens: 2, totalTokens: 6 });
    expect(captured?.url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect((captured?.init.headers as Record<string, string>).authorization).toBe('Bearer sk-test');
    expect(captured?.init.signal).toBe(controller.signal);
  });

  it('omits usage when the API returns none', async () => {
    const llm = createOpenRouterLLM({
      apiKey: 'k',
      model: 'm',
      fetch: async () => jsonResponse(completion('no usage')),
    });
    expect((await llm.generate({ messages: [] })).usage).toBeUndefined();
  });

  it('parses JSON output and tolerates invalid JSON', async () => {
    const ok = createOpenRouterLLM({
      apiKey: 'k',
      model: 'm',
      fetch: async () => jsonResponse(completion('{"a":1}')),
    });
    expect((await ok.generate({ messages: [], responseFormat: 'json' })).json).toEqual({ a: 1 });

    const bad = createOpenRouterLLM({
      apiKey: 'k',
      model: 'm',
      fetch: async () => jsonResponse(completion('not json')),
    });
    expect((await bad.generate({ messages: [], responseFormat: 'json' })).json).toBeUndefined();
  });

  it('throws a normalized error on HTTP failure', async () => {
    const llm = createOpenRouterLLM({
      apiKey: 'k',
      model: 'm',
      baseUrl: 'https://proxy/v1/',
      fetch: async () => new Response('rate', { status: 429 }),
    });
    await expect(llm.generate({ messages: [] })).rejects.toMatchObject({
      code: 'provider_rate_limited',
    });
  });
});

describe('createOpenRouterLLM.stream', () => {
  function streamResponse(lines: string[]): Response {
    return new Response(streamFromStrings(lines.map((l) => `${l}\n`)));
  }

  it('yields text deltas, usage and done', async () => {
    const llm = createOpenRouterLLM({
      apiKey: 'k',
      model: 'm',
      fetch: async () =>
        streamResponse([
          'data: {"choices":[{"delta":{"content":"Hel"}}]}',
          'data: {"choices":[{"delta":{"content":"lo"}}]}',
          'data: {"choices":[{"delta":{}}],"usage":{"prompt_tokens":1,"completion_tokens":1,"total_tokens":2}}',
          'data: bad-json',
          'data: [DONE]',
        ]),
    });
    const chunks = await drain(llm.stream!({ messages: [{ role: 'user', content: 'hi' }] }));
    expect(chunks).toEqual([
      { type: 'text_delta', text: 'Hel' },
      { type: 'text_delta', text: 'lo' },
      { type: 'usage', usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 } },
      { type: 'done' },
    ]);
  });

  it('emits an error chunk on HTTP failure', async () => {
    const llm = createOpenRouterLLM({
      apiKey: 'k',
      model: 'm',
      fetch: async () => new Response('boom', { status: 500 }),
    });
    const chunks = await drain(llm.stream!({ messages: [] }));
    expect(chunks).toEqual([
      { type: 'error', error: expect.objectContaining({ code: 'network_error' }) },
    ]);
  });

  it('emits an error chunk when the response has no body', async () => {
    const llm = createOpenRouterLLM({
      apiKey: 'k',
      model: 'm',
      fetch: async () => new Response(null, { status: 200 }),
    });
    const chunks = await drain(llm.stream!({ messages: [] }));
    expect(chunks[0]?.type).toBe('error');
  });
});
