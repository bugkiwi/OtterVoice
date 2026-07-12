# OtterVoice examples

One example per platform / integration. All run with **Bun** and the workspace
packages; none need API keys to start (cognition falls back to mocks).

| Example | Platform | Run |
| --- | --- | --- |
| [`node-cli`](node-cli) | Node | `bun run examples/node-cli/index.ts` |
| [`node-openrouter`](node-openrouter) | Node + real LLM | `bun run examples/node-openrouter/index.ts` |
| [`web`](web) | Browser | `bun run examples/web/serve.ts` → http://localhost:5173 |
| [`react-native-expo`](react-native-expo) | Expo | copy into an Expo app (illustrative) |
| [`token-broker`](token-broker) | Backend | `bun run examples/token-broker/server.ts` |

## What each shows

- **node-cli** — the half-duplex loop end-to-end with fully mocked providers and
  the in-memory runtime. The smallest possible "hello world".
- **node-openrouter** — a real LLM (`@ottervoice/provider-openrouter`) on the
  in-memory runtime; set `OPENROUTER_API_KEY` to go live, otherwise it uses a mock.
- **web** — real browser microphone capture + playback via
  `@ottervoice/runtime-web` (getUserMedia + MediaRecorder + HTMLAudio), bundled
  and served by Bun (no Vite). Swap in real providers + the token broker to ship.
- **react-native-expo** — adapters bridging `expo-av` / `expo-file-system` to
  `@ottervoice/runtime-react-native`, plus a sample screen. Illustrative: drop it
  into a real Expo project.
- **token-broker** — the backend half of the security model (tech design §17):
  clients fetch short-lived credentials here instead of holding provider secrets.

## Going live

1. Run the token broker with your provider keys in the environment.
2. In a client example, replace the mock/demo providers with real ones pointed
   at `tokenBrokerUrl: '<broker>/api/voice/token'`.
3. Never put provider API keys in client code.
