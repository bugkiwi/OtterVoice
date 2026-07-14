# OtterVoice 🦦

TypeScript-first real-time voice SDK for Web, React Native / Expo, and Node.js.

OtterVoice 提供可替换 Provider 的实时语音会话内核，支持 ASR、LLM、TTS / Audio LLM、流式字幕、静音断句和自然打断。应用可以独立选择运行时与模型服务，不需要把业务 UI 绑定到某一家 Provider。

## Features

- Half-duplex, full-duplex, push-to-talk, and transcript-only modes
- Incremental `asr_partial` and `assistant_text_delta` events
- Barge-in, playback-echo filtering, and false-interruption recovery
- Classic `ASR → LLM → TTS` and native Audio LLM pipelines
- Web, Expo, and Node runtime adapters
- Replaceable ASR / LLM / TTS providers
- Normalized errors, usage metering, and deterministic mocks

## Quick start

```bash
bun add @ottervoice/core
# or: npm install @ottervoice/core
```

```ts
import {
  createMockASR,
  createMockLLM,
  createMockRuntime,
  createMockTTS,
  createVoiceSession,
} from '@ottervoice/core';

const runtime = createMockRuntime();
const session = createVoiceSession({
  mode: 'half_duplex',
  runtime,
  providers: {
    asr: createMockASR({ transcripts: ['Hello Otter'] }),
    llm: createMockLLM({ reply: () => 'Hello! How can I help?' }),
    tts: createMockTTS(),
  },
});

session.on('asr_partial', ({ text }) => console.log('user:', text));
session.on('assistant_text_delta', ({ text }) => console.log('assistant:', text));

await session.start();
runtime.audioInput.emitChunk({
  data: new ArrayBuffer(8),
  timestamp: Date.now(),
  durationMs: 800,
});
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
| `@ottervoice/core` | Session, events, state machine, routing, mocks |
| `@ottervoice/runtime-web` | Browser capture, VAD, and playback |
| `@ottervoice/runtime-react-native` | Expo PCM capture and streaming playback |
| `@ottervoice/runtime-node` | Node audio and network runtime |
| `@ottervoice/provider-*` | Replaceable provider adapters |
| `@ottervoice/protocol` | Cross-process JSON event protocol |

## Documentation

Read the bilingual engineering guide on the website:

**[ottervoice.vercel.app/docs/](https://ottervoice.vercel.app/docs/)**

## Development

```bash
bun run typecheck
bun test
bun run build
bun run build:site
```

MIT © OtterVoice contributors
