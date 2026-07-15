---
title: "@ottervoice/provider-elevenlabs"
description: "由 TypeDoc 从源码 JSDoc 生成的 API 参考（英文注释）。"
editUrl: false
---

[**Documentation**](../index/)

***

[Documentation](/docs/reference/api/index/) / @ottervoice/provider-elevenlabs

# @ottervoice/provider-elevenlabs

ElevenLabs Scribe real-time streaming ASR provider for OtterVoice over
WebSocket.

## Install

```bash
npm install @ottervoice/core @ottervoice/provider-elevenlabs
```

## Usage

```ts
import { createElevenLabsASR } from '@ottervoice/provider-elevenlabs';

const asr = createElevenLabsASR({
  tokenBrokerUrl: '/api/voice-token',
  modelId: 'scribe_v2_realtime',
});
```

Use `tokenBrokerUrl` in browser and mobile apps so provider credentials remain
on your server.

## Links

[Documentation](https://ottervoice.vercel.app/docs/) ·
[GitHub](https://github.com/bugkiwi/OtterVoice)

## License

MIT

## Interfaces

### ElevenLabsASROptions

Defined in: [provider-elevenlabs/src/index.ts:22](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/provider-elevenlabs/src/index.ts#L22)

Options for [createElevenLabsASR](/docs/reference/api/ottervoice-provider-elevenlabs/#createelevenlabsasr). Extends [CredentialOptions](/docs/reference/api/ottervoice-provider-utils/#credentialoptions) and
[ElevenLabsQueryOptions](/docs/reference/api/ottervoice-provider-elevenlabs/#elevenlabsqueryoptions); prefer `tokenBrokerUrl` on clients over a static key.

#### Extends

- [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`ElevenLabsQueryOptions`](/docs/reference/api/ottervoice-provider-elevenlabs/#elevenlabsqueryoptions)

#### Properties

| Property | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="apikey"></a> `apiKey?` | `string` | A long-lived key (server-side only — never ship to clients). | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`apiKey`](/docs/reference/api/ottervoice-provider-utils/#apikey) | provider-utils/dist/credential.d.ts:35 |
| <a id="baseurl"></a> `baseUrl?` | `string` | Override the realtime listen endpoint. | - | [provider-elevenlabs/src/index.ts:24](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/provider-elevenlabs/src/index.ts#L24) |
| <a id="fetch"></a> `fetch?` | [`FetchLike`](/docs/reference/api/ottervoice-provider-utils/#fetchlike) | Custom `fetch` implementation (tests / React Native polyfills). | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`fetch`](/docs/reference/api/ottervoice-provider-utils/#fetch) | provider-utils/dist/credential.d.ts:39 |
| <a id="language"></a> `language?` | `string` | BCP-47 language code; overridden by [ASRSessionOptions.language](/docs/reference/api/ottervoice-core/#language) when set. | [`ElevenLabsQueryOptions`](/docs/reference/api/ottervoice-provider-elevenlabs/#elevenlabsqueryoptions).[`language`](/docs/reference/api/ottervoice-provider-elevenlabs/#language-1) | [provider-elevenlabs/src/decode.ts:16](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/provider-elevenlabs/src/decode.ts#L16) |
| <a id="modelid"></a> `modelId?` | `string` | ElevenLabs STT model id (e.g. `scribe_v2_realtime`). | [`ElevenLabsQueryOptions`](/docs/reference/api/ottervoice-provider-elevenlabs/#elevenlabsqueryoptions).[`modelId`](/docs/reference/api/ottervoice-provider-elevenlabs/#modelid-1) | [provider-elevenlabs/src/decode.ts:14](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/provider-elevenlabs/src/decode.ts#L14) |
| <a id="now"></a> `now?` | () => `number` | Clock override for deterministic expiry checks in tests. | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`now`](/docs/reference/api/ottervoice-provider-utils/#now) | provider-utils/dist/credential.d.ts:41 |
| <a id="tokenbrokerurl"></a> `tokenBrokerUrl?` | `string` | Endpoint that mints short-lived tokens (client-safe). | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`tokenBrokerUrl`](/docs/reference/api/ottervoice-provider-utils/#tokenbrokerurl) | provider-utils/dist/credential.d.ts:37 |
| <a id="websocket"></a> `webSocket?` | [`WebSocketCtor`](/docs/reference/api/ottervoice-provider-utils/#websocketctor) | Inject a WebSocket constructor (defaults to the global). | - | [provider-elevenlabs/src/index.ts:26](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/provider-elevenlabs/src/index.ts#L26) |

***

### ElevenLabsQueryOptions

Defined in: [provider-elevenlabs/src/decode.ts:12](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/provider-elevenlabs/src/decode.ts#L12)

Query knobs mapped onto ElevenLabs realtime
`/v1/speech-to-text/realtime` WebSocket URL.

#### Extended by

- [`ElevenLabsASROptions`](/docs/reference/api/ottervoice-provider-elevenlabs/#elevenlabsasroptions)

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="language-1"></a> `language?` | `string` | BCP-47 language code; overridden by [ASRSessionOptions.language](/docs/reference/api/ottervoice-core/#language) when set. | [provider-elevenlabs/src/decode.ts:16](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/provider-elevenlabs/src/decode.ts#L16) |
| <a id="modelid-1"></a> `modelId?` | `string` | ElevenLabs STT model id (e.g. `scribe_v2_realtime`). | [provider-elevenlabs/src/decode.ts:14](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/provider-elevenlabs/src/decode.ts#L14) |

## Variables

### DEFAULT\_BASE\_URL

```ts
const DEFAULT_BASE_URL: "wss://api.elevenlabs.io/v1/speech-to-text/realtime" = 'wss://api.elevenlabs.io/v1/speech-to-text/realtime';
```

Defined in: [provider-elevenlabs/src/decode.ts:6](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/provider-elevenlabs/src/decode.ts#L6)

Default ElevenLabs realtime speech-to-text WebSocket endpoint.

## Functions

### buildElevenLabsUrl()

```ts
function buildElevenLabsUrl(
   baseUrl, 
   options, 
   asr): string;
```

Defined in: [provider-elevenlabs/src/decode.ts:29](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/provider-elevenlabs/src/decode.ts#L29)

Build the realtime STT URL. NOTE: ElevenLabs' realtime ASR wire format is
evolving — verify parameter and message names against the current docs and
prefer `tokenBrokerUrl` (which returns a fully signed URL) in production.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `baseUrl` | `string` | Listen endpoint; usually [DEFAULT\_BASE\_URL](/docs/reference/api/ottervoice-provider-elevenlabs/#default_base_url) or a broker-signed URL. |
| `options` | [`ElevenLabsQueryOptions`](/docs/reference/api/ottervoice-provider-elevenlabs/#elevenlabsqueryoptions) | Provider defaults for model / language. |
| `asr` | [`ASRSessionOptions`](/docs/reference/api/ottervoice-core/#asrsessionoptions) | Per-session overrides from [ASRSessionOptions](/docs/reference/api/ottervoice-core/#asrsessionoptions). |

#### Returns

`string`

Fully qualified `wss://` URL including search params.

***

### createElevenLabsASR()

```ts
function createElevenLabsASR(options): ASRProvider;
```

Defined in: [provider-elevenlabs/src/index.ts:46](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/provider-elevenlabs/src/index.ts#L46)

ElevenLabs Scribe realtime ASR provider over WebSocket. Prefer a
`tokenBrokerUrl` so the signed URL/credential is minted server-side.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | [`ElevenLabsASROptions`](/docs/reference/api/ottervoice-provider-elevenlabs/#elevenlabsasroptions) | Credentials and optional listen endpoint / query overrides. |

#### Returns

[`ASRProvider`](/docs/reference/api/ottervoice-core/#asrprovider)

***

### decodeElevenLabs()

```ts
function decodeElevenLabs(data): 
  | ASRDecodeResult
  | undefined;
```

Defined in: [provider-elevenlabs/src/decode.ts:53](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/provider-elevenlabs/src/decode.ts#L53)

Decode an ElevenLabs realtime message into a transcript result.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `data` | `string` |

#### Returns

  \| [`ASRDecodeResult`](/docs/reference/api/ottervoice-provider-utils/#asrdecoderesult)
  \| `undefined`
