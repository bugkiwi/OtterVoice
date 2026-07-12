/**
 * Bundles the demo with Bun and serves it — no Vite/webpack needed.
 *
 *   bun run examples/web/serve.ts   →   http://localhost:5173
 */
const root = new URL('.', import.meta.url);

const build = await Bun.build({
  entrypoints: [new URL('./src/main.ts', root).pathname],
  target: 'browser',
  minify: false,
});
if (!build.success) {
  console.error(build.logs);
  process.exit(1);
}
const appJs = await build.outputs[0]!.text();
const html = await Bun.file(new URL('./index.html', root).pathname).text();

const port = Number(process.env.PORT ?? 5173);
Bun.serve({
  port,
  fetch(req) {
    const path = new URL(req.url).pathname;
    if (path === '/app.js') {
      return new Response(appJs, { headers: { 'content-type': 'text/javascript' } });
    }
    return new Response(html, { headers: { 'content-type': 'text/html' } });
  },
});

console.log(`OtterVoice web demo: http://localhost:${port}`);
