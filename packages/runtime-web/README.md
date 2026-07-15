# @ottervoice/runtime-web

Browser runtime adapter for OtterVoice, with microphone capture, VAD metering,
barge-in pre-roll, and audio playback.

## Install

```bash
npm install @ottervoice/core @ottervoice/runtime-web
```

## Usage

```ts
import { createWebRuntime } from '@ottervoice/runtime-web';

const runtime = createWebRuntime();
```

The default runtime uses `getUserMedia`, `MediaRecorder`, `AudioContext`, and
`HTMLAudioElement`. These browser primitives can be injected for tests or
non-standard hosts.

## Links

[Documentation](https://ottervoice.vercel.app/docs/) ·
[Web example](https://github.com/bugkiwi/OtterVoice/tree/main/examples/web) ·
[GitHub](https://github.com/bugkiwi/OtterVoice)

## License

MIT
