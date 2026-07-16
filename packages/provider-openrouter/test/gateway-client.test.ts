import { describe, expect, it } from 'bun:test';
import {
  createOpenRouterGatewayASR,
  createOpenRouterGatewayAudioLLM,
  createOpenRouterGatewayLLM,
  createOpenRouterGatewayTTS,
} from '../src/index';

describe('server-managed OpenRouter gateway clients', () => {
  it('omit every provider/business policy field from browser requests', async () => {
    const bodies = new Map<string, Record<string, unknown>>();
    const fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      bodies.set(new URL(url).pathname, JSON.parse(String(init?.body)));
      if (url.endsWith('/audio/transcriptions')) return Response.json({ text: 'caption' });
      if (url.endsWith('/audio/speech')) {
        return new Response(new Uint8Array([1]), { headers: { 'content-type': 'audio/mpeg' } });
      }
      if (url.includes('/audio-llm/')) {
        return new Response(
          'data: {"choices":[{"delta":{"audio":{"data":"AQIDBA==","transcript":"hi"}}}]}\n\ndata: [DONE]\n\n',
          { headers: { 'content-type': 'text/event-stream' } },
        );
      }
      return Response.json({ choices: [{ message: { content: 'reply' } }] });
    };

    const llm = createOpenRouterGatewayLLM({
      baseUrl: 'https://app.test/api/voice/llm',
      fetch,
    });
    await llm.generate({
      system: 'client system prompt',
      messages: [
        { role: 'system', content: 'client history policy' },
        { role: 'user', content: 'hello' },
      ],
      temperature: 2,
      maxTokens: 999_999,
      responseFormat: 'json',
    });

    const asr = createOpenRouterGatewayASR({
      baseUrl: 'https://app.test/api/voice/asr',
      format: 'wav',
      fetch,
    });
    const asrSession = await asr.createSession({ language: 'client-language', encoding: 'wav' });
    asrSession.onFinal(() => {});
    await asrSession.sendAudio(new Uint8Array([1, 2]).buffer);
    await asrSession.stop();

    const tts = createOpenRouterGatewayTTS({
      baseUrl: 'https://app.test/api/voice/tts',
      fetch,
    });
    await tts.synthesize({
      text: 'speak this',
      voice: 'client-voice',
      speed: 4,
      format: 'pcm',
    });

    const audioLlm = createOpenRouterGatewayAudioLLM({
      baseUrl: 'https://app.test/api/voice/audio-llm',
      fetch,
      requireDoneSentinel: true,
    });
    await audioLlm.generate({
      audio: new Uint8Array([1, 2]).buffer,
      format: 'wav',
      system: 'client audio policy',
      messages: [
        { role: 'system', content: 'client audio history policy' },
        { role: 'assistant', content: 'prior reply' },
      ],
      temperature: 2,
      maxTokens: 999_999,
    });

    expect(bodies.get('/api/voice/llm/chat/completions')).toEqual({
      messages: [{ role: 'user', content: 'hello' }],
      stream: false,
    });
    expect(bodies.get('/api/voice/asr/audio/transcriptions')).toEqual({
      input_audio: { data: 'AQI=', format: 'wav' },
    });
    expect(bodies.get('/api/voice/tts/audio/speech')).toEqual({ input: 'speak this' });
    expect(bodies.get('/api/voice/audio-llm/chat/completions')).toEqual({
      messages: [
        { role: 'assistant', content: 'prior reply' },
        {
          role: 'user',
          content: [{
            type: 'input_audio',
            input_audio: { data: 'AQI=', format: 'wav' },
          }],
        },
      ],
      stream: true,
    });
  });
});
