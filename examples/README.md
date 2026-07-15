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
  served by Bun (no Vite). Swap in real providers + the token broker to ship.
- **web-audio-llm-only** — the minimal browser path: caption ASR plus one native
  audio-in/audio-out model, with no text LLM or TTS provider.
- **react-native-expo** — a runnable full-duplex Audio LLM app with native PCM
  capture, continuous VAD/barge-in, SSE chunk playback through AudioPlaylist,
  Expo Go QR preview, and EAS simulator/APK build profiles.
- **token-broker** — the backend half of the security model (tech design §17):
  clients fetch short-lived credentials here instead of holding provider secrets.

## Going live

1. Run the token broker with your provider keys in the environment.
2. In a client example, replace the mock/demo providers with real ones pointed
   at `tokenBrokerUrl: '<broker>/api/voice/token'`.
3. Never put provider API keys in client code.
