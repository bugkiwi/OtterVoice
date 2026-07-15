import {
  createVoiceError,
  type ASRResult,
  type ASRSession,
  type NormalizedVoiceError,
} from '@ottervoice/core';

/**
 * Minimal browser/Node WebSocket surface used by {@link createWebSocketASRSession}.
 * Prefer the platform constructor via {@link resolveWebSocket}, or inject a mock
 * in tests.
 */
export interface WebSocketLike {
  /** Prefer `'arraybuffer'` when the peer sends binary frames. */
  binaryType?: string;
  /** Send a text or binary frame to the peer. */
  send(data: string | ArrayBufferLike | ArrayBufferView): void;
  /** Close the socket; optional close code and reason. */
  close(code?: number, reason?: string): void;
  /** Subscribe to `open` / `message` / `error` / `close` (and peers). */
  addEventListener(type: string, listener: (event: any) => void): void;
}

/**
 * Constructible WebSocket type returning a {@link WebSocketLike}. Passed to
 * {@link resolveWebSocket} when the runtime has no global `WebSocket`.
 */
export type WebSocketCtor = new (
  url: string,
  protocols?: string | string[],
) => WebSocketLike;

/**
 * Resolve the WebSocket constructor, preferring an injected one.
 *
 * @param ctor - Optional override for tests or non-browser runtimes.
 * @returns A {@link WebSocketCtor} ready to open sockets.
 */
export function resolveWebSocket(ctor?: WebSocketCtor): WebSocketCtor {
  return ctor ?? (globalThis.WebSocket as unknown as WebSocketCtor);
}

/**
 * Result of decoding one vendor WebSocket text frame inside
 * {@link WebSocketASRConfig.decode}. Omit fields that do not apply; return
 * `undefined` from `decode` to skip the message entirely.
 */
export interface ASRDecodeResult {
  /** Incremental (non-final) transcript, if this frame carries one. */
  partial?: ASRResult;
  /** Finalized transcript segment, if this frame ends an utterance. */
  final?: ASRResult;
  /** Provider-reported or decode-time failure for this frame. */
  error?: NormalizedVoiceError;
}

/**
 * Vendor-agnostic knobs for {@link createWebSocketASRSession}. Wire
 * `encodeAudio` / `decode` to the specific ASR protocol; this config owns only
 * the session plumbing.
 */
export interface WebSocketASRConfig {
  /** Open (or about-to-open) socket used for the ASR stream. */
  ws: WebSocketLike;
  /** Vendor id used in emitted {@link NormalizedVoiceError}s. */
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
 *
 * @param config - Socket, provider id, and encode/decode hooks. See
 *   {@link WebSocketASRConfig}.
 * @returns An {@link ASRSession} bound to the given socket.
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
