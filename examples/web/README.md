<p align="center">
  <img src="../../assets/brand/ottervoice-icon.webp" width="112" alt="OtterVoice pixel otter mascot" />
</p>

# Web example

Full-duplex browser demo with real microphone capture/playback and two live
pipelines that can be switched in the UI. The demo server currently selects
OpenRouter adapters, while the session and UI remain provider-independent:

- **Audio LLM (default):** Qwen ASR streams provisional captions and confirms
  one final turn; only then does `openai/gpt-audio-mini` receive the recorded
  audio and generate speech directly.
- **Cascade (retained):** Qwen ASR → DeepSeek V4 Flash → Kokoro 82M.

```bash
echo 'OPENROUTER_API_KEY=...' > .env
bun run examples/web/serve.ts
# open http://localhost:5173
```

`serve.ts` bundles `src/main.ts` with Bun's bundler and serves it — no Vite or
webpack. **Local dev always bundles from `packages/*/src`** (`development`
export + explicit aliases in `serve.ts`), so you never need to rebuild `dist/`
just to pick up core/provider changes. Run `bun run build` only before deploy
(`docs/site` uses compiled `dist/`).

Click **Start conversation** (allow the microphone), speak naturally,
and pause when you are done — volume-based VAD ends each turn automatically.
While the assistant is replying you can speak again to barge in.

Input captions are incremental: `MediaRecorder` emits a WebM/Opus timeslice
every 100 ms, but rolling ASR stays paused until VAD confirms real speech. The
demo then requests at most one snapshot every 1 second, and backs off for
3 seconds after an empty result. Short turns therefore go straight to the
single final transcription, while idle microphone audio creates no rolling ASR
requests. `asr_partial` updates the existing user turn by `turnId`; `asr_final`
replaces the provisional text at the turn boundary. A native streaming ASR
adapter can replace the rolling snapshot provider without changing the UI event
handlers.
Partial results never start an LLM request. If speech resumes before final ASR
confirms the turn, the pending capture is cancelled without spending an Audio
LLM request.

After normal assistant playback, the Web runtime rotates `MediaRecorder` so
the next turn starts with a fresh WebM container instead of joining clusters
across a filtered playback gap. Audio decode failures are reported without a
client-side second provider path; production fallback and idempotency belong at
the authenticated gateway.

The Web controls expose two independent switches. **Live ASR captions** maps to
the core `asrPartial` session option and can remove rolling ASR requests while
keeping final recognition. **Input / output text** only controls whether the
transcript UI is visible. Live ASR captions default to off to avoid rolling ASR
costs, while the transcript defaults to on. Both are remembered in
`localStorage`; the ASR switch is locked while a session is active because it
is part of session construction.

Barge-in is playback-aware: `runtime-web` derives a synchronized RMS envelope
from the assistant audio, and core searches 0–300 ms of acoustic delay before
subtracting the learned speaker-to-microphone echo baseline. A 4-of-12 voiced
frame gate then rejects isolated knocks without requiring uninterrupted speech.
That first signal is only a candidate: playback is paused rather than destroyed.
If ASR hears distinct user speech or strong foreground energy continues after
the loudspeaker tail has decayed, core commits the interruption; if it
disappears, playback resumes from the same position. The demo also has a
200 ms fast path for strong foreground speech, so short commands can stop
playback before their audio ends. Streaming ASR partials are ignored during
assistant speech unless there is already a candidate and the text is meaningful
and not a substring of the assistant reply; one-character CJK commands such as
“停” and short English words such as “no”, “stop”, and “wait” are considered
meaningful.

Run the deterministic real-waveform loopback matrix (requires `ffmpeg`):

```bash
bun run examples/web/acoustic-loopback.ts
# Optional: provide separate assistant and user speech clips
bun run examples/web/acoustic-loopback.ts assistant.mp3 user.mp3
```

The matrix covers 0–300 ms loopback delay, 0.2–1.2× echo gain, a desk knock,
an AEC glitch that must pause then resume, an early assistant-speech interruption,
and a later interruption. It performs no API calls and does not require speaker
or microphone access.

## Where each responsibility lives

- `@ottervoice/core`: the `full_duplex` mode, concurrent listening during an
  assistant reply, interruption/cancellation, and the required state-machine
  transitions.
- `@ottervoice/runtime-web`: continuous microphone capture, Web Audio RMS volume
  samples for VAD, gapless PCM chunk scheduling, and playback cancellation.
- `@ottervoice/provider-openrouter`: optional demo adapters for chat, rolling
  speech-to-text, text-to-speech, and Audio LLM output.
- `examples/web/src`: client-side VAD/interruption UX, input meter, transcript,
  and controls. It contains no model, prompt, voice, or generation policy.
- `examples/web/openrouter-proxy.ts`: server-side authorization boundary,
  models, system prompts, voices, generation limits, provider credentials, and
  upstream request construction.

The browser never receives `OPENROUTER_API_KEY` or privileged policy.
`serve.ts` reads server configuration from `.env`; the client calls four
profile-specific routes below `/api/voice`. The gateway rejects privileged
client message roles, ignores unknown/top-level policy fields, and reconstructs
the provider body from locked server policy. It also validates same-origin
browser requests and caps request, history, and text sizes. Production
deployments must replace the loopback-only demo authorizer with user/session
ownership checks and durable cost/rate limits.

## Low-cost model defaults

- LLM: `deepseek/deepseek-v4-flash:nitro` with reasoning disabled
- ASR: `qwen/qwen3-asr-flash-2026-02-10`
- TTS: `hexgrad/kokoro-82m`, voice `zf_xiaoxiao`
- Native audio LLM: `openai/gpt-audio-mini`, voice `alloy`

Browser MediaRecorder produces WebM/Opus, while GPT Audio accepts WAV/MP3.
`@ottervoice/runtime-web` decodes the completed WebM turn and encodes a mono
PCM16 WAV before the audio-LLM request. The deployed showcase downsamples that
WAV to 16 kHz and caps a turn at 90 seconds so Base64 audio plus its JSON
envelope stays below Vercel's Function request-body limit. Each output
`delta.audio` PCM16 chunk is decoded and scheduled immediately on a Web Audio
timeline; the complete stream is still wrapped as WAV for fallback playback
and the SSE debug button.

## Price evaluation (2026-07-13)

Current OpenRouter list prices:

| Component | Price |
| --- | ---: |
| Qwen3 ASR Flash | $0.000035 / audio second |
| DeepSeek V4 Flash | $0.077 / 1M input tokens; $0.154 / 1M output tokens |
| Kokoro 82M | $0.62 / 1M characters |
| GPT Audio Mini | $0.60 / 1M input tokens; $2.40 / 1M output tokens |

Sources: [GPT Audio Mini](https://openrouter.ai/openai/gpt-audio-mini/pricing),
[Qwen3 ASR Flash](https://openrouter.ai/qwen/qwen3-asr-flash-2026-02-10/pricing),
[DeepSeek V4 Flash](https://openrouter.ai/deepseek/deepseek-v4-flash/pricing), and
[Kokoro 82M](https://openrouter.ai/hexgrad/kokoro-82m/pricing).

On the repository's 9.99-second fixed opening clip, OpenRouter billed 6 seconds
of non-silent ASR audio. Three live runs produced these averages:

| Pipeline | Cost / turn | Full audio ready | Relative |
| --- | ---: | ---: | ---: |
| ASR → LLM → TTS | $0.0002343 | 5,213 ms | 1.00× cost / speed |
| Audio LLM + eager parallel caption ASR (historical) | $0.0004842 | 2,179 ms | 2.07× cost / 2.39× faster |

The Audio LLM row records the former eager-request path and is retained only as
a historical baseline. The current cost-safe path waits for final ASR before
generation, so re-run the benchmark before using its latency in planning.
This is a workload sample, not a universal quote: conversation history, reply
length, provider load, and silence change both token usage and latency. The
browser also displays per-mode rolling latency measured from VAD turn end to
playback start.

Re-run the comparison with your own MP3:

```bash
BENCHMARK_RUNS=3 bun run examples/web/benchmark.ts path/to/voice.mp3
```

OpenRouter transcription is turn-based rather than a streaming WebSocket: the
microphone and VAD remain real-time, then the completed WebM turn is sent when
silence is detected. The microphone remains open during TTS so barge-in still
works.

For low perceived latency, the proxy memory-caches repeated speech, the LLM uses
OpenRouter's `:nitro` throughput routing with reasoning disabled, normal turns
close after 1 second of silence, and batch ASR drops buffered assistant playback
after every uninterrupted reply.

## Showcase deployment

The project showcase lives in `docs/site`, keeping this directory focused on the
reusable example. The docs site bundles the UI and a same-origin voice gateway
for the live demo.

- `docs/site/vercel.json`: clean-clone workspace install/build, site output,
  Singapore region (required for GPT Audio availability), and Function limits
- `docs/site/api/voice/**`: four profile-specific deployed API Functions
- `docs/site/build.ts`: showcase bundle plus a best-effort prebuilt opening voice

Use `docs/site` as the Vercel project's Root Directory.

The reference deployment requires `OPENROUTER_API_KEY`. The showcase authorizer
accepts same-origin browser requests only. A real product must replace the
check in `docs/site/openrouter-proxy.ts` with user login, conversation
ownership, profile entitlement, and quota checks.

With the Vercel project connected to GitHub, set its Production Branch to
`main`, then deploy a committed, clean worktree from the repository root:

```bash
bun run deploy:git
```

This verifies the monorepo and showcase locally before pushing `main`. Vercel's
GitHub integration performs the deployment, so no Vercel credential is needed
by the script. Use `bun run deploy:git -- --dry-run` to run the same checks
without pushing.
