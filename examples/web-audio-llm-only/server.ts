import { createOpenRouterGateway } from '@ottervoice/provider-openrouter';

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
const voiceGateway = createOpenRouterGateway({
  apiKey,
  policy: {
    asr: { model: 'qwen/qwen3-asr-flash-2026-02-10' },
    audioLlm: {
      model: 'openai/gpt-audio-mini',
      systemPrompt: process.env.OTTERVOICE_SYSTEM_PROMPT ??
        'Reply naturally in one or two short spoken sentences.',
      voice: 'alloy',
      temperature: 0.45,
      maxTokens: 512,
    },
  },
  authorize: ({ request, url }) => request.headers.get('origin') === url.origin,
  maxRequestBodyBytes: 6 * 1024 * 1024,
  maxMessages: 24,
  maxTextCharacters: 20_000,
  title: 'OtterVoice Audio LLM-only Example',
});

Bun.serve({
  hostname: '127.0.0.1',
  port,
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/voice/')) {
      return voiceGateway(request);
    }
    if (url.pathname === '/app.js') {
      return new Response(appJs, { headers: { 'content-type': 'text/javascript' } });
    }
    if (url.pathname === '/') return new Response(html, { headers: { 'content-type': 'text/html' } });
    return new Response('Not Found', { status: 404 });
  },
});

console.log(`Audio LLM-only example: http://localhost:${port}`);
