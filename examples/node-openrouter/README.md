# Node + OpenRouter LLM

Same mock mic/speakers as `node-cli`, but the **LLM can be live** via OpenRouter when `OPENROUTER_API_KEY` is set. Without a key it falls back to a mock LLM (CI-friendly).

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

- Runtime is still `createMockRuntime` (headless CLI). Use `@ottervoice/runtime-node` when you need real byte streams or injected `fetch` / `WebSocket`.
- Never ship long-lived keys in browser or app clients — use the [token broker](../token-broker) pattern.

Docs: [Node quick start](https://ottervoice.vercel.app/docs/getting-started/node/)
