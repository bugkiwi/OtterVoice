import { describe, expect, it } from 'bun:test';
import { createDeepgramASR } from '../src/index';
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

describe('createDeepgramASR', () => {
  it('opens a token-authenticated socket and streams transcripts', async () => {
    const { Ctor, instances } = fakeCtor();
    const asr = createDeepgramASR({
      apiKey: 'dg-key',
      model: 'nova-2',
      webSocket: Ctor,
    });
    expect(asr.capabilities.streaming).toBe(true);

    const session = await asr.createSession({ language: 'en' });
    const ws = instances[0]!;
    expect(ws.url).toContain('model=nova-2');
    expect(ws.protocols).toEqual(['token', 'dg-key']);

    const finals: ASRResult[] = [];
    session.onFinal((r) => finals.push(r));
    ws.dispatch('open');
    const pcm = new ArrayBuffer(4);
    session.sendAudio(pcm); // exercises encodeAudio passthrough
    expect(ws.sent).toContain(pcm);
    ws.dispatch('message', {
      data: JSON.stringify({
        type: 'Results',
        is_final: true,
        channel: { alternatives: [{ transcript: 'hi there', confidence: 0.9 }] },
      }),
    });
    expect(finals[0]?.text).toBe('hi there');

    await session.stop();
    expect(ws.sent).toContainEqual(JSON.stringify({ type: 'CloseStream' }));
    await session.close();
    expect(ws.closed).toBe(true);
  });

  it('uses a broker-provided signed URL when present', async () => {
    const { Ctor, instances } = fakeCtor();
    const asr = createDeepgramASR({
      tokenBrokerUrl: 'https://broker',
      webSocket: Ctor,
      fetch: async () =>
        new Response(JSON.stringify({ token: 'tk', url: 'wss://signed.example/listen' })),
    });
    await asr.createSession({});
    expect(instances[0]?.url).toBe('wss://signed.example/listen');
    expect(instances[0]?.protocols).toEqual(['token', 'tk']);
  });
});
