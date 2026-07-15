import { describe, expect, it, mock } from 'bun:test';
import { createAzureTTS } from '../src/index';

function audioResponse(status = 200): Response {
  return new Response(new Uint8Array([1, 2, 3, 4]).buffer, { status });
}

describe('createAzureTTS', () => {
  it('synthesizes with a subscription key and maps the audio', async () => {
    let captured: { url: string; init: RequestInit } | undefined;
    const fetchImpl = mock(async (url: any, init: any) => {
      captured = { url, init };
      return audioResponse();
    });
    const tts = createAzureTTS({
      region: 'eastus',
      subscriptionKey: 'sub-key',
      voice: 'en-US-Jenny',
      fetch: fetchImpl,
    });

    const out = await tts.synthesize({ text: 'hello', format: 'mp3', cacheKey: 'c1' });

    expect(out.mimeType).toBe('audio/mpeg');
    expect(out.cached).toBe(true);
    expect(new Uint8Array(out.audioBuffer!)).toEqual(new Uint8Array([1, 2, 3, 4]));
    expect(captured?.url).toBe(
      'https://eastus.tts.speech.microsoft.com/cognitiveservices/v1',
    );
    const headers = captured?.init.headers as Record<string, string>;
    expect(headers['ocp-apim-subscription-key']).toBe('sub-key');
    expect(headers['x-microsoft-outputformat']).toContain('mp3');
  });

  it('uses a bearer token from the broker and the default format', async () => {
    let headers: Record<string, string> = {};
    const fetchImpl = mock(async (url: any, init: any) => {
      if (String(url).includes('broker')) {
        return new Response(JSON.stringify({ token: 'brokered' }));
      }
      headers = init.headers;
      return audioResponse();
    });
    const tts = createAzureTTS({
      region: 'westus',
      tokenBrokerUrl: 'https://broker',
      voice: 'v',
      fetch: fetchImpl,
    });

    const out = await tts.synthesize({ text: 'hi' });
    expect(out.mimeType).toBe('audio/mpeg'); // default mp3
    expect(out.cached).toBe(false);
    expect(headers['authorization']).toBe('Bearer brokered');
  });

  it('honours a custom endpoint and language default', async () => {
    let url = '';
    const tts = createAzureTTS({
      region: 'eastus',
      subscriptionKey: 'k',
      voice: 'v',
      endpoint: 'https://proxy/tts',
      fetch: async (u: any) => {
        url = String(u);
        return audioResponse();
      },
    });
    await tts.synthesize({ text: 'hi', format: 'wav' });
    expect(url).toBe('https://proxy/tts');
  });

  it('throws a normalized error on HTTP failure', async () => {
    const tts = createAzureTTS({
      region: 'eastus',
      subscriptionKey: 'k',
      voice: 'v',
      fetch: async () => audioResponse(401),
    });
    await expect(tts.synthesize({ text: 'x' })).rejects.toMatchObject({
      code: 'tts_failed',
      provider: 'azure_speech',
      stage: 'provider',
      httpStatus: 401,
      retryable: false,
    });
  });

  it('advertises capabilities', () => {
    const tts = createAzureTTS({ region: 'r', subscriptionKey: 'k', voice: 'v' });
    expect(tts.capabilities.formats).toContain('mp3');
    expect(tts.capabilities.streaming).toBe(false);
  });
});
