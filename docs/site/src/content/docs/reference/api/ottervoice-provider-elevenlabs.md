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
  tokenBrokerHeaders: { authorization: `Bearer ${applicationSessionToken}` },
  tokenBrokerSessionId: voiceSessionId,
  modelId: 'scribe_v2_realtime',
});
```

Use this direct-client mode only when the broker returns a short-lived,
least-privilege credential or a signed URL that already locks route/model
policy. Otherwise keep the provider and its configuration behind your
application server.

## Links

[Documentation](https://ottervoice.vercel.app/docs/) ·
[GitHub](https://github.com/bugkiwi/OtterVoice)

## License

MIT

## Interfaces

### ElevenLabsASROptions

Defined in: [provider-elevenlabs/src/index.ts:23](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-elevenlabs/src/index.ts#L23)

Options for [createElevenLabsASR](/docs/reference/api/ottervoice-provider-elevenlabs/#createelevenlabsasr). Extends [CredentialOptions](/docs/reference/api/ottervoice-provider-utils/#credentialoptions) and
[ElevenLabsQueryOptions](/docs/reference/api/ottervoice-provider-elevenlabs/#elevenlabsqueryoptions). Direct-client broker use is appropriate only
for a short-lived scoped credential or a server-locked signed URL.

#### Extends

- [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`ElevenLabsQueryOptions`](/docs/reference/api/ottervoice-provider-elevenlabs/#elevenlabsqueryoptions)

#### Properties

| Property | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="apikey"></a> `apiKey?` | `string` | A long-lived key (server-side only — never ship to clients). | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`apiKey`](/docs/reference/api/ottervoice-provider-utils/#apikey) | provider-utils/dist/credential.d.ts:37 |
| <a id="baseurl"></a> `baseUrl?` | `string` | Override the realtime listen endpoint. | - | [provider-elevenlabs/src/index.ts:25](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-elevenlabs/src/index.ts#L25) |
| <a id="fetch"></a> `fetch?` | [`FetchLike`](/docs/reference/api/ottervoice-provider-utils/#fetchlike) | Custom `fetch` implementation (tests / React Native polyfills). | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`fetch`](/docs/reference/api/ottervoice-provider-utils/#fetch) | provider-utils/dist/credential.d.ts:50 |
| <a id="language"></a> `language?` | `string` | BCP-47 language code; overridden by [ASRSessionOptions.language](/docs/reference/api/ottervoice-core/#language) when set. | [`ElevenLabsQueryOptions`](/docs/reference/api/ottervoice-provider-elevenlabs/#elevenlabsqueryoptions).[`language`](/docs/reference/api/ottervoice-provider-elevenlabs/#language-1) | [provider-elevenlabs/src/decode.ts:16](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-elevenlabs/src/decode.ts#L16) |
| <a id="modelid"></a> `modelId?` | `string` | ElevenLabs STT model id (e.g. `scribe_v2_realtime`). | [`ElevenLabsQueryOptions`](/docs/reference/api/ottervoice-provider-elevenlabs/#elevenlabsqueryoptions).[`modelId`](/docs/reference/api/ottervoice-provider-elevenlabs/#modelid-1) | [provider-elevenlabs/src/decode.ts:14](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-elevenlabs/src/decode.ts#L14) |
| <a id="now"></a> `now?` | () => `number` | Clock override for deterministic expiry checks in tests. | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`now`](/docs/reference/api/ottervoice-provider-utils/#now) | provider-utils/dist/credential.d.ts:52 |
| <a id="tokenbrokercredentials"></a> `tokenBrokerCredentials?` | `RequestCredentials` | Browser credential mode for the broker request. Use `include` for a cross-origin cookie session. | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`tokenBrokerCredentials`](/docs/reference/api/ottervoice-provider-utils/#tokenbrokercredentials) | provider-utils/dist/credential.d.ts:48 |
| <a id="tokenbrokerheaders"></a> `tokenBrokerHeaders?` | `Readonly`\<`Record`\<`string`, `string`\>\> | Application-authentication headers sent only to the token broker, such as a short-lived user session bearer token. Use browser-compatible characters. | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`tokenBrokerHeaders`](/docs/reference/api/ottervoice-provider-utils/#tokenbrokerheaders) | provider-utils/dist/credential.d.ts:44 |
| <a id="tokenbrokersessionid"></a> `tokenBrokerSessionId?` | `string` | Application voice-session id sent to the broker for ownership checks, audit, and quotas. | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`tokenBrokerSessionId`](/docs/reference/api/ottervoice-provider-utils/#tokenbrokersessionid) | provider-utils/dist/credential.d.ts:46 |
| <a id="tokenbrokerurl"></a> `tokenBrokerUrl?` | `string` | Endpoint that mints short-lived, least-privilege tokens; broad provider bearer tokens are not client-safe. | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`tokenBrokerUrl`](/docs/reference/api/ottervoice-provider-utils/#tokenbrokerurl) | provider-utils/dist/credential.d.ts:39 |
| <a id="websocket"></a> `webSocket?` | [`WebSocketCtor`](/docs/reference/api/ottervoice-provider-utils/#websocketctor) | Inject a WebSocket constructor (defaults to the global). | - | [provider-elevenlabs/src/index.ts:27](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-elevenlabs/src/index.ts#L27) |

***

### ElevenLabsQueryOptions

Defined in: [provider-elevenlabs/src/decode.ts:12](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-elevenlabs/src/decode.ts#L12)

Query knobs mapped onto ElevenLabs realtime
`/v1/speech-to-text/realtime` WebSocket URL.

#### Extended by

- [`ElevenLabsASROptions`](/docs/reference/api/ottervoice-provider-elevenlabs/#elevenlabsasroptions)

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="language-1"></a> `language?` | `string` | BCP-47 language code; overridden by [ASRSessionOptions.language](/docs/reference/api/ottervoice-core/#language) when set. | [provider-elevenlabs/src/decode.ts:16](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-elevenlabs/src/decode.ts#L16) |
| <a id="modelid-1"></a> `modelId?` | `string` | ElevenLabs STT model id (e.g. `scribe_v2_realtime`). | [provider-elevenlabs/src/decode.ts:14](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-elevenlabs/src/decode.ts#L14) |

## Variables

### DEFAULT\_BASE\_URL

```ts
const DEFAULT_BASE_URL: "wss://api.elevenlabs.io/v1/speech-to-text/realtime" = 'wss://api.elevenlabs.io/v1/speech-to-text/realtime';
```

Defined in: [provider-elevenlabs/src/decode.ts:6](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-elevenlabs/src/decode.ts#L6)

Default ElevenLabs realtime speech-to-text WebSocket endpoint.

## Functions

### buildElevenLabsUrl()

```ts
function buildElevenLabsUrl(
   baseUrl,
   options,
   asr): string;
```

Defined in: [provider-elevenlabs/src/decode.ts:30](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-elevenlabs/src/decode.ts#L30)

Build the realtime STT URL. NOTE: ElevenLabs' realtime ASR wire format is
evolving — verify parameter and message names against the current docs. In a
direct-client deployment, prefer a broker URL that returns a signed URL with
the route/model already locked by the server.

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

Defined in: [provider-elevenlabs/src/index.ts:47](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-elevenlabs/src/index.ts#L47)

ElevenLabs Scribe realtime ASR provider over WebSocket. A broker-signed URL
may be used when it locks the route/model policy server-side.

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

Defined in: [provider-elevenlabs/src/decode.ts:54](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-elevenlabs/src/decode.ts#L54)

Decode an ElevenLabs realtime message into a transcript result.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `data` | `string` |

#### Returns

  \| [`ASRDecodeResult`](/docs/reference/api/ottervoice-provider-utils/#asrdecoderesult)
  \| `undefined`
