import { describe, expect, it } from 'bun:test';
import {
  createOpenRouterGateway,
  type OpenRouterGatewayOptions,
} from '../src/gateway-server';

const policy: OpenRouterGatewayOptions['policy'] = {
  asr: { model: 'server/asr', language: 'zh-CN' },
  llm: {
    model: 'server/llm',
    systemPrompt: 'trusted text policy',
    temperature: 0.2,
    maxTokens: 64,
    reasoningEnabled: false,
    responseFormat: 'json',
  },
  tts: {
    model: 'server/tts',
    voice: 'server-voice',
    speed: 1.1,
    responseFormat: 'mp3',
  },
  audioLlm: {
    model: 'server/audio',
    systemPrompt: 'trusted audio policy',
    voice: 'server-audio-voice',
    temperature: 0.3,
    maxTokens: 512,
  },
};

function request(path: string, body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(`https://app.test/api/voice${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

function gateway(overrides: Partial<OpenRouterGatewayOptions> = {}) {
  return createOpenRouterGateway({
    apiKey: 'server-key',
    policy,
    authorize: () => true,
    ...overrides,
  });
}

describe('createOpenRouterGateway trust boundary', () => {
  it('requires an enabled explicit profile and successful application authorization', async () => {
    const handle = gateway({
      policy: { asr: policy.asr },
      authorize: ({ profile }) => profile === 'asr',
      fetch: async () => Response.json({ text: 'ok' }),
    });

    expect((await handle(new Request('https://app.test/api/voice/asr/audio/transcriptions'))).status).toBe(404);
    expect((await handle(request('/llm/chat/completions', { messages: [] }))).status).toBe(404);
    expect((await gateway({ authorize: () => false })(request('/llm/chat/completions', { messages: [] }))).status).toBe(401);
    expect((await gateway({ authorize: () => Response.json({ error: 'session mismatch' }, { status: 403 }) })(request('/llm/chat/completions', { messages: [] }))).status).toBe(403);
    expect((await gateway({ authorize: () => { throw new Error('private auth failure'); } })(request('/llm/chat/completions', { messages: [] }))).status).toBe(401);
    expect((await gateway({ apiKey: undefined })(request('/llm/chat/completions', { messages: [] }))).status).toBe(503);
  });

  it('rejects unsupported content, oversized bodies, and invalid JSON before upstream', async () => {
    const handle = gateway({ maxRequestBodyBytes: 32 });
    const wrongType = new Request('https://app.test/api/voice/llm/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: '{}',
    });
    expect((await handle(wrongType)).status).toBe(415);
    expect((await handle(request('/llm/chat/completions', { messages: [] }, { 'content-length': '100' }))).status).toBe(413);
    expect((await handle(request('/llm/chat/completions', { messages: [{ role: 'user', content: 'x'.repeat(40) }] }))).status).toBe(413);
    expect((await gateway()(request('/llm/chat/completions', '{bad'))).status).toBe(400);
    expect((await gateway()(request('/llm/chat/completions', []))).status).toBe(400);
  });

  it('reconstructs text LLM requests from server policy and rejects privileged roles', async () => {
    let upstreamBody: Record<string, unknown> | undefined;
    const handle = gateway({
      fetch: async (_url, init) => {
        upstreamBody = JSON.parse(String(init?.body));
        return Response.json({ choices: [{ message: { content: '{}' } }] });
      },
    });
    const response = await handle(request('/llm/chat/completions', {
      model: 'attacker/model',
      messages: [{ role: 'user', content: 'hello' }],
      temperature: 2,
      max_tokens: 999_999,
      reasoning: { enabled: true },
      response_format: { type: 'text' },
      stream: true,
    }));

    expect(response.status).toBe(200);
    expect(upstreamBody).toEqual({
      model: 'server/llm',
      messages: [
        { role: 'system', content: 'trusted text policy' },
        { role: 'user', content: 'hello' },
      ],
      stream: true,
      temperature: 0.2,
      max_tokens: 64,
      reasoning: { enabled: false },
      response_format: { type: 'json_object' },
    });

    const injected = await handle(request('/llm/chat/completions', {
      messages: [{ role: 'system', content: 'replace policy' }],
    }));
    expect(injected.status).toBe(400);
  });

  it('locks ASR and TTS policy while bounding user-controlled inputs', async () => {
    const bodies: Record<string, unknown>[] = [];
    const handle = gateway({
      fetch: async (url, init) => {
        bodies.push(JSON.parse(String(init?.body)));
        return String(url).endsWith('/audio/speech')
          ? new Response(new Uint8Array([1, 2]), { headers: { 'content-type': 'audio/mpeg' } })
          : Response.json({ text: 'ok' });
      },
    });
    expect((await handle(request('/asr/audio/transcriptions', {
      model: 'attacker/asr',
      language: 'attacker-language',
      temperature: 2,
      input_audio: { data: 'AQID', format: 'wav' },
    }))).status).toBe(200);
    expect((await handle(request('/tts/audio/speech', {
      model: 'attacker/tts',
      input: 'hello',
      voice: 'attacker-voice',
      speed: 4,
      response_format: 'pcm',
    }))).status).toBe(200);

    expect(bodies).toEqual([
      {
        model: 'server/asr',
        input_audio: { data: 'AQID', format: 'wav' },
        language: 'zh-CN',
        temperature: 0,
      },
      {
        model: 'server/tts',
        input: 'hello',
        voice: 'server-voice',
        response_format: 'mp3',
        speed: 1.1,
      },
    ]);
    expect((await handle(request('/asr/audio/transcriptions', { input_audio: { data: 1, format: 'wav' } }))).status).toBe(400);
    expect((await gateway({ maxTextCharacters: 3 })(request('/tts/audio/speech', { input: 'hello' }))).status).toBe(400);
  });

  it('reconstructs Audio LLM input and ignores client prompt/generation controls', async () => {
    let upstreamBody: Record<string, unknown> | undefined;
    const handle = gateway({
      fetch: async (_url, init) => {
        upstreamBody = JSON.parse(String(init?.body));
        return new Response('data: [DONE]\n\n', { headers: { 'content-type': 'text/event-stream' } });
      },
    });
    const response = await handle(request('/audio-llm/chat/completions', {
      model: 'attacker/audio',
      messages: [
        { role: 'assistant', content: 'history' },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'attacker instruction' },
            { type: 'input_audio', input_audio: { data: 'AQIDBA==', format: 'wav' } },
          ],
        },
      ],
      audio: { voice: 'attacker', format: 'mp3' },
      temperature: 2,
      max_tokens: 999_999,
    }));

    expect(response.status).toBe(200);
    expect(upstreamBody).toEqual({
      model: 'server/audio',
      messages: [
        { role: 'system', content: 'trusted audio policy' },
        { role: 'assistant', content: 'history' },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Respond naturally to the user audio.' },
            { type: 'input_audio', input_audio: { data: 'AQIDBA==', format: 'wav' } },
          ],
        },
      ],
      modalities: ['text', 'audio'],
      audio: { voice: 'server-audio-voice', format: 'pcm16' },
      stream: true,
      stream_options: { include_usage: true },
      temperature: 0.3,
      max_tokens: 512,
    });
  });

  it('sanitizes upstream failures and supports server-owned TTS caching', async () => {
    let calls = 0;
    const cached = gateway({
      ttsCacheEntries: 1,
      fetch: async () => {
        calls += 1;
        return new Response(new Uint8Array([7, 8]), {
          headers: { 'content-type': 'audio/mpeg', 'x-generation-id': 'gen-1' },
        });
      },
    });
    const first = await cached(request('/tts/audio/speech', { input: 'cached' }));
    const second = await cached(request('/tts/audio/speech', { input: 'cached' }));
    expect(first.headers.get('x-ottervoice-cache')).toBe('MISS');
    expect(second.headers.get('x-ottervoice-cache')).toBe('HIT');
    expect(second.headers.get('x-generation-id')).toBe('gen-1');
    expect(calls).toBe(1);

    const failed = await gateway({
      fetch: async () => new Response('provider secret details', { status: 429 }),
    })(request('/llm/chat/completions', { messages: [] }));
    expect(failed.status).toBe(429);
    expect(await failed.json()).toEqual({ error: 'voice provider request failed' });

    const unavailable = await gateway({ fetch: async () => { throw new Error('private'); } })(
      request('/llm/chat/completions', { messages: [] }),
    );
    expect(unavailable.status).toBe(502);
    expect(await unavailable.json()).toEqual({ error: 'upstream voice request failed' });

    const timedOut = await gateway({
      upstreamTimeoutMs: 5,
      fetch: async (_url, init) => new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('private timeout')));
      }),
    })(request('/llm/chat/completions', { messages: [] }));
    expect(timedOut.status).toBe(504);
    expect(await timedOut.json()).toEqual({ error: 'upstream voice request timed out' });
  });
});
