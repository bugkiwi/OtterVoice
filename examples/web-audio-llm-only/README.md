# Web Audio LLM-only example

The smallest runnable browser integration with native audio-in/audio-out:

- OpenRouter ASR is used only for the user's caption.
- GPT Audio Mini generates assistant text and audio directly.
- No text LLM or TTS provider is configured.
- The same-origin server caps request size, validates `Origin`, and overwrites
  both model ids before forwarding. The provider key never reaches the browser.
- Complete user/assistant audio events are ready for an authenticated upload
  handler; this example only logs their metadata.

```bash
OPENROUTER_API_KEY=... bun run examples/web-audio-llm-only/server.ts
# open http://localhost:5174
```

This is intentionally small. Use the full [`examples/web`](../web) showcase for
rolling partial captions, acoustic diagnostics, a cascade fallback, and richer UI.
