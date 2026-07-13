const siteRoot = new URL('.', import.meta.url);
const repositoryRoot = new URL('../../', siteRoot);
const webExample = new URL('./examples/web/', repositoryRoot);
const outdir = new URL('./dist/', siteRoot);

await Bun.file(new URL('./app.js.map', outdir)).delete().catch(() => undefined);
await Bun.file(new URL('./opening.mp3', outdir)).delete().catch(() => undefined);

const result = await Bun.build({
  entrypoints: [new URL('./src/main.ts', webExample).pathname],
  outdir: outdir.pathname,
  naming: 'app.js',
  target: 'browser',
  minify: true,
  conditions: ['import', 'browser'],
});

if (!result.success) {
  console.error(result.logs);
  process.exit(1);
}

await Bun.write(new URL('./index.html', outdir), Bun.file(new URL('./index.html', webExample)));

console.log(`Built OtterVoice docs site: ${outdir.pathname}`);
