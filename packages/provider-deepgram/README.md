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
  model: 'nova-3',
  language: 'en-US',
});
```

Use `tokenBrokerUrl` in browser and mobile apps so provider credentials remain
on your server.

## Links

[Documentation](https://ottervoice.vercel.app/docs/) ·
[GitHub](https://github.com/bugkiwi/OtterVoice)

## License

MIT
