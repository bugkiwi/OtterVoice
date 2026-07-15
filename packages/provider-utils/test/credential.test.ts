import { describe, expect, it, mock } from 'bun:test';
import { createCredentialResolver } from '../src/credential';
import { VoiceError } from '@ottervoice/core';

const request = { provider: 'test', purpose: 'llm' as const, sessionId: 's1' };

describe('createCredentialResolver', () => {
  it('returns a static apiKey without calling the broker', async () => {
    const fetchImpl = mock(async () => new Response('{}'));
    const resolve = createCredentialResolver({ apiKey: 'sk-1', fetch: fetchImpl }, request);
    expect(await resolve()).toEqual({ token: 'sk-1' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('throws when neither apiKey nor tokenBrokerUrl is given', async () => {
    const resolve = createCredentialResolver({}, request);
    await expect(resolve()).rejects.toBeInstanceOf(VoiceError);
  });

  it('fetches and caches a broker token', async () => {
    const fetchImpl = mock(
      async () =>
        new Response(JSON.stringify({ token: 't-1', expiresAt: 10_000 }), {
          headers: { 'content-type': 'application/json' },
        }),
    );
    const resolve = createCredentialResolver(
      { tokenBrokerUrl: 'https://broker', fetch: fetchImpl, now: () => 1000 },
      request,
    );
    expect((await resolve()).token).toBe('t-1');
    expect((await resolve()).token).toBe('t-1'); // cached
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('caches indefinitely when no expiry is given', async () => {
    const fetchImpl = mock(
      async () => new Response(JSON.stringify({ token: 't-x' })),
    );
    const resolve = createCredentialResolver(
      { tokenBrokerUrl: 'https://broker', fetch: fetchImpl },
      request,
    );
    await resolve();
    await resolve();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('refreshes once the token is near expiry', async () => {
    let calls = 0;
    const fetchImpl = mock(async () => {
      calls += 1;
      return new Response(JSON.stringify({ token: `t-${calls}`, expiresAt: 2000 + calls }));
    });
    let clock = 1000;
    const resolve = createCredentialResolver(
      { tokenBrokerUrl: 'https://broker', fetch: fetchImpl, now: () => clock },
      request,
    );
    expect((await resolve()).token).toBe('t-1');
    clock = 5000; // past expiry+skew
    expect((await resolve()).token).toBe('t-2');
  });

  it('throws a normalized error on a broker HTTP failure', async () => {
    const fetchImpl = mock(async () => new Response('nope', { status: 500 }));
    const resolve = createCredentialResolver(
      { tokenBrokerUrl: 'https://broker', fetch: fetchImpl },
      request,
    );
    await expect(resolve()).rejects.toMatchObject({
      code: 'network_error',
      stage: 'gateway',
      httpStatus: 500,
    });
  });

  it('throws when the broker returns no token', async () => {
    const fetchImpl = mock(async () => new Response(JSON.stringify({ nope: true })));
    const resolve = createCredentialResolver(
      { tokenBrokerUrl: 'https://broker', fetch: fetchImpl },
      request,
    );
    await expect(resolve()).rejects.toMatchObject({
      code: 'network_error',
      stage: 'gateway',
      safeMessage: 'The token broker returned no usable credential.',
    });
  });

  it('throws when the broker returns null json', async () => {
    const fetchImpl = mock(async () => new Response('null'));
    const resolve = createCredentialResolver(
      { tokenBrokerUrl: 'https://broker', fetch: fetchImpl },
      request,
    );
    await expect(resolve()).rejects.toBeInstanceOf(VoiceError);
  });
});
