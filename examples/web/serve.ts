/**
 * Bundles and serves the demo locally — no Vite/webpack needed.
 *
 *   bun run examples/web/serve.ts   →   http://localhost:5173
 *
 * Local bundling always resolves @ottervoice packages from packages/.../src via
 * the development export condition — never stale dist artifacts.
 */
import { proxyOpenRouter } from './openrouter-proxy';

const root = new URL('.', import.meta.url);
const staticRoot = new URL('./dist/', root);
const staticTypes: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
};

async function serveStatic(pathname: string): Promise<Response | undefined> {
  if (pathname === '/' || pathname === '') return undefined;
  const relative = pathname.replace(/^\//, '');
  if (!relative || relative.includes('..')) return undefined;
  const file = Bun.file(new URL(relative, staticRoot));
  if (!(await file.exists())) return undefined;
  const extension = relative.includes('.') ? relative.slice(relative.lastIndexOf('.')) : '';
  const contentType = staticTypes[extension] ?? file.type;
  return new Response(file, {
    headers: contentType ? { 'content-type': contentType } : undefined,
  });
}

const repositoryRoot = new URL('../../', root);
const workspaceSrcAliases: Record<string, string> = {
  '@ottervoice/core': new URL('../core/src/index.ts', repositoryRoot).pathname,
  '@ottervoice/provider-utils': new URL('../provider-utils/src/index.ts', repositoryRoot).pathname,
  '@ottervoice/provider-openrouter': new URL('../provider-openrouter/src/index.ts', repositoryRoot).pathname,
  '@ottervoice/runtime-web': new URL('../runtime-web/src/index.ts', repositoryRoot).pathname,
};

const build = await Bun.build({
  entrypoints: [new URL('./src/main.ts', root).pathname],
  target: 'browser',
  minify: true,
  conditions: ['development', 'browser'],
  alias: workspaceSrcAliases,
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
      return new Response(appJs, {
        headers: {
          'content-type': 'text/javascript',
          'cache-control': 'no-store',
        },
      });
    }
    const staticFile = await serveStatic(path);
    if (staticFile) return staticFile;
    if (path === '/') {
      return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
    }
    return new Response('Not Found', { status: 404 });
  },
});

console.log(`OtterVoice web demo: http://localhost:${port}`);
console.log(`OpenRouter proxy: ${openRouterKey ? 'configured' : 'missing OPENROUTER_API_KEY'}`);
console.log('Bundled from packages/*/src (development aliases, no dist cache).');
