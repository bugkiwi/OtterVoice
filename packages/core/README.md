<p align="center">
  <img src="https://raw.githubusercontent.com/bugkiwi/OtterVoice/main/assets/brand/ottervoice-icon.webp" width="96" alt="OtterVoice pixel otter mascot" />
</p>

# @ottervoice/core

Platform-agnostic core for [OtterVoice](https://github.com/bugkiwi/OtterVoice) —
a TypeScript-first SDK for real-time voice conversation, including full-duplex
barge-in.

This package contains **no DOM, Node or native dependencies**. It provides the
session state machine, typed events, transcript buffer, turn
detector, usage meter, a normalized error model, and built-in mock providers /
runtime for testing.

```bash
bun add @ottervoice/core
```

## What's inside

| Export | Purpose |
| --- | --- |
| `createVoiceSession` / `createOtterVoiceSession` / `VoiceSession` | Unified audio-turn loop and interruption policy. |
| `StateMachine`, `canTransition`, `isTerminal` | Session state transitions. |
| `TypedEmitter` | Strongly-typed, unsubscribe-returning event emitter. |
| `TranscriptBuffer` | Ordered turns → LLM message projection. |
| `TurnDetector` | Deterministic local VAD from volume samples. |
| `UsageMeter` | Per-session usage snapshot (you bill; it measures). |
| `createVoiceError`, `normalizeError`, `VoiceError` | Unified error model. |
| `createMockAudioLLM/ASR/LLM/TTS/Pronunciation`, `createMockRuntime` | Session mocks plus trusted-backend building blocks. |

## Provider & runtime contracts

Implement these interfaces to plug in real services / platforms:

- **`ASRProvider`** — optional captioning via streaming partial/final transcripts.
- **`AudioLLMProvider`** — one provider consumes a completed audio turn and
  returns assistant text + audio. It may be a native model or a server-composed
  voice stack. Set `transcribesInput: true` when it also supplies the
  authoritative user transcript; otherwise configure caption ASR in parallel.
- **`LLMProvider` / `TTSProvider`** — low-level contracts for trusted servers
  implementing a composite `AudioLLMProvider`; they are not Session slots.
- **`PronunciationProvider`** — `assess()` → scores.
- **`RuntimeAdapter`** — `audioInput`, `audioOutput`, optional `network` /
  `storage` / `logger`.

Every error raised by an adapter should be a `NormalizedVoiceError` (use
`createVoiceError`), so consumers handle one shape regardless of provider.

Set `VoiceSessionConfig.asrPartial` to `false` when provisional captions are not
needed. Core passes that preference to the ASR session while preserving
`asr_final`. For batch-backed rolling ASR, providers may implement
`ASRSession.setInterimResultsEnabled()`; volume-based sessions use it to defer
paid partial work until VAD confirms speech.

Use `turnDetection.strategy: 'volume'` for local RMS-based turn boundaries, or
`'hybrid'` when ASR partial text should also confirm quiet speech before the
same local silence timer closes the turn. Use `'manual'` for push-to-talk.

## Session events

`statechange`, `asr_partial`, `asr_final`, `user_audio_end`,
`user_audio_final`, `assistant_text_delta`, `assistant_text`, `assistant_audio`,
`assistant_audio_start`, `assistant_audio_end`, `turn`, `usage`, `finished`, `error`. Subscribe with
`session.on(event, cb)`; the returned function unsubscribes.

## Example

See the [root README](../../README.md#quick-start) for a
runnable, fully-mocked quick start, and `examples/node-cli` for an end-to-end
demo.

## License

MIT
