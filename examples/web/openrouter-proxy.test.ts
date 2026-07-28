import { describe, expect, it } from 'bun:test';
import {
  createGptAudioTtsFetch,
  createDemoVoiceGateway,
  demoVoiceGatewayPolicy,
  stripSearchCitations,
} from './openrouter-proxy';

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
  it('uses Gemini 3.5 Flash Lite and GPT Audio Mini for cascaded turns', () => {
    expect(demoVoiceGatewayPolicy.llm?.model).toBe('google/gemini-3.5-flash-lite');
    expect(demoVoiceGatewayPolicy.tts?.model).toBe('openai/gpt-audio-mini');
  });

  it('adapts GPT Audio Mini TTS to streaming audio chat completions', async () => {
    let upstreamUrl = '';
    let upstreamBody: Record<string, unknown> = {};
    const fetchImpl = createGptAudioTtsFetch(async (input, init) => {
      upstreamUrl = String(input);
      upstreamBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response([
        'data: {"choices":[{"delta":{"audio":{"data":"AQIDBA=="}}}]}',
        '',
        'data: {"choices":[],"usage":{"cost":0.001}}',
        '',
        'data: [DONE]',
        '',
      ].join('\n'), {
        headers: {
          'content-type': 'text/event-stream',
          'x-generation-id': 'gen-audio',
        },
      });
    });

    const response = await fetchImpl('https://openrouter.ai/api/v1/audio/speech', {
      method: 'POST',
      body: JSON.stringify({
        model: 'openai/gpt-audio-mini',
        input: '你好',
        voice: 'alloy',
        response_format: 'mp3',
      }),
    });
    const bytes = new Uint8Array(await response.arrayBuffer());

    expect(upstreamUrl).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(upstreamBody).toMatchObject({
      model: 'openai/gpt-audio-mini',
      messages: [
        { role: 'system' },
        { role: 'user', content: '你好' },
      ],
      modalities: ['text', 'audio'],
      audio: { voice: 'alloy', format: 'pcm16' },
      stream: true,
    });
    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe('RIFF');
    expect([...bytes.slice(44)]).toEqual([1, 2, 3, 4]);
    expect(response.headers.get('content-type')).toBe('audio/wav');
    expect(response.headers.get('x-generation-id')).toBe('gen-audio');
    expect(response.headers.get('x-ottervoice-provider-cost')).toBe('0.001');
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
      provider: {
        sort: 'latency',
        preferred_max_latency: { p90: 2 },
      },
    });
    expect(upstreamBodies[1]).toEqual({
      ...upstreamBodies[0],
      messages: [
        {
          role: 'system',
          content: `${demoVoiceGatewayPolicy.llm?.systemPrompt}` +
            '\n联网搜索结果只用于内部核实。最终回答只输出适合朗读的自然语言正文；' +
            '禁止输出引用编号、脚注、URL、域名、Markdown 链接、来源或参考资料列表。',
        },
        { role: 'user', content: 'Who won the latest match?' },
      ],
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
    });
  });

  it('removes citation markers, Markdown source links, and bare URLs', () => {
    expect(stripSearchCitations(
      '西班牙赢得了冠军。 [[1]](https://example.com/world-cup)\n' +
      '来源：https://example.com/source',
    )).toBe('西班牙赢得了冠军。\n');
    expect(stripSearchCitations('详情见 https://example.com/a，这是已核实的结论。'))
      .toBe('详情见，这是已核实的结论。');
  });

  it('filters citations split across streamed deltas before display and TTS', async () => {
    const spokenInputs: string[] = [];
    const gateway = createDemoVoiceGateway('server-secret', {
      fetch: async (input, init) => {
        const path = new URL(String(input)).pathname;
        if (path.endsWith('/audio/transcriptions')) {
          return Response.json({ text: '今年的世界杯谁获得了冠军？' });
        }
        if (path.endsWith('/chat/completions')) {
          const body = JSON.parse(String(init?.body)) as {
            model?: string;
            messages?: Array<{ content?: string }>;
          };
          if (body.model === 'openai/gpt-audio-mini') {
            spokenInputs.push(body.messages?.[1]?.content ?? '');
            return new Response([
              'data: {"choices":[{"delta":{"audio":{"data":"AQIDBA=="}}}]}',
              '',
              'data: [DONE]',
              '',
            ].join('\n'), { headers: { 'content-type': 'text/event-stream' } });
          }
          return new Response([
            'data: {"choices":[{"delta":{"content":"西班牙赢得了冠军。 [[1]](https://example"}}]}',
            '',
            'data: {"choices":[{"delta":{"content":".com/world-cup)"}}]}',
            '',
            'data: [DONE]',
            '',
          ].join('\n'), { headers: { 'content-type': 'text/event-stream' } });
        }
        throw new Error(`unexpected upstream path: ${path}`);
      },
    });

    const response = await gateway(request('/api/voice/online/asr-llm-tts/chat/completions'));
    const output = await response.text();

    expect(output).toContain('西班牙赢得了冠军。');
    expect(output).not.toContain('example.com');
    expect(output).not.toContain('[[1]]');
    expect(output).toContain('"mimeType":"audio/wav"');
    expect(spokenInputs).toEqual(['西班牙赢得了冠军。']);
  });
});
