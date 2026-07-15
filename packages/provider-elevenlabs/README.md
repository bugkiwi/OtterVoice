# @ottervoice/provider-elevenlabs

ElevenLabs Scribe real-time streaming ASR provider for OtterVoice over
WebSocket.

## Install

```bash
npm install @ottervoice/core @ottervoice/provider-elevenlabs
```

## Usage

```ts
import { createElevenLabsASR } from '@ottervoice/provider-elevenlabs';

const asr = createElevenLabsASR({
  tokenBrokerUrl: '/api/voice-token',
  modelId: 'scribe_v2_realtime',
});
```

Use `tokenBrokerUrl` in browser and mobile apps so provider credentials remain
on your server.

## Links

[Documentation](https://ottervoice.vercel.app/docs/) ·
[GitHub](https://github.com/bugkiwi/OtterVoice)

## License

MIT
