# @ottervoice/core

Platform-agnostic core for [OtterVoice](https://github.com/gkiwi/OtterVoice) —
a TypeScript-first SDK for real-time voice conversation, including full-duplex
barge-in.

This package contains **no DOM, Node or native dependencies**. It provides the
session state machine, typed events, provider router, transcript buffer, turn
detector, usage meter, a normalized error model, and built-in mock providers /
runtime for testing.

```bash
bun add @ottervoice/core
```

## What's inside

| Export | Purpose |
| --- | --- |
| `createVoiceSession` / `VoiceSession` | Conversation loop and full-duplex interruption policy. |
| `StateMachine`, `canTransition`, `isTerminal` | Session state transitions. |
| `TypedEmitter` | Strongly-typed, unsubscribe-returning event emitter. |
| `TranscriptBuffer` | Ordered turns → LLM message projection. |
| `TurnDetector` | Rule-based VAD / endpointing from volume samples. |
| `UsageMeter` | Per-session usage snapshot (you bill; it measures). |
| `ProviderRegistry`, `providerProfiles`, `resolveProfile` | Provider routing. |
| `createVoiceError`, `normalizeError`, `VoiceError` | Unified error model. |
| `createMockASR/LLM/TTS/Pronunciation`, `createMockRuntime` | Test doubles. |

## Provider & runtime contracts

Implement these interfaces to plug in real services / platforms:

- **`ASRProvider`** — `createSession()` → streaming partial/final transcripts.
- **`LLMProvider`** — `generate()` (and optional `stream()`).
- **`AudioLLMProvider`** — one model consumes a completed audio turn and returns
  assistant transcript + audio; set `pipeline: 'audio_llm'`. Caption ASR runs
  in parallel and does not feed the model.
- **`TTSProvider`** — `synthesize()` → audio buffer or URL.
- **`PronunciationProvider`** — `assess()` → scores.
- **`RuntimeAdapter`** — `audioInput`, `audioOutput`, optional `network` /
  `storage` / `logger`.

Every error raised by an adapter should be a `NormalizedVoiceError` (use
`createVoiceError`), so consumers handle one shape regardless of provider.

## Session events

`statechange`, `asr_partial`, `asr_final`, `user_audio_end`, `assistant_text`,
`assistant_audio_start`, `assistant_audio_end`, `turn`, `usage`, `finished`,
`error`. Subscribe with `session.on(event, cb)`; the returned function
unsubscribes.

## Example

See the [root README](../../README.md#quick-start-fully-mocked-no-api-keys) for a
runnable, fully-mocked quick start, and `examples/node-cli` for an end-to-end
demo.

## License

MIT
