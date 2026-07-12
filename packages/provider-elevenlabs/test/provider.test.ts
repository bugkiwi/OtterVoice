import { describe, expect, it } from 'bun:test';
import { createElevenLabsASR } from '../src/index';
import type { WebSocketLike } from '@ottervoice/provider-utils';
import type { ASRResult } from '@ottervoice/core';

class FakeWS implements WebSocketLike {
  binaryType = 'blob';
  sent: unknown[] = [];
  closed = false;
  private listeners: Record<string, Set<(e: any) => void>> = {};
  constructor(
    public url: string,
    public protocols?: string | string[],
  ) {}
  send(d: any) {
    this.sent.push(d);
  }
  close() {
    this.closed = true;
  }
  addEventListener(t: string, l: (e: any) => void) {
    (this.listeners[t] ??= new Set()).add(l);
  }
  dispatch(t: string, e?: unknown) {
    this.listeners[t]?.forEach((l) => l(e));
  }
}

function fakeCtor() {
  const instances: FakeWS[] = [];
  const Ctor = function (url: string, protocols?: string | string[]) {
    const ws = new FakeWS(url, protocols);
    instances.push(ws);
    return ws;
  } as unknown as new (u: string, p?: string | string[]) => WebSocketLike;
  return { Ctor, instances };
}

describe('createElevenLabsASR', () => {
  it('connects with an api-key subprotocol and streams a final', async () => {
    const { Ctor, instances } = fakeCtor();
    const asr = createElevenLabsASR({ apiKey: 'xi', modelId: 'scribe_v1', webSocket: Ctor });
    expect(asr.capabilities.partialResults).toBe(true);

    const session = await asr.createSession({ language: 'en' });
    const ws = instances[0]!;
    expect(ws.url).toContain('model_id=scribe_v1');
    expect(ws.protocols).toEqual(['xi-api-key', 'xi']);

    const finals: ASRResult[] = [];
    session.onFinal((r) => finals.push(r));
    ws.dispatch('open');
    session.sendAudio(new ArrayBuffer(4));
    ws.dispatch('message', { data: JSON.stringify({ text: 'hi', is_final: true }) });
    expect(finals[0]?.text).toBe('hi');

    await session.stop();
    expect(ws.sent).toContainEqual(JSON.stringify({ type: 'flush' }));
  });

  it('uses a broker signed URL when provided', async () => {
    const { Ctor, instances } = fakeCtor();
    const asr = createElevenLabsASR({
      tokenBrokerUrl: 'https://broker',
      webSocket: Ctor,
      fetch: async () =>
        new Response(JSON.stringify({ token: 'tk', url: 'wss://signed.example/stt' })),
    });
    await asr.createSession({});
    expect(instances[0]?.url).toBe('wss://signed.example/stt');
  });
});
