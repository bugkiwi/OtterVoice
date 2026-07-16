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
  tokenBrokerHeaders: { authorization: `Bearer ${applicationSessionToken}` },
  tokenBrokerSessionId: voiceSessionId,
  modelId: 'scribe_v2_realtime',
});
```

Use this direct-client mode only when the broker returns a short-lived,
least-privilege credential or a signed URL that already locks route/model
policy. Otherwise keep the provider and its configuration behind your
application server.

## Links

[Documentation](https://ottervoice.vercel.app/docs/) ·
[GitHub](https://github.com/bugkiwi/OtterVoice)

## License

MIT
