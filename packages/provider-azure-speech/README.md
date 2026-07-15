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
});
```

Use `tokenBrokerUrl` in browser and mobile apps so Azure credentials remain on
your server. `subscriptionKey` is available for trusted server-side code.

## Links

[Documentation](https://ottervoice.vercel.app/docs/) ·
[GitHub](https://github.com/bugkiwi/OtterVoice)

## License

MIT
