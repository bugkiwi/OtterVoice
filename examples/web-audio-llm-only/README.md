# Web Audio LLM-only example

The smallest runnable browser integration with native audio-in/audio-out:

- OpenRouter ASR is used only for the user's caption.
- GPT Audio Mini generates assistant text and audio directly.
- Caption ASR and the Audio LLM request run in parallel after each turn's audio
  is finalized, reducing time to the first assistant audio.
- No text LLM or TTS provider is configured.
- The browser uses server-managed provider factories and sends no model,
  system prompt, voice, temperature, or token-limit fields.
- The same-origin server authorizes the route, caps request/history/text sizes,
  validates `Origin`, and reconstructs the upstream request from locked policy.
  The provider key never reaches the browser.
- Complete user/assistant audio events are ready for an authenticated upload
  handler; this example only logs their metadata.

```bash
OPENROUTER_API_KEY=... bun run examples/web-audio-llm-only/server.ts
# open http://localhost:5174
```

This is intentionally small. Use the full [`examples/web`](../web) showcase for
rolling partial captions, acoustic diagnostics, a selectable cascade mode, and richer UI.

The example sets `audioLlmStartTiming: 'after_audio'`. In production, keep
per-user/session budgets and idempotency at the gateway because a superseded
natural pause may already have started a paid Audio LLM request.
