import { afterEach, describe, expect, it } from 'bun:test';
import { createOpenRouterAudioLLM } from '@ottervoice/provider-openrouter';
import { prepareBrowserAudio } from '@ottervoice/runtime-web';
import { proxyOpenRouter } from './openrouter-proxy';

const originalAudioContext = Object.getOwnPropertyDescriptor(globalThis, 'AudioContext');
const originalFetch = globalThis.fetch;

afterEach(() => {
  if (originalAudioContext) {
    Object.defineProperty(globalThis, 'AudioContext', originalAudioContext);
  } else {
    Reflect.deleteProperty(globalThis, 'AudioContext');
  }
  globalThis.fetch = originalFetch;
});

describe('Audio LLM no-microphone smoke path', () => {
  it('rejects client-selected models outside the gateway allowlist', async () => {
    const response = await proxyOpenRouter(
      new Request('http://local.test/api/voice/chat/completions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: 'http://local.test',
        },
        body: JSON.stringify({ model: 'attacker/expensive-model' }),
      }),
      'server-secret',
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'model is not allowed for this route' });
  });

  it('converts a fixed WebM turn, crosses the gateway, and receives SSE audio', async () => {
    const fixedWebm = new Uint8Array([
      0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81,
      0x01, 0x42, 0xf7, 0x81, 0x01,
    ]).buffer;
    let decodedInput: Uint8Array | undefined;
    class SmokeAudioContext {
      async decodeAudioData(input: ArrayBuffer) {
        decodedInput = new Uint8Array(input);
        return {
          length: 4,
          numberOfChannels: 1,
          sampleRate: 16_000,
          getChannelData: () => new Float32Array([0, 0.25, -0.25, 0]),
        };
      }

      async close() {}
    }
    Object.defineProperty(globalThis, 'AudioContext', {
      configurable: true,
      value: SmokeAudioContext,
    });

    const pcm = Buffer.from([1, 2, 3, 4]).toString('base64');
    globalThis.fetch = async (_input, init) => {
      expect(new Headers(init?.headers).get('authorization')).toBe('Bearer server-secret');
      const requestBody = init?.body;
      const requestText = requestBody instanceof ArrayBuffer
        ? new TextDecoder().decode(requestBody)
        : String(requestBody);
      const body = JSON.parse(requestText) as {
        model: string;
        messages: Array<{ content?: Array<{ input_audio?: { data: string; format: string } }> }>;
      };
      expect(body.model).toBe('openai/gpt-audio-mini');
      const encoded = body.messages.at(-1)?.content?.at(-1)?.input_audio;
      expect(encoded?.format).toBe('wav');
      expect(Buffer.from(encoded?.data ?? '', 'base64').subarray(0, 4).toString()).toBe('RIFF');
      return new Response(
        [
          `data: {"choices":[{"delta":{"audio":{"data":"${pcm}","transcript":"smoke ok"}}}]}\n\n`,
          'data: [DONE]\n\n',
        ].join(''),
        { status: 200, headers: { 'content-type': 'text/event-stream' } },
      );
    };

    const audioLlm = createOpenRouterAudioLLM({
      apiKey: 'gateway-session-placeholder',
      model: 'openai/gpt-audio-mini',
      baseUrl: 'http://local.test/api/voice',
      requireDoneSentinel: true,
      prepareAudio: prepareBrowserAudio,
      fetch: async (input, init) => {
        const request = new Request(String(input), init);
        return proxyOpenRouter(request, 'server-secret');
      },
    });

    const output = await audioLlm.generate({
      audio: fixedWebm,
      format: 'webm',
      messages: [],
    });

    expect(decodedInput).toEqual(new Uint8Array(fixedWebm));
    expect(output.text).toBe('smoke ok');
    expect(output.mimeType).toBe('audio/wav');
    expect(new TextDecoder().decode(output.audioBuffer.slice(0, 4))).toBe('RIFF');
    expect(new Uint8Array(output.audioBuffer).slice(44)).toEqual(new Uint8Array([1, 2, 3, 4]));
  });
});
