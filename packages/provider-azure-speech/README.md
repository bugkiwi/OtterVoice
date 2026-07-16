# @ottervoice/provider-azure-speech

Azure Cognitive Services text-to-speech provider for OtterVoice, using REST and
SSML.

## Install

```bash
npm install @ottervoice/core @ottervoice/provider-azure-speech
```

## Usage

```ts
import { createAzureTTS } from '@ottervoice/provider-azure-speech';

const tts = createAzureTTS({
  region: 'eastus',
  voice: 'en-US-AvaMultilingualNeural',
  tokenBrokerUrl: '/api/voice-token',
  tokenBrokerHeaders: { authorization: `Bearer ${applicationSessionToken}` },
  tokenBrokerSessionId: voiceSessionId,
});
```

This is an explicit direct-client mode: Azure's short-lived STS token avoids
shipping the subscription key but does not lock voice, route, or budget. The
standard production mode keeps this provider and `voice` on your application
server. `subscriptionKey` is for trusted server-side code only.

## Links

[Documentation](https://ottervoice.vercel.app/docs/) ·
[GitHub](https://github.com/bugkiwi/OtterVoice)

## License

MIT
