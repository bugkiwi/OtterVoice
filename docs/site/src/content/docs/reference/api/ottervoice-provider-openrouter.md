---
title: "@ottervoice/provider-openrouter"
description: "由 TypeDoc 从源码 JSDoc 生成的 API 参考（英文注释）。"
editUrl: false
---

[**Documentation**](../index/)

***

[Documentation](/docs/reference/api/index/) / @ottervoice/provider-openrouter

# @ottervoice/provider-openrouter

OpenRouter providers for OtterVoice: text LLM, audio LLM, speech-to-text, and
text-to-speech through OpenAI-compatible APIs.

## Install

```bash
npm install @ottervoice/core @ottervoice/provider-openrouter
```

## Usage

```ts
import { createOpenRouterLLM } from '@ottervoice/provider-openrouter';

const llm = createOpenRouterLLM({
  model: 'openai/gpt-4o-mini',
  tokenBrokerUrl: '/api/voice-token',
});
```

Use `tokenBrokerUrl` in browser and mobile apps so OpenRouter credentials remain
on your server. The package also exports audio LLM, ASR, and TTS provider
factories.

## Links

[Documentation](https://ottervoice.vercel.app/docs/) ·
[GitHub](https://github.com/bugkiwi/OtterVoice)

## License

MIT

## Interfaces

### ChatBody

Defined in: [provider-openrouter/src/chat.ts:7](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/chat.ts#L7)

OpenAI-compatible chat-completions request body fields used by the adapter.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="max_tokens"></a> `max_tokens?` | `number` | Max completion tokens. | [provider-openrouter/src/chat.ts:15](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/chat.ts#L15) |
| <a id="messages"></a> `messages` | \{ `content`: `string`; `role`: `string`; \}[] | Chat messages in OpenAI role/content shape. | [provider-openrouter/src/chat.ts:11](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/chat.ts#L11) |
| <a id="model"></a> `model` | `string` | Model id on OpenRouter. | [provider-openrouter/src/chat.ts:9](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/chat.ts#L9) |
| <a id="reasoning"></a> `reasoning?` | \{ `enabled`: `boolean`; \} | OpenRouter reasoning toggle when the model supports it. | [provider-openrouter/src/chat.ts:21](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/chat.ts#L21) |
| `reasoning.enabled` | `boolean` | - | [provider-openrouter/src/chat.ts:21](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/chat.ts#L21) |
| <a id="response_format"></a> `response_format?` | \{ `type`: `"json_object"`; \} | Force JSON-object responses when supported. | [provider-openrouter/src/chat.ts:19](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/chat.ts#L19) |
| `response_format.type` | `"json_object"` | - | [provider-openrouter/src/chat.ts:19](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/chat.ts#L19) |
| <a id="stream"></a> `stream?` | `boolean` | When true, request SSE streaming. | [provider-openrouter/src/chat.ts:17](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/chat.ts#L17) |
| <a id="temperature"></a> `temperature?` | `number` | Sampling temperature. | [provider-openrouter/src/chat.ts:13](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/chat.ts#L13) |

***

### HeaderOptions

Defined in: [provider-openrouter/src/chat.ts:57](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/chat.ts#L57)

Optional OpenRouter attribution and header overrides.

#### Extended by

- [`OpenRouterOptions`](/docs/reference/api/ottervoice-provider-openrouter/#openrouteroptions)
- [`OpenRouterASROptions`](/docs/reference/api/ottervoice-provider-openrouter/#openrouterasroptions)
- [`OpenRouterTTSOptions`](/docs/reference/api/ottervoice-provider-openrouter/#openrouterttsoptions)
- [`OpenRouterAudioLLMOptions`](/docs/reference/api/ottervoice-provider-openrouter/#openrouteraudiollmoptions)

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="headers"></a> `headers?` | `Record`\<`string`, `string`\> | Extra headers merged last (override defaults carefully). | [provider-openrouter/src/chat.ts:63](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/chat.ts#L63) |
| <a id="referer"></a> `referer?` | `string` | Sent as `HTTP-Referer` for OpenRouter rankings / allowlists. | [provider-openrouter/src/chat.ts:59](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/chat.ts#L59) |
| <a id="title"></a> `title?` | `string` | Sent as `X-Title` (app name shown on OpenRouter). | [provider-openrouter/src/chat.ts:61](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/chat.ts#L61) |

***

### OpenRouterASROptions

Defined in: [provider-openrouter/src/audio.ts:22](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/audio.ts#L22)

Options for OpenRouter HTTP transcription (batch / rolling partial ASR).

#### Extends

- [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`HeaderOptions`](/docs/reference/api/ottervoice-provider-openrouter/#headeroptions)

#### Properties

| Property | Type | Description | Overrides | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="apikey"></a> `apiKey?` | `string` | A long-lived key (server-side only — never ship to clients). | - | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`apiKey`](/docs/reference/api/ottervoice-provider-utils/#apikey) | provider-utils/dist/credential.d.ts:35 |
| <a id="baseurl"></a> `baseUrl?` | `string` | API root; defaults to OpenRouter's chat-compatible base URL. | - | - | [provider-openrouter/src/audio.ts:40](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/audio.ts#L40) |
| <a id="emptypartialbackoffms"></a> `emptyPartialBackoffMs?` | `number` | Delay the next rolling request after an empty provisional transcript. Defaults to the greater of 3x `partialIntervalMs` and 3 seconds. | - | - | [provider-openrouter/src/audio.ts:36](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/audio.ts#L36) |
| <a id="fetch"></a> `fetch?` | [`FetchLike`](/docs/reference/api/ottervoice-provider-utils/#fetchlike) | Custom `fetch` implementation (tests / React Native polyfills). | - | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`fetch`](/docs/reference/api/ottervoice-provider-utils/#fetch) | provider-utils/dist/credential.d.ts:39 |
| <a id="format"></a> `format?` | `"opus"` \| `"webm"` \| `"wav"` \| `"mp3"` | Browser MediaRecorder defaults to WebM. | - | - | [provider-openrouter/src/audio.ts:26](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/audio.ts#L26) |
| <a id="headers-1"></a> `headers?` | `Record`\<`string`, `string`\> | Extra headers merged last (override defaults carefully). | - | [`HeaderOptions`](/docs/reference/api/ottervoice-provider-openrouter/#headeroptions).[`headers`](/docs/reference/api/ottervoice-provider-openrouter/#headers) | [provider-openrouter/src/chat.ts:63](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/chat.ts#L63) |
| <a id="language"></a> `language?` | `string` | BCP-47 language hint sent to the transcription API when supported. | - | - | [provider-openrouter/src/audio.ts:38](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/audio.ts#L38) |
| <a id="model-1"></a> `model` | `string` | OpenRouter / OpenAI-compatible transcription model id. | - | - | [provider-openrouter/src/audio.ts:24](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/audio.ts#L24) |
| <a id="now"></a> `now?` | () => `number` | Test hook for partial-result scheduling. | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`now`](/docs/reference/api/ottervoice-provider-utils/#now) | - | [provider-openrouter/src/audio.ts:44](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/audio.ts#L44) |
| <a id="partialintervalms"></a> `partialIntervalMs?` | `number` | Re-transcribe the accumulated live PCM at this interval to provide best-effort partial results before the turn ends. Omit for batch-only ASR. | - | - | [provider-openrouter/src/audio.ts:31](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/audio.ts#L31) |
| <a id="referer-1"></a> `referer?` | `string` | Sent as `HTTP-Referer` for OpenRouter rankings / allowlists. | - | [`HeaderOptions`](/docs/reference/api/ottervoice-provider-openrouter/#headeroptions).[`referer`](/docs/reference/api/ottervoice-provider-openrouter/#referer) | [provider-openrouter/src/chat.ts:59](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/chat.ts#L59) |
| <a id="requeststage"></a> `requestStage?` | `"gateway"` \| `"provider"` | Classify HTTP failures as gateway/provider errors. Defaults from whether `baseUrl` is customized. | - | - | [provider-openrouter/src/audio.ts:42](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/audio.ts#L42) |
| <a id="title-1"></a> `title?` | `string` | Sent as `X-Title` (app name shown on OpenRouter). | - | [`HeaderOptions`](/docs/reference/api/ottervoice-provider-openrouter/#headeroptions).[`title`](/docs/reference/api/ottervoice-provider-openrouter/#title) | [provider-openrouter/src/chat.ts:61](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/chat.ts#L61) |
| <a id="tokenbrokerurl"></a> `tokenBrokerUrl?` | `string` | Endpoint that mints short-lived tokens (client-safe). | - | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`tokenBrokerUrl`](/docs/reference/api/ottervoice-provider-utils/#tokenbrokerurl) | provider-utils/dist/credential.d.ts:37 |

***

### OpenRouterAudioLLMOptions

Defined in: [provider-openrouter/src/audio-llm.ts:31](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/audio-llm.ts#L31)

Options for the OpenRouter Audio LLM adapter (`pipeline: 'audio_llm'`).

#### Extends

- [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`HeaderOptions`](/docs/reference/api/ottervoice-provider-openrouter/#headeroptions)

#### Properties

| Property | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="apikey-1"></a> `apiKey?` | `string` | A long-lived key (server-side only — never ship to clients). | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`apiKey`](/docs/reference/api/ottervoice-provider-utils/#apikey) | provider-utils/dist/credential.d.ts:35 |
| <a id="baseurl-1"></a> `baseUrl?` | `string` | API root; defaults to OpenRouter's public `…/api/v1`. | - | [provider-openrouter/src/audio-llm.ts:37](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/audio-llm.ts#L37) |
| <a id="defaulttemperature"></a> `defaultTemperature?` | `number` | Default sampling temperature when the session does not override. | - | [provider-openrouter/src/audio-llm.ts:44](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/audio-llm.ts#L44) |
| <a id="fetch-1"></a> `fetch?` | [`FetchLike`](/docs/reference/api/ottervoice-provider-utils/#fetchlike) | Custom `fetch` implementation (tests / React Native polyfills). | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`fetch`](/docs/reference/api/ottervoice-provider-utils/#fetch) | provider-utils/dist/credential.d.ts:39 |
| <a id="headers-2"></a> `headers?` | `Record`\<`string`, `string`\> | Extra headers merged last (override defaults carefully). | [`HeaderOptions`](/docs/reference/api/ottervoice-provider-openrouter/#headeroptions).[`headers`](/docs/reference/api/ottervoice-provider-openrouter/#headers) | [provider-openrouter/src/chat.ts:63](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/chat.ts#L63) |
| <a id="model-2"></a> `model` | `string` | Audio-capable chat model id (e.g. OpenAI GPT-4o-audio via OpenRouter). | - | [provider-openrouter/src/audio-llm.ts:33](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/audio-llm.ts#L33) |
| <a id="now-1"></a> `now?` | () => `number` | Clock override for deterministic expiry checks in tests. | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`now`](/docs/reference/api/ottervoice-provider-utils/#now) | provider-utils/dist/credential.d.ts:41 |
| <a id="prepareaudio"></a> `prepareAudio?` | (`audio`, `format`) => `Promise`\<[`PreparedAudioInput`](/docs/reference/api/ottervoice-provider-openrouter/#preparedaudioinput)\> | OpenAI audio chat accepts WAV/MP3, while browsers normally record WebM. Supply a runtime-specific decoder when WebM/Opus input is possible. | - | [provider-openrouter/src/audio-llm.ts:49](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/audio-llm.ts#L49) |
| <a id="referer-2"></a> `referer?` | `string` | Sent as `HTTP-Referer` for OpenRouter rankings / allowlists. | [`HeaderOptions`](/docs/reference/api/ottervoice-provider-openrouter/#headeroptions).[`referer`](/docs/reference/api/ottervoice-provider-openrouter/#referer) | [provider-openrouter/src/chat.ts:59](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/chat.ts#L59) |
| <a id="requeststage-1"></a> `requestStage?` | `"gateway"` \| `"provider"` | Classify HTTP failures as direct provider or same-origin gateway errors. Defaults to `gateway` when `baseUrl` is customized, otherwise `provider`. | - | [provider-openrouter/src/audio-llm.ts:42](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/audio-llm.ts#L42) |
| <a id="requiredonesentinel"></a> `requireDoneSentinel?` | `boolean` | Require the SSE response to end with an explicit `[DONE]` sentinel. Disabled by default for compatibility with gateways that close a complete stream cleanly. | - | [provider-openrouter/src/audio-llm.ts:57](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/audio-llm.ts#L57) |
| <a id="title-2"></a> `title?` | `string` | Sent as `X-Title` (app name shown on OpenRouter). | [`HeaderOptions`](/docs/reference/api/ottervoice-provider-openrouter/#headeroptions).[`title`](/docs/reference/api/ottervoice-provider-openrouter/#title) | [provider-openrouter/src/chat.ts:61](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/chat.ts#L61) |
| <a id="tokenbrokerurl-1"></a> `tokenBrokerUrl?` | `string` | Endpoint that mints short-lived tokens (client-safe). | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`tokenBrokerUrl`](/docs/reference/api/ottervoice-provider-utils/#tokenbrokerurl) | provider-utils/dist/credential.d.ts:37 |
| <a id="voice"></a> `voice?` | \| `"alloy"` \| `"ash"` \| `"ballad"` \| `"coral"` \| `"echo"` \| `"fable"` \| `"nova"` \| `"onyx"` \| `"sage"` \| `"shimmer"` \| `"verse"` | Output voice when the model returns spoken audio. | - | [provider-openrouter/src/audio-llm.ts:35](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/audio-llm.ts#L35) |

***

### OpenRouterOptions

Defined in: [provider-openrouter/src/index.ts:34](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/index.ts#L34)

Options for [createOpenRouterLLM](/docs/reference/api/ottervoice-provider-openrouter/#createopenrouterllm). Extends [CredentialOptions](/docs/reference/api/ottervoice-provider-utils/#credentialoptions) and
[HeaderOptions](/docs/reference/api/ottervoice-provider-openrouter/#headeroptions); prefer `tokenBrokerUrl` on clients over a static `apiKey`.

#### Extends

- [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`HeaderOptions`](/docs/reference/api/ottervoice-provider-openrouter/#headeroptions)

#### Properties

| Property | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="apikey-2"></a> `apiKey?` | `string` | A long-lived key (server-side only — never ship to clients). | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`apiKey`](/docs/reference/api/ottervoice-provider-utils/#apikey) | provider-utils/dist/credential.d.ts:35 |
| <a id="baseurl-2"></a> `baseUrl?` | `string` | API base, default `https://openrouter.ai/api/v1`. | - | [provider-openrouter/src/index.ts:38](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/index.ts#L38) |
| <a id="defaulttemperature-1"></a> `defaultTemperature?` | `number` | Applied when a request does not specify its own temperature. | - | [provider-openrouter/src/index.ts:42](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/index.ts#L42) |
| <a id="fetch-2"></a> `fetch?` | [`FetchLike`](/docs/reference/api/ottervoice-provider-utils/#fetchlike) | Custom `fetch` implementation (tests / React Native polyfills). | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`fetch`](/docs/reference/api/ottervoice-provider-utils/#fetch) | provider-utils/dist/credential.d.ts:39 |
| <a id="headers-3"></a> `headers?` | `Record`\<`string`, `string`\> | Extra headers merged last (override defaults carefully). | [`HeaderOptions`](/docs/reference/api/ottervoice-provider-openrouter/#headeroptions).[`headers`](/docs/reference/api/ottervoice-provider-openrouter/#headers) | [provider-openrouter/src/chat.ts:63](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/chat.ts#L63) |
| <a id="model-3"></a> `model` | `string` | OpenRouter model id, e.g. `openai/gpt-4o-mini`. | - | [provider-openrouter/src/index.ts:36](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/index.ts#L36) |
| <a id="now-2"></a> `now?` | () => `number` | Clock override for deterministic expiry checks in tests. | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`now`](/docs/reference/api/ottervoice-provider-utils/#now) | provider-utils/dist/credential.d.ts:41 |
| <a id="reasoningenabled"></a> `reasoningEnabled?` | `boolean` | Explicitly enable/disable reasoning tokens on compatible models. | - | [provider-openrouter/src/index.ts:44](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/index.ts#L44) |
| <a id="referer-3"></a> `referer?` | `string` | Sent as `HTTP-Referer` for OpenRouter rankings / allowlists. | [`HeaderOptions`](/docs/reference/api/ottervoice-provider-openrouter/#headeroptions).[`referer`](/docs/reference/api/ottervoice-provider-openrouter/#referer) | [provider-openrouter/src/chat.ts:59](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/chat.ts#L59) |
| <a id="requeststage-2"></a> `requestStage?` | `"gateway"` \| `"provider"` | Classify HTTP failures as gateway/provider errors. Defaults from whether `baseUrl` is customized. | - | [provider-openrouter/src/index.ts:40](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/index.ts#L40) |
| <a id="title-3"></a> `title?` | `string` | Sent as `X-Title` (app name shown on OpenRouter). | [`HeaderOptions`](/docs/reference/api/ottervoice-provider-openrouter/#headeroptions).[`title`](/docs/reference/api/ottervoice-provider-openrouter/#title) | [provider-openrouter/src/chat.ts:61](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/chat.ts#L61) |
| <a id="tokenbrokerurl-2"></a> `tokenBrokerUrl?` | `string` | Endpoint that mints short-lived tokens (client-safe). | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`tokenBrokerUrl`](/docs/reference/api/ottervoice-provider-utils/#tokenbrokerurl) | provider-utils/dist/credential.d.ts:37 |

***

### OpenRouterTTSOptions

Defined in: [provider-openrouter/src/audio.ts:48](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/audio.ts#L48)

Options for OpenRouter HTTP speech synthesis.

#### Extends

- [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`HeaderOptions`](/docs/reference/api/ottervoice-provider-openrouter/#headeroptions)

#### Properties

| Property | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="apikey-3"></a> `apiKey?` | `string` | A long-lived key (server-side only — never ship to clients). | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`apiKey`](/docs/reference/api/ottervoice-provider-utils/#apikey) | provider-utils/dist/credential.d.ts:35 |
| <a id="baseurl-3"></a> `baseUrl?` | `string` | API root; defaults to OpenRouter's chat-compatible base URL. | - | [provider-openrouter/src/audio.ts:54](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/audio.ts#L54) |
| <a id="fetch-3"></a> `fetch?` | [`FetchLike`](/docs/reference/api/ottervoice-provider-utils/#fetchlike) | Custom `fetch` implementation (tests / React Native polyfills). | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`fetch`](/docs/reference/api/ottervoice-provider-utils/#fetch) | provider-utils/dist/credential.d.ts:39 |
| <a id="headers-4"></a> `headers?` | `Record`\<`string`, `string`\> | Extra headers merged last (override defaults carefully). | [`HeaderOptions`](/docs/reference/api/ottervoice-provider-openrouter/#headeroptions).[`headers`](/docs/reference/api/ottervoice-provider-openrouter/#headers) | [provider-openrouter/src/chat.ts:63](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/chat.ts#L63) |
| <a id="model-4"></a> `model` | `string` | OpenRouter / OpenAI-compatible TTS model id. | - | [provider-openrouter/src/audio.ts:50](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/audio.ts#L50) |
| <a id="now-3"></a> `now?` | () => `number` | Clock override for deterministic expiry checks in tests. | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`now`](/docs/reference/api/ottervoice-provider-utils/#now) | provider-utils/dist/credential.d.ts:41 |
| <a id="referer-4"></a> `referer?` | `string` | Sent as `HTTP-Referer` for OpenRouter rankings / allowlists. | [`HeaderOptions`](/docs/reference/api/ottervoice-provider-openrouter/#headeroptions).[`referer`](/docs/reference/api/ottervoice-provider-openrouter/#referer) | [provider-openrouter/src/chat.ts:59](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/chat.ts#L59) |
| <a id="requeststage-3"></a> `requestStage?` | `"gateway"` \| `"provider"` | Classify HTTP failures as gateway/provider errors. Defaults from whether `baseUrl` is customized. | - | [provider-openrouter/src/audio.ts:56](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/audio.ts#L56) |
| <a id="speed"></a> `speed?` | `number` | Speaking rate multiplier when the upstream model supports it. | - | [provider-openrouter/src/audio.ts:58](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/audio.ts#L58) |
| <a id="title-4"></a> `title?` | `string` | Sent as `X-Title` (app name shown on OpenRouter). | [`HeaderOptions`](/docs/reference/api/ottervoice-provider-openrouter/#headeroptions).[`title`](/docs/reference/api/ottervoice-provider-openrouter/#title) | [provider-openrouter/src/chat.ts:61](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/chat.ts#L61) |
| <a id="tokenbrokerurl-3"></a> `tokenBrokerUrl?` | `string` | Endpoint that mints short-lived tokens (client-safe). | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`tokenBrokerUrl`](/docs/reference/api/ottervoice-provider-utils/#tokenbrokerurl) | provider-utils/dist/credential.d.ts:37 |
| <a id="voice-1"></a> `voice` | `string` | Voice name accepted by the selected model. | - | [provider-openrouter/src/audio.ts:52](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/audio.ts#L52) |

***

### PreparedAudioInput

Defined in: [provider-openrouter/src/audio-llm.ts:23](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/audio-llm.ts#L23)

WAV/MP3 bytes ready for OpenAI-compatible audio chat.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="audio"></a> `audio` | `ArrayBuffer` | Encoded audio body. | [provider-openrouter/src/audio-llm.ts:25](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/audio-llm.ts#L25) |
| <a id="format-1"></a> `format` | `"wav"` \| `"mp3"` | Container accepted by the audio chat API. | [provider-openrouter/src/audio-llm.ts:27](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/audio-llm.ts#L27) |

## Variables

### DEFAULT\_BASE\_URL

```ts
const DEFAULT_BASE_URL: "https://openrouter.ai/api/v1" = 'https://openrouter.ai/api/v1';
```

Defined in: [provider-openrouter/src/chat.ts:4](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/chat.ts#L4)

Default OpenRouter OpenAI-compatible API root.

## Functions

### buildChatBody()

```ts
function buildChatBody(
   model,
   input,
   defaults?,
   openRouter?): ChatBody;
```

Defined in: [provider-openrouter/src/chat.ts:32](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/chat.ts#L32)

Build the OpenAI-compatible chat-completions request body.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `model` | `string` | OpenRouter model id. |
| `input` | [`LLMGenerateInput`](/docs/reference/api/ottervoice-core/#llmgenerateinput) | Core [LLMGenerateInput](/docs/reference/api/ottervoice-core/#llmgenerateinput) messages and knobs. |
| `defaults` | \{ `stream?`: `boolean`; `temperature?`: `number`; \} | Adapter-level temperature / stream defaults. |
| `defaults.stream?` | `boolean` | - |
| `defaults.temperature?` | `number` | - |
| `openRouter` | \{ `reasoningEnabled?`: `boolean`; \} | OpenRouter-specific extras (e.g. reasoning). |
| `openRouter.reasoningEnabled?` | `boolean` | - |

#### Returns

[`ChatBody`](/docs/reference/api/ottervoice-provider-openrouter/#chatbody)

***

### buildHeaders()

```ts
function buildHeaders(token, options): Record<string, string>;
```

Defined in: [provider-openrouter/src/chat.ts:72](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/chat.ts#L72)

Assemble request headers, including OpenRouter's optional attribution.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `token` | `string` | Bearer token from apiKey or token broker. |
| `options` | [`HeaderOptions`](/docs/reference/api/ottervoice-provider-openrouter/#headeroptions) | Attribution and header overrides. |

#### Returns

`Record`\<`string`, `string`\>

***

### bytesToBase64()

```ts
function bytesToBase64(bytes): string;
```

Defined in: [provider-openrouter/src/audio.ts:152](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/audio.ts#L152)

Browser- and Node-safe base64 without relying on Buffer.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `bytes` | `Uint8Array` |

#### Returns

`string`

***

### createOpenRouterASR()

```ts
function createOpenRouterASR(options): ASRProvider;
```

Defined in: [provider-openrouter/src/audio.ts:177](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/audio.ts#L177)

Transcription through OpenRouter's `/audio/transcriptions` endpoint.
The default remains one request at turn end. Setting `partialIntervalMs`
adds rolling, best-effort snapshots for low-latency partial text while the
final request still covers the complete turn.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | [`OpenRouterASROptions`](/docs/reference/api/ottervoice-provider-openrouter/#openrouterasroptions) | Model, credentials, and optional rolling-partial interval. |

#### Returns

[`ASRProvider`](/docs/reference/api/ottervoice-core/#asrprovider)

An [ASRProvider](/docs/reference/api/ottervoice-core/#asrprovider) for VoiceSessionConfig.providers.asr.

***

### createOpenRouterAudioLLM()

```ts
function createOpenRouterAudioLLM(options): AudioLLMProvider;
```

Defined in: [provider-openrouter/src/audio-llm.ts:174](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/audio-llm.ts#L174)

OpenRouter chat-completions adapter for models such as
`openai/gpt-audio-mini` that understand speech and generate speech directly.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | [`OpenRouterAudioLLMOptions`](/docs/reference/api/ottervoice-provider-openrouter/#openrouteraudiollmoptions) | Model, voice, credentials, and optional WebM→WAV preparer. |

#### Returns

[`AudioLLMProvider`](/docs/reference/api/ottervoice-core/#audiollmprovider)

An [AudioLLMProvider](/docs/reference/api/ottervoice-core/#audiollmprovider) for `pipeline: 'audio_llm'`.

***

### createOpenRouterLLM()

```ts
function createOpenRouterLLM(options): LLMProvider;
```

Defined in: [provider-openrouter/src/index.ts:55](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/index.ts#L55)

LLM provider backed by OpenRouter's OpenAI-compatible HTTP API. Credentials
come from a static `apiKey` (server) or a `tokenBrokerUrl` (client-safe).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | [`OpenRouterOptions`](/docs/reference/api/ottervoice-provider-openrouter/#openrouteroptions) | Model id plus [CredentialOptions](/docs/reference/api/ottervoice-provider-utils/#credentialoptions) / header overrides. |

#### Returns

[`LLMProvider`](/docs/reference/api/ottervoice-core/#llmprovider)

***

### createOpenRouterTTS()

```ts
function createOpenRouterTTS(options): TTSProvider;
```

Defined in: [provider-openrouter/src/audio.ts:430](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/audio.ts#L430)

OpenRouter TTS through the OpenAI-compatible `/audio/speech` endpoint.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | [`OpenRouterTTSOptions`](/docs/reference/api/ottervoice-provider-openrouter/#openrouterttsoptions) | Model, voice, credentials, and optional speed. |

#### Returns

[`TTSProvider`](/docs/reference/api/ottervoice-core/#ttsprovider)

A [TTSProvider](/docs/reference/api/ottervoice-core/#ttsprovider) for the classic `asr_llm_tts` pipeline.

***

### extractDelta()

```ts
function extractDelta(json): string;
```

Defined in: [provider-openrouter/src/chat.ts:110](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/chat.ts#L110)

Extract the incremental text from a streamed chunk.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `json` | `ChatCompletion` |

#### Returns

`string`

***

### extractText()

```ts
function extractText(json): string;
```

Defined in: [provider-openrouter/src/chat.ts:105](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/chat.ts#L105)

Extract the assistant text from a non-streamed completion.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `json` | `ChatCompletion` |

#### Returns

`string`

***

### mapUsage()

```ts
function mapUsage(usage):
  | LLMUsage
  | undefined;
```

Defined in: [provider-openrouter/src/chat.ts:90](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/chat.ts#L90)

Map an OpenAI-style `usage` object to the core [LLMUsage](/docs/reference/api/ottervoice-core/#llmusage) shape.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `usage` | `RawUsage` \| `null` \| `undefined` |

#### Returns

  \| [`LLMUsage`](/docs/reference/api/ottervoice-core/#llmusage)
  \| `undefined`

***

### pcm16ToWav()

```ts
function pcm16ToWav(pcm, sampleRate?): ArrayBuffer;
```

Defined in: [provider-openrouter/src/audio-llm.ts:144](https://github.com/bugkiwi/OtterVoice/blob/2bfc8092126714d41319b22544fc5f9414c591f5/packages/provider-openrouter/src/audio-llm.ts#L144)

Wrap OpenAI's 24 kHz mono PCM16 stream so browser audio elements can play it.

#### Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `pcm` | `Uint8Array` | `undefined` | Interleaved little-endian PCM16 bytes. |
| `sampleRate` | `number` | `24_000` | Sample rate in Hz (OpenAI audio chat defaults to 24_000). |

#### Returns

`ArrayBuffer`

A standard WAV container buffer.
