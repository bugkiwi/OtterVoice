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
    provider: {
      sort: 'latency',
      preferredMaxLatency: { p90: 2 },
    },
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
    expect((await handle(request('/audio-llm/chat/completions', { messages: [] }))).status).toBe(404);
    expect((await gateway({ authorize: () => false })(request('/audio-llm/chat/completions', { messages: [] }))).status).toBe(401);
    expect((await gateway({ authorize: () => Response.json({ error: 'session mismatch' }, { status: 403 }) })(request('/audio-llm/chat/completions', { messages: [] }))).status).toBe(403);
    expect((await gateway({ authorize: () => { throw new Error('private auth failure'); } })(request('/audio-llm/chat/completions', { messages: [] }))).status).toBe(401);
    expect((await gateway({ apiKey: undefined })(request('/audio-llm/chat/completions', { messages: [] }))).status).toBe(503);
  });

  it('rejects unsupported content, oversized bodies, and invalid JSON before upstream', async () => {
    const handle = gateway({ maxRequestBodyBytes: 32 });
    const wrongType = new Request('https://app.test/api/voice/audio-llm/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: '{}',
    });
    expect((await handle(wrongType)).status).toBe(415);
    expect((await handle(request('/audio-llm/chat/completions', { messages: [] }, { 'content-length': '100' }))).status).toBe(413);
    expect((await handle(request('/audio-llm/chat/completions', { messages: [{ role: 'user', content: 'x'.repeat(40) }] }))).status).toBe(413);
    expect((await gateway()(request('/audio-llm/chat/completions', '{bad'))).status).toBe(400);
    expect((await gateway()(request('/audio-llm/chat/completions', []))).status).toBe(400);
  });

  it('locks standalone caption ASR policy', async () => {
    let upstreamBody: Record<string, unknown> | undefined;
    const handle = gateway({
      fetch: async (_url, init) => {
        upstreamBody = JSON.parse(String(init?.body));
        return Response.json({ text: 'ok' });
      },
    });
    const response = await handle(request('/asr/audio/transcriptions', {
      model: 'attacker/asr',
      language: 'attacker-language',
      temperature: 2,
      input_audio: { data: 'AQID', format: 'wav' },
    }));

    expect(response.status).toBe(200);
    expect(upstreamBody).toEqual({
      model: 'server/asr',
      input_audio: { data: 'AQID', format: 'wav' },
      language: 'zh-CN',
      temperature: 0,
    });
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

  it('orchestrates ASR, streamed LLM segmentation, and ordered TTS on one route', async () => {
    const upstream: Array<{ path: string; body: Record<string, unknown> }> = [];
    const handle = gateway({
      fetch: async (input, init) => {
        const path = new URL(String(input)).pathname;
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
        upstream.push({ path, body });
        if (path.endsWith('/audio/transcriptions')) {
          return Response.json({ text: '你好' });
        }
        if (path.endsWith('/chat/completions')) {
          return new Response([
            'data: {"choices":[{"delta":{"content":"第一句。"}}]}',
            '',
            'data: {"choices":[{"delta":{"content":"第二句。"}}],"usage":{"prompt_tokens":3,"completion_tokens":4,"total_tokens":7}}',
            '',
            'data: [DONE]',
            '',
          ].join('\n'), { headers: { 'content-type': 'text/event-stream' } });
        }
        const text = String(body.input);
        return new Response(
          new Uint8Array(text.startsWith('第一') ? [1, 2] : [3, 4]),
          {
            headers: {
              'content-type': text.startsWith('第一') ? 'audio/wav' : 'audio/mpeg',
            },
          },
        );
      },
    });

    const response = await handle(request('/asr-llm-tts/chat/completions', {
      model: 'attacker/model',
      messages: [
        { role: 'assistant', content: '先前回复' },
        {
          role: 'user',
          content: [{
            type: 'input_audio',
            input_audio: { data: 'AQIDBA==', format: 'wav' },
          }],
        },
      ],
      voice: 'attacker-voice',
    }));

    expect(response.status).toBe(200);
    const events = (await response.text())
      .split('\n')
      .filter((line) => line.startsWith('data: ') && line !== 'data: [DONE]')
      .map((line) => JSON.parse(line.slice(6)) as Record<string, unknown>);
    expect(events.map((event) => event.type)).toEqual([
      'input_text',
      'output_text_delta',
      'output_text_delta',
      'usage',
      'output_audio_segment',
      'output_audio_segment',
      'done',
    ]);
    expect(events.filter((event) => event.type === 'output_audio_segment')).toEqual([
      {
        type: 'output_audio_segment',
        sequence: 0,
        mimeType: 'audio/wav',
        data: 'AQI=',
      },
      {
        type: 'output_audio_segment',
        sequence: 1,
        mimeType: 'audio/mpeg',
        data: 'AwQ=',
      },
    ]);
    expect(upstream.map((call) => call.path)).toEqual([
      '/api/v1/audio/transcriptions',
      '/api/v1/chat/completions',
      '/api/v1/audio/speech',
      '/api/v1/audio/speech',
    ]);
    expect(upstream[0]?.body).toEqual({
      model: 'server/asr',
      input_audio: { data: 'AQIDBA==', format: 'wav' },
      language: 'zh-CN',
      temperature: 0,
    });
    expect(upstream[1]?.body).toEqual({
      model: 'server/llm',
      messages: [
        { role: 'system', content: 'trusted text policy' },
        { role: 'assistant', content: '先前回复' },
        { role: 'user', content: '你好' },
      ],
      stream: true,
      stream_options: { include_usage: true },
      temperature: 0.2,
      max_tokens: 64,
      reasoning: { enabled: false },
      provider: {
        sort: 'latency',
        preferred_max_latency: { p90: 2 },
      },
    });
    expect(upstream.slice(2).map((call) => call.body)).toEqual([
      {
        model: 'server/tts',
        input: '第一句。',
        voice: 'server-voice',
        response_format: 'mp3',
        speed: 1.1,
      },
      {
        model: 'server/tts',
        input: '第二句。',
        voice: 'server-voice',
        response_format: 'mp3',
        speed: 1.1,
      },
    ]);
  });

  it('starts later sentence synthesis before earlier MP3 playback delivery completes', async () => {
    let resolveFirstSpeech!: (response: Response) => void;
    let markSecondSpeechStarted!: () => void;
    const secondSpeechStarted = new Promise<void>((resolve) => {
      markSecondSpeechStarted = resolve;
    });
    let speechCalls = 0;
    const handle = gateway({
      fetch: async (input) => {
        const path = new URL(String(input)).pathname;
        if (path.endsWith('/audio/transcriptions')) {
          return Response.json({ text: 'question' });
        }
        if (path.endsWith('/chat/completions')) {
          return new Response([
            'data: {"choices":[{"delta":{"content":"First sentence. Second sentence."}}]}',
            '',
            'data: [DONE]',
            '',
          ].join('\n'));
        }
        speechCalls += 1;
        if (speechCalls === 1) {
          return await new Promise<Response>((resolve) => {
            resolveFirstSpeech = resolve;
          });
        }
        markSecondSpeechStarted();
        return new Response(new Uint8Array([2]), {
          headers: { 'content-type': 'audio/mpeg' },
        });
      },
    });
    const response = await handle(request('/asr-llm-tts/chat/completions', {
      messages: [{
        role: 'user',
        content: [{
          type: 'input_audio',
          input_audio: { data: 'AQ==', format: 'wav' },
        }],
      }],
    }));
    const completed = response.text();

    await secondSpeechStarted;
    expect(speechCalls).toBe(2);
    resolveFirstSpeech(new Response(new Uint8Array([1]), {
      headers: { 'content-type': 'audio/mpeg' },
    }));
    await completed;
  });

  it('sanitizes upstream audio-turn failures', async () => {
    const body = {
      messages: [{
        role: 'user',
        content: [{
          type: 'input_audio',
          input_audio: { data: 'AQ==', format: 'wav' },
        }],
      }],
    };
    const failed = await gateway({
      fetch: async () => new Response('provider secret details', { status: 429 }),
    })(request('/audio-llm/chat/completions', body));
    expect(failed.status).toBe(429);
    expect(await failed.json()).toEqual({ error: 'voice provider request failed' });

    const unavailable = await gateway({ fetch: async () => { throw new Error('private'); } })(
      request('/audio-llm/chat/completions', body),
    );
    expect(unavailable.status).toBe(502);
    expect(await unavailable.json()).toEqual({ error: 'upstream voice request failed' });

    const timedOut = await gateway({
      upstreamTimeoutMs: 5,
      fetch: async (_url, init) => new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('private timeout')));
      }),
    })(request('/audio-llm/chat/completions', body));
    expect(timedOut.status).toBe(504);
    expect(await timedOut.json()).toEqual({ error: 'upstream voice request timed out' });
  });
});
