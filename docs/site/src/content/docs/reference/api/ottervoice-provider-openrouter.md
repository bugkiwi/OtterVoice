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

## Browser / app (recommended)

```ts
import { createOpenRouterGatewayVoiceTurn } from '@ottervoice/provider-openrouter';

const voice = createOpenRouterGatewayVoiceTurn({
  baseUrl: '/api/voice/asr-llm-tts',
  prepareAudio,
});
```

Pair this with server-side `createOpenRouterGateway()`. The server owns the
model, system prompt, voice, temperature, token ceiling, reasoning policy,
authorization, and budget. The browser sends only user content and transport
data.

```ts
import { createOpenRouterGateway } from '@ottervoice/provider-openrouter';

const handleVoice = createOpenRouterGateway({
  apiKey: process.env.OPENROUTER_API_KEY,
  policy: {
    asr: { model: 'qwen/qwen3-asr-flash-2026-02-10' },
    llm: {
      model: 'openai/gpt-4o-mini',
      systemPrompt: process.env.OTTERVOICE_SYSTEM_PROMPT ?? 'Be concise.',
      maxTokens: 256,
    },
    tts: {
      model: 'minimax/speech-2.8-turbo',
      voice: 'alloy',
      responseFormat: 'mp3',
    },
  },
  authorize: async ({ request, profile }) =>
    validateUserConversationAndProfile(request, profile),
});
```

Mount `handleVoice` at `/api/voice/*`. The composite
`asr-llm-tts/chat/completions` route accepts one audio turn, runs all three
stages on the server, and returns text plus sentence-sized MP3 segments over
one SSE response. Apps use this route or the native `audio-llm` route through
the same `AudioLLMProvider` contract. The standalone `asr` route remains
available only for optional captions; there are no standalone client LLM/TTS
profiles.

Direct `createOpenRouterLLM()` and `createOpenRouterTTS()` factories remain as
trusted-server building blocks for composite audio-turn implementations. Do not return a broad OpenRouter bearer token to a
browser: hiding a long-lived key is insufficient if the client can still select
models or generation parameters.

## Links

[Documentation](https://ottervoice.vercel.app/docs/) ·
[GitHub](https://github.com/bugkiwi/OtterVoice)

## License

MIT

## Interfaces

### ChatBody

Defined in: [provider-openrouter/src/chat.ts:7](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/chat.ts#L7)

OpenAI-compatible chat-completions request body fields used by the adapter.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="max_tokens"></a> `max_tokens?` | `number` | Max completion tokens. | [provider-openrouter/src/chat.ts:15](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/chat.ts#L15) |
| <a id="messages"></a> `messages` | \{ `content`: `string`; `role`: `string`; \}[] | Chat messages in OpenAI role/content shape. | [provider-openrouter/src/chat.ts:11](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/chat.ts#L11) |
| <a id="model"></a> `model` | `string` | Model id on OpenRouter. | [provider-openrouter/src/chat.ts:9](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/chat.ts#L9) |
| <a id="reasoning"></a> `reasoning?` | \{ `enabled`: `boolean`; \} | OpenRouter reasoning toggle when the model supports it. | [provider-openrouter/src/chat.ts:21](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/chat.ts#L21) |
| `reasoning.enabled` | `boolean` | - | [provider-openrouter/src/chat.ts:21](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/chat.ts#L21) |
| <a id="response_format"></a> `response_format?` | \{ `type`: `"json_object"`; \} | Force JSON-object responses when supported. | [provider-openrouter/src/chat.ts:19](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/chat.ts#L19) |
| `response_format.type` | `"json_object"` | - | [provider-openrouter/src/chat.ts:19](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/chat.ts#L19) |
| <a id="stream"></a> `stream?` | `boolean` | When true, request SSE streaming. | [provider-openrouter/src/chat.ts:17](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/chat.ts#L17) |
| <a id="temperature"></a> `temperature?` | `number` | Sampling temperature. | [provider-openrouter/src/chat.ts:13](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/chat.ts#L13) |

***

### ChatCompletion

Defined in: [provider-openrouter/src/chat.ts:104](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/chat.ts#L104)

Minimal chat-completion payload accepted by the text extraction helpers.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="choices"></a> `choices?` | \{ `delta?`: \{ `content?`: `string`; \}; `message?`: \{ `content?`: `string`; \}; \}[] | Completion choices containing either a final message or streamed delta. | [provider-openrouter/src/chat.ts:106](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/chat.ts#L106) |
| <a id="usage"></a> `usage?` | [`RawUsage`](/docs/reference/api/ottervoice-provider-openrouter/#rawusage) | Optional OpenAI-compatible token accounting. | [provider-openrouter/src/chat.ts:108](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/chat.ts#L108) |

***

### HeaderOptions

Defined in: [provider-openrouter/src/chat.ts:57](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/chat.ts#L57)

Optional OpenRouter attribution and header overrides.

#### Extended by

- [`OpenRouterOptions`](/docs/reference/api/ottervoice-provider-openrouter/#openrouteroptions)
- [`OpenRouterASROptions`](/docs/reference/api/ottervoice-provider-openrouter/#openrouterasroptions)
- [`OpenRouterTTSOptions`](/docs/reference/api/ottervoice-provider-openrouter/#openrouterttsoptions)
- [`OpenRouterAudioLLMOptions`](/docs/reference/api/ottervoice-provider-openrouter/#openrouteraudiollmoptions)

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="headers"></a> `headers?` | `Record`\<`string`, `string`\> | Extra headers merged last (override defaults carefully). | [provider-openrouter/src/chat.ts:63](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/chat.ts#L63) |
| <a id="referer"></a> `referer?` | `string` | Sent as `HTTP-Referer` for OpenRouter rankings / allowlists. | [provider-openrouter/src/chat.ts:59](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/chat.ts#L59) |
| <a id="title"></a> `title?` | `string` | Sent as `X-Title` (app name shown on OpenRouter). | [provider-openrouter/src/chat.ts:61](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/chat.ts#L61) |

***

### OpenRouterASROptions

Defined in: [provider-openrouter/src/audio.ts:26](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/audio.ts#L26)

Options for direct OpenRouter HTTP transcription in trusted server/CLI
runtimes. Browser/app integrations should use `OpenRouterGatewayASROptions`.

#### Extends

- [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`HeaderOptions`](/docs/reference/api/ottervoice-provider-openrouter/#headeroptions)

#### Properties

| Property | Type | Description | Overrides | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="apikey"></a> `apiKey?` | `string` | A long-lived key (server-side only — never ship to clients). | - | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`apiKey`](/docs/reference/api/ottervoice-provider-utils/#apikey) | provider-utils/dist/credential.d.ts:37 |
| <a id="baseurl"></a> `baseUrl?` | `string` | API root; defaults to OpenRouter's chat-compatible base URL. | - | - | [provider-openrouter/src/audio.ts:44](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/audio.ts#L44) |
| <a id="emptypartialbackoffms"></a> `emptyPartialBackoffMs?` | `number` | Delay the next rolling request after an empty provisional transcript. Defaults to the greater of 3x `partialIntervalMs` and 3 seconds. | - | - | [provider-openrouter/src/audio.ts:40](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/audio.ts#L40) |
| <a id="fetch"></a> `fetch?` | [`FetchLike`](/docs/reference/api/ottervoice-provider-utils/#fetchlike) | Custom `fetch` implementation (tests / React Native polyfills). | - | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`fetch`](/docs/reference/api/ottervoice-provider-utils/#fetch) | provider-utils/dist/credential.d.ts:50 |
| <a id="format"></a> `format?` | `"opus"` \| `"webm"` \| `"wav"` \| `"mp3"` | Browser MediaRecorder defaults to WebM. | - | - | [provider-openrouter/src/audio.ts:30](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/audio.ts#L30) |
| <a id="headers-1"></a> `headers?` | `Record`\<`string`, `string`\> | Extra headers merged last (override defaults carefully). | - | [`HeaderOptions`](/docs/reference/api/ottervoice-provider-openrouter/#headeroptions).[`headers`](/docs/reference/api/ottervoice-provider-openrouter/#headers) | [provider-openrouter/src/chat.ts:63](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/chat.ts#L63) |
| <a id="language"></a> `language?` | `string` | BCP-47 language hint sent to the transcription API when supported. Keep server-owned in standard mode. | - | - | [provider-openrouter/src/audio.ts:42](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/audio.ts#L42) |
| <a id="model-1"></a> `model` | `string` | OpenRouter / OpenAI-compatible transcription model id. Keep server-owned. | - | - | [provider-openrouter/src/audio.ts:28](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/audio.ts#L28) |
| <a id="now"></a> `now?` | () => `number` | Test hook for partial-result scheduling. | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`now`](/docs/reference/api/ottervoice-provider-utils/#now) | - | [provider-openrouter/src/audio.ts:48](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/audio.ts#L48) |
| <a id="partialintervalms"></a> `partialIntervalMs?` | `number` | Re-transcribe the accumulated live PCM at this interval to provide best-effort partial results before the turn ends. Omit for batch-only ASR. | - | - | [provider-openrouter/src/audio.ts:35](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/audio.ts#L35) |
| <a id="referer-1"></a> `referer?` | `string` | Sent as `HTTP-Referer` for OpenRouter rankings / allowlists. | - | [`HeaderOptions`](/docs/reference/api/ottervoice-provider-openrouter/#headeroptions).[`referer`](/docs/reference/api/ottervoice-provider-openrouter/#referer) | [provider-openrouter/src/chat.ts:59](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/chat.ts#L59) |
| <a id="requeststage"></a> `requestStage?` | `"gateway"` \| `"provider"` | Classify HTTP failures as gateway/provider errors. Defaults from whether `baseUrl` is customized. | - | - | [provider-openrouter/src/audio.ts:46](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/audio.ts#L46) |
| <a id="servermanaged"></a> `serverManaged?` | `boolean` | Omit provider policy fields because a trusted gateway reconstructs the request. | - | - | [provider-openrouter/src/audio.ts:50](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/audio.ts#L50) |
| <a id="title-1"></a> `title?` | `string` | Sent as `X-Title` (app name shown on OpenRouter). | - | [`HeaderOptions`](/docs/reference/api/ottervoice-provider-openrouter/#headeroptions).[`title`](/docs/reference/api/ottervoice-provider-openrouter/#title) | [provider-openrouter/src/chat.ts:61](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/chat.ts#L61) |
| <a id="tokenbrokercredentials"></a> `tokenBrokerCredentials?` | `RequestCredentials` | Browser credential mode for the broker request. Use `include` for a cross-origin cookie session. | - | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`tokenBrokerCredentials`](/docs/reference/api/ottervoice-provider-utils/#tokenbrokercredentials) | provider-utils/dist/credential.d.ts:48 |
| <a id="tokenbrokerheaders"></a> `tokenBrokerHeaders?` | `Readonly`\<`Record`\<`string`, `string`\>\> | Application-authentication headers sent only to the token broker, such as a short-lived user session bearer token. Use browser-compatible characters. | - | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`tokenBrokerHeaders`](/docs/reference/api/ottervoice-provider-utils/#tokenbrokerheaders) | provider-utils/dist/credential.d.ts:44 |
| <a id="tokenbrokersessionid"></a> `tokenBrokerSessionId?` | `string` | Application voice-session id sent to the broker for ownership checks, audit, and quotas. | - | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`tokenBrokerSessionId`](/docs/reference/api/ottervoice-provider-utils/#tokenbrokersessionid) | provider-utils/dist/credential.d.ts:46 |
| <a id="tokenbrokerurl"></a> `tokenBrokerUrl?` | `string` | Endpoint that mints short-lived, least-privilege tokens; broad provider bearer tokens are not client-safe. | - | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`tokenBrokerUrl`](/docs/reference/api/ottervoice-provider-utils/#tokenbrokerurl) | provider-utils/dist/credential.d.ts:39 |

***

### OpenRouterAudioLLMOptions

Defined in: [provider-openrouter/src/audio-llm.ts:35](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/audio-llm.ts#L35)

Options for the direct OpenRouter Audio LLM adapter in trusted server/CLI
runtimes. Browser/app integrations should use
`OpenRouterGatewayAudioLLMOptions`.

#### Extends

- [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`HeaderOptions`](/docs/reference/api/ottervoice-provider-openrouter/#headeroptions)

#### Properties

| Property | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="apikey-1"></a> `apiKey?` | `string` | A long-lived key (server-side only — never ship to clients). | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`apiKey`](/docs/reference/api/ottervoice-provider-utils/#apikey) | provider-utils/dist/credential.d.ts:37 |
| <a id="baseurl-1"></a> `baseUrl?` | `string` | API root; defaults to OpenRouter's public `…/api/v1`. | - | [provider-openrouter/src/audio-llm.ts:41](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/audio-llm.ts#L41) |
| <a id="defaulttemperature"></a> `defaultTemperature?` | `number` | Default sampling temperature when the session does not override. Keep server-owned. | - | [provider-openrouter/src/audio-llm.ts:48](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/audio-llm.ts#L48) |
| <a id="fetch-1"></a> `fetch?` | [`FetchLike`](/docs/reference/api/ottervoice-provider-utils/#fetchlike) | Custom `fetch` implementation (tests / React Native polyfills). | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`fetch`](/docs/reference/api/ottervoice-provider-utils/#fetch) | provider-utils/dist/credential.d.ts:50 |
| <a id="headers-2"></a> `headers?` | `Record`\<`string`, `string`\> | Extra headers merged last (override defaults carefully). | [`HeaderOptions`](/docs/reference/api/ottervoice-provider-openrouter/#headeroptions).[`headers`](/docs/reference/api/ottervoice-provider-openrouter/#headers) | [provider-openrouter/src/chat.ts:63](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/chat.ts#L63) |
| <a id="model-2"></a> `model` | `string` | Audio-capable chat model id. Keep server-owned in standard mode. | - | [provider-openrouter/src/audio-llm.ts:37](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/audio-llm.ts#L37) |
| <a id="now-1"></a> `now?` | () => `number` | Clock override for deterministic expiry checks in tests. | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`now`](/docs/reference/api/ottervoice-provider-utils/#now) | provider-utils/dist/credential.d.ts:52 |
| <a id="prepareaudio"></a> `prepareAudio?` | (`audio`, `format`) => `Promise`\<[`PreparedAudioInput`](/docs/reference/api/ottervoice-provider-openrouter/#preparedaudioinput)\> | OpenAI audio chat accepts WAV/MP3, while browsers normally record WebM. Supply a runtime-specific decoder when WebM/Opus input is possible. | - | [provider-openrouter/src/audio-llm.ts:53](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/audio-llm.ts#L53) |
| <a id="referer-2"></a> `referer?` | `string` | Sent as `HTTP-Referer` for OpenRouter rankings / allowlists. | [`HeaderOptions`](/docs/reference/api/ottervoice-provider-openrouter/#headeroptions).[`referer`](/docs/reference/api/ottervoice-provider-openrouter/#referer) | [provider-openrouter/src/chat.ts:59](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/chat.ts#L59) |
| <a id="requeststage-1"></a> `requestStage?` | `"gateway"` \| `"provider"` | Classify HTTP failures as direct provider or same-origin gateway errors. Defaults to `gateway` when `baseUrl` is customized, otherwise `provider`. | - | [provider-openrouter/src/audio-llm.ts:46](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/audio-llm.ts#L46) |
| <a id="requiredonesentinel"></a> `requireDoneSentinel?` | `boolean` | Require the SSE response to end with an explicit `[DONE]` sentinel. Disabled by default for compatibility with gateways that close a complete stream cleanly. | - | [provider-openrouter/src/audio-llm.ts:61](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/audio-llm.ts#L61) |
| <a id="servermanaged-1"></a> `serverManaged?` | `boolean` | Omit model, system prompt, voice, temperature, and token limits because a trusted gateway reconstructs them. Prefer `createOpenRouterGatewayAudioLLM`. | - | [provider-openrouter/src/audio-llm.ts:66](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/audio-llm.ts#L66) |
| <a id="title-2"></a> `title?` | `string` | Sent as `X-Title` (app name shown on OpenRouter). | [`HeaderOptions`](/docs/reference/api/ottervoice-provider-openrouter/#headeroptions).[`title`](/docs/reference/api/ottervoice-provider-openrouter/#title) | [provider-openrouter/src/chat.ts:61](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/chat.ts#L61) |
| <a id="tokenbrokercredentials-1"></a> `tokenBrokerCredentials?` | `RequestCredentials` | Browser credential mode for the broker request. Use `include` for a cross-origin cookie session. | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`tokenBrokerCredentials`](/docs/reference/api/ottervoice-provider-utils/#tokenbrokercredentials) | provider-utils/dist/credential.d.ts:48 |
| <a id="tokenbrokerheaders-1"></a> `tokenBrokerHeaders?` | `Readonly`\<`Record`\<`string`, `string`\>\> | Application-authentication headers sent only to the token broker, such as a short-lived user session bearer token. Use browser-compatible characters. | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`tokenBrokerHeaders`](/docs/reference/api/ottervoice-provider-utils/#tokenbrokerheaders) | provider-utils/dist/credential.d.ts:44 |
| <a id="tokenbrokersessionid-1"></a> `tokenBrokerSessionId?` | `string` | Application voice-session id sent to the broker for ownership checks, audit, and quotas. | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`tokenBrokerSessionId`](/docs/reference/api/ottervoice-provider-utils/#tokenbrokersessionid) | provider-utils/dist/credential.d.ts:46 |
| <a id="tokenbrokerurl-1"></a> `tokenBrokerUrl?` | `string` | Endpoint that mints short-lived, least-privilege tokens; broad provider bearer tokens are not client-safe. | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`tokenBrokerUrl`](/docs/reference/api/ottervoice-provider-utils/#tokenbrokerurl) | provider-utils/dist/credential.d.ts:39 |
| <a id="voice"></a> `voice?` | \| `"alloy"` \| `"ash"` \| `"ballad"` \| `"coral"` \| `"echo"` \| `"fable"` \| `"nova"` \| `"onyx"` \| `"sage"` \| `"shimmer"` \| `"verse"` | Output voice when the model returns spoken audio. Keep server-owned. | - | [provider-openrouter/src/audio-llm.ts:39](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/audio-llm.ts#L39) |

***

### OpenRouterGatewayASRPolicy

Defined in: [provider-openrouter/src/gateway-server.ts:20](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/gateway-server.ts#L20)

Locked server policy for speech recognition requests.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="language-1"></a> `language?` | `string` | Optional fixed recognition language. Omit to let the provider detect it. | [provider-openrouter/src/gateway-server.ts:24](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/gateway-server.ts#L24) |
| <a id="model-3"></a> `model` | `string` | Provider model id. Never read this value from an untrusted client. | [provider-openrouter/src/gateway-server.ts:22](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/gateway-server.ts#L22) |

***

### OpenRouterGatewayAudioLLMOptions

Defined in: [provider-openrouter/src/index.ts:170](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/index.ts#L170)

Client-safe Audio LLM gateway options. Model, prompt, voice, and generation limits stay on the server.

#### Extends

- [`OpenRouterGatewayClientOptions`](/docs/reference/api/ottervoice-provider-openrouter/#openroutergatewayclientoptions)

#### Properties

| Property | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="baseurl-2"></a> `baseUrl` | `string` | Profile-specific application base URL, such as `/api/voice/llm`. | [`OpenRouterGatewayClientOptions`](/docs/reference/api/ottervoice-provider-openrouter/#openroutergatewayclientoptions).[`baseUrl`](/docs/reference/api/ottervoice-provider-openrouter/#baseurl-3) | [provider-openrouter/src/index.ts:154](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/index.ts#L154) |
| <a id="fetch-2"></a> `fetch?` | [`FetchLike`](/docs/reference/api/ottervoice-provider-utils/#fetchlike) | Custom fetch implementation, commonly Expo's fetch adapter. | [`OpenRouterGatewayClientOptions`](/docs/reference/api/ottervoice-provider-openrouter/#openroutergatewayclientoptions).[`fetch`](/docs/reference/api/ottervoice-provider-openrouter/#fetch-3) | [provider-openrouter/src/index.ts:158](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/index.ts#L158) |
| <a id="headers-3"></a> `headers?` | `Record`\<`string`, `string`\> | Application-gateway headers, for example a short-lived session token. | [`OpenRouterGatewayClientOptions`](/docs/reference/api/ottervoice-provider-openrouter/#openroutergatewayclientoptions).[`headers`](/docs/reference/api/ottervoice-provider-openrouter/#headers-4) | [provider-openrouter/src/index.ts:156](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/index.ts#L156) |
| <a id="prepareaudio-1"></a> `prepareAudio?` | (`audio`, `format`) => `Promise`\<[`PreparedAudioInput`](/docs/reference/api/ottervoice-provider-openrouter/#preparedaudioinput)\> | Runtime conversion from browser/native capture to WAV or MP3. | - | [provider-openrouter/src/index.ts:172](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/index.ts#L172) |
| <a id="requiredonesentinel-1"></a> `requireDoneSentinel?` | `boolean` | Require the server SSE response to end with `[DONE]`. | - | [provider-openrouter/src/index.ts:174](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/index.ts#L174) |

***

### OpenRouterGatewayAudioLLMPolicy

Defined in: [provider-openrouter/src/gateway-server.ts:81](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/gateway-server.ts#L81)

Locked server policy for native Audio LLM requests.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="maxtokens"></a> `maxTokens` | `number` | Hard server-selected output-token ceiling. | [provider-openrouter/src/gateway-server.ts:91](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/gateway-server.ts#L91) |
| <a id="model-4"></a> `model` | `string` | Provider model id. Never read this value from an untrusted client. | [provider-openrouter/src/gateway-server.ts:83](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/gateway-server.ts#L83) |
| <a id="systemprompt"></a> `systemPrompt` | `string` | Trusted system instruction injected before client conversation history. | [provider-openrouter/src/gateway-server.ts:85](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/gateway-server.ts#L85) |
| <a id="temperature-1"></a> `temperature?` | `number` | Server-selected sampling temperature. | [provider-openrouter/src/gateway-server.ts:89](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/gateway-server.ts#L89) |
| <a id="voice-1"></a> `voice` | `string` | Server-selected output voice. | [provider-openrouter/src/gateway-server.ts:87](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/gateway-server.ts#L87) |

***

### OpenRouterGatewayAuthorizationContext

Defined in: [provider-openrouter/src/gateway-server.ts:110](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/gateway-server.ts#L110)

Context passed to the application-owned gateway authorization hook.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="profile"></a> `profile` | [`OpenRouterGatewayProfile`](/docs/reference/api/ottervoice-provider-openrouter/#openroutergatewayprofile) | Server profile selected by the explicit route. | [provider-openrouter/src/gateway-server.ts:116](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/gateway-server.ts#L116) |
| <a id="request"></a> `request` | `Request` | Original application request. | [provider-openrouter/src/gateway-server.ts:112](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/gateway-server.ts#L112) |
| <a id="url"></a> `url` | `URL` | Parsed request URL. | [provider-openrouter/src/gateway-server.ts:114](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/gateway-server.ts#L114) |

***

### OpenRouterGatewayClientOptions

Defined in: [provider-openrouter/src/index.ts:152](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/index.ts#L152)

Shared browser/app options for a server-managed OpenRouter gateway profile.

#### Extended by

- [`OpenRouterGatewayAudioLLMOptions`](/docs/reference/api/ottervoice-provider-openrouter/#openroutergatewayaudiollmoptions)

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="baseurl-3"></a> `baseUrl` | `string` | Profile-specific application base URL, such as `/api/voice/llm`. | [provider-openrouter/src/index.ts:154](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/index.ts#L154) |
| <a id="fetch-3"></a> `fetch?` | [`FetchLike`](/docs/reference/api/ottervoice-provider-utils/#fetchlike) | Custom fetch implementation, commonly Expo's fetch adapter. | [provider-openrouter/src/index.ts:158](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/index.ts#L158) |
| <a id="headers-4"></a> `headers?` | `Record`\<`string`, `string`\> | Application-gateway headers, for example a short-lived session token. | [provider-openrouter/src/index.ts:156](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/index.ts#L156) |

***

### OpenRouterGatewayLLMPolicy

Defined in: [provider-openrouter/src/gateway-server.ts:28](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/gateway-server.ts#L28)

Locked server policy for text LLM requests.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="maxtokens-1"></a> `maxTokens` | `number` | Hard server-selected output-token ceiling. | [provider-openrouter/src/gateway-server.ts:36](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/gateway-server.ts#L36) |
| <a id="model-5"></a> `model` | `string` | Provider model id. Never read this value from an untrusted client. | [provider-openrouter/src/gateway-server.ts:30](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/gateway-server.ts#L30) |
| <a id="provider"></a> `provider?` | [`OpenRouterGatewayProviderRoutingPolicy`](/docs/reference/api/ottervoice-provider-openrouter/#openroutergatewayproviderroutingpolicy) | Server-selected OpenRouter endpoint routing preferences. See [OpenRouterGatewayProviderRoutingPolicy](/docs/reference/api/ottervoice-provider-openrouter/#openroutergatewayproviderroutingpolicy). | [provider-openrouter/src/gateway-server.ts:45](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/gateway-server.ts#L45) |
| <a id="reasoningenabled"></a> `reasoningEnabled?` | `boolean` | Server-selected OpenRouter reasoning behavior. | [provider-openrouter/src/gateway-server.ts:38](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/gateway-server.ts#L38) |
| <a id="responseformat"></a> `responseFormat?` | `"text"` \| `"json"` | Server-selected response shape. Defaults to text. | [provider-openrouter/src/gateway-server.ts:40](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/gateway-server.ts#L40) |
| <a id="systemprompt-1"></a> `systemPrompt` | `string` | Trusted system instruction injected before client conversation history. | [provider-openrouter/src/gateway-server.ts:32](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/gateway-server.ts#L32) |
| <a id="temperature-2"></a> `temperature?` | `number` | Server-selected sampling temperature. | [provider-openrouter/src/gateway-server.ts:34](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/gateway-server.ts#L34) |

***

### OpenRouterGatewayOptions

Defined in: [provider-openrouter/src/gateway-server.ts:129](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/gateway-server.ts#L129)

Options for [createOpenRouterGateway](/docs/reference/api/ottervoice-provider-openrouter/#createopenroutergateway).

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="apikey-2"></a> `apiKey?` | `string` | Long-lived OpenRouter key read only in the trusted server runtime. | [provider-openrouter/src/gateway-server.ts:131](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/gateway-server.ts#L131) |
| <a id="authorize"></a> `authorize` | (`context`) => [`OpenRouterGatewayAuthorizationResult`](/docs/reference/api/ottervoice-provider-openrouter/#openroutergatewayauthorizationresult) | Application authorization and session-ownership check. This hook is mandatory so production integrations cannot accidentally omit the trust boundary. | [provider-openrouter/src/gateway-server.ts:138](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/gateway-server.ts#L138) |
| <a id="fetch-4"></a> `fetch?` | [`FetchLike`](/docs/reference/api/ottervoice-provider-utils/#fetchlike) | Server-side fetch override for tests or custom runtimes. | [provider-openrouter/src/gateway-server.ts:160](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/gateway-server.ts#L160) |
| <a id="gatewayprefix"></a> `gatewayPrefix?` | `string` | Browser-facing prefix. Defaults to `/api/voice`. | [provider-openrouter/src/gateway-server.ts:142](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/gateway-server.ts#L142) |
| <a id="maxmessages"></a> `maxMessages?` | `number` | Maximum conversation messages accepted from a client. Defaults to 32. | [provider-openrouter/src/gateway-server.ts:148](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/gateway-server.ts#L148) |
| <a id="maxrequestbodybytes"></a> `maxRequestBodyBytes?` | `number` | Maximum encoded request size. Defaults to 6 MiB. | [provider-openrouter/src/gateway-server.ts:146](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/gateway-server.ts#L146) |
| <a id="maxtextcharacters"></a> `maxTextCharacters?` | `number` | Maximum cumulative client-controlled text characters. Defaults to 32,000. | [provider-openrouter/src/gateway-server.ts:150](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/gateway-server.ts#L150) |
| <a id="policy"></a> `policy` | [`OpenRouterGatewayPolicy`](/docs/reference/api/ottervoice-provider-openrouter/#openroutergatewaypolicy) | Locked model, prompt, voice, and generation policy. | [provider-openrouter/src/gateway-server.ts:133](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/gateway-server.ts#L133) |
| <a id="referer-3"></a> `referer?` | `string` | Server-owned HTTP Referer sent upstream. | [provider-openrouter/src/gateway-server.ts:156](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/gateway-server.ts#L156) |
| <a id="title-3"></a> `title?` | `string` | Server-owned application title sent upstream. | [provider-openrouter/src/gateway-server.ts:158](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/gateway-server.ts#L158) |
| <a id="ttscacheentries"></a> `ttsCacheEntries?` | `number` | Maximum in-memory TTS cache entries. Defaults to zero (disabled). | [provider-openrouter/src/gateway-server.ts:154](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/gateway-server.ts#L154) |
| <a id="upstreambaseurl"></a> `upstreamBaseUrl?` | `string` | Provider API root. Defaults to OpenRouter's public v1 endpoint. | [provider-openrouter/src/gateway-server.ts:144](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/gateway-server.ts#L144) |
| <a id="upstreamtimeoutms"></a> `upstreamTimeoutMs?` | `number` | Total upstream response timeout in milliseconds. Defaults to 60 seconds. | [provider-openrouter/src/gateway-server.ts:152](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/gateway-server.ts#L152) |

***

### OpenRouterGatewayPolicy

Defined in: [provider-openrouter/src/gateway-server.ts:98](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/gateway-server.ts#L98)

Server-owned provider policy. Omit a profile to disable its route entirely.
The gateway never accepts these values from a browser or app request body.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="asr"></a> `asr?` | [`OpenRouterGatewayASRPolicy`](/docs/reference/api/ottervoice-provider-openrouter/#openroutergatewayasrpolicy) | Policy for standalone ASR and the ASR stage of the composite voice route. | [provider-openrouter/src/gateway-server.ts:100](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/gateway-server.ts#L100) |
| <a id="audiollm"></a> `audioLlm?` | [`OpenRouterGatewayAudioLLMPolicy`](/docs/reference/api/ottervoice-provider-openrouter/#openroutergatewayaudiollmpolicy) | Policy for `/audio-llm/chat/completions`. | [provider-openrouter/src/gateway-server.ts:106](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/gateway-server.ts#L106) |
| <a id="llm"></a> `llm?` | [`OpenRouterGatewayLLMPolicy`](/docs/reference/api/ottervoice-provider-openrouter/#openroutergatewayllmpolicy) | Policy for the LLM stage of the composite voice route. | [provider-openrouter/src/gateway-server.ts:102](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/gateway-server.ts#L102) |
| <a id="tts"></a> `tts?` | [`OpenRouterGatewayTTSPolicy`](/docs/reference/api/ottervoice-provider-openrouter/#openroutergatewayttspolicy) | Policy for the TTS stage of the composite voice route. | [provider-openrouter/src/gateway-server.ts:104](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/gateway-server.ts#L104) |

***

### OpenRouterGatewayProviderRoutingPolicy

Defined in: [provider-openrouter/src/gateway-server.ts:49](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/gateway-server.ts#L49)

Locked OpenRouter endpoint-routing preferences for text LLM requests.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="preferredmaxlatency"></a> `preferredMaxLatency?` | \{ `p50?`: `number`; `p75?`: `number`; `p90?`: `number`; `p99?`: `number`; \} | Preferred maximum time-to-first-token latency in seconds. Endpoints above these rolling percentile thresholds are deprioritized, not excluded. | [provider-openrouter/src/gateway-server.ts:56](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/gateway-server.ts#L56) |
| `preferredMaxLatency.p50?` | `number` | Preferred maximum median latency in seconds. | [provider-openrouter/src/gateway-server.ts:58](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/gateway-server.ts#L58) |
| `preferredMaxLatency.p75?` | `number` | Preferred maximum p75 latency in seconds. | [provider-openrouter/src/gateway-server.ts:60](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/gateway-server.ts#L60) |
| `preferredMaxLatency.p90?` | `number` | Preferred maximum p90 latency in seconds. | [provider-openrouter/src/gateway-server.ts:62](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/gateway-server.ts#L62) |
| `preferredMaxLatency.p99?` | `number` | Preferred maximum p99 latency in seconds. | [provider-openrouter/src/gateway-server.ts:64](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/gateway-server.ts#L64) |
| <a id="sort"></a> `sort?` | `"price"` \| `"throughput"` \| `"latency"` | Attribute used to order eligible provider endpoints. | [provider-openrouter/src/gateway-server.ts:51](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/gateway-server.ts#L51) |

***

### OpenRouterGatewayTTSPolicy

Defined in: [provider-openrouter/src/gateway-server.ts:69](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/gateway-server.ts#L69)

Locked server policy for speech synthesis requests.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="model-6"></a> `model` | `string` | Provider model id. Never read this value from an untrusted client. | [provider-openrouter/src/gateway-server.ts:71](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/gateway-server.ts#L71) |
| <a id="responseformat-1"></a> `responseFormat?` | `"mp3"` \| `"pcm"` | Server-selected one-shot output encoding. Streaming requests force PCM. | [provider-openrouter/src/gateway-server.ts:77](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/gateway-server.ts#L77) |
| <a id="speed"></a> `speed?` | `number` | Server-selected speaking-rate multiplier. | [provider-openrouter/src/gateway-server.ts:75](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/gateway-server.ts#L75) |
| <a id="voice-2"></a> `voice` | `string` | Server-selected voice id. | [provider-openrouter/src/gateway-server.ts:73](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/gateway-server.ts#L73) |

***

### OpenRouterGatewayVoiceTurnOptions

Defined in: [provider-openrouter/src/voice-turn.ts:24](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/voice-turn.ts#L24)

Client options for the server-orchestrated ASR → LLM → TTS voice-turn route.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="baseurl-4"></a> `baseUrl` | `string` | Application route prefix, such as `/api/voice/asr-llm-tts`. | [provider-openrouter/src/voice-turn.ts:26](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/voice-turn.ts#L26) |
| <a id="fetch-5"></a> `fetch?` | [`FetchLike`](/docs/reference/api/ottervoice-provider-utils/#fetchlike) | Custom Fetch implementation for browser, native, or test runtimes. | [provider-openrouter/src/voice-turn.ts:30](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/voice-turn.ts#L30) |
| <a id="headers-5"></a> `headers?` | `Record`\<`string`, `string`\> | Application-gateway headers, for example a short-lived session token. | [provider-openrouter/src/voice-turn.ts:28](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/voice-turn.ts#L28) |
| <a id="prepareaudio-2"></a> `prepareAudio?` | (`audio`, `format`) => `Promise`\<[`PreparedAudioInput`](/docs/reference/api/ottervoice-provider-openrouter/#preparedaudioinput)\> | Runtime conversion from browser/native capture to WAV or MP3. | [provider-openrouter/src/voice-turn.ts:32](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/voice-turn.ts#L32) |
| <a id="requiredonesentinel-2"></a> `requireDoneSentinel?` | `boolean` | Require the composite SSE response to end with `[DONE]`. | [provider-openrouter/src/voice-turn.ts:37](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/voice-turn.ts#L37) |

***

### OpenRouterOptions

Defined in: [provider-openrouter/src/index.ts:43](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/index.ts#L43)

Options for [createOpenRouterLLM](/docs/reference/api/ottervoice-provider-openrouter/#createopenrouterllm). Use this direct provider only as a
trusted-server building block for a composite audio-turn backend.

#### Extends

- [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`HeaderOptions`](/docs/reference/api/ottervoice-provider-openrouter/#headeroptions)

#### Properties

| Property | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="apikey-3"></a> `apiKey?` | `string` | A long-lived key (server-side only — never ship to clients). | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`apiKey`](/docs/reference/api/ottervoice-provider-utils/#apikey) | provider-utils/dist/credential.d.ts:37 |
| <a id="baseurl-5"></a> `baseUrl?` | `string` | API base, default `https://openrouter.ai/api/v1`. | - | [provider-openrouter/src/index.ts:47](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/index.ts#L47) |
| <a id="defaulttemperature-1"></a> `defaultTemperature?` | `number` | Applied when a request does not specify its own temperature. | - | [provider-openrouter/src/index.ts:51](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/index.ts#L51) |
| <a id="fetch-6"></a> `fetch?` | [`FetchLike`](/docs/reference/api/ottervoice-provider-utils/#fetchlike) | Custom `fetch` implementation (tests / React Native polyfills). | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`fetch`](/docs/reference/api/ottervoice-provider-utils/#fetch) | provider-utils/dist/credential.d.ts:50 |
| <a id="headers-6"></a> `headers?` | `Record`\<`string`, `string`\> | Extra headers merged last (override defaults carefully). | [`HeaderOptions`](/docs/reference/api/ottervoice-provider-openrouter/#headeroptions).[`headers`](/docs/reference/api/ottervoice-provider-openrouter/#headers) | [provider-openrouter/src/chat.ts:63](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/chat.ts#L63) |
| <a id="model-7"></a> `model` | `string` | OpenRouter model id, e.g. `openai/gpt-4o-mini`. | - | [provider-openrouter/src/index.ts:45](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/index.ts#L45) |
| <a id="now-2"></a> `now?` | () => `number` | Clock override for deterministic expiry checks in tests. | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`now`](/docs/reference/api/ottervoice-provider-utils/#now) | provider-utils/dist/credential.d.ts:52 |
| <a id="reasoningenabled-1"></a> `reasoningEnabled?` | `boolean` | Explicitly enable/disable reasoning tokens on compatible models. | - | [provider-openrouter/src/index.ts:53](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/index.ts#L53) |
| <a id="referer-4"></a> `referer?` | `string` | Sent as `HTTP-Referer` for OpenRouter rankings / allowlists. | [`HeaderOptions`](/docs/reference/api/ottervoice-provider-openrouter/#headeroptions).[`referer`](/docs/reference/api/ottervoice-provider-openrouter/#referer) | [provider-openrouter/src/chat.ts:59](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/chat.ts#L59) |
| <a id="requeststage-2"></a> `requestStage?` | `"gateway"` \| `"provider"` | Classify HTTP failures as gateway/provider errors. Defaults from whether `baseUrl` is customized. | - | [provider-openrouter/src/index.ts:49](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/index.ts#L49) |
| <a id="title-4"></a> `title?` | `string` | Sent as `X-Title` (app name shown on OpenRouter). | [`HeaderOptions`](/docs/reference/api/ottervoice-provider-openrouter/#headeroptions).[`title`](/docs/reference/api/ottervoice-provider-openrouter/#title) | [provider-openrouter/src/chat.ts:61](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/chat.ts#L61) |
| <a id="tokenbrokercredentials-2"></a> `tokenBrokerCredentials?` | `RequestCredentials` | Browser credential mode for the broker request. Use `include` for a cross-origin cookie session. | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`tokenBrokerCredentials`](/docs/reference/api/ottervoice-provider-utils/#tokenbrokercredentials) | provider-utils/dist/credential.d.ts:48 |
| <a id="tokenbrokerheaders-2"></a> `tokenBrokerHeaders?` | `Readonly`\<`Record`\<`string`, `string`\>\> | Application-authentication headers sent only to the token broker, such as a short-lived user session bearer token. Use browser-compatible characters. | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`tokenBrokerHeaders`](/docs/reference/api/ottervoice-provider-utils/#tokenbrokerheaders) | provider-utils/dist/credential.d.ts:44 |
| <a id="tokenbrokersessionid-2"></a> `tokenBrokerSessionId?` | `string` | Application voice-session id sent to the broker for ownership checks, audit, and quotas. | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`tokenBrokerSessionId`](/docs/reference/api/ottervoice-provider-utils/#tokenbrokersessionid) | provider-utils/dist/credential.d.ts:46 |
| <a id="tokenbrokerurl-2"></a> `tokenBrokerUrl?` | `string` | Endpoint that mints short-lived, least-privilege tokens; broad provider bearer tokens are not client-safe. | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`tokenBrokerUrl`](/docs/reference/api/ottervoice-provider-utils/#tokenbrokerurl) | provider-utils/dist/credential.d.ts:39 |

***

### OpenRouterTTSOptions

Defined in: [provider-openrouter/src/audio.ts:57](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/audio.ts#L57)

Options for direct OpenRouter HTTP speech synthesis in trusted server/CLI
runtimes. Use it for the TTS stage of a composite audio-turn backend.

#### Extends

- [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`HeaderOptions`](/docs/reference/api/ottervoice-provider-openrouter/#headeroptions)

#### Properties

| Property | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="apikey-4"></a> `apiKey?` | `string` | A long-lived key (server-side only — never ship to clients). | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`apiKey`](/docs/reference/api/ottervoice-provider-utils/#apikey) | provider-utils/dist/credential.d.ts:37 |
| <a id="baseurl-6"></a> `baseUrl?` | `string` | API root; defaults to OpenRouter's chat-compatible base URL. | - | [provider-openrouter/src/audio.ts:63](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/audio.ts#L63) |
| <a id="fetch-7"></a> `fetch?` | [`FetchLike`](/docs/reference/api/ottervoice-provider-utils/#fetchlike) | Custom `fetch` implementation (tests / React Native polyfills). | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`fetch`](/docs/reference/api/ottervoice-provider-utils/#fetch) | provider-utils/dist/credential.d.ts:50 |
| <a id="headers-7"></a> `headers?` | `Record`\<`string`, `string`\> | Extra headers merged last (override defaults carefully). | [`HeaderOptions`](/docs/reference/api/ottervoice-provider-openrouter/#headeroptions).[`headers`](/docs/reference/api/ottervoice-provider-openrouter/#headers) | [provider-openrouter/src/chat.ts:63](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/chat.ts#L63) |
| <a id="model-8"></a> `model` | `string` | OpenRouter / OpenAI-compatible TTS model id. Keep server-owned. | - | [provider-openrouter/src/audio.ts:59](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/audio.ts#L59) |
| <a id="now-3"></a> `now?` | () => `number` | Clock override for deterministic expiry checks in tests. | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`now`](/docs/reference/api/ottervoice-provider-utils/#now) | provider-utils/dist/credential.d.ts:52 |
| <a id="referer-5"></a> `referer?` | `string` | Sent as `HTTP-Referer` for OpenRouter rankings / allowlists. | [`HeaderOptions`](/docs/reference/api/ottervoice-provider-openrouter/#headeroptions).[`referer`](/docs/reference/api/ottervoice-provider-openrouter/#referer) | [provider-openrouter/src/chat.ts:59](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/chat.ts#L59) |
| <a id="requeststage-3"></a> `requestStage?` | `"gateway"` \| `"provider"` | Classify HTTP failures as gateway/provider errors. Defaults from whether `baseUrl` is customized. | - | [provider-openrouter/src/audio.ts:65](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/audio.ts#L65) |
| <a id="speed-1"></a> `speed?` | `number` | Speaking rate multiplier when the upstream model supports it. Keep server-owned. | - | [provider-openrouter/src/audio.ts:67](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/audio.ts#L67) |
| <a id="title-5"></a> `title?` | `string` | Sent as `X-Title` (app name shown on OpenRouter). | [`HeaderOptions`](/docs/reference/api/ottervoice-provider-openrouter/#headeroptions).[`title`](/docs/reference/api/ottervoice-provider-openrouter/#title) | [provider-openrouter/src/chat.ts:61](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/chat.ts#L61) |
| <a id="tokenbrokercredentials-3"></a> `tokenBrokerCredentials?` | `RequestCredentials` | Browser credential mode for the broker request. Use `include` for a cross-origin cookie session. | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`tokenBrokerCredentials`](/docs/reference/api/ottervoice-provider-utils/#tokenbrokercredentials) | provider-utils/dist/credential.d.ts:48 |
| <a id="tokenbrokerheaders-3"></a> `tokenBrokerHeaders?` | `Readonly`\<`Record`\<`string`, `string`\>\> | Application-authentication headers sent only to the token broker, such as a short-lived user session bearer token. Use browser-compatible characters. | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`tokenBrokerHeaders`](/docs/reference/api/ottervoice-provider-utils/#tokenbrokerheaders) | provider-utils/dist/credential.d.ts:44 |
| <a id="tokenbrokersessionid-3"></a> `tokenBrokerSessionId?` | `string` | Application voice-session id sent to the broker for ownership checks, audit, and quotas. | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`tokenBrokerSessionId`](/docs/reference/api/ottervoice-provider-utils/#tokenbrokersessionid) | provider-utils/dist/credential.d.ts:46 |
| <a id="tokenbrokerurl-3"></a> `tokenBrokerUrl?` | `string` | Endpoint that mints short-lived, least-privilege tokens; broad provider bearer tokens are not client-safe. | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`tokenBrokerUrl`](/docs/reference/api/ottervoice-provider-utils/#tokenbrokerurl) | provider-utils/dist/credential.d.ts:39 |
| <a id="voice-3"></a> `voice` | `string` | Voice name accepted by the selected model. Keep server-owned. | - | [provider-openrouter/src/audio.ts:61](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/audio.ts#L61) |

***

### PreparedAudioInput

Defined in: [provider-openrouter/src/audio-llm.ts:23](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/audio-llm.ts#L23)

WAV/MP3 bytes ready for OpenAI-compatible audio chat.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="audio"></a> `audio` | `ArrayBuffer` | Encoded audio body. | [provider-openrouter/src/audio-llm.ts:25](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/audio-llm.ts#L25) |
| <a id="format-1"></a> `format` | `"wav"` \| `"mp3"` | Container accepted by the audio chat API. | [provider-openrouter/src/audio-llm.ts:27](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/audio-llm.ts#L27) |

***

### RawUsage

Defined in: [provider-openrouter/src/chat.ts:84](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/chat.ts#L84)

OpenAI-compatible token counters accepted by [mapUsage](/docs/reference/api/ottervoice-provider-openrouter/#mapusage).

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="completion_tokens"></a> `completion_tokens?` | `number` | Tokens generated by the completion. | [provider-openrouter/src/chat.ts:88](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/chat.ts#L88) |
| <a id="prompt_tokens"></a> `prompt_tokens?` | `number` | Tokens consumed by prompts/messages. | [provider-openrouter/src/chat.ts:86](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/chat.ts#L86) |
| <a id="total_tokens"></a> `total_tokens?` | `number` | Combined prompt and completion tokens. | [provider-openrouter/src/chat.ts:90](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/chat.ts#L90) |

## Type Aliases

### OpenRouterGatewayASROptions

```ts
type OpenRouterGatewayASROptions = OpenRouterGatewayClientOptions & Pick<OpenRouterASROptions, "format" | "partialIntervalMs" | "emptyPartialBackoffMs" | "now">;
```

Defined in: [provider-openrouter/src/index.ts:164](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/index.ts#L164)

Client-safe ASR gateway options. Provider model and language policy stay on the server.

***

### OpenRouterGatewayAuthorizationResult

```ts
type OpenRouterGatewayAuthorizationResult = boolean | Response | Promise<boolean | Response>;
```

Defined in: [provider-openrouter/src/gateway-server.ts:123](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/gateway-server.ts#L123)

Authorization result for an OpenRouter policy gateway.
Return `true` to continue, `false` to reject, or a custom response.

***

### OpenRouterGatewayProfile

```ts
type OpenRouterGatewayProfile = "asr" | "audio_llm" | "asr_llm_tts";
```

Defined in: [provider-openrouter/src/gateway-server.ts:14](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/gateway-server.ts#L14)

Server-owned gateway profile selected by an explicit application route.

## Variables

### DEFAULT\_BASE\_URL

```ts
const DEFAULT_BASE_URL: "https://openrouter.ai/api/v1" = 'https://openrouter.ai/api/v1';
```

Defined in: [provider-openrouter/src/chat.ts:4](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/chat.ts#L4)

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

Defined in: [provider-openrouter/src/chat.ts:32](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/chat.ts#L32)

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

Defined in: [provider-openrouter/src/chat.ts:72](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/chat.ts#L72)

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

Defined in: [provider-openrouter/src/audio.ts:161](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/audio.ts#L161)

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

Defined in: [provider-openrouter/src/audio.ts:187](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/audio.ts#L187)

Direct transcription through OpenRouter's `/audio/transcriptions` endpoint
for trusted server/CLI runtimes.
The default remains one request at turn end. Setting `partialIntervalMs`
adds rolling, best-effort snapshots for low-latency partial text while the
final request still covers the complete turn.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | [`OpenRouterASROptions`](/docs/reference/api/ottervoice-provider-openrouter/#openrouterasroptions) | Model, credentials, and optional rolling-partial interval. |

#### Returns

[`ASRProvider`](/docs/reference/api/ottervoice-core/#asrprovider)

An [ASRProvider](/docs/reference/api/ottervoice-core/#asrprovider) for a session's caption/transcription provider slot.

***

### createOpenRouterAudioLLM()

```ts
function createOpenRouterAudioLLM(options): AudioLLMProvider;
```

Defined in: [provider-openrouter/src/audio-llm.ts:183](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/audio-llm.ts#L183)

Direct OpenRouter native Audio LLM provider for trusted server/CLI runtimes.
Use the gateway factory in browser/app integrations.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | [`OpenRouterAudioLLMOptions`](/docs/reference/api/ottervoice-provider-openrouter/#openrouteraudiollmoptions) | Model, voice, credentials, and optional WebM→WAV preparer. |

#### Returns

[`AudioLLMProvider`](/docs/reference/api/ottervoice-core/#audiollmprovider)

An [AudioLLMProvider](/docs/reference/api/ottervoice-core/#audiollmprovider) for unified voice sessions.

***

### createOpenRouterGateway()

```ts
function createOpenRouterGateway(options): (request) => Promise<Response>;
```

Defined in: [provider-openrouter/src/gateway-server.ts:361](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/gateway-server.ts#L361)

Create a server-side OpenRouter gateway that reconstructs every upstream
request from a locked policy. Browser-supplied model, system/developer
messages, voice, temperature, token limits, reasoning options, and unknown
fields are never forwarded.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | [`OpenRouterGatewayOptions`](/docs/reference/api/ottervoice-provider-openrouter/#openroutergatewayoptions) | Server credentials, locked policy, authorization hook, and limits. |

#### Returns

A Fetch-compatible request handler for standalone and composite profile routes.

(`request`) => `Promise`\<`Response`\>

***

### createOpenRouterGatewayASR()

```ts
function createOpenRouterGatewayASR(options): ASRProvider;
```

Defined in: [provider-openrouter/src/index.ts:185](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/index.ts#L185)

Create an ASR provider for a server-managed application gateway.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | [`OpenRouterGatewayASROptions`](/docs/reference/api/ottervoice-provider-openrouter/#openroutergatewayasroptions) | Profile URL plus client-side capture/partial-result behavior. |

#### Returns

[`ASRProvider`](/docs/reference/api/ottervoice-core/#asrprovider)

An ASR provider that sends only audio input and no provider policy fields.

***

### createOpenRouterGatewayAudioLLM()

```ts
function createOpenRouterGatewayAudioLLM(options): AudioLLMProvider;
```

Defined in: [provider-openrouter/src/index.ts:203](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/index.ts#L203)

Create an Audio LLM provider for a server-managed application gateway.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | [`OpenRouterGatewayAudioLLMOptions`](/docs/reference/api/ottervoice-provider-openrouter/#openroutergatewayaudiollmoptions) | Profile URL plus runtime audio conversion/stream validation. |

#### Returns

[`AudioLLMProvider`](/docs/reference/api/ottervoice-core/#audiollmprovider)

An Audio LLM provider that sends audio/history without business policy fields.

***

### createOpenRouterGatewayVoiceTurn()

```ts
function createOpenRouterGatewayVoiceTurn(options): AudioLLMProvider;
```

Defined in: [provider-openrouter/src/voice-turn.ts:91](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/voice-turn.ts#L91)

Create a client-safe voice-turn provider backed by one server-orchestrated
ASR → LLM → MP3 TTS SSE request.

Use this for cascaded voice applications that should expose the same client
lifecycle as a native audio model while keeping every vendor call and model
policy on the server.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | [`OpenRouterGatewayVoiceTurnOptions`](/docs/reference/api/ottervoice-provider-openrouter/#openroutergatewayvoiceturnoptions) | Composite route, audio preparation, and transport options. |

#### Returns

[`AudioLLMProvider`](/docs/reference/api/ottervoice-core/#audiollmprovider)

An [AudioLLMProvider](/docs/reference/api/ottervoice-core/#audiollmprovider) that also supplies the input transcript.

***

### createOpenRouterLLM()

```ts
function createOpenRouterLLM(options): LLMProvider;
```

Defined in: [provider-openrouter/src/index.ts:65](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/index.ts#L65)

LLM provider backed by OpenRouter's OpenAI-compatible HTTP API. A direct
client credential is safe only when it is short-lived and tightly scoped;
broad OpenRouter credentials require a policy-enforcing server gateway.

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

Defined in: [provider-openrouter/src/audio.ts:464](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/audio.ts#L464)

Direct OpenRouter TTS for trusted server/CLI runtimes through the
OpenAI-compatible `/audio/speech` endpoint.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | [`OpenRouterTTSOptions`](/docs/reference/api/ottervoice-provider-openrouter/#openrouterttsoptions) | Model, voice, credentials, and optional speed. |

#### Returns

[`TTSProvider`](/docs/reference/api/ottervoice-core/#ttsprovider)

A [TTSProvider](/docs/reference/api/ottervoice-core/#ttsprovider) for trusted-server audio-turn composition.

***

### extractDelta()

```ts
function extractDelta(json): string;
```

Defined in: [provider-openrouter/src/chat.ts:117](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/chat.ts#L117)

Extract the incremental text from a streamed chunk.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `json` | [`ChatCompletion`](/docs/reference/api/ottervoice-provider-openrouter/#chatcompletion) |

#### Returns

`string`

***

### extractText()

```ts
function extractText(json): string;
```

Defined in: [provider-openrouter/src/chat.ts:112](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/chat.ts#L112)

Extract the assistant text from a non-streamed completion.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `json` | [`ChatCompletion`](/docs/reference/api/ottervoice-provider-openrouter/#chatcompletion) |

#### Returns

`string`

***

### mapUsage()

```ts
function mapUsage(usage):
  | LLMUsage
  | undefined;
```

Defined in: [provider-openrouter/src/chat.ts:94](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/chat.ts#L94)

Map an OpenAI-style `usage` object to the core [LLMUsage](/docs/reference/api/ottervoice-core/#llmusage) shape.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `usage` | \| [`RawUsage`](/docs/reference/api/ottervoice-provider-openrouter/#rawusage) \| `null` \| `undefined` |

#### Returns

  \| [`LLMUsage`](/docs/reference/api/ottervoice-core/#llmusage)
  \| `undefined`

***

### pcm16ToWav()

```ts
function pcm16ToWav(pcm, sampleRate?): ArrayBuffer;
```

Defined in: [provider-openrouter/src/audio-llm.ts:153](https://github.com/bugkiwi/OtterVoice/blob/293dcd6e6779183ea7a5d7f96fbfd2d1201d496d/packages/provider-openrouter/src/audio-llm.ts#L153)

Wrap OpenAI's 24 kHz mono PCM16 stream so browser audio elements can play it.

#### Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `pcm` | `Uint8Array` | `undefined` | Interleaved little-endian PCM16 bytes. |
| `sampleRate` | `number` | `24_000` | Sample rate in Hz (OpenAI audio chat defaults to 24_000). |

#### Returns

`ArrayBuffer`

A standard WAV container buffer.
