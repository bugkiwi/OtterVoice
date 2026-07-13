# Web example

Full-duplex browser demo with real microphone capture/playback and two live
OpenRouter pipelines that can be switched in the UI:

- **Audio LLM (default):** `openai/gpt-audio-mini` consumes the recorded turn
  and generates speech directly. Qwen ASR runs in parallel only for captions.
- **Cascade (retained):** Qwen ASR → DeepSeek V4 Flash → Kokoro 82M.

```bash
echo 'OPENROUTER_API_KEY=...' > .env
bun run examples/web/serve.ts
# open http://localhost:5173
```

`serve.ts` serves `dist/opening.mp3` for the cached welcome clip. If that file is
missing, the demo falls back to live TTS (requires `OPENROUTER_API_KEY`).

`serve.ts` bundles `src/main.ts` with Bun's bundler and serves it — no Vite or
webpack. **Local dev always bundles from `packages/*/src`** (`development`
export + explicit aliases in `serve.ts`), so you never need to rebuild `dist/`
just to pick up core/provider changes. Run `bun run build` only before deploy
(`docs/site` uses compiled `dist/`).

Click **Start conversation** (allow the microphone), speak naturally,
and pause when you are done — volume-based VAD ends each turn automatically.
While the assistant is replying you can speak again to barge in.

Barge-in is playback-aware: `runtime-web` derives a synchronized RMS envelope
from the assistant audio, and core searches 0–300 ms of acoustic delay before
subtracting the learned speaker-to-microphone echo baseline. A 4-of-12 voiced
frame gate then rejects isolated knocks without requiring uninterrupted speech.
That first signal is only a candidate: playback is paused rather than destroyed.
If ASR hears distinct user speech after the loudspeaker tail has decayed, core
commits the interruption; if it disappears, playback resumes from the same
position. Volume alone never confirms an interruption after the pause — only
non-echo ASR text can. Streaming ASR partials are also ignored during assistant
speech unless there is already a candidate and at least two words or visible
characters that are not a substring of the assistant reply.

Run the deterministic real-waveform loopback matrix (requires `ffmpeg`):

```bash
bun run examples/web/acoustic-loopback.ts
# Optional: provide separate assistant and user speech clips
bun run examples/web/acoustic-loopback.ts assistant.mp3 user.mp3
```

The matrix covers 0–300 ms loopback delay, 0.2–1.2× echo gain, a desk knock,
an AEC glitch that must pause then resume, an early welcome-message interruption,
and a later interruption. It performs no API calls and does not require speaker
or microphone access.

## Where each responsibility lives

- `@ottervoice/core`: the `full_duplex` mode, concurrent listening during an
  assistant reply, interruption/cancellation, and the required state-machine
  transitions.
- `@ottervoice/runtime-web`: continuous microphone capture, Web Audio RMS volume
  samples for VAD, and playback that can be stopped without leaving `play()`
  pending.
- `@ottervoice/provider-openrouter`: chat completion, batch speech-to-text, and
  text-to-speech adapters for OpenRouter's three API endpoints.
- `examples/web`: the server-side credential proxy, VAD thresholds,
  interruption policy, model selection, input meter, transcript, and controls.

The browser never receives `OPENROUTER_API_KEY`. `serve.ts` reads it from the
root `.env` and only proxies three allow-listed OpenRouter routes.

## Low-cost model defaults

- LLM: `deepseek/deepseek-v4-flash:nitro` with reasoning disabled
- ASR: `qwen/qwen3-asr-flash-2026-02-10`
- TTS: `hexgrad/kokoro-82m`, voice `zf_xiaoxiao`
- Native audio LLM: `openai/gpt-audio-mini`, voice `alloy`

Browser MediaRecorder produces WebM/Opus, while GPT Audio accepts WAV/MP3.
`@ottervoice/runtime-web` decodes the completed WebM turn and encodes a mono
PCM16 WAV before the audio-LLM request. The model's streamed PCM16 reply is
wrapped as WAV for browser playback.

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
| Audio LLM + parallel caption ASR | $0.0004842 | 2,179 ms | 2.07× cost / 2.39× faster |

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

For low perceived latency, the deployment build pre-generates the fixed opening
TTS and the proxy memory-caches repeated speech, the LLM uses OpenRouter's `:nitro` throughput routing with reasoning
disabled, VAD closes after 600 ms of silence, and batch ASR drops buffered
assistant playback after every uninterrupted reply.

## Showcase deployment

The project showcase lives in `docs/site`, keeping this directory focused on the
reusable example. The docs site bundles this example as its primary live demo.

- `docs/site/vercel.json`: clean-clone workspace install/build, site output,
  Singapore region (required for GPT Audio availability), and Function limits
- `docs/site/api/openrouter/**`: the three deployed same-origin API Functions
- `docs/site/build.ts`: showcase bundle plus a best-effort prebuilt opening voice

Use `docs/site` as the Vercel project's Root Directory.

With the Vercel project connected to GitHub, set its Production Branch to
`main`, then deploy a committed, clean worktree from the repository root:

```bash
bun run deploy:git
```

This verifies the monorepo and showcase locally before pushing `main`. Vercel's
GitHub integration performs the deployment, so no Vercel credential is needed
by the script. Use `bun run deploy:git -- --dry-run` to run the same checks
without pushing.
