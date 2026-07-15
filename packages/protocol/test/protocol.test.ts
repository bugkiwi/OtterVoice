import { describe, expect, it } from 'bun:test';
import {
  encodeMessage,
  isProtocolMessage,
  parseMessage,
  PROTOCOL_MESSAGE_TYPES,
  PROTOCOL_VERSION,
  ProtocolError,
  serializeMessage,
} from '../src/index';

describe('encode/serialize/parse round-trip', () => {
  it('encodes a typed envelope with the current version', () => {
    const env = encodeMessage('asr_final', { text: 'hi', turnId: 't1', confidence: 0.9 });
    expect(env).toEqual({
      v: PROTOCOL_VERSION,
      type: 'asr_final',
      payload: { text: 'hi', turnId: 't1', confidence: 0.9 },
    });
  });

  it('round-trips through serialize → parse', () => {
    const env = encodeMessage('statechange', { from: 'listening', to: 'user_speaking' });
    const parsed = parseMessage(serializeMessage(env));
    expect(parsed).toEqual(env);
  });

  it('exposes every event type', () => {
    expect(PROTOCOL_MESSAGE_TYPES).toContain('error');
    expect(PROTOCOL_MESSAGE_TYPES).toContain('user_audio_end');
    expect(PROTOCOL_MESSAGE_TYPES).not.toContain('user_audio_final' as never);
    expect(PROTOCOL_MESSAGE_TYPES).not.toContain('assistant_audio' as never);
    expect(PROTOCOL_MESSAGE_TYPES).toContain('assistant_text_delta');
    expect(PROTOCOL_MESSAGE_TYPES).toHaveLength(12);
  });
});

describe('isProtocolMessage', () => {
  it('accepts a well-formed envelope', () => {
    expect(isProtocolMessage(encodeMessage('finished', { turns: [] }))).toBe(true);
  });

  it('rejects non-objects, wrong version, unknown type and bad payload', () => {
    expect(isProtocolMessage(null)).toBe(false);
    expect(isProtocolMessage('nope')).toBe(false);
    expect(isProtocolMessage({ v: 999, type: 'error', payload: {} })).toBe(false);
    expect(isProtocolMessage({ v: PROTOCOL_VERSION, type: 'nope', payload: {} })).toBe(false);
    expect(isProtocolMessage({ v: PROTOCOL_VERSION, type: 'error' })).toBe(false);
    expect(isProtocolMessage({ v: PROTOCOL_VERSION, type: 'error', payload: 5 })).toBe(false);
  });
});

describe('parseMessage errors', () => {
  it('throws on malformed JSON', () => {
    expect(() => parseMessage('{not json')).toThrow(ProtocolError);
  });

  it('throws when the top level is not an object', () => {
    expect(() => parseMessage('42')).toThrow('must be a JSON object');
  });

  it('throws on an unsupported version', () => {
    expect(() => parseMessage(JSON.stringify({ v: 2, type: 'error', payload: {} }))).toThrow(
      'Unsupported protocol version',
    );
  });

  it('throws on an unknown message type', () => {
    expect(() =>
      parseMessage(JSON.stringify({ v: PROTOCOL_VERSION, type: 'bogus', payload: {} })),
    ).toThrow('Unknown protocol message type');
  });

  it('throws on a missing or non-object payload', () => {
    expect(() =>
      parseMessage(JSON.stringify({ v: PROTOCOL_VERSION, type: 'error' })),
    ).toThrow('Missing payload');
    expect(() =>
      parseMessage(JSON.stringify({ v: PROTOCOL_VERSION, type: 'error', payload: 1 })),
    ).toThrow('Missing payload');
  });
});
