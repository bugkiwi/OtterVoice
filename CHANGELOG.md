# Changelog

Notable changes to OtterVoice are documented here. Prerelease versions may
still evolve, but compatibility notes call out any required migration.

## 0.2.0-alpha.2 — 2026-07-29

### Added

- One unified `VoiceSessionConfig` centered on a required audio-turn provider;
  caption ASR is optional when `AudioLLMProvider.transcribesInput` is true.
- Input-transcript and encoded-audio-segment callbacks for audio-turn providers,
  allowing native models and server-composed voice stacks to share one client
  lifecycle.
- `createOpenRouterGatewayVoiceTurn` plus the server-side `asr_llm_tts` profile,
  which streams the input transcript, assistant text, and ordered MP3 segments
  from one policy-controlled request.
- `SpeechTextSegmenter` for incrementally turning model deltas into ordered TTS
  clauses.
- `AudioOutputAdapter.onPlaybackRequested` separates a platform playback
  attempt from confirmed audible playback. All built-in runtimes and mocks
  expose the callback.

### Changed

- React Native `onStart` now waits for the first native `playing: true` status
  for both one-shot and PCM playlist output. Web uses the media `playing` event
  for encoded audio and the first scheduled output time for PCM.
- Official Web Audio LLM and Expo examples start caption ASR and Audio LLM
  response generation in parallel with `audioLlmStartTiming: 'after_audio'`.
- The Expo example now uses the same unified backend switch as Web: composite
  voice-turn by default or native Audio LLM with optional caption ASR. App
  backgrounding gracefully finishes and disposes the session.
- React Native capture and playback now cancel stale asynchronous native setup
  after `stop()` and clean one-shot as well as streamed temporary audio files.
- The Web showcase now switches between native GPT Audio, Gemini Live, and a
  server-composed ASR → LLM → TTS path while preserving one Core audio-turn
  contract and server-owned model policy.
- `createMockAudioLLM` now provides a deterministic end-to-end Session mock.

### Compatibility

- Custom React Native `ExpoSound` bridges must forward the native `playing`
  field in `ExpoPlaybackStatus`. `onPlaybackRequested` is optional on the base
  `AudioOutputAdapter`, so existing third-party runtimes remain source-compatible.
- `asr_endpointing` and the unused ASR endpointing capability flags were removed;
  use `volume`, `hybrid`, or `manual` turn detection. Provider segmentation
  remains transcript data and local VAD/manual control owns turn boundaries.
- This prerelease removes the classic Session configuration: `pipeline`,
  `providers.llm`, `providers.tts`, `agent`, opening prompts passed to `start()`,
  and `submitUserText()` are no longer public Session APIs.
- `ProviderRegistry` and its classic three-provider profiles were removed.
  `LLMProvider`, `TTSProvider`, `createOpenRouterLLM()`, and
  `createOpenRouterTTS()` remain available as trusted-backend building blocks
  for a composite `AudioLLMProvider`.

## 0.2.0-alpha.1 — 2026-07-16

### Added

- Turn-level `user_audio_final` and `assistant_audio` events for persistence,
  upload, replay, and audit workflows.
- Structured production-safe errors with failure stage, provider, HTTP status,
  retryability, and `safeMessage` diagnostics.
- Per-turn Audio LLM retry/recovery policy without forcing the whole session to
  end after a recoverable failure.
- `createOtterVoiceSession` as an explicit alias for `createVoiceSession`.
- Server-managed OpenRouter gateway clients plus a policy gateway that locks
  model, system prompt, voice, sampling, token limits, reasoning, and output
  format on the trusted server.
- An Audio LLM-only web example and an audio smoke test.
- Production integration, event ordering, lifecycle, VAD, security, and gateway
  documentation in Chinese and English.

### Changed

- Official browser and React Native examples now use authenticated application
  gateway routes and no longer place privileged provider policy in client code.
- Token broker options now support application headers, session ownership ids,
  cookie credential mode, and safer gateway error classification.
- Direct provider factories remain available for trusted server and CLI use;
  browser/app integrations are guided toward server-managed gateway factories.

### Compatibility

- No existing public factory or configuration field was removed or renamed.
- Existing trusted server/CLI integrations remain source-compatible.
- The two new binary audio events are intentionally in-process only and are not
  added to the JSON protocol envelope; use object storage or a binary side
  channel when forwarding their payloads.

## 0.2.0-alpha.0

- Initial `0.2.0` prerelease of the TypeScript packages.
