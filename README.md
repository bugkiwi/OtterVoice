# OtterVoice 🦦

A TypeScript-first, platform-agnostic SDK for **real-time voice conversation** —
half-duplex, push-to-talk, or full-duplex with barge-in.

OtterVoice gives you a clean, well-tested core for building voice-AI experiences
(voice assistants, spoken practice, companions, task dialogs) without wiring ASR,
LLM and TTS providers into every app by hand. The core is pure TypeScript: bring
your own runtime (Web / React Native / Node) and your own providers.

```txt
OtterVoice
  = Audio Capture (runtime adapter)
  + ASR / LLM / TTS / Pronunciation providers
  + Voice Session state machine
  + Provider router
  + Usage metering & normalized errors
```

- **Provider-agnostic** — ASR, LLM, TTS and pronunciation are interfaces. Swap
  ElevenLabs, Deepgram, OpenRouter, Azure, etc. without touching app logic.
- **Runtime-agnostic** — the core never touches the DOM, Node `fs`, or native
  audio. Platform capabilities are injected via a `RuntimeAdapter`.
- **Explicit conversation modes** — a deterministic state machine drives
  half-duplex, full-duplex barge-in, and manual push-to-talk turn-taking.
- **Secure by default** — clients never hold provider secrets; providers talk to
  a token broker on your backend.
- **100% test coverage** on the core, with built-in mocks so you can develop and
  test the whole loop with zero API keys.

## Status

All packages below are implemented and ship with **100% line + function test
coverage** (enforced in CI). Vendor providers talk to raw HTTP/WebSocket APIs
with injectable `fetch`/`WebSocket`, so they are fully unit-testable; their live
wire formats should still be validated with opt-in contract tests before
production use.

| Package | Role |
| --- | --- |
| `@ottervoice/core` | Session, state machine, router, events, mocks |
| `@ottervoice/protocol` | JSON wire protocol for native/cross-process clients |
| `@ottervoice/provider-utils` | Token broker, HTTP errors, SSE & WebSocket-ASR helpers |
| `@ottervoice/provider-openrouter` | LLM + speech-to-text + text-to-speech |
| `@ottervoice/provider-elevenlabs` | Streaming ASR (WebSocket) |
| `@ottervoice/provider-deepgram` | Streaming ASR (WebSocket) |
| `@ottervoice/provider-azure-speech` | TTS (REST + SSML) |
| `@ottervoice/runtime-web` | getUserMedia + MediaRecorder + Web Audio VAD + HTMLAudio |
| `@ottervoice/runtime-node` | fetch/WebSocket + stream audio I/O |
| `@ottervoice/runtime-react-native` | Expo native PCM capture + gapless chunk playback |

## Install

```bash
bun add @ottervoice/core
# or: npm i @ottervoice/core
```

## Quick start (fully mocked, no API keys)

```ts
import {
  createVoiceSession,
  createMockRuntime,
  createMockASR,
  createMockLLM,
  createMockTTS,
} from '@ottervoice/core';

const runtime = createMockRuntime();

const session = createVoiceSession({
  mode: 'half_duplex',
  runtime,
  providers: {
    asr: createMockASR({ transcripts: ['I work as a software engineer.'] }),
    llm: createMockLLM({ reply: (i) => `Tell me more about: ${i.messages.at(-1)?.content}` }),
    tts: createMockTTS(),
  },
});

session.on('statechange', (e) => console.log(e.from, '->', e.to));
session.on('asr_final', (e) => console.log('user:', e.text));
session.on('assistant_text', (e) => console.log('assistant:', e.text));

await session.start('Good morning! Tell me about your work.');

// Feed audio from your runtime; here we simulate one chunk.
runtime.audioInput.emitChunk({ data: new ArrayBuffer(8), timestamp: Date.now(), durationMs: 1200 });
```

Run the end-to-end Node demo:

```bash
bun run demo
```

## Using real providers

In a real app you supply a runtime adapter for your platform and providers that
talk to a **token broker** on your backend (so secrets never reach the client):

```ts
const session = createVoiceSession({
  mode: 'half_duplex',
  runtime: createWebRuntime(),            // from @ottervoice/runtime-web (roadmap)
  providers: {
    asr: createElevenLabsASR({ tokenBrokerUrl: '/api/voice/token' }),
    llm: createOpenRouterLLM({ tokenBrokerUrl: '/api/voice/token', model: 'google/gemini-2.5-flash-lite' }),
    tts: createAzureTTS({ tokenBrokerUrl: '/api/voice/token', voice: 'en-US-JennyNeural' }),
  },
  policy: { silenceTimeoutMs: 1200, autoStartListening: true },
});
```

Your backend implements `POST /api/voice/token`, returning a short-lived
`{ url, token, expiresAt }`. See [docs](docs/universal-voice-ai-sdk-tech-design.md) §17.

## Architecture

```txt
Business Apps
     ↓
@ottervoice/core   ← VoiceSession · state machine · provider router · events
     ↓                 ↓                 ↓
Runtime Adapter   Provider Adapter   Agent Plugin
Web / RN / Node   ASR / LLM / TTS    persona / flow / scoring
```

The core is documented in detail in
[docs/universal-voice-ai-sdk-tech-design.md](docs/universal-voice-ai-sdk-tech-design.md).

## Monorepo layout

```txt
packages/
  core/                      @ottervoice/core
  protocol/                  @ottervoice/protocol
  provider-utils/            shared HTTP/SSE/WebSocket/token-broker helpers
  provider-openrouter/       LLM + ASR + TTS through OpenRouter
  provider-elevenlabs/       ASR
  provider-deepgram/         ASR
  provider-azure-speech/     TTS
  runtime-web/               browser runtime
  runtime-node/              Node runtime
  runtime-react-native/      Expo runtime
examples/
  node-cli/                  end-to-end mocked demo
  web/                       full-duplex browser Audio LLM demo
  react-native-expo/         full-duplex Expo Audio LLM demo
docs/                        technical design
```

Under Bun, packages resolve to TypeScript source via a `bun` export condition,
so tests and the demo run without a build step; published Node consumers get
the compiled `dist`.

## Development

```bash
bun install
bun test            # run tests + enforce 100% coverage gate (bunfig.toml)
bun run typecheck   # tsc project references
bun run build       # build @ottervoice/core to dist (ESM + d.ts)
bun run demo        # run the node-cli demo
```

## Deploying the showcase through GitHub

The production showcase is deployed by Vercel's GitHub integration. Configure
the Vercel project once with:

- Git repository: this repository
- Root Directory: `docs/site`
- Production Branch: `main`
- Environment variable: `OPENROUTER_API_KEY`

Then commit changes locally and run:

```bash
bun run deploy:git
```

The command requires a clean `main` worktree, runs typechecking, tests, the SDK
build, and the site build, then pushes the exact commit to `origin/main`. The
GitHub push triggers Vercel; the script itself does not call the Vercel CLI or
require a Vercel token. To validate everything without pushing, use
`bun run deploy:git -- --dry-run`.

## Roadmap

- [x] `@ottervoice/core` — session, state machine, router, mocks
- [x] `@ottervoice/protocol` — JSON event schema for native (Swift/Kotlin) clients
- [x] `@ottervoice/provider-utils` — token broker, HTTP/SSE/WebSocket helpers
- [x] `@ottervoice/provider-openrouter` — LLM, ASR and TTS over OpenRouter HTTP
- [x] `@ottervoice/provider-elevenlabs` — streaming ASR
- [x] `@ottervoice/provider-deepgram` — streaming ASR
- [x] `@ottervoice/provider-azure-speech` — TTS (REST + SSML)
- [x] `@ottervoice/runtime-web` — getUserMedia + MediaRecorder + HTMLAudio
- [x] `@ottervoice/runtime-node` — fetch/WebSocket + stream audio I/O
- [x] `@ottervoice/runtime-react-native` — continuous Expo PCM capture + AudioPlaylist playback

The Web and Expo showcases now share the Audio LLM pipeline, concurrent caption
ASR, interruption policy and streaming PCM playback. Next: Azure pronunciation
assessment, ElevenLabs TTS, and opt-in provider contract tests.

## License

MIT © OtterVoice contributors
