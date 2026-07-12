/**
 * Token broker example (see tech design §17).
 *
 * OtterVoice clients must never hold provider secrets. Instead they POST to
 * your backend, which mints a SHORT-LIVED credential. This Bun server shows the
 * contract `@ottervoice/provider-utils`' `createCredentialResolver` expects:
 *
 *   POST /api/voice/token   { provider, purpose, sessionId? }
 *   200  ->                 { token, url?, expiresAt? }
 *
 * Run:  bun run examples/token-broker/server.ts
 *
 * Azure is implemented with a REAL ephemeral-token exchange. For the other
 * providers this demo returns the configured key directly — replace those
 * branches with each vendor's short-lived-token flow before production.
 */

const PORT = Number(process.env.PORT ?? 8787);

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
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

/** Map a provider id to a credential. DEMO ONLY for non-Azure providers. */
async function mintToken(provider: string): Promise<{ token: string; url?: string; expiresAt?: number }> {
  switch (provider) {
    case 'azure_speech':
      return mintAzureToken();
    case 'openrouter': {
      const token = requireEnv('OPENROUTER_API_KEY');
      return { token, expiresAt: Date.now() + 5 * 60_000 };
    }
    case 'deepgram':
      return { token: requireEnv('DEEPGRAM_API_KEY') };
    case 'elevenlabs':
      return { token: requireEnv('ELEVENLABS_API_KEY') };
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var ${name}`);
  console.warn(
    `[token-broker] returning raw ${name} — replace with an ephemeral-token flow for production`,
  );
  return value;
}

Bun.serve({
  port: PORT,
  async fetch(req) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const url = new URL(req.url);
    if (req.method !== 'POST' || url.pathname !== '/api/voice/token') {
      return json({ error: 'not found' }, 404);
    }
    let body: { provider?: string; purpose?: string; sessionId?: string };
    try {
      body = await req.json();
    } catch {
      return json({ error: 'invalid JSON' }, 400);
    }
    if (!body.provider) return json({ error: 'provider is required' }, 400);
    try {
      return json(await mintToken(body.provider));
    } catch (err) {
      return json({ error: err instanceof Error ? err.message : String(err) }, 400);
    }
  },
});

console.log(`Token broker listening on http://localhost:${PORT}/api/voice/token`);
