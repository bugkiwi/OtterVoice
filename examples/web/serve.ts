/**
 * Bundles and serves the demo locally — no Vite/webpack needed.
 *
 *   bun run examples/web/serve.ts   →   http://localhost:5173
 */
import { proxyOpenRouter } from './openrouter-proxy';

const root = new URL('.', import.meta.url);
const build = await Bun.build({
  entrypoints: [new URL('./src/main.ts', root).pathname],
  target: 'browser',
  minify: true,
});
if (!build.success) {
  console.error(build.logs);
  process.exit(1);
}

const appJs = await build.outputs[0]!.text();
const html = await Bun.file(new URL('./index.html', root).pathname).text();
const openRouterKey = process.env.OPENROUTER_API_KEY;
const port = Number(process.env.PORT ?? 5173);

Bun.serve({
  port,
  async fetch(request) {
    const path = new URL(request.url).pathname;
    if (path.startsWith('/api/openrouter/')) {
      return proxyOpenRouter(request, openRouterKey);
    }
    if (path === '/app.js') {
      return new Response(appJs, { headers: { 'content-type': 'text/javascript' } });
    }
    return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
  },
});

console.log(`OtterVoice web demo: http://localhost:${port}`);
console.log(`OpenRouter proxy: ${openRouterKey ? 'configured' : 'missing OPENROUTER_API_KEY'}`);
