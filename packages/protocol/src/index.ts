/**
 * OtterVoice wire protocol.
 *
 * A small, dependency-light JSON envelope for transporting session events
 * across a process/language boundary (e.g. a TypeScript core driving a native
 * Swift/Kotlin runtime, or a server streaming events to a client). The payload
 * shapes mirror {@link VoiceSessionEventMap} from `@ottervoice/core`.
 */
import type { VoiceSessionEventMap } from '@ottervoice/core';

/** Bumped when the envelope shape or payload contracts change incompatibly. */
export const PROTOCOL_VERSION = 1 as const;

export type ProtocolMessageType = keyof VoiceSessionEventMap;

/** Every event type that may appear on the wire, in a stable order. */
export const PROTOCOL_MESSAGE_TYPES: readonly ProtocolMessageType[] = [
  'statechange',
  'asr_partial',
  'asr_final',
  'user_audio_end',
  'assistant_text_delta',
  'assistant_text',
  'assistant_audio_start',
  'assistant_audio_end',
  'turn',
  'usage',
  'finished',
  'error',
] as const;

const KNOWN_TYPES: ReadonlySet<string> = new Set(PROTOCOL_MESSAGE_TYPES);

export interface ProtocolEnvelope<
  T extends ProtocolMessageType = ProtocolMessageType,
> {
  v: typeof PROTOCOL_VERSION;
  type: T;
  payload: VoiceSessionEventMap[T];
}

/** Discriminated union of all protocol envelopes. */
export type VoiceProtocolMessage = {
  [T in ProtocolMessageType]: ProtocolEnvelope<T>;
}[ProtocolMessageType];

export class ProtocolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProtocolError';
  }
}

/** Build a typed envelope for an event. */
export function encodeMessage<T extends ProtocolMessageType>(
  type: T,
  payload: VoiceSessionEventMap[T],
): ProtocolEnvelope<T> {
  return { v: PROTOCOL_VERSION, type, payload };
}

/** Serialize an envelope (or any event via {@link encodeMessage}) to JSON. */
export function serializeMessage(message: VoiceProtocolMessage): string {
  return JSON.stringify(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Structurally validate a decoded value as a {@link ProtocolEnvelope} without
 * trusting the version. Returns a boolean type-guard.
 */
export function isProtocolMessage(value: unknown): value is VoiceProtocolMessage {
  return (
    isRecord(value) &&
    value['v'] === PROTOCOL_VERSION &&
    typeof value['type'] === 'string' &&
    KNOWN_TYPES.has(value['type']) &&
    'payload' in value &&
    isRecord(value['payload'])
  );
}

/**
 * Parse a JSON string into a validated {@link ProtocolEnvelope}.
 *
 * Throws {@link ProtocolError} on malformed JSON, an unknown/old version, an
 * unknown message type, or a missing payload.
 */
export function parseMessage(raw: string): VoiceProtocolMessage {
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch (err) {
    throw new ProtocolError(
      `Invalid protocol JSON: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!isRecord(decoded)) {
    throw new ProtocolError('Protocol message must be a JSON object');
  }
  if (decoded['v'] !== PROTOCOL_VERSION) {
    throw new ProtocolError(
      `Unsupported protocol version: expected ${PROTOCOL_VERSION}, got ${String(decoded['v'])}`,
    );
  }
  if (typeof decoded['type'] !== 'string' || !KNOWN_TYPES.has(decoded['type'])) {
    throw new ProtocolError(`Unknown protocol message type: ${String(decoded['type'])}`);
  }
  if (!('payload' in decoded) || !isRecord(decoded['payload'])) {
    throw new ProtocolError(`Missing payload for message type "${decoded['type']}"`);
  }
  return decoded as unknown as VoiceProtocolMessage;
}
