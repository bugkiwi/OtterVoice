import { cp, mkdir, rm } from 'node:fs/promises';

const siteRoot = new URL('.', import.meta.url);
const repositoryRoot = new URL('../../', siteRoot);
const webExample = new URL('./examples/web/', repositoryRoot);
const outdir = new URL('./dist/', siteRoot);
const docsBuild = new URL('./dist-docs/', siteRoot);
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

await Bun.write(new URL('./index.html', outdir), Bun.file(new URL('./index.html', webExample)));

const assetOutdir = new URL('./assets/', outdir);
const brandAssetRoot = new URL('./assets/brand/', repositoryRoot);
const brandAssets = [
  'ottervoice-icon.webp',
  'ottervoice-icon-64.png',
  'ottervoice-icon-180.png',
  'ottervoice-icon-512.png',
  'ottervoice-android-latest.svg',
];
await mkdir(assetOutdir, { recursive: true });
await Promise.all(
  brandAssets.map((asset) =>
    Bun.write(new URL(asset, assetOutdir), Bun.file(new URL(asset, brandAssetRoot))),
  ),
);

const api = Bun.spawn({
  cmd: ['bun', 'run', 'build:api'],
  cwd: siteRoot.pathname,
  stdout: 'inherit',
  stderr: 'inherit',
});
if ((await api.exited) !== 0) process.exit(1);

const docs = Bun.spawn({
  cmd: ['bun', 'run', 'build:docs'],
  cwd: siteRoot.pathname,
  stdout: 'inherit',
  stderr: 'inherit',
});
if ((await docs.exited) !== 0) process.exit(1);

await rm(docsOutdir, { recursive: true, force: true });
await mkdir(docsOutdir, { recursive: true });
await cp(docsBuild, docsOutdir, { recursive: true });

console.log(`Built OtterVoice site: ${outdir.pathname}`);
console.log(`Docs: ${docsOutdir.pathname}`);
