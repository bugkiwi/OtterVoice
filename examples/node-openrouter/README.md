# Node + composite OpenRouter audio turn

Same mock mic/speakers as `node-cli`, but the single `AudioLLMProvider` can
compose a live OpenRouter text model with scripted transcription and mock TTS.
Without a key it falls back to a fully mocked audio-turn provider (CI-friendly).

## Run

```bash
# mock LLM (no key)
bun run examples/node-openrouter/index.ts

# live LLM
OPENROUTER_API_KEY=sk-... bun run examples/node-openrouter/index.ts

# optional model override
OPENROUTER_MODEL=google/gemini-2.5-flash-lite OPENROUTER_API_KEY=sk-... \
  bun run examples/node-openrouter/index.ts
```

## Notes

- Runtime is still `createMockRuntime` (headless CLI). Both the composed and
  mocked branches expose the same `providers.audioLlm` Session contract.
- Use `@ottervoice/runtime-node` when you need real byte streams or injected `fetch` / `WebSocket`.
- Never ship long-lived keys in browser or app clients — use the [token broker](../token-broker) pattern.

Docs: [Node quick start](https://ottervoice.vercel.app/docs/getting-started/node/)
