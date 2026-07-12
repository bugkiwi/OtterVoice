import type { NetworkAdapter, RuntimeWebSocket } from '@ottervoice/core';

/** Minimal surface of a browser/Bun/`ws` WebSocket the wrapper relies on. */
export interface WebSocketLike {
  binaryType?: string;
  send(data: string | ArrayBufferLike | ArrayBufferView): void;
  close(code?: number, reason?: string): void;
  addEventListener(type: string, listener: (event: any) => void): void;
  removeEventListener(type: string, listener: (event: any) => void): void;
}

export type WebSocketCtor = new (
  url: string,
  protocols?: string | string[],
) => WebSocketLike;

export type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

/** Normalize a WebSocket `message` event's `data` to `string | ArrayBuffer`. */
export function normalizeWsData(data: unknown): string | ArrayBuffer {
  if (typeof data === 'string') return data;
  if (data instanceof ArrayBuffer) return data;
  if (ArrayBuffer.isView(data)) {
    const view = data as ArrayBufferView;
    return view.buffer.slice(
      view.byteOffset,
      view.byteOffset + view.byteLength,
    ) as ArrayBuffer;
  }
  return String(data);
}

/** Adapts a {@link WebSocketLike} to the core {@link RuntimeWebSocket} contract. */
export class NodeRuntimeWebSocket implements RuntimeWebSocket {
  constructor(private readonly ws: WebSocketLike) {
    this.ws.binaryType = 'arraybuffer';
  }

  send(data: string | ArrayBuffer): void {
    this.ws.send(data);
  }

  close(code?: number, reason?: string): void {
    this.ws.close(code, reason);
  }

  onOpen(cb: () => void): () => void {
    const handler = () => cb();
    this.ws.addEventListener('open', handler);
    return () => this.ws.removeEventListener('open', handler);
  }

  onMessage(cb: (data: string | ArrayBuffer) => void): () => void {
    const handler = (event: { data: unknown }) => cb(normalizeWsData(event.data));
    this.ws.addEventListener('message', handler);
    return () => this.ws.removeEventListener('message', handler);
  }

  onError(cb: (error: unknown) => void): () => void {
    const handler = (event: unknown) => cb(event);
    this.ws.addEventListener('error', handler);
    return () => this.ws.removeEventListener('error', handler);
  }

  onClose(cb: () => void): () => void {
    const handler = () => cb();
    this.ws.addEventListener('close', handler);
    return () => this.ws.removeEventListener('close', handler);
  }
}

export interface NodeNetworkOptions {
  /** Override `fetch` (defaults to the global). */
  fetch?: FetchLike;
  /** Override the WebSocket constructor (defaults to the global). */
  webSocket?: WebSocketCtor;
}

/** {@link NetworkAdapter} backed by global (or injected) `fetch`/`WebSocket`. */
export class NodeNetworkAdapter implements NetworkAdapter {
  private readonly _fetch: FetchLike;
  private readonly _WS: WebSocketCtor;

  constructor(options: NodeNetworkOptions = {}) {
    this._fetch = options.fetch ?? (globalThis.fetch as FetchLike);
    this._WS = options.webSocket ?? (globalThis.WebSocket as unknown as WebSocketCtor);
  }

  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    return this._fetch(input, init);
  }

  createWebSocket(url: string, protocols?: string | string[]): RuntimeWebSocket {
    const ws = new this._WS(url, protocols);
    return new NodeRuntimeWebSocket(ws);
  }
}
