<p align="center">
  <img src="../../assets/brand/ottervoice-icon.webp" width="112" alt="OtterVoice pixel otter mascot" />
</p>

# Web example

Full-duplex browser demo with real microphone capture/playback and two live
pipelines that can be switched in the UI. The demo server keeps provider
credentials and model policy out of the browser:

- **Audio LLM (default):** choose OpenRouter-managed
  `openai/gpt-audio-mini`, or Google AI Studio's official
  `gemini-3.1-flash-live-preview` Live API. Gemini can optionally enable
  Google Search Grounding; GPT Audio Mini never receives a search tool.
- **Cascade:** the browser sends the same one audio-turn request shape. The
  server performs Qwen ASR → Grok 4.3 → MiniMax TTS and streams the user
  transcript, assistant text deltas, and sentence-sized MP3 segments over the
  original response.

```bash
# repository-root .env
OPENROUTER_API_KEY=...
AISTUDIO_GOOGLE_API_KEY=...

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

`MediaRecorder` emits WebM/Opus timeslices every 100 ms for local VAD and
barge-in capture. Once silence closes the turn, the browser converts that one
immutable recording to WAV and sends exactly one request. In cascade mode the
authoritative input caption arrives from the same response after server-side
ASR. GPT Audio and Gemini Live use the same server-managed Qwen ASR route for
their input captions because those client adapters only return the assistant
transcript. This caption request runs in parallel with native audio generation;
there is no rolling browser ASR request to cancel or restart.

After normal assistant playback, the Web runtime rotates `MediaRecorder` so
the next turn starts with a fresh WebM container instead of joining clusters
across a filtered playback gap. Audio decode failures are reported without a
client-side second provider path; production fallback and idempotency belong at
the authenticated gateway.

The Web controls expose an Audio LLM model selector plus two switches.
**Input / output text** only controls whether the transcript UI is visible.
**Web search** is available for the server-composed ASR → LLM → TTS pipeline
and for Gemini Live. The former selects a bounded OpenRouter search route; the
latter adds Google's server-owned `{ googleSearch: {} }` grounding tool to the
Live session. Search stays unavailable for GPT Audio Mini. Search defaults to
off and transcript display defaults to on. Preferences are remembered in
`localStorage`; provider-affecting controls are locked while a session is active.

Barge-in is playback-aware: `runtime-web` derives a synchronized RMS envelope
from the assistant audio, and core searches 0–300 ms of acoustic delay before
subtracting the learned speaker-to-microphone echo baseline. A 4-of-12 voiced
frame gate then rejects isolated knocks without requiring uninterrupted speech.
That first signal is only a candidate: playback is paused rather than destroyed.
If strong foreground energy continues after the loudspeaker tail has decayed,
core commits the interruption; if it
disappears, playback resumes from the same position. The demo also has a
200 ms fast path for strong foreground speech, so short commands can stop
playback before their audio ends.

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
- `@ottervoice/provider-openrouter`: one client audio-turn adapter plus the
  server-side native and composed OpenRouter implementations.
- `examples/web/src`: client-side VAD/interruption UX, input meter, transcript,
  model selection, and controls. It contains route selection but no provider
  credential, system prompt, voice, or generation budget.
- `examples/web/openrouter-proxy.ts`: server-side authorization boundary,
  models, system prompts, voices, generation limits, provider credentials, and
  upstream request construction.
- `examples/web/gemini-live-proxy.ts`: same-origin Google Live bridge, locked
  Gemini model and prompt, optional Google Search Grounding, WAV validation,
  and streamed PCM/audio-transcript translation back to the browser.

The browser never receives `OPENROUTER_API_KEY`, `AISTUDIO_GOOGLE_API_KEY`, or
privileged policy.
`serve.ts` reads server configuration from `.env`; the client calls either the
native Audio LLM route or the composed voice-turn route below `/api/voice`.
The gateway rejects privileged
client message roles, ignores unknown/top-level policy fields, and reconstructs
the provider body from locked server policy. It also validates same-origin
browser requests and caps request, history, and text sizes. Production
deployments must replace the loopback-only demo authorizer with user/session
ownership checks and durable cost/rate limits.

## Model defaults

- LLM: `x-ai/grok-4.3` with reasoning disabled; OpenRouter provider
  endpoints are sorted by latency and prefer a rolling p90 TTFT of at most 2 s
- ASR: `qwen/qwen3-asr-flash-2026-02-10`
- TTS: `minimax/speech-2.8-turbo`, voice `alloy`
- Native audio LLM: `openai/gpt-audio-mini`, voice `alloy`
- Optional native audio LLM: Google official
  `gemini-3.1-flash-live-preview`, with Google Search Grounding off by default

Browser MediaRecorder produces WebM/Opus, while both server routes accept WAV/MP3.
`@ottervoice/runtime-web` decodes the completed WebM turn and encodes a mono
PCM16 WAV before the audio-LLM request. The deployed showcase downsamples that
WAV to 16 kHz and caps a turn at 90 seconds so Base64 audio plus its JSON
envelope stays below Vercel's Function request-body limit. Each output
`delta.audio` PCM16 chunk from the native model is decoded and scheduled on a
Web Audio timeline. The composed route instead returns sentence-sized MP3
segments: synthesis begins as soon as each LLM clause is ready, independent of
client playback, and the browser queues already-downloaded segments in order.
This avoids raw PCM's much larger transfer size while preserving low first-audio
latency.

## Price evaluation (2026-07-27)

Current OpenRouter list prices:

| Component | Price |
| --- | ---: |
| Qwen3 ASR Flash | $0.000035 / audio second |
| Grok 4.3 | $1.25 / 1M input tokens; $2.50 / 1M output tokens |
| MiniMax Speech 2.8 Turbo | $60 / 1M characters |
| GPT Audio Mini | $0.60 / 1M input tokens; $2.40 / 1M output tokens |

Sources: [GPT Audio Mini](https://openrouter.ai/openai/gpt-audio-mini/pricing),
[Qwen3 ASR Flash](https://openrouter.ai/qwen/qwen3-asr-flash-2026-02-10/pricing),
[Grok 4.3](https://openrouter.ai/x-ai/grok-4.3/pricing), and
[MiniMax Speech 2.8 Turbo](https://openrouter.ai/minimax/speech-2.8-turbo/pricing).

On the repository's 9.99-second fixed opening clip, OpenRouter billed 6 seconds
of non-silent ASR audio. Before the current Grok 4.3 and MiniMax defaults, three
live runs produced these historical averages:

| Pipeline | Cost / turn | Full audio ready | Relative |
| --- | ---: | ---: | ---: |
| ASR → LLM → TTS | $0.0002343 | 5,213 ms | 1.00× cost / speed |
| Audio LLM + eager parallel caption ASR (historical) | $0.0004842 | 2,179 ms | 2.07× cost / 2.39× faster |

Both rows predate the current cascaded model selection and are retained only as
historical baselines. The current cost-safe path waits for final ASR before
generation, so re-run the benchmark before using its cost or latency in planning.
This is a workload sample, not a universal quote: conversation history, reply
length, provider load, and silence change both token usage and latency. The
browser also displays per-mode rolling latency measured from VAD turn end to
playback start. Each assistant row records first-text and first-audio latency,
both measured from the matching `user_audio_end` event.

Re-run the comparison with your own MP3:

```bash
BENCHMARK_RUNS=3 bun run examples/web/benchmark.ts path/to/voice.mp3
```

The browser microphone and VAD remain real-time, then the completed WebM turn is
converted to 16 kHz mono PCM16 WAV when silence is detected. GPT Audio uses the
existing OpenRouter turn request. Gemini opens an official Google Live WebSocket
on the server, sends the PCM in 500 ms chunks, and translates the 24 kHz native
audio stream back into the existing gapless browser playback path. The
microphone remains open during playback so barge-in still works.

For low perceived latency, the LLM asks OpenRouter to sort provider endpoints by
time to first token and prefer endpoints whose rolling p90 latency is at most
2 seconds. Reasoning is disabled and spoken answers are capped at 512 tokens.
Local volume detection closes the user turn after 500 ms of silence. In the
composed pipeline, the first complete LLM
clause starts a MiniMax MP3 synthesis request while later text is still being
generated. Later clauses can synthesize before earlier audio finishes playing;
the SSE delivery and playback queues preserve sentence order. Repeated speech
may use the gateway memory cache.

## Showcase deployment

The project showcase lives in `docs/site`, keeping this directory focused on the
reusable example. The docs site bundles the UI and a same-origin voice gateway
for the live demo.

- `docs/site/vercel.json`: clean-clone workspace install/build, site output,
  Singapore region (required for GPT Audio availability), and Function limits
- `docs/site/api/voice/**`: native, composed, and composed-with-search API Functions
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
