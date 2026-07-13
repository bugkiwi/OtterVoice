const siteRoot = new URL('.', import.meta.url);
const repositoryRoot = new URL('../../', siteRoot);
const webExample = new URL('./examples/web/', repositoryRoot);
const outdir = new URL('./dist/', siteRoot);
const openingMessage = '你好，我是 Otter。现在可以直接跟我说话，想打断时开口就行。';

await Bun.file(new URL('./app.js.map', outdir)).delete().catch(() => undefined);

const result = await Bun.build({
  entrypoints: [new URL('./src/main.ts', webExample).pathname],
  outdir: outdir.pathname,
  naming: 'app.js',
  target: 'browser',
  minify: true,
});

if (!result.success) {
  console.error(result.logs);
  process.exit(1);
}

await Bun.write(new URL('./index.html', outdir), Bun.file(new URL('./index.html', webExample)));

if (process.env.OPENROUTER_API_KEY) {
  try {
    const speech = await fetch('https://openrouter.ai/api/v1/audio/speech', {
      method: 'POST',
      signal: AbortSignal.timeout(8_000),
      headers: {
        authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'content-type': 'application/json',
        'x-title': 'OtterVoice Docs Build',
      },
      body: JSON.stringify({
        model: 'hexgrad/kokoro-82m',
        input: openingMessage,
        voice: 'zf_xiaoxiao',
        response_format: 'mp3',
        speed: 1.05,
      }),
    });
    if (speech.ok) await Bun.write(new URL('./opening.mp3', outdir), speech);
    else console.warn(`Opening speech prebuild skipped: OpenRouter returned ${speech.status}`);
  } catch (error) {
    console.warn('Opening speech prebuild skipped:', error);
  }
}

console.log(`Built OtterVoice docs site: ${outdir.pathname}`);
