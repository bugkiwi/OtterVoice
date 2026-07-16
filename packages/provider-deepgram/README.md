# @ottervoice/provider-deepgram

Deepgram real-time streaming ASR provider for OtterVoice over WebSocket.

## Install

```bash
npm install @ottervoice/core @ottervoice/provider-deepgram
```

## Usage

```ts
import { createDeepgramASR } from '@ottervoice/provider-deepgram';

const asr = createDeepgramASR({
  tokenBrokerUrl: '/api/voice-token',
  tokenBrokerHeaders: { authorization: `Bearer ${applicationSessionToken}` },
  tokenBrokerSessionId: voiceSessionId,
  model: 'nova-3',
  language: 'en-US',
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
