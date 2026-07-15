import { proxyOpenRouter } from '../web/openrouter-proxy';

const AUDIO_MODEL = 'openai/gpt-audio-mini';
const ASR_MODEL = 'qwen/qwen3-asr-flash-2026-02-10';
const MAX_BODY_BYTES = 6 * 1024 * 1024;
const root = new URL('.', import.meta.url);
const repositoryRoot = new URL('../../', root);

const build = await Bun.build({
  entrypoints: [new URL('./main.ts', root).pathname],
  target: 'browser',
  conditions: ['development', 'browser'],
  alias: {
    '@ottervoice/core': new URL('packages/core/src/index.ts', repositoryRoot).pathname,
    '@ottervoice/provider-utils': new URL('packages/provider-utils/src/index.ts', repositoryRoot).pathname,
    '@ottervoice/provider-openrouter': new URL('packages/provider-openrouter/src/index.ts', repositoryRoot).pathname,
    '@ottervoice/runtime-web': new URL('packages/runtime-web/src/index.ts', repositoryRoot).pathname,
  },
});
if (!build.success) throw new AggregateError(build.logs, 'Browser build failed');
const appJs = await build.outputs[0]!.text();
const html = Bun.file(new URL('./index.html', root));
const apiKey = process.env.OPENROUTER_API_KEY;
const port = Number(process.env.PORT ?? 5174);

async function lockRequestModel(request: Request): Promise<Request | Response> {
  if ((await request.clone().arrayBuffer()).byteLength > MAX_BODY_BYTES) {
    return Response.json({ error: 'voice request is too large' }, { status: 413 });
  }
  const url = new URL(request.url);
  if (url.pathname.endsWith('/chat/completions')) {
    const body = await request.json() as Record<string, unknown>;
    body.model = AUDIO_MODEL;
    return new Request(request.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: request.signal,
    });
  }
  if (url.pathname.endsWith('/audio/transcriptions')) {
    const body = await request.json() as Record<string, unknown>;
    body.model = ASR_MODEL;
    return new Request(request.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: request.signal,
    });
  }
  return Response.json({ error: 'route is not allowed' }, { status: 404 });
}

Bun.serve({
  port,
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/voice/')) {
      if (request.headers.get('origin') !== url.origin) {
        return Response.json({ error: 'origin rejected' }, { status: 403 });
      }
      if (!apiKey) return Response.json({ error: 'server is not configured' }, { status: 503 });
      const locked = await lockRequestModel(request);
      return locked instanceof Response ? locked : proxyOpenRouter(locked, apiKey);
    }
    if (url.pathname === '/app.js') {
      return new Response(appJs, { headers: { 'content-type': 'text/javascript' } });
    }
    if (url.pathname === '/') return new Response(html, { headers: { 'content-type': 'text/html' } });
    return new Response('Not Found', { status: 404 });
  },
});

console.log(`Audio LLM-only example: http://localhost:${port}`);
