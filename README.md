<p align="center">
  <img src="assets/brand/ottervoice-icon.webp" width="180" alt="OtterVoice pixel otter mascot" />
</p>

<h1 align="center">OtterVoice</h1>

<p align="center"><strong>TypeScript-first real-time voice SDK for Web, React Native / Expo, and Node.js.</strong></p>

OtterVoice 提供统一 audio-turn Provider 的实时语音会话内核，支持流式字幕、静音断句和自然打断。后端既可以使用原生语音模型，也可以组合 ASR、LLM 与 TTS，而客户端始终保持同一套 Session API。

## Features

- Half-duplex, full-duplex, push-to-talk, and transcript-only modes
- Incremental `asr_partial` and `assistant_text_delta` events
- Barge-in, playback-echo filtering, and false-interruption recovery
- One audio-turn contract with native and server-composed backends
- Web, Expo, and Node runtime adapters
- Optional caption ASR plus replaceable audio-turn providers
- Normalized errors, usage metering, and deterministic mocks

## Quick start

```bash
bun add @ottervoice/core
# or: npm install @ottervoice/core
```

```ts
import {
  createMockAudioLLM,
  createMockRuntime,
  createVoiceSession,
} from '@ottervoice/core';

const runtime = createMockRuntime();
const session = createVoiceSession({
  mode: 'half_duplex',
  runtime,
  providers: {
    audioLlm: createMockAudioLLM({
      inputTranscripts: ['Hello Otter'],
      reply: () => 'Hello! How can I help?',
    }),
  },
});

session.on('asr_final', ({ text }) => console.log('user:', text));
session.on('assistant_text_delta', ({ text }) => console.log('assistant:', text));

await session.start();
runtime.audioInput.emitChunk({
  data: new ArrayBuffer(8),
  timestamp: Date.now(),
  durationMs: 800,
});
await session.endUserTurn();
```

## Run the examples

```bash
bun install

# Mocked Node example
bun run demo

# Browser example
cd examples/web
bun run start

# Expo example
cd examples/react-native-expo
bun run start
```

## Packages

| Package | Purpose |
| --- | --- |
| `@ottervoice/core` | Unified audio-turn Session, events, state machine, mocks |
| `@ottervoice/runtime-web` | Browser capture, VAD, and playback |
| `@ottervoice/runtime-react-native` | Expo PCM capture and streaming playback |
| `@ottervoice/runtime-node` | Node audio and network runtime |
| `@ottervoice/provider-*` | Replaceable provider adapters |
| `@ottervoice/protocol` | Cross-process JSON event protocol |

## Documentation

Engineering docs (Astro Starlight, zh-CN + English) and TypeDoc API reference:

**[ottervoice.vercel.app/docs/](https://ottervoice.vercel.app/docs/)**

| Section | Contents |
| --- | --- |
| Quick start | Mock → Web / Expo / Node / token-broker, mapped to `examples/*` |
| Packages | What to install and why |
| Guides | Architecture, events, latency, security |
| API reference | Generated from package JSDoc |

When changing public exports, follow [`AGENTS.md`](./AGENTS.md) (JSDoc required).

## Development

```bash
bun run typecheck
bun test
bun run build
bun run build:site
```

MIT © OtterVoice contributors
