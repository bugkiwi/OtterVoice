import { describe, expect, it, mock } from 'bun:test';
import {
  bytesToBase64,
  createOpenRouterASR,
  createOpenRouterTTS,
} from '../src/audio';
import type { ASRResult, NormalizedVoiceError } from '@ottervoice/core';

describe('bytesToBase64', () => {
  it('encodes complete and padded groups', () => {
    expect(bytesToBase64(new Uint8Array([]))).toBe('');
    expect(bytesToBase64(new Uint8Array([77]))).toBe('TQ==');
    expect(bytesToBase64(new Uint8Array([77, 97]))).toBe('TWE=');
    expect(bytesToBase64(new Uint8Array([77, 97, 110]))).toBe('TWFu');
  });
});

describe('createOpenRouterASR', () => {
  it('buffers chunks, transcribes on stop, and emits a final', async () => {
    let body: any;
    const fetchImpl = mock(async (_url: unknown, init?: RequestInit) => {
      body = JSON.parse(String(init?.body));
      return Response.json({ text: 'hello world', usage: { seconds: 1 } });
    });
    const provider = createOpenRouterASR({
      apiKey: 'secret',
      model: 'qwen/asr',
      format: 'webm',
      fetch: fetchImpl,
    });
    const session = await provider.createSession({ language: 'en' });
    const finals: ASRResult[] = [];
    session.onFinal((result) => finals.push(result));
    session.sendAudio(new Uint8Array([1, 2]).buffer);
    session.sendAudio(new Uint8Array([3]).buffer);
    await session.stop();

    expect(body).toMatchObject({
      model: 'qwen/asr',
      input_audio: { data: 'AQID', format: 'webm' },
      language: 'en',
      temperature: 0,
    });
    expect(finals[0]?.text).toBe('hello world');
    expect(provider.capabilities).toMatchObject({ streaming: false, batch: true });
  });

  it('drops buffered assistant audio while preserving the WebM header', async () => {
    let body: any;
    const session = await createOpenRouterASR({
      apiKey: 'k',
      model: 'm',
      fetch: async (_url, init) => {
        body = JSON.parse(String(init?.body));
        return Response.json({ text: 'after reset' });
      },
    }).createSession({});
    session.sendAudio(new Uint8Array([1]).buffer); // container header
    session.sendAudio(new Uint8Array([2]).buffer); // assistant audio
    await session.resetAudio?.();
    session.sendAudio(new Uint8Array([3]).buffer); // user audio
    await session.stop();
    expect(body.input_audio.data).toBe('AQM=');
  });

  it('emits an empty final without making a request', async () => {
    const fetchImpl = mock(async () => Response.json({ text: 'unused' }));
    const session = await createOpenRouterASR({
      apiKey: 'k',
      model: 'm',
      fetch: fetchImpl,
    }).createSession({});
    const finals: ASRResult[] = [];
    session.onFinal((result) => finals.push(result));
    await session.stop();
    await session.stop();
    expect(finals).toEqual([{ text: '' }]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('notifies errors and supports closing/unsubscribing', async () => {
    const session = await createOpenRouterASR({
      apiKey: 'k',
      model: 'm',
      fetch: async () => new Response('bad', { status: 400 }),
    }).createSession({});
    const errors: NormalizedVoiceError[] = [];
    const offPartial = session.onPartial(() => {});
    offPartial();
    const off = session.onError((error) => errors.push(error));
    session.sendAudio(new Uint8Array([1]).buffer);
    await expect(session.stop()).rejects.toMatchObject({ code: 'asr_connection_failed' });
    expect(errors[0]?.code).toBe('asr_connection_failed');
    off();
    await session.close();
    session.sendAudio(new Uint8Array([2]).buffer);
  });

  it('normalizes a transport exception for ASR listeners', async () => {
    const session = await createOpenRouterASR({
      apiKey: 'k',
      model: 'm',
      fetch: async () => {
        throw new Error('socket closed');
      },
    }).createSession({});
    const errors: NormalizedVoiceError[] = [];
    session.onError((error) => errors.push(error));
    session.sendAudio(new Uint8Array([1]).buffer);
    await expect(session.stop()).rejects.toThrow('socket closed');
    expect(errors[0]).toMatchObject({
      code: 'asr_connection_failed',
      message: 'socket closed',
      provider: 'openrouter',
    });
  });
});

describe('createOpenRouterTTS', () => {
  it('synthesizes speech bytes with the configured cheap model', async () => {
    let body: any;
    const provider = createOpenRouterTTS({
      apiKey: 'k',
      model: 'hexgrad/kokoro-82m',
      voice: 'zf_xiaoxiao',
      fetch: async (_url, init) => {
        body = JSON.parse(String(init?.body));
        return new Response(new Uint8Array([1, 2]), {
          headers: { 'content-type': 'audio/mpeg', 'x-generation-id': 'gen-1' },
        });
      },
    });
    const out = await provider.synthesize({ text: '你好', format: 'mp3', speed: 1.1 });
    expect(body).toEqual({
      model: 'hexgrad/kokoro-82m',
      input: '你好',
      voice: 'zf_xiaoxiao',
      response_format: 'mp3',
      speed: 1.1,
    });
    expect(new Uint8Array(out.audioBuffer!)).toEqual(new Uint8Array([1, 2]));
    expect(out.mimeType).toBe('audio/mpeg');
    expect(out.raw).toEqual({ generationId: 'gen-1' });
  });

  it('maps non-mp3 requests to pcm and normalizes failures', async () => {
    const provider = createOpenRouterTTS({
      apiKey: 'k',
      model: 'm',
      voice: 'v',
      fetch: async () => new Response('down', { status: 503 }),
    });
    await expect(provider.synthesize({ text: 'x', format: 'wav' })).rejects.toMatchObject({
      code: 'network_error',
    });
  });
});
