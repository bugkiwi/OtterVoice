# @ottervoice/protocol

Versioned JSON wire protocol for transporting OtterVoice session events across
processes and native boundaries.

## Install

```bash
npm install @ottervoice/core @ottervoice/protocol
```

## Usage

```ts
import { encodeMessage, parseMessage, serializeMessage } from '@ottervoice/protocol';

const encoded = serializeMessage(encodeMessage('asr_final', {
  text: 'Hello',
  confidence: 0.98,
}));
const message = parseMessage(encoded);
```

The package exports the protocol version, supported message types, envelope
types, serializers, parsers, and runtime validation helpers.

## Links

[Documentation](https://ottervoice.vercel.app/docs/) ·
[GitHub](https://github.com/bugkiwi/OtterVoice)

## License

MIT
