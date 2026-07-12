import { describe, expect, it, mock } from 'bun:test';
import {
  NodeNetworkAdapter,
  NodeRuntimeWebSocket,
  normalizeWsData,
  type WebSocketCtor,
  type WebSocketLike,
} from '../src/network';

class FakeWS implements WebSocketLike {
  binaryType = 'blob';
  sent: Array<string | ArrayBufferLike | ArrayBufferView> = [];
  closed: { code?: number; reason?: string } | undefined;
  private listeners: Record<string, Set<(e: any) => void>> = {};
  constructor(
    public url: string,
    public protocols?: string | string[],
  ) {}
  send(data: string | ArrayBufferLike | ArrayBufferView) {
    this.sent.push(data);
  }
  close(code?: number, reason?: string) {
    this.closed = { code, reason };
  }
  addEventListener(type: string, listener: (e: any) => void) {
    (this.listeners[type] ??= new Set()).add(listener);
  }
  removeEventListener(type: string, listener: (e: any) => void) {
    this.listeners[type]?.delete(listener);
  }
  dispatch(type: string, event: unknown) {
    this.listeners[type]?.forEach((l) => l(event));
  }
}

describe('normalizeWsData', () => {
  it('passes strings and ArrayBuffers through', () => {
    expect(normalizeWsData('hi')).toBe('hi');
    const buf = new ArrayBuffer(4);
    expect(normalizeWsData(buf)).toBe(buf);
  });

  it('copies a typed-array view honoring byteOffset', () => {
    const view = new Uint8Array([9, 1, 2, 3]).subarray(1);
    const out = normalizeWsData(view) as ArrayBuffer;
    expect(new Uint8Array(out)).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('stringifies anything else', () => {
    expect(normalizeWsData(42)).toBe('42');
  });
});

describe('NodeRuntimeWebSocket', () => {
  it('forces arraybuffer binary type and proxies send/close', () => {
    const ws = new FakeWS('wss://x');
    const rt = new NodeRuntimeWebSocket(ws);
    expect(ws.binaryType).toBe('arraybuffer');
    rt.send('ping');
    rt.close(1000, 'bye');
    expect(ws.sent).toEqual(['ping']);
    expect(ws.closed).toEqual({ code: 1000, reason: 'bye' });
  });

  it('wires open/message/error/close and supports unsubscribe', () => {
    const ws = new FakeWS('wss://x');
    const rt = new NodeRuntimeWebSocket(ws);
    const log: string[] = [];
    const offs = [
      rt.onOpen(() => log.push('open')),
      rt.onMessage((d) => log.push(`msg:${String(d)}`)),
      rt.onError(() => log.push('error')),
      rt.onClose(() => log.push('close')),
    ];

    ws.dispatch('open', {});
    ws.dispatch('message', { data: 'hello' });
    ws.dispatch('error', new Error('x'));
    ws.dispatch('close', {});
    expect(log).toEqual(['open', 'msg:hello', 'error', 'close']);

    // Every unsubscribe detaches its handler.
    for (const off of offs) off();
    ws.dispatch('open', {});
    ws.dispatch('message', { data: 'again' });
    ws.dispatch('error', new Error('y'));
    ws.dispatch('close', {});
    expect(log).toEqual(['open', 'msg:hello', 'error', 'close']);
  });
});

describe('NodeNetworkAdapter', () => {
  it('delegates fetch to the injected implementation', async () => {
    const response = new Response('ok');
    const fetchImpl = mock(async () => response);
    const net = new NodeNetworkAdapter({ fetch: fetchImpl });
    const res = await net.fetch('https://api.test', { method: 'POST' });
    expect(res).toBe(response);
    expect(fetchImpl).toHaveBeenCalledWith('https://api.test', { method: 'POST' });
  });

  it('creates a wrapped WebSocket from the injected constructor', () => {
    const instances: FakeWS[] = [];
    const Ctor = function (url: string, protocols?: string | string[]) {
      const ws = new FakeWS(url, protocols);
      instances.push(ws);
      return ws;
    } as unknown as WebSocketCtor;
    const net = new NodeNetworkAdapter({ webSocket: Ctor });
    const sock = net.createWebSocket('wss://api.test', 'proto');
    expect(sock).toBeInstanceOf(NodeRuntimeWebSocket);
    expect(instances[0]?.url).toBe('wss://api.test');
    expect(instances[0]?.protocols).toBe('proto');
  });

  it('falls back to global fetch/WebSocket when not injected', () => {
    const net = new NodeNetworkAdapter();
    expect(typeof net.fetch).toBe('function');
    const sock = net.createWebSocket('ws://127.0.0.1:1');
    sock.onError(() => {}); // swallow the inevitable connect failure
    sock.close();
  });
});
