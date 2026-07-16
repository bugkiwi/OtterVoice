<p align="center">
  <img src="../assets/brand/ottervoice-icon.webp" width="120" alt="OtterVoice pixel otter mascot" />
</p>

# OtterVoice examples

One example per platform / integration. All run with **Bun** and the workspace
packages; none need API keys to start (cognition falls back to mocks).

| Example | Platform | Run |
| --- | --- | --- |
| [`node-cli`](node-cli) | Node | `bun run examples/node-cli/index.ts` |
| [`node-openrouter`](node-openrouter) | Node + real LLM | `bun run examples/node-openrouter/index.ts` |
| [`web`](web) | Browser | `bun run examples/web/serve.ts` → http://localhost:5173 |
| [`web-audio-llm-only`](web-audio-llm-only) | Browser, native Audio LLM | `bun run examples/web-audio-llm-only/server.ts` → http://localhost:5174 |
| [`react-native-expo`](react-native-expo) | Expo SDK 57 | `cd examples/react-native-expo && bun run start` |
| [`token-broker`](token-broker) | Backend | `bun run examples/token-broker/server.ts` |

## What each shows

- **node-cli** — the half-duplex loop end-to-end with fully mocked providers and
  the in-memory runtime. The smallest possible "hello world".
- **node-openrouter** — a real LLM (`@ottervoice/provider-openrouter`) on the
  in-memory runtime; set `OPENROUTER_API_KEY` to go live, otherwise it uses a mock.
- **web** — full-duplex browser conversation with automatic volume endpointing,
  a live input meter, and barge-in via `@ottervoice/runtime-web`; bundled and
  served by Bun (no Vite). A policy gateway owns prompts, models, voices, and
  spend controls; the browser sends only user content and transport data.
- **web-audio-llm-only** — the minimal browser path: caption ASR plus one native
  audio-in/audio-out model, with no text LLM or TTS provider.
- **react-native-expo** — a runnable full-duplex Audio LLM app with native PCM
  capture, continuous VAD/barge-in, SSE chunk playback through AudioPlaylist,
  Expo Go QR preview, and EAS simulator/APK build profiles.
- **token-broker** — an opt-in direct-provider pattern: clients fetch short-lived
  credentials instead of holding provider secrets. It is not a substitute for
  policy enforcement when a token cannot lock route/model/budget.

## Going live

1. For request/response LLM, Audio LLM, ASR, and TTS APIs, deploy a policy
   gateway with provider keys and business policy in server-only environment variables.
2. Use a token broker only for providers that can issue genuinely short-lived,
   route/model/budget-scoped credentials (commonly direct WebSocket ASR).
3. Never put provider keys, system prompts, unrestricted model ids, or spend
   controls in client code.
