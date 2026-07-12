# Web example

Real browser microphone capture and playback via `@ottervoice/runtime-web`,
with mocked cognition so it runs without API keys.

```bash
bun run examples/web/serve.ts
# open http://localhost:5173
```

`serve.ts` bundles `src/main.ts` with Bun's bundler and serves it — no Vite or
webpack. Click **Start** (allow the microphone), speak, then **Done speaking**
to end each turn.

To go live, swap the demo providers in `src/main.ts` for real ones pointed at a
[token broker](../token-broker) — see the comment block at the top of that file.
