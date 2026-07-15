# @ottervoice/provider-openrouter

OpenRouter providers for OtterVoice: text LLM, audio LLM, speech-to-text, and
text-to-speech through OpenAI-compatible APIs.

## Install

```bash
npm install @ottervoice/core @ottervoice/provider-openrouter
```

## Usage

```ts
import { createOpenRouterLLM } from '@ottervoice/provider-openrouter';

const llm = createOpenRouterLLM({
  model: 'openai/gpt-4o-mini',
  tokenBrokerUrl: '/api/voice-token',
});
```

Use `tokenBrokerUrl` in browser and mobile apps so OpenRouter credentials remain
on your server. The package also exports audio LLM, ASR, and TTS provider
factories.

## Links

[Documentation](https://ottervoice.vercel.app/docs/) ·
[GitHub](https://github.com/bugkiwi/OtterVoice)

## License

MIT
