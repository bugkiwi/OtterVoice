import { mkdir } from 'node:fs/promises';

const siteRoot = new URL('.', import.meta.url);
const repositoryRoot = new URL('../../', siteRoot);
const webExample = new URL('./examples/web/', repositoryRoot);
const outdir = new URL('./dist/', siteRoot);
const docsOutdir = new URL('./dist/docs/', siteRoot);

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

const docsResult = await Bun.build({
  entrypoints: [new URL('./docs.ts', siteRoot).pathname],
  outdir: docsOutdir.pathname,
  naming: 'app.js',
  target: 'browser',
  minify: true,
});

if (!docsResult.success) {
  console.error(docsResult.logs);
  process.exit(1);
}

await Bun.write(new URL('./index.html', outdir), Bun.file(new URL('./index.html', webExample)));
await Bun.write(new URL('./index.html', docsOutdir), Bun.file(new URL('./docs.html', siteRoot)));

const assetOutdir = new URL('./assets/', outdir);
const brandAssetRoot = new URL('./assets/brand/', repositoryRoot);
const brandAssets = [
  'ottervoice-icon.webp',
  'ottervoice-icon-64.png',
  'ottervoice-icon-180.png',
  'ottervoice-icon-512.png',
];
await mkdir(assetOutdir, { recursive: true });
await Promise.all(brandAssets.map((asset) => (
  Bun.write(new URL(asset, assetOutdir), Bun.file(new URL(asset, brandAssetRoot)))
)));

console.log(`Built OtterVoice docs site: ${outdir.pathname}`);
