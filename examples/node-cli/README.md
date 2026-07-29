# Node CLI (mocks)

Half-duplex voice session with one **mock audio-turn provider** and
`createMockRuntime`. No microphone, network, or API keys.

## Run

```bash
# from repo root
bun run demo
# or
bun run examples/node-cli/index.ts
```

## What it shows

- Same `createVoiceSession` path a real app uses
- Scripted audio turns → input transcripts, assistant text, and mock audio
- Event logging (`statechange`, transcripts, usage)

Docs: [Mocks quick start](https://ottervoice.vercel.app/docs/getting-started/mocks/) · [Getting started overview](https://ottervoice.vercel.app/docs/getting-started/)
