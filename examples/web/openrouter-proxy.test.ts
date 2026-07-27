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
      messages: [{ role: 'user', content: 'Who won the latest match?' }],
      tools: [{ type: 'client_tool' }],
      max_tool_calls: 99,
      stream: true,
    }),
  });
}

describe('web example OpenRouter policy gateway', () => {
  it('adds a bounded server-owned web search tool only on the online route', async () => {
    const upstreamBodies: Record<string, unknown>[] = [];
    const gateway = createDemoVoiceGateway('server-secret', {
      fetch: async (_input, init) => {
        upstreamBodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
        return new Response('data: [DONE]\n\n', {
          headers: { 'content-type': 'text/event-stream' },
        });
      },
    });

    const offline = await gateway(request('/api/voice/llm/chat/completions'));
    const online = await gateway(request('/api/voice/llm-online/llm/chat/completions'));

    expect(offline.status).toBe(200);
    expect(online.status).toBe(200);
    expect(upstreamBodies[0]).toEqual({
      model: demoVoiceGatewayPolicy.llm?.model,
      messages: [
        { role: 'system', content: demoVoiceGatewayPolicy.llm?.systemPrompt },
        { role: 'user', content: 'Who won the latest match?' },
      ],
      stream: true,
      temperature: demoVoiceGatewayPolicy.llm?.temperature,
      max_tokens: demoVoiceGatewayPolicy.llm?.maxTokens,
      reasoning: { enabled: false },
    });
    expect(upstreamBodies[1]).toEqual({
      ...upstreamBodies[0],
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
    });
  });
});
