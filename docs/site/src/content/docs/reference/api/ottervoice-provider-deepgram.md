---
title: "@ottervoice/provider-deepgram"
description: "由 TypeDoc 从源码 JSDoc 生成的 API 参考（英文注释）。"
editUrl: false
---

[**Documentation**](../index/)

***

[Documentation](/docs/reference/api/index/) / @ottervoice/provider-deepgram

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

## Interfaces

### DeepgramOptions

Defined in: [provider-deepgram/src/index.ts:22](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-deepgram/src/index.ts#L22)

Options for [createDeepgramASR](/docs/reference/api/ottervoice-provider-deepgram/#createdeepgramasr). Extends [CredentialOptions](/docs/reference/api/ottervoice-provider-utils/#credentialoptions) and
[DeepgramQueryOptions](/docs/reference/api/ottervoice-provider-deepgram/#deepgramqueryoptions); prefer `tokenBrokerUrl` on clients over a static key.

#### Extends

- [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`DeepgramQueryOptions`](/docs/reference/api/ottervoice-provider-deepgram/#deepgramqueryoptions)

#### Properties

| Property | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="apikey"></a> `apiKey?` | `string` | A long-lived key (server-side only — never ship to clients). | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`apiKey`](/docs/reference/api/ottervoice-provider-utils/#apikey) | provider-utils/dist/credential.d.ts:35 |
| <a id="baseurl"></a> `baseUrl?` | `string` | Override the listen endpoint. | - | [provider-deepgram/src/index.ts:24](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-deepgram/src/index.ts#L24) |
| <a id="encoding"></a> `encoding?` | `string` | Raw audio encoding when not inferred from the runtime (e.g. `linear16`). | [`DeepgramQueryOptions`](/docs/reference/api/ottervoice-provider-deepgram/#deepgramqueryoptions).[`encoding`](/docs/reference/api/ottervoice-provider-deepgram/#encoding-1) | [provider-deepgram/src/decode.ts:14](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-deepgram/src/decode.ts#L14) |
| <a id="fetch"></a> `fetch?` | [`FetchLike`](/docs/reference/api/ottervoice-provider-utils/#fetchlike) | Custom `fetch` implementation (tests / React Native polyfills). | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`fetch`](/docs/reference/api/ottervoice-provider-utils/#fetch) | provider-utils/dist/credential.d.ts:39 |
| <a id="interimresults"></a> `interimResults?` | `boolean` | Request interim (`is_final: false`) Results; default from session options. | [`DeepgramQueryOptions`](/docs/reference/api/ottervoice-provider-deepgram/#deepgramqueryoptions).[`interimResults`](/docs/reference/api/ottervoice-provider-deepgram/#interimresults-1) | [provider-deepgram/src/decode.ts:18](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-deepgram/src/decode.ts#L18) |
| <a id="language"></a> `language?` | `string` | BCP-47 language; overridden by [ASRSessionOptions.language](/docs/reference/api/ottervoice-core/#language) when set. | [`DeepgramQueryOptions`](/docs/reference/api/ottervoice-provider-deepgram/#deepgramqueryoptions).[`language`](/docs/reference/api/ottervoice-provider-deepgram/#language-1) | [provider-deepgram/src/decode.ts:12](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-deepgram/src/decode.ts#L12) |
| <a id="model"></a> `model?` | `string` | Deepgram model id (e.g. `nova-2`, `nova-3`). | [`DeepgramQueryOptions`](/docs/reference/api/ottervoice-provider-deepgram/#deepgramqueryoptions).[`model`](/docs/reference/api/ottervoice-provider-deepgram/#model-1) | [provider-deepgram/src/decode.ts:10](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-deepgram/src/decode.ts#L10) |
| <a id="now"></a> `now?` | () => `number` | Clock override for deterministic expiry checks in tests. | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`now`](/docs/reference/api/ottervoice-provider-utils/#now) | provider-utils/dist/credential.d.ts:41 |
| <a id="punctuate"></a> `punctuate?` | `boolean` | Ask Deepgram to add punctuation to transcripts. | [`DeepgramQueryOptions`](/docs/reference/api/ottervoice-provider-deepgram/#deepgramqueryoptions).[`punctuate`](/docs/reference/api/ottervoice-provider-deepgram/#punctuate-1) | [provider-deepgram/src/decode.ts:20](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-deepgram/src/decode.ts#L20) |
| <a id="samplerate"></a> `sampleRate?` | `number` | Sample rate in Hz for PCM encodings; overridden by session options when set. | [`DeepgramQueryOptions`](/docs/reference/api/ottervoice-provider-deepgram/#deepgramqueryoptions).[`sampleRate`](/docs/reference/api/ottervoice-provider-deepgram/#samplerate-1) | [provider-deepgram/src/decode.ts:16](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-deepgram/src/decode.ts#L16) |
| <a id="smartformat"></a> `smartFormat?` | `boolean` | Enable Deepgram smart formatting (numbers, dates, etc.). | [`DeepgramQueryOptions`](/docs/reference/api/ottervoice-provider-deepgram/#deepgramqueryoptions).[`smartFormat`](/docs/reference/api/ottervoice-provider-deepgram/#smartformat-1) | [provider-deepgram/src/decode.ts:22](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-deepgram/src/decode.ts#L22) |
| <a id="tokenbrokerurl"></a> `tokenBrokerUrl?` | `string` | Endpoint that mints short-lived tokens (client-safe). | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`tokenBrokerUrl`](/docs/reference/api/ottervoice-provider-utils/#tokenbrokerurl) | provider-utils/dist/credential.d.ts:37 |
| <a id="websocket"></a> `webSocket?` | [`WebSocketCtor`](/docs/reference/api/ottervoice-provider-utils/#websocketctor) | Inject a WebSocket constructor (defaults to the global). | - | [provider-deepgram/src/index.ts:26](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-deepgram/src/index.ts#L26) |

***

### DeepgramQueryOptions

Defined in: [provider-deepgram/src/decode.ts:8](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-deepgram/src/decode.ts#L8)

Query knobs mapped onto Deepgram's `/v1/listen` WebSocket URL.

#### Extended by

- [`DeepgramOptions`](/docs/reference/api/ottervoice-provider-deepgram/#deepgramoptions)

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="encoding-1"></a> `encoding?` | `string` | Raw audio encoding when not inferred from the runtime (e.g. `linear16`). | [provider-deepgram/src/decode.ts:14](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-deepgram/src/decode.ts#L14) |
| <a id="interimresults-1"></a> `interimResults?` | `boolean` | Request interim (`is_final: false`) Results; default from session options. | [provider-deepgram/src/decode.ts:18](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-deepgram/src/decode.ts#L18) |
| <a id="language-1"></a> `language?` | `string` | BCP-47 language; overridden by [ASRSessionOptions.language](/docs/reference/api/ottervoice-core/#language) when set. | [provider-deepgram/src/decode.ts:12](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-deepgram/src/decode.ts#L12) |
| <a id="model-1"></a> `model?` | `string` | Deepgram model id (e.g. `nova-2`, `nova-3`). | [provider-deepgram/src/decode.ts:10](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-deepgram/src/decode.ts#L10) |
| <a id="punctuate-1"></a> `punctuate?` | `boolean` | Ask Deepgram to add punctuation to transcripts. | [provider-deepgram/src/decode.ts:20](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-deepgram/src/decode.ts#L20) |
| <a id="samplerate-1"></a> `sampleRate?` | `number` | Sample rate in Hz for PCM encodings; overridden by session options when set. | [provider-deepgram/src/decode.ts:16](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-deepgram/src/decode.ts#L16) |
| <a id="smartformat-1"></a> `smartFormat?` | `boolean` | Enable Deepgram smart formatting (numbers, dates, etc.). | [provider-deepgram/src/decode.ts:22](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-deepgram/src/decode.ts#L22) |

## Variables

### DEFAULT\_BASE\_URL

```ts
const DEFAULT_BASE_URL: "wss://api.deepgram.com/v1/listen" = 'wss://api.deepgram.com/v1/listen';
```

Defined in: [provider-deepgram/src/decode.ts:5](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-deepgram/src/decode.ts#L5)

Default Deepgram live listen WebSocket endpoint.

## Functions

### buildDeepgramUrl()

```ts
function buildDeepgramUrl(
   baseUrl,
   options,
   asr): string;
```

Defined in: [provider-deepgram/src/decode.ts:33](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-deepgram/src/decode.ts#L33)

Build the Deepgram listen WebSocket URL with query parameters.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `baseUrl` | `string` | Listen endpoint; usually [DEFAULT\_BASE\_URL](/docs/reference/api/ottervoice-provider-deepgram/#default_base_url) or a broker-signed URL. |
| `options` | [`DeepgramQueryOptions`](/docs/reference/api/ottervoice-provider-deepgram/#deepgramqueryoptions) | Provider defaults for model / formatting. |
| `asr` | [`ASRSessionOptions`](/docs/reference/api/ottervoice-core/#asrsessionoptions) | Per-session overrides from [ASRSessionOptions](/docs/reference/api/ottervoice-core/#asrsessionoptions). |

#### Returns

`string`

Fully qualified `wss://` URL including search params.

***

### createDeepgramASR()

```ts
function createDeepgramASR(options): ASRProvider;
```

Defined in: [provider-deepgram/src/index.ts:45](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-deepgram/src/index.ts#L45)

Deepgram streaming ASR provider over WebSocket.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | [`DeepgramOptions`](/docs/reference/api/ottervoice-provider-deepgram/#deepgramoptions) | Credentials plus listen URL / query options. Prefer `tokenBrokerUrl` on clients. |

#### Returns

[`ASRProvider`](/docs/reference/api/ottervoice-core/#asrprovider)

***

### decodeDeepgram()

```ts
function decodeDeepgram(data):
  | ASRDecodeResult
  | undefined;
```

Defined in: [provider-deepgram/src/decode.ts:63](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-deepgram/src/decode.ts#L63)

Decode a Deepgram `Results` message into a transcript result.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `data` | `string` |

#### Returns

  \| [`ASRDecodeResult`](/docs/reference/api/ottervoice-provider-utils/#asrdecoderesult)
  \| `undefined`
