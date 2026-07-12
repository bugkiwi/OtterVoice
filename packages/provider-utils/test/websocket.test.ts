import { describe, expect, it } from 'bun:test';
import {
  createWebSocketASRSession,
  resolveWebSocket,
  type ASRDecodeResult,
  type WebSocketLike,
} from '../src/websocket';
import type { ASRResult, NormalizedVoiceError } from '@ottervoice/core';

class FakeWS implements WebSocketLike {
  binaryType = 'blob';
  sent: Array<string | ArrayBufferLike | ArrayBufferView> = [];
  closed = false;
  private listeners: Record<string, Set<(e: any) => void>> = {};
  send(d: string | ArrayBufferLike | ArrayBufferView) {
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

const decodeJson = (data: string): ASRDecodeResult | undefined => {
  const msg = JSON.parse(data) as { kind: string; text: string };
  if (msg.kind === 'partial') return { partial: { text: msg.text } };
  if (msg.kind === 'final') return { final: { text: msg.text } };
  if (msg.kind === 'err') return { error: { code: 'asr_timeout', message: msg.text } };
  return undefined;
};

function session(ws: FakeWS, finishMessage?: string) {
  return createWebSocketASRSession({
    ws,
    provider: 'test',
    encodeAudio: (chunk) => chunk,
    decode: decodeJson,
    ...(finishMessage !== undefined ? { finishMessage } : {}),
  });
}

describe('resolveWebSocket', () => {
  it('returns the injected constructor or the global', () => {
    const ctor = class {} as any;
    expect(resolveWebSocket(ctor)).toBe(ctor);
    expect(resolveWebSocket()).toBe(globalThis.WebSocket);
  });
});

describe('createWebSocketASRSession', () => {
  it('queues audio until open, then flushes', () => {
    const ws = new FakeWS();
    const s = session(ws);
    s.sendAudio(new ArrayBuffer(2)); // queued
    expect(ws.sent).toHaveLength(0);
    ws.dispatch('open');
    expect(ws.sent).toHaveLength(1);
    s.sendAudio(new ArrayBuffer(3)); // sent immediately
    expect(ws.sent).toHaveLength(2);
  });

  it('decodes partials, finals and errors from text and binary frames', () => {
    const ws = new FakeWS();
    const s = session(ws);
    const partials: ASRResult[] = [];
    const finals: ASRResult[] = [];
    const errors: NormalizedVoiceError[] = [];
    s.onPartial((r) => partials.push(r));
    s.onFinal((r) => finals.push(r));
    s.onError((e) => errors.push(e));

    ws.dispatch('message', { data: JSON.stringify({ kind: 'partial', text: 'he' }) });
    // binary frame
    ws.dispatch('message', {
      data: new TextEncoder().encode(JSON.stringify({ kind: 'final', text: 'hello' })).buffer,
    });
    ws.dispatch('message', { data: JSON.stringify({ kind: 'err', text: 'boom' }) });
    ws.dispatch('message', { data: JSON.stringify({ kind: 'ignore', text: '' }) });

    expect(partials.map((p) => p.text)).toEqual(['he']);
    expect(finals.map((f) => f.text)).toEqual(['hello']);
    expect(errors[0]?.code).toBe('asr_timeout');
  });

  it('emits a connection error on the socket error event', () => {
    const ws = new FakeWS();
    const s = session(ws);
    const errors: NormalizedVoiceError[] = [];
    s.onError((e) => errors.push(e));
    ws.dispatch('error');
    expect(errors[0]?.code).toBe('asr_connection_failed');
  });

  it('sends the finish message on stop only when open', async () => {
    const ws = new FakeWS();
    const s = session(ws, 'FLUSH');
    await s.stop(); // not open yet → nothing
    expect(ws.sent).toHaveLength(0);
    ws.dispatch('open');
    await s.stop();
    expect(ws.sent).toEqual(['FLUSH']);
  });

  it('does nothing on stop without a finish message', async () => {
    const ws = new FakeWS();
    const s = session(ws);
    ws.dispatch('open');
    await s.stop();
    expect(ws.sent).toHaveLength(0);
  });

  it('stops sending after close and supports unsubscribe', async () => {
    const ws = new FakeWS();
    const s = session(ws);
    const offP = s.onPartial(() => {});
    const offF = s.onFinal(() => {});
    const offE = s.onError(() => {});
    offP();
    offF();
    offE();
    ws.dispatch('open');
    await s.close();
    expect(ws.closed).toBe(true);
    s.sendAudio(new ArrayBuffer(1)); // closed → ignored
    ws.dispatch('close'); // idempotent close handler
    expect(ws.sent).toHaveLength(0);
  });
});
