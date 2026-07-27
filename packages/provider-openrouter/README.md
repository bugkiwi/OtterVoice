# @ottervoice/provider-openrouter

OpenRouter providers for OtterVoice: text LLM, audio LLM, speech-to-text, and
text-to-speech through OpenAI-compatible APIs.

## Install

```bash
npm install @ottervoice/core @ottervoice/provider-openrouter
```

## Browser / app (recommended)

```ts
import { createOpenRouterGatewayVoiceTurn } from '@ottervoice/provider-openrouter';

const voice = createOpenRouterGatewayVoiceTurn({
  baseUrl: '/api/voice/asr-llm-tts',
  prepareAudio,
});
```

Pair this with server-side `createOpenRouterGateway()`. The server owns the
model, system prompt, voice, temperature, token ceiling, reasoning policy,
authorization, and budget. The browser sends only user content and transport
data.

```ts
import { createOpenRouterGateway } from '@ottervoice/provider-openrouter';

const handleVoice = createOpenRouterGateway({
  apiKey: process.env.OPENROUTER_API_KEY,
  policy: {
    asr: { model: 'qwen/qwen3-asr-flash-2026-02-10' },
    llm: {
      model: 'openai/gpt-4o-mini',
      systemPrompt: process.env.OTTERVOICE_SYSTEM_PROMPT ?? 'Be concise.',
      maxTokens: 256,
    },
    tts: {
      model: 'minimax/speech-2.8-turbo',
      voice: 'alloy',
      responseFormat: 'mp3',
    },
  },
  authorize: async ({ request, profile }) =>
    validateUserConversationAndProfile(request, profile),
});
```

Mount `handleVoice` at `/api/voice/*`. The composite
`asr-llm-tts/chat/completions` route accepts one audio turn, runs all three
stages on the server, and returns text plus sentence-sized MP3 segments over
one SSE response. Independent `asr`, `llm`, and `tts` profiles remain available
for server/trusted integrations; an omitted policy is disabled.

Direct factories such as `createOpenRouterLLM()` remain available for trusted
Node/server/CLI runtimes. Do not return a broad OpenRouter bearer token to a
browser: hiding a long-lived key is insufficient if the client can still select
models or generation parameters.

## Links

[Documentation](https://ottervoice.vercel.app/docs/) ·
[GitHub](https://github.com/bugkiwi/OtterVoice)

## License

MIT
