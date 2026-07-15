# @ottervoice/runtime-node

Node.js runtime adapter for OtterVoice, with network, stream-based audio I/O,
and console logging adapters.

## Install

```bash
npm install @ottervoice/core @ottervoice/runtime-node
```

## Usage

```ts
import { createNodeRuntime } from '@ottervoice/runtime-node';

const runtime = createNodeRuntime();
```

Pass the returned runtime to your OtterVoice session configuration. Every
adapter can be overridden for custom audio, network, and logging integration.

## Links

[Documentation](https://ottervoice.vercel.app/docs/) ·
[GitHub](https://github.com/bugkiwi/OtterVoice)

## License

MIT
