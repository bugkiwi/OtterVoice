import { describe, expect, it } from 'bun:test';
import {
  createGeminiLiveGateway,
  GEMINI_LIVE_MODEL,
} from './gemini-live-proxy';

type RealtimeInput = {
  audio?: { data: string; mimeType: string };
  audioStreamEnd?: boolean;
};

type ConnectOptions = {
  systemInstruction: string;
  searchEnabled: boolean;
  callbacks: {
    onmessage: (message: unknown) => void;
  };
};

type Capture = {
  systemInstruction?: string;
  searchEnabled?: boolean;
  audio?: RealtimeInput[];
};

function wavBase64(): string {
  const wav = new ArrayBuffer(48);
  const bytes = new Uint8Array(wav);
  const view = new DataView(wav);
  const write = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      bytes[offset + index] = value.charCodeAt(index);
    }
  };
  write(0, 'RIFF');
  view.setUint32(4, 40, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 16_000, true);
  view.setUint32(28, 32_000, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, 4, true);
  bytes.set([1, 2, 3, 4], 44);
  return Buffer.from(bytes).toString('base64');
}

function request(path: string, signal?: AbortSignal): Request {
  return new Request(`http://local.test${path}`, {
    method: 'POST',
    ...(signal ? { signal } : {}),
    headers: {
      'content-type': 'application/json',
      origin: 'http://local.test',
    },
    body: JSON.stringify({
      model: 'client-controlled-model',
      messages: [
        { role: 'user', content: 'Earlier question' },
        { role: 'assistant', content: 'Earlier answer' },
        {
          role: 'user',
          content: [{
            type: 'input_audio',
            input_audio: { data: wavBase64(), format: 'wav' },
          }],
        },
      ],
      tools: [{ type: 'client-tool' }],
    }),
  });
}

function fakeClient(capture: Capture) {
  return {
    async connect(params: ConnectOptions) {
      capture.systemInstruction = params.systemInstruction;
      capture.searchEnabled = params.searchEnabled;
      capture.audio = [];
      return {
        sendRealtimeInput(input: RealtimeInput) {
          capture.audio?.push(input);
          if (!input.audioStreamEnd) return;
          queueMicrotask(() => {
            params.callbacks.onmessage({
              serverContent: {
                outputTranscription: { text: '答案' },
                modelTurn: {
                  role: 'model',
                  parts: [
                    { inlineData: { data: 'AQIDBA==', mimeType: 'audio/pcm;rate=24000' } },
                    { inlineData: { data: 'BQY=', mimeType: 'audio/pcm;rate=24000' } },
                  ],
                },
              },
              usageMetadata: {
                promptTokenCount: 11,
                responseTokenCount: 7,
                totalTokenCount: 18,
              },
            });
            params.callbacks.onmessage({
              serverContent: { turnComplete: true },
            });
          });
        },
        close() {},
      };
    },
  };
}

describe('Gemini Live web example gateway', () => {
  it('locks the official model and keeps Google Search off on the standard route', async () => {
    const capture: Capture = {};
    const gateway = createGeminiLiveGateway({
      apiKey: 'server-secret',
      createClient: () => fakeClient(capture) as never,
    });

    const response = await gateway(request('/api/voice/google/audio-llm/chat/completions'));
    expect(response.status).toBe(200);
    const body = await response.text();

    expect(GEMINI_LIVE_MODEL).toBe('gemini-3.1-flash-live-preview');
    expect(capture.searchEnabled).toBe(false);
    expect(capture.systemInstruction).toContain('Earlier question');
    expect(capture.audio?.[0]?.audio).toEqual({
      data: 'AQIDBA==',
      mimeType: 'audio/pcm;rate=16000',
    });
    expect(capture.audio?.at(-1)).toEqual({ audioStreamEnd: true });
    expect(body).toContain('"transcript":"答案"');
    const streamedAudio = body.split('\n')
      .filter((line) => line.startsWith('data: {'))
      .map((line) => JSON.parse(line.slice(6)) as {
        choices?: Array<{ delta?: { audio?: { data?: string } } }>;
      })
      .map((event) => event.choices?.[0]?.delta?.audio?.data ?? '')
      .join('');
    expect(streamedAudio).toBe('AQIDBAUG');
    expect([...Buffer.from(streamedAudio, 'base64')]).toEqual([1, 2, 3, 4, 5, 6]);
    expect(body).toContain('"total_tokens":18');
    expect(body).toContain('data: [DONE]');
    expect(body).not.toContain('server-secret');
    expect(body).not.toContain('client-controlled-model');
    expect(body).not.toContain('client-tool');
  });

  it('adds only the server-owned Google Search tool on the online route', async () => {
    const capture: Capture = {};
    const gateway = createGeminiLiveGateway({
      apiKey: 'server-secret',
      createClient: () => fakeClient(capture) as never,
    });

    const response = await gateway(request('/api/voice/google/online/audio-llm/chat/completions'));
    expect(response.status).toBe(200);
    await response.text();
    expect(capture.searchEnabled).toBe(true);
  });

  it('rejects cross-origin calls before opening a Live session', async () => {
    let connected = false;
    const gateway = createGeminiLiveGateway({
      apiKey: 'server-secret',
      createClient: () => ({
        connect: async () => {
          connected = true;
          throw new Error('must not connect');
        },
      } as never),
    });
    const unsafe = request('/api/voice/google/audio-llm/chat/completions');
    unsafe.headers.set('origin', 'https://attacker.test');

    const response = await gateway(unsafe);
    expect(response.status).toBe(403);
    expect(connected).toBe(false);
  });

  it('returns a gateway response when Live setup fails before streaming', async () => {
    const gateway = createGeminiLiveGateway({
      apiKey: 'server-secret',
      createClient: () => ({
        connect: async () => {
          throw new Error('upstream quota details');
        },
      } as never),
    });

    const response = await gateway(request('/api/voice/google/audio-llm/chat/completions'));
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'Gemini Live request failed' });
  });

  it('handles a client abort while the Live handshake is pending', async () => {
    let releaseConnect: (() => void) | undefined;
    let markConnectStarted: (() => void) | undefined;
    let closeCount = 0;
    const connectGate = new Promise<void>((resolve) => {
      releaseConnect = resolve;
    });
    const connectStarted = new Promise<void>((resolve) => {
      markConnectStarted = resolve;
    });
    const gateway = createGeminiLiveGateway({
      apiKey: 'server-secret',
      createClient: () => ({
        connect: async () => {
          markConnectStarted?.();
          await connectGate;
          return {
            sendRealtimeInput() {},
            close() { closeCount += 1; },
          };
        },
      } as never),
    });
    const abortController = new AbortController();
    const responsePromise = gateway(request(
      '/api/voice/google/audio-llm/chat/completions',
      abortController.signal,
    ));

    await connectStarted;
    abortController.abort();
    releaseConnect?.();

    const response = await responsePromise;
    expect(response.status).toBe(502);
    expect(closeCount).toBe(1);
  });

  it('closes an established Live stream cleanly when the client aborts', async () => {
    let closeCount = 0;
    const gateway = createGeminiLiveGateway({
      apiKey: 'server-secret',
      createClient: () => ({
        connect: async () => ({
          sendRealtimeInput() {},
          close() { closeCount += 1; },
        }),
      } as never),
    });
    const abortController = new AbortController();
    const response = await gateway(request(
      '/api/voice/google/audio-llm/chat/completions',
      abortController.signal,
    ));
    const body = response.text();

    abortController.abort();

    expect(await body).toBe('');
    expect(closeCount).toBe(1);
  });
});
