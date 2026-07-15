---
title: "@ottervoice/provider-azure-speech"
description: "API reference generated from source JSDoc via TypeDoc."
editUrl: false
---

[**Documentation**](../index/)

***

[Documentation](/docs/en/reference/api/index/) / @ottervoice/provider-azure-speech

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
});
```

Use `tokenBrokerUrl` in browser and mobile apps so Azure credentials remain on
your server. `subscriptionKey` is available for trusted server-side code.

## Links

[Documentation](https://ottervoice.vercel.app/docs/) ·
[GitHub](https://github.com/bugkiwi/OtterVoice)

## License

MIT

## Interfaces

### AzureTTSOptions

Defined in: [provider-azure-speech/src/index.ts:30](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-azure-speech/src/index.ts#L30)

Options for [createAzureTTS](/docs/en/reference/api/ottervoice-provider-azure-speech/#createazuretts). Region and neural voice are required;
authenticate with `subscriptionKey` (server) or `tokenBrokerUrl` (client-safe).
Shares broker/`fetch` fields from [CredentialOptions](/docs/en/reference/api/ottervoice-provider-utils/#credentialoptions) (use `subscriptionKey`
instead of `apiKey`).

#### Extends

- `Omit`\<[`CredentialOptions`](/docs/en/reference/api/ottervoice-provider-utils/#credentialoptions), `"apiKey"`\>

#### Properties

| Property | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="defaultformat"></a> `defaultFormat?` | [`TTSFormat`](/docs/en/reference/api/ottervoice-core/#ttsformat) | Default audio container when the request omits `format`. | - | [provider-azure-speech/src/index.ts:40](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-azure-speech/src/index.ts#L40) |
| <a id="endpoint"></a> `endpoint?` | `string` | Override the synthesis endpoint (defaults to the region host). | - | [provider-azure-speech/src/index.ts:42](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-azure-speech/src/index.ts#L42) |
| <a id="fetch"></a> `fetch?` | [`FetchLike`](/docs/en/reference/api/ottervoice-provider-utils/#fetchlike) | Custom `fetch` implementation (tests / React Native polyfills). | `Omit.fetch` | provider-utils/dist/credential.d.ts:39 |
| <a id="language"></a> `language?` | `string` | BCP-47 language tag for SSML. Defaults to `en-US`. | - | [provider-azure-speech/src/index.ts:38](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-azure-speech/src/index.ts#L38) |
| <a id="now"></a> `now?` | () => `number` | Clock override for deterministic expiry checks in tests. | `Omit.now` | provider-utils/dist/credential.d.ts:41 |
| <a id="region"></a> `region` | `string` | Azure region, e.g. `eastus`. | - | [provider-azure-speech/src/index.ts:32](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-azure-speech/src/index.ts#L32) |
| <a id="subscriptionkey"></a> `subscriptionKey?` | `string` | Subscription key (server-side). Mutually exclusive with `tokenBrokerUrl`. | - | [provider-azure-speech/src/index.ts:34](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-azure-speech/src/index.ts#L34) |
| <a id="tokenbrokerurl"></a> `tokenBrokerUrl?` | `string` | Endpoint that mints short-lived tokens (client-safe). | `Omit.tokenBrokerUrl` | provider-utils/dist/credential.d.ts:37 |
| <a id="voice"></a> `voice` | `string` | Neural voice name, e.g. `zh-CN-XiaoxiaoNeural`. | - | [provider-azure-speech/src/index.ts:36](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-azure-speech/src/index.ts#L36) |

***

### SSMLOptions

Defined in: [provider-azure-speech/src/ssml.ts:56](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-azure-speech/src/ssml.ts#L56)

Default voice / language when [TTSInput](/docs/en/reference/api/ottervoice-core/#ttsinput) omits them.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="language-1"></a> `language` | `string` | BCP-47 language for the `<voice xml:lang>` attribute. | [provider-azure-speech/src/ssml.ts:60](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-azure-speech/src/ssml.ts#L60) |
| <a id="voice-1"></a> `voice` | `string` | Azure neural voice name (e.g. `zh-CN-XiaoxiaoNeural`). | [provider-azure-speech/src/ssml.ts:58](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-azure-speech/src/ssml.ts#L58) |

## Functions

### azureOutputFormat()

```ts
function azureOutputFormat(format): string;
```

Defined in: [provider-azure-speech/src/ssml.ts:26](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-azure-speech/src/ssml.ts#L26)

Map a core [TTSFormat](/docs/en/reference/api/ottervoice-core/#ttsformat) to an Azure `X-Microsoft-OutputFormat` value.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `format` | [`TTSFormat`](/docs/en/reference/api/ottervoice-core/#ttsformat) | OtterVoice TTS format. |

#### Returns

`string`

Azure output-format header value.

***

### buildSSML()

```ts
function buildSSML(input, defaults): string;
```

Defined in: [provider-azure-speech/src/ssml.ts:69](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-azure-speech/src/ssml.ts#L69)

Build an SSML document for a synthesis request.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `input` | [`TTSInput`](/docs/en/reference/api/ottervoice-core/#ttsinput) | Text plus optional voice / rate / pitch overrides. |
| `defaults` | [`SSMLOptions`](/docs/en/reference/api/ottervoice-provider-azure-speech/#ssmloptions) | Adapter defaults when `input` omits voice or language. |

#### Returns

`string`

***

### createAzureTTS()

```ts
function createAzureTTS(options): TTSProvider;
```

Defined in: [provider-azure-speech/src/index.ts:59](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-azure-speech/src/index.ts#L59)

Azure Cognitive Services Text-to-Speech provider (REST + SSML).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | [`AzureTTSOptions`](/docs/en/reference/api/ottervoice-provider-azure-speech/#azurettsoptions) | Region, voice, and credentials (`subscriptionKey` or broker). |

#### Returns

[`TTSProvider`](/docs/en/reference/api/ottervoice-core/#ttsprovider)

***

### escapeXml()

```ts
function escapeXml(text): string;
```

Defined in: [provider-azure-speech/src/ssml.ts:40](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-azure-speech/src/ssml.ts#L40)

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

Defined in: [provider-azure-speech/src/ssml.ts:35](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-azure-speech/src/ssml.ts#L35)

MIME type for a synthesized [TTSFormat](/docs/en/reference/api/ottervoice-core/#ttsformat).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `format` | [`TTSFormat`](/docs/en/reference/api/ottervoice-core/#ttsformat) | OtterVoice TTS format. |

#### Returns

`string`

***

### ratePercent()

```ts
function ratePercent(speed): string;
```

Defined in: [provider-azure-speech/src/ssml.ts:50](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-azure-speech/src/ssml.ts#L50)

Convert a 0.5–2.0 multiplier into an Azure prosody `rate` percentage.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `speed` | `number` |

#### Returns

`string`
