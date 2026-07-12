import { describe, expect, it } from 'bun:test';
import { createVoiceError, normalizeError, VoiceError } from '../src/errors';

describe('createVoiceError', () => {
  it('defaults retryable from the known retryable set', () => {
    expect(createVoiceError('network_error', 'x').retryable).toBe(true);
    expect(createVoiceError('llm_failed', 'x').retryable).toBe(false);
  });

  it('honours explicit retryable and attaches provider/raw', () => {
    const err = createVoiceError('llm_failed', 'boom', {
      retryable: true,
      provider: 'mock',
      raw: { a: 1 },
    });
    expect(err).toEqual({
      code: 'llm_failed',
      message: 'boom',
      retryable: true,
      provider: 'mock',
      raw: { a: 1 },
    });
  });

  it('omits provider/raw when not supplied', () => {
    const err = createVoiceError('unknown', 'x');
    expect('provider' in err).toBe(false);
    expect('raw' in err).toBe(false);
  });
});

describe('VoiceError', () => {
  it('is an Error carrying normalized fields', () => {
    const e = new VoiceError({ code: 'tts_failed', message: 'no' });
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe('VoiceError');
    expect(e.code).toBe('tts_failed');
    expect(e.retryable).toBe(false);
  });

  it('defaults retryable from the retryable set when unset', () => {
    expect(new VoiceError({ code: 'asr_timeout', message: 'x' }).retryable).toBe(
      true,
    );
  });

  it('toNormalized round-trips with provider and raw', () => {
    const e = new VoiceError({
      code: 'provider_rate_limited',
      message: 'slow',
      provider: 'eleven',
      raw: { status: 429 },
    });
    expect(e.toNormalized()).toEqual({
      code: 'provider_rate_limited',
      message: 'slow',
      retryable: true,
      provider: 'eleven',
      raw: { status: 429 },
    });
  });

  it('toNormalized omits absent provider/raw', () => {
    const e = new VoiceError({ code: 'unknown', message: 'x', retryable: false });
    expect(e.toNormalized()).toEqual({
      code: 'unknown',
      message: 'x',
      retryable: false,
    });
  });
});

describe('normalizeError', () => {
  it('passes through a VoiceError and fills missing provider', () => {
    const e = new VoiceError({ code: 'llm_failed', message: 'x' });
    expect(normalizeError(e, 'unknown', 'fallbackProvider').provider).toBe(
      'fallbackProvider',
    );
  });

  it('keeps an existing provider on a VoiceError', () => {
    const e = new VoiceError({ code: 'llm_failed', message: 'x', provider: 'a' });
    expect(normalizeError(e, 'unknown', 'b').provider).toBe('a');
  });

  it('maps an error-shaped object with a known code', () => {
    const out = normalizeError({ code: 'asr_timeout', message: 'late' });
    expect(out.code).toBe('asr_timeout');
    expect(out.retryable).toBe(true);
  });

  it('falls back when an error-shaped object has an unknown code', () => {
    const out = normalizeError({ code: 'weird', message: 'm' }, 'llm_failed');
    expect(out.code).toBe('llm_failed');
    expect(out.raw).toEqual({ code: 'weird', message: 'm' });
  });

  it('stringifies a non-string message on an error-shaped object', () => {
    const out = normalizeError({ code: 'unknown', message: 42 });
    expect(out.message).toBe('42');
  });

  it('wraps a plain Error', () => {
    const out = normalizeError(new Error('oops'), 'network_error');
    expect(out.code).toBe('network_error');
    expect(out.message).toBe('oops');
    expect(out.raw).toBeInstanceOf(Error);
  });

  it('coerces a primitive value', () => {
    const out = normalizeError('boom');
    expect(out.code).toBe('unknown');
    expect(out.message).toBe('boom');
  });

  it('uses the default fallback code', () => {
    expect(normalizeError(null).code).toBe('unknown');
  });
});
