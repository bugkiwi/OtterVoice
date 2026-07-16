# @ottervoice/provider-utils

Shared utilities for authors of OtterVoice providers, including scoped
credential brokers, HTTP error normalization, SSE parsing, and WebSocket ASR
session helpers.

## Install

```bash
npm install @ottervoice/core @ottervoice/provider-utils
```

## Usage

```ts
import {
  createCredentialResolver,
  normalizeHttpError,
  parseSSEStream,
} from '@ottervoice/provider-utils';
```

Application code normally consumes one of the official provider packages
instead of importing this package directly.

A token broker is client-safe only when the issued token is short-lived and
least-privilege (route/model/budget scoped). If a provider credential remains
broad, keep it behind an application gateway that reconstructs upstream
requests from server-owned policy.

Authenticate broker calls as an application user and bind them to a voice
session:

```ts
createCredentialResolver(
  {
    tokenBrokerUrl: '/api/voice/token',
    tokenBrokerHeaders: { authorization: `Bearer ${applicationSessionToken}` },
    tokenBrokerSessionId: voiceSessionId,
  },
  { provider: 'azure_speech', purpose: 'tts' },
);
```

## Links

[Documentation](https://ottervoice.vercel.app/docs/) ·
[GitHub](https://github.com/bugkiwi/OtterVoice)

## License

MIT
