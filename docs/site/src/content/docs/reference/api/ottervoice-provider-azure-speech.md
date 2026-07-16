---
title: "@ottervoice/provider-azure-speech"
description: "由 TypeDoc 从源码 JSDoc 生成的 API 参考（英文注释）。"
editUrl: false
---

[**Documentation**](../index/)

***

[Documentation](/docs/reference/api/index/) / @ottervoice/provider-azure-speech

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
  tokenBrokerHeaders: { authorization: `Bearer ${applicationSessionToken}` },
  tokenBrokerSessionId: voiceSessionId,
});
```

This is an explicit direct-client mode: Azure's short-lived STS token avoids
shipping the subscription key but does not lock voice, route, or budget. The
standard production mode keeps this provider and `voice` on your application
server. `subscriptionKey` is for trusted server-side code only.

## Links

[Documentation](https://ottervoice.vercel.app/docs/) ·
[GitHub](https://github.com/bugkiwi/OtterVoice)

## License

MIT

## Interfaces

### AzureTTSOptions

Defined in: [provider-azure-speech/src/index.ts:32](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-azure-speech/src/index.ts#L32)

Options for [createAzureTTS](/docs/reference/api/ottervoice-provider-azure-speech/#createazuretts). Region and neural voice are required;
authenticate with `subscriptionKey` on a trusted server. `tokenBrokerUrl`
enables an explicit direct-client mode only; Azure STS tokens do not enforce
voice, route, or budget policy.
Shares broker/`fetch` fields from [CredentialOptions](/docs/reference/api/ottervoice-provider-utils/#credentialoptions) (use `subscriptionKey`
instead of `apiKey`).

#### Extends

- `Omit`\<[`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions), `"apiKey"`\>

#### Properties

| Property | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="defaultformat"></a> `defaultFormat?` | [`TTSFormat`](/docs/reference/api/ottervoice-core/#ttsformat) | Default audio container when the request omits `format`. | - | [provider-azure-speech/src/index.ts:42](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-azure-speech/src/index.ts#L42) |
| <a id="endpoint"></a> `endpoint?` | `string` | Override the synthesis endpoint (defaults to the region host). | - | [provider-azure-speech/src/index.ts:44](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-azure-speech/src/index.ts#L44) |
| <a id="fetch"></a> `fetch?` | [`FetchLike`](/docs/reference/api/ottervoice-provider-utils/#fetchlike) | Custom `fetch` implementation (tests / React Native polyfills). | `Omit.fetch` | provider-utils/dist/credential.d.ts:50 |
| <a id="language"></a> `language?` | `string` | BCP-47 language tag for SSML. Defaults to `en-US`. | - | [provider-azure-speech/src/index.ts:40](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-azure-speech/src/index.ts#L40) |
| <a id="now"></a> `now?` | () => `number` | Clock override for deterministic expiry checks in tests. | `Omit.now` | provider-utils/dist/credential.d.ts:52 |
| <a id="region"></a> `region` | `string` | Azure region, e.g. `eastus`. | - | [provider-azure-speech/src/index.ts:34](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-azure-speech/src/index.ts#L34) |
| <a id="subscriptionkey"></a> `subscriptionKey?` | `string` | Subscription key (server-side). Mutually exclusive with `tokenBrokerUrl`. | - | [provider-azure-speech/src/index.ts:36](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-azure-speech/src/index.ts#L36) |
| <a id="tokenbrokercredentials"></a> `tokenBrokerCredentials?` | `RequestCredentials` | Browser credential mode for the broker request. Use `include` for a cross-origin cookie session. | `Omit.tokenBrokerCredentials` | provider-utils/dist/credential.d.ts:48 |
| <a id="tokenbrokerheaders"></a> `tokenBrokerHeaders?` | `Readonly`\<`Record`\<`string`, `string`\>\> | Application-authentication headers sent only to the token broker, such as a short-lived user session bearer token. Use browser-compatible characters. | `Omit.tokenBrokerHeaders` | provider-utils/dist/credential.d.ts:44 |
| <a id="tokenbrokersessionid"></a> `tokenBrokerSessionId?` | `string` | Application voice-session id sent to the broker for ownership checks, audit, and quotas. | `Omit.tokenBrokerSessionId` | provider-utils/dist/credential.d.ts:46 |
| <a id="tokenbrokerurl"></a> `tokenBrokerUrl?` | `string` | Endpoint that mints short-lived, least-privilege tokens; broad provider bearer tokens are not client-safe. | `Omit.tokenBrokerUrl` | provider-utils/dist/credential.d.ts:39 |
| <a id="voice"></a> `voice` | `string` | Neural voice name, e.g. `zh-CN-XiaoxiaoNeural`. Keep server-owned in standard mode. | - | [provider-azure-speech/src/index.ts:38](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-azure-speech/src/index.ts#L38) |

***

### SSMLOptions

Defined in: [provider-azure-speech/src/ssml.ts:56](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-azure-speech/src/ssml.ts#L56)

Default voice / language when [TTSInput](/docs/reference/api/ottervoice-core/#ttsinput) omits them.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="language-1"></a> `language` | `string` | BCP-47 language for the `<voice xml:lang>` attribute. | [provider-azure-speech/src/ssml.ts:60](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-azure-speech/src/ssml.ts#L60) |
| <a id="voice-1"></a> `voice` | `string` | Azure neural voice name (e.g. `zh-CN-XiaoxiaoNeural`). | [provider-azure-speech/src/ssml.ts:58](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-azure-speech/src/ssml.ts#L58) |

## Functions

### azureOutputFormat()

```ts
function azureOutputFormat(format): string;
```

Defined in: [provider-azure-speech/src/ssml.ts:26](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-azure-speech/src/ssml.ts#L26)

Map a core [TTSFormat](/docs/reference/api/ottervoice-core/#ttsformat) to an Azure `X-Microsoft-OutputFormat` value.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `format` | [`TTSFormat`](/docs/reference/api/ottervoice-core/#ttsformat) | OtterVoice TTS format. |

#### Returns

`string`

Azure output-format header value.

***

### buildSSML()

```ts
function buildSSML(input, defaults): string;
```

Defined in: [provider-azure-speech/src/ssml.ts:69](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-azure-speech/src/ssml.ts#L69)

Build an SSML document for a synthesis request.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `input` | [`TTSInput`](/docs/reference/api/ottervoice-core/#ttsinput) | Text plus optional voice / rate / pitch overrides. |
| `defaults` | [`SSMLOptions`](/docs/reference/api/ottervoice-provider-azure-speech/#ssmloptions) | Adapter defaults when `input` omits voice or language. |

#### Returns

`string`

***

### createAzureTTS()

```ts
function createAzureTTS(options): TTSProvider;
```

Defined in: [provider-azure-speech/src/index.ts:61](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-azure-speech/src/index.ts#L61)

Azure Cognitive Services Text-to-Speech provider (REST + SSML).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | [`AzureTTSOptions`](/docs/reference/api/ottervoice-provider-azure-speech/#azurettsoptions) | Region, voice, and credentials (`subscriptionKey` or broker). |

#### Returns

[`TTSProvider`](/docs/reference/api/ottervoice-core/#ttsprovider)

***

### escapeXml()

```ts
function escapeXml(text): string;
```

Defined in: [provider-azure-speech/src/ssml.ts:40](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-azure-speech/src/ssml.ts#L40)

Escape the five XML predefined entities so user text is SSML-safe.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `text` | `string` |

#### Returns

`string`

***

### mimeTypeForFormat()

```ts
function mimeTypeForFormat(format): string;
```

Defined in: [provider-azure-speech/src/ssml.ts:35](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-azure-speech/src/ssml.ts#L35)

MIME type for a synthesized [TTSFormat](/docs/reference/api/ottervoice-core/#ttsformat).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `format` | [`TTSFormat`](/docs/reference/api/ottervoice-core/#ttsformat) | OtterVoice TTS format. |

#### Returns

`string`

***

### ratePercent()

```ts
function ratePercent(speed): string;
```

Defined in: [provider-azure-speech/src/ssml.ts:50](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-azure-speech/src/ssml.ts#L50)

Convert a 0.5–2.0 multiplier into an Azure prosody `rate` percentage.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `speed` | `number` |

#### Returns

`string`
