/**
 * Token broker example (see tech design §17).
 *
 * OtterVoice clients must never hold provider secrets. Instead they POST to
 * your backend, which mints a SHORT-LIVED credential. Short-lived does not
 * necessarily mean route/model/budget scoped. This Bun server shows the
 * contract `@ottervoice/provider-utils`' `createCredentialResolver` expects:
 *
 *   POST /api/voice/token   Authorization: Bearer <application-session-token>
 *                           { provider, purpose, sessionId }
 *   200  ->                 { token, url?, expiresAt? }
 *
 * Run:  bun run examples/token-broker/server.ts
 *
 * Azure is implemented with a real ephemeral-token exchange. Its STS token is
 * still broader than a server policy gateway, so this is an explicit direct
 * client mode rather than the standard browser boundary. This example never
 * returns a configured long-lived key as a "temporary" token.
 */

const PORT = Number(process.env.PORT ?? 8787);
const ALLOWED_ORIGIN = process.env.TOKEN_BROKER_ALLOWED_ORIGIN ?? 'http://localhost:5173';
const APP_AUTH_TOKEN = process.env.TOKEN_BROKER_APP_AUTH_TOKEN;
const MAX_BODY_BYTES = 4 * 1024;

const CORS = {
  'access-control-allow-origin': ALLOWED_ORIGIN,
  'access-control-allow-headers': 'authorization, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-credentials': 'true',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...CORS },
  });
}

/** Exchange an Azure subscription key for a ~10-minute STS token. */
async function mintAzureToken(): Promise<{ token: string; expiresAt: number }> {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_REGION;
  if (!key || !region) throw new Error('Set AZURE_SPEECH_KEY and AZURE_REGION');
  const res = await fetch(
    `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
    { method: 'POST', headers: { 'ocp-apim-subscription-key': key } },
  );
  if (!res.ok) throw new Error(`Azure issueToken failed: ${res.status}`);
  return { token: await res.text(), expiresAt: Date.now() + 9 * 60_000 };
}

/** Map a provider id to an implemented ephemeral credential flow. */
async function mintToken(
  provider: string,
  purpose: string,
): Promise<{ token: string; url?: string; expiresAt?: number }> {
  switch (provider) {
    case 'azure_speech':
      if (purpose !== 'tts' && purpose !== 'asr') {
        throw new Error('unsupported purpose');
      }
      return mintAzureToken();
    default:
      throw new Error('provider has no ephemeral token flow in this example');
  }
}

Bun.serve({
  port: PORT,
  async fetch(req) {
    const origin = req.headers.get('origin');
    if (origin !== null && origin !== ALLOWED_ORIGIN) {
      return json({ error: 'origin rejected' }, 403);
    }
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const url = new URL(req.url);
    if (req.method !== 'POST' || url.pathname !== '/api/voice/token') {
      return json({ error: 'not found' }, 404);
    }
    if (!APP_AUTH_TOKEN) return json({ error: 'broker app authorization is not configured' }, 503);
    if (req.headers.get('authorization') !== `Bearer ${APP_AUTH_TOKEN}`) {
      return json({ error: 'unauthorized' }, 401);
    }
    const contentLength = Number(req.headers.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      return json({ error: 'request is too large' }, 413);
    }
    const rawBody = await req.arrayBuffer();
    if (rawBody.byteLength > MAX_BODY_BYTES) return json({ error: 'request is too large' }, 413);
    let body: { provider?: string; purpose?: string; sessionId?: string };
    try {
      body = JSON.parse(new TextDecoder().decode(rawBody));
    } catch {
      return json({ error: 'invalid JSON' }, 400);
    }
    if (!body.provider || !body.purpose || !body.sessionId) {
      return json({ error: 'provider, purpose, and sessionId are required' }, 400);
    }
    try {
      return json(await mintToken(body.provider, body.purpose));
    } catch {
      return json({ error: 'credential cannot be minted for this request' }, 400);
    }
  },
});

console.log(`Token broker listening on http://localhost:${PORT}/api/voice/token`);
