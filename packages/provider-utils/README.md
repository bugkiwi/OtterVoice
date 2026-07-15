# @ottervoice/provider-utils

Shared utilities for authors of OtterVoice providers, including client-safe
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

## Links

[Documentation](https://ottervoice.vercel.app/docs/) ·
[GitHub](https://github.com/bugkiwi/OtterVoice)

## License

MIT
