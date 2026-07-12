import {
  createVoiceError,
  type ASRResult,
  type ASRSession,
  type NormalizedVoiceError,
} from '@ottervoice/core';

export interface WebSocketLike {
  binaryType?: string;
  send(data: string | ArrayBufferLike | ArrayBufferView): void;
  close(code?: number, reason?: string): void;
  addEventListener(type: string, listener: (event: any) => void): void;
}

export type WebSocketCtor = new (
  url: string,
  protocols?: string | string[],
) => WebSocketLike;

export function resolveWebSocket(ctor?: WebSocketCtor): WebSocketCtor {
  return ctor ?? (globalThis.WebSocket as unknown as WebSocketCtor);
}

export interface ASRDecodeResult {
  partial?: ASRResult;
  final?: ASRResult;
  error?: NormalizedVoiceError;
}

export interface WebSocketASRConfig {
  ws: WebSocketLike;
  provider: string;
  /** Encode an audio chunk into a WS payload. */
  encodeAudio: (chunk: ArrayBuffer) => string | ArrayBufferLike | ArrayBufferView;
  /** Decode a (text) server message into transcripts. Return `undefined` to skip. */
  decode: (data: string) => ASRDecodeResult | undefined;
  /** Optional message sent on `stop()` to flush the stream. */
  finishMessage?: string;
}

/**
 * Build an {@link ASRSession} over a WebSocket. Audio sent before the socket
 * opens is queued and flushed on open. Vendor specifics live entirely in
 * `encodeAudio`/`decode`, keeping this plumbing reusable and testable.
 */
export function createWebSocketASRSession(config: WebSocketASRConfig): ASRSession {
  const { ws, provider, encodeAudio, decode, finishMessage } = config;
  const partialCbs = new Set<(r: ASRResult) => void>();
  const finalCbs = new Set<(r: ASRResult) => void>();
  const errorCbs = new Set<(e: NormalizedVoiceError) => void>();
  const queue: Array<string | ArrayBufferLike | ArrayBufferView> = [];
  let opened = false;
  let closed = false;

  const emitError = (error: NormalizedVoiceError) => {
    for (const cb of [...errorCbs]) cb(error);
  };

  ws.addEventListener('open', () => {
    opened = true;
    for (const payload of queue) ws.send(payload);
    queue.length = 0;
  });

  ws.addEventListener('message', (event: { data: unknown }) => {
    const text =
      typeof event.data === 'string'
        ? event.data
        : new TextDecoder().decode(event.data as ArrayBuffer);
    const result = decode(text);
    if (!result) return;
    if (result.error) emitError(result.error);
    if (result.partial) for (const cb of [...partialCbs]) cb(result.partial);
    if (result.final) for (const cb of [...finalCbs]) cb(result.final);
  });

  ws.addEventListener('error', () => {
    emitError(
      createVoiceError('asr_connection_failed', `${provider}: websocket error`, {
        provider,
        retryable: true,
      }),
    );
  });

  ws.addEventListener('close', () => {
    closed = true;
  });

  return {
    sendAudio(chunk: ArrayBuffer): void {
      if (closed) return;
      const payload = encodeAudio(chunk);
      if (opened) ws.send(payload);
      else queue.push(payload);
    },
    async stop(): Promise<void> {
      if (finishMessage !== undefined && opened) ws.send(finishMessage);
    },
    async close(): Promise<void> {
      closed = true;
      ws.close();
    },
    onPartial(cb) {
      partialCbs.add(cb);
      return () => partialCbs.delete(cb);
    },
    onFinal(cb) {
      finalCbs.add(cb);
      return () => finalCbs.delete(cb);
    },
    onError(cb) {
      errorCbs.add(cb);
      return () => errorCbs.delete(cb);
    },
  };
}
