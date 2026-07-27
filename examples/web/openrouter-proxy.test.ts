import { describe, expect, it } from 'bun:test';
import { createDemoVoiceGateway, demoVoiceGatewayPolicy } from './openrouter-proxy';

function request(path: string): Request {
  return new Request(`http://local.test${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'http://local.test',
    },
    body: JSON.stringify({
      model: 'client/model',
      messages: [{
        role: 'user',
        content: [{
          type: 'input_audio',
          input_audio: { data: 'AQIDBA==', format: 'wav' },
        }],
      }],
      tools: [{ type: 'client_tool' }],
      max_tool_calls: 99,
      stream: true,
    }),
  });
}

describe('web example OpenRouter policy gateway', () => {
  it('uses Grok 4.3 for cascaded LLM turns', () => {
    expect(demoVoiceGatewayPolicy.llm?.model).toBe('x-ai/grok-4.3');
  });

  it('adds a bounded server-owned web search tool only on the online route', async () => {
    const upstreamBodies: Record<string, unknown>[] = [];
    const gateway = createDemoVoiceGateway('server-secret', {
      fetch: async (input, init) => {
        const path = new URL(String(input)).pathname;
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
        if (path.endsWith('/audio/transcriptions')) {
          return Response.json({ text: 'Who won the latest match?' });
        }
        upstreamBodies.push(body);
        return new Response('data: [DONE]\n\n', {
          headers: { 'content-type': 'text/event-stream' },
        });
      },
    });

    const offline = await gateway(request('/api/voice/asr-llm-tts/chat/completions'));
    const online = await gateway(request('/api/voice/online/asr-llm-tts/chat/completions'));

    expect(offline.status).toBe(200);
    expect(online.status).toBe(200);
    await offline.text();
    await online.text();
    expect(upstreamBodies[0]).toEqual({
      model: demoVoiceGatewayPolicy.llm?.model,
      messages: [
        { role: 'system', content: demoVoiceGatewayPolicy.llm?.systemPrompt },
        { role: 'user', content: 'Who won the latest match?' },
      ],
      stream: true,
      stream_options: { include_usage: true },
      temperature: demoVoiceGatewayPolicy.llm?.temperature,
      max_tokens: demoVoiceGatewayPolicy.llm?.maxTokens,
      reasoning: { enabled: false },
      provider: {
        sort: 'latency',
        preferred_max_latency: { p90: 2 },
      },
    });
    expect(upstreamBodies[1]).toEqual({
      ...upstreamBodies[0],
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
    });
  });
});
