import { describe, expect, it } from 'bun:test';
import { normalizeHttpError, readBody, resolveFetch } from '../src/http';

describe('resolveFetch', () => {
  it('returns the injected fetch', () => {
    const fake = (async () => new Response('')) as any;
    expect(resolveFetch(fake)).toBe(fake);
  });

  it('falls back to the global fetch', () => {
    expect(typeof resolveFetch()).toBe('function');
  });
});

describe('normalizeHttpError', () => {
  it('maps 429 to a retryable rate-limit error', () => {
    const e = normalizeHttpError(429, 'slow down', { provider: 'p' });
    expect(e.code).toBe('provider_rate_limited');
    expect(e.retryable).toBe(true);
    expect(e.provider).toBe('p');
  });

  it('maps 402 to quota exceeded', () => {
    expect(normalizeHttpError(402, 'pay up').code).toBe('provider_quota_exceeded');
  });

  it('maps 5xx to a retryable network error', () => {
    const e = normalizeHttpError(503, 'oops');
    expect(e.code).toBe('network_error');
    expect(e.retryable).toBe(true);
  });

  it('uses the supplied failureCode for other 4xx', () => {
    expect(normalizeHttpError(400, 'bad', { failureCode: 'llm_failed' }).code).toBe(
      'llm_failed',
    );
  });

  it('defaults the failure code to unknown', () => {
    expect(normalizeHttpError(404, 'missing').code).toBe('unknown');
  });
});

describe('readBody', () => {
  it('reads response text', async () => {
    expect(await readBody(new Response('hello'))).toBe('hello');
  });

  it('returns empty string when the body cannot be read', async () => {
    const broken = { text: async () => { throw new Error('no body'); } } as Response;
    expect(await readBody(broken)).toBe('');
  });
});
