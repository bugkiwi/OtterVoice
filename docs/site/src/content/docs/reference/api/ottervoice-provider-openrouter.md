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
import { createOpenRouterGatewayLLM } from '@ottervoice/provider-openrouter';

const llm = createOpenRouterGatewayLLM({
  baseUrl: '/api/voice/llm',
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
    llm: {
      model: 'openai/gpt-4o-mini',
      systemPrompt: process.env.OTTERVOICE_SYSTEM_PROMPT ?? 'Be concise.',
      maxTokens: 256,
    },
  },
  authorize: async ({ request, profile }) =>
    validateUserConversationAndProfile(request, profile),
});
```

Mount `handleVoice` at `/api/voice/*`. The built-in routes are profile-specific;
an omitted profile is disabled.

Direct factories such as `createOpenRouterLLM()` remain available for trusted
Node/server/CLI runtimes. Do not return a broad OpenRouter bearer token to a
browser: hiding a long-lived key is insufficient if the client can still select
models or generation parameters.

## Links

[Documentation](https://ottervoice.vercel.app/docs/) ·
[GitHub](https://github.com/bugkiwi/OtterVoice)

## License

MIT

## Interfaces

### ChatBody

Defined in: [provider-openrouter/src/chat.ts:7](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/chat.ts#L7)

OpenAI-compatible chat-completions request body fields used by the adapter.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="max_tokens"></a> `max_tokens?` | `number` | Max completion tokens. | [provider-openrouter/src/chat.ts:15](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/chat.ts#L15) |
| <a id="messages"></a> `messages` | \{ `content`: `string`; `role`: `string`; \}[] | Chat messages in OpenAI role/content shape. | [provider-openrouter/src/chat.ts:11](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/chat.ts#L11) |
| <a id="model"></a> `model` | `string` | Model id on OpenRouter. | [provider-openrouter/src/chat.ts:9](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/chat.ts#L9) |
| <a id="reasoning"></a> `reasoning?` | \{ `enabled`: `boolean`; \} | OpenRouter reasoning toggle when the model supports it. | [provider-openrouter/src/chat.ts:21](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/chat.ts#L21) |
| `reasoning.enabled` | `boolean` | - | [provider-openrouter/src/chat.ts:21](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/chat.ts#L21) |
| <a id="response_format"></a> `response_format?` | \{ `type`: `"json_object"`; \} | Force JSON-object responses when supported. | [provider-openrouter/src/chat.ts:19](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/chat.ts#L19) |
| `response_format.type` | `"json_object"` | - | [provider-openrouter/src/chat.ts:19](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/chat.ts#L19) |
| <a id="stream"></a> `stream?` | `boolean` | When true, request SSE streaming. | [provider-openrouter/src/chat.ts:17](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/chat.ts#L17) |
| <a id="temperature"></a> `temperature?` | `number` | Sampling temperature. | [provider-openrouter/src/chat.ts:13](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/chat.ts#L13) |

***

### HeaderOptions

Defined in: [provider-openrouter/src/chat.ts:57](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/chat.ts#L57)

Optional OpenRouter attribution and header overrides.

#### Extended by

- [`OpenRouterOptions`](/docs/reference/api/ottervoice-provider-openrouter/#openrouteroptions)
- [`OpenRouterASROptions`](/docs/reference/api/ottervoice-provider-openrouter/#openrouterasroptions)
- [`OpenRouterTTSOptions`](/docs/reference/api/ottervoice-provider-openrouter/#openrouterttsoptions)
- [`OpenRouterAudioLLMOptions`](/docs/reference/api/ottervoice-provider-openrouter/#openrouteraudiollmoptions)

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="headers"></a> `headers?` | `Record`\<`string`, `string`\> | Extra headers merged last (override defaults carefully). | [provider-openrouter/src/chat.ts:63](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/chat.ts#L63) |
| <a id="referer"></a> `referer?` | `string` | Sent as `HTTP-Referer` for OpenRouter rankings / allowlists. | [provider-openrouter/src/chat.ts:59](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/chat.ts#L59) |
| <a id="title"></a> `title?` | `string` | Sent as `X-Title` (app name shown on OpenRouter). | [provider-openrouter/src/chat.ts:61](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/chat.ts#L61) |

***

### OpenRouterASROptions

Defined in: [provider-openrouter/src/audio.ts:25](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/audio.ts#L25)

Options for direct OpenRouter HTTP transcription in trusted server/CLI
runtimes. Browser/app integrations should use `OpenRouterGatewayASROptions`.

#### Extends

- [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`HeaderOptions`](/docs/reference/api/ottervoice-provider-openrouter/#headeroptions)

#### Properties

| Property | Type | Description | Overrides | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="apikey"></a> `apiKey?` | `string` | A long-lived key (server-side only — never ship to clients). | - | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`apiKey`](/docs/reference/api/ottervoice-provider-utils/#apikey) | provider-utils/dist/credential.d.ts:37 |
| <a id="baseurl"></a> `baseUrl?` | `string` | API root; defaults to OpenRouter's chat-compatible base URL. | - | - | [provider-openrouter/src/audio.ts:43](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/audio.ts#L43) |
| <a id="emptypartialbackoffms"></a> `emptyPartialBackoffMs?` | `number` | Delay the next rolling request after an empty provisional transcript. Defaults to the greater of 3x `partialIntervalMs` and 3 seconds. | - | - | [provider-openrouter/src/audio.ts:39](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/audio.ts#L39) |
| <a id="fetch"></a> `fetch?` | [`FetchLike`](/docs/reference/api/ottervoice-provider-utils/#fetchlike) | Custom `fetch` implementation (tests / React Native polyfills). | - | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`fetch`](/docs/reference/api/ottervoice-provider-utils/#fetch) | provider-utils/dist/credential.d.ts:50 |
| <a id="format"></a> `format?` | `"opus"` \| `"webm"` \| `"wav"` \| `"mp3"` | Browser MediaRecorder defaults to WebM. | - | - | [provider-openrouter/src/audio.ts:29](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/audio.ts#L29) |
| <a id="headers-1"></a> `headers?` | `Record`\<`string`, `string`\> | Extra headers merged last (override defaults carefully). | - | [`HeaderOptions`](/docs/reference/api/ottervoice-provider-openrouter/#headeroptions).[`headers`](/docs/reference/api/ottervoice-provider-openrouter/#headers) | [provider-openrouter/src/chat.ts:63](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/chat.ts#L63) |
| <a id="language"></a> `language?` | `string` | BCP-47 language hint sent to the transcription API when supported. Keep server-owned in standard mode. | - | - | [provider-openrouter/src/audio.ts:41](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/audio.ts#L41) |
| <a id="model-1"></a> `model` | `string` | OpenRouter / OpenAI-compatible transcription model id. Keep server-owned. | - | - | [provider-openrouter/src/audio.ts:27](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/audio.ts#L27) |
| <a id="now"></a> `now?` | () => `number` | Test hook for partial-result scheduling. | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`now`](/docs/reference/api/ottervoice-provider-utils/#now) | - | [provider-openrouter/src/audio.ts:47](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/audio.ts#L47) |
| <a id="partialintervalms"></a> `partialIntervalMs?` | `number` | Re-transcribe the accumulated live PCM at this interval to provide best-effort partial results before the turn ends. Omit for batch-only ASR. | - | - | [provider-openrouter/src/audio.ts:34](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/audio.ts#L34) |
| <a id="referer-1"></a> `referer?` | `string` | Sent as `HTTP-Referer` for OpenRouter rankings / allowlists. | - | [`HeaderOptions`](/docs/reference/api/ottervoice-provider-openrouter/#headeroptions).[`referer`](/docs/reference/api/ottervoice-provider-openrouter/#referer) | [provider-openrouter/src/chat.ts:59](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/chat.ts#L59) |
| <a id="requeststage"></a> `requestStage?` | `"gateway"` \| `"provider"` | Classify HTTP failures as gateway/provider errors. Defaults from whether `baseUrl` is customized. | - | - | [provider-openrouter/src/audio.ts:45](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/audio.ts#L45) |
| <a id="servermanaged"></a> `serverManaged?` | `boolean` | Omit provider policy fields because a trusted gateway reconstructs the request. | - | - | [provider-openrouter/src/audio.ts:49](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/audio.ts#L49) |
| <a id="title-1"></a> `title?` | `string` | Sent as `X-Title` (app name shown on OpenRouter). | - | [`HeaderOptions`](/docs/reference/api/ottervoice-provider-openrouter/#headeroptions).[`title`](/docs/reference/api/ottervoice-provider-openrouter/#title) | [provider-openrouter/src/chat.ts:61](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/chat.ts#L61) |
| <a id="tokenbrokercredentials"></a> `tokenBrokerCredentials?` | `RequestCredentials` | Browser credential mode for the broker request. Use `include` for a cross-origin cookie session. | - | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`tokenBrokerCredentials`](/docs/reference/api/ottervoice-provider-utils/#tokenbrokercredentials) | provider-utils/dist/credential.d.ts:48 |
| <a id="tokenbrokerheaders"></a> `tokenBrokerHeaders?` | `Readonly`\<`Record`\<`string`, `string`\>\> | Application-authentication headers sent only to the token broker, such as a short-lived user session bearer token. Use browser-compatible characters. | - | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`tokenBrokerHeaders`](/docs/reference/api/ottervoice-provider-utils/#tokenbrokerheaders) | provider-utils/dist/credential.d.ts:44 |
| <a id="tokenbrokersessionid"></a> `tokenBrokerSessionId?` | `string` | Application voice-session id sent to the broker for ownership checks, audit, and quotas. | - | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`tokenBrokerSessionId`](/docs/reference/api/ottervoice-provider-utils/#tokenbrokersessionid) | provider-utils/dist/credential.d.ts:46 |
| <a id="tokenbrokerurl"></a> `tokenBrokerUrl?` | `string` | Endpoint that mints short-lived, least-privilege tokens; broad provider bearer tokens are not client-safe. | - | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`tokenBrokerUrl`](/docs/reference/api/ottervoice-provider-utils/#tokenbrokerurl) | provider-utils/dist/credential.d.ts:39 |

***

### OpenRouterAudioLLMOptions

Defined in: [provider-openrouter/src/audio-llm.ts:35](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/audio-llm.ts#L35)

Options for the direct OpenRouter Audio LLM adapter in trusted server/CLI
runtimes. Browser/app integrations should use
`OpenRouterGatewayAudioLLMOptions`.

#### Extends

- [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`HeaderOptions`](/docs/reference/api/ottervoice-provider-openrouter/#headeroptions)

#### Properties

| Property | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="apikey-1"></a> `apiKey?` | `string` | A long-lived key (server-side only — never ship to clients). | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`apiKey`](/docs/reference/api/ottervoice-provider-utils/#apikey) | provider-utils/dist/credential.d.ts:37 |
| <a id="baseurl-1"></a> `baseUrl?` | `string` | API root; defaults to OpenRouter's public `…/api/v1`. | - | [provider-openrouter/src/audio-llm.ts:41](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/audio-llm.ts#L41) |
| <a id="defaulttemperature"></a> `defaultTemperature?` | `number` | Default sampling temperature when the session does not override. Keep server-owned. | - | [provider-openrouter/src/audio-llm.ts:48](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/audio-llm.ts#L48) |
| <a id="fetch-1"></a> `fetch?` | [`FetchLike`](/docs/reference/api/ottervoice-provider-utils/#fetchlike) | Custom `fetch` implementation (tests / React Native polyfills). | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`fetch`](/docs/reference/api/ottervoice-provider-utils/#fetch) | provider-utils/dist/credential.d.ts:50 |
| <a id="headers-2"></a> `headers?` | `Record`\<`string`, `string`\> | Extra headers merged last (override defaults carefully). | [`HeaderOptions`](/docs/reference/api/ottervoice-provider-openrouter/#headeroptions).[`headers`](/docs/reference/api/ottervoice-provider-openrouter/#headers) | [provider-openrouter/src/chat.ts:63](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/chat.ts#L63) |
| <a id="model-2"></a> `model` | `string` | Audio-capable chat model id. Keep server-owned in standard mode. | - | [provider-openrouter/src/audio-llm.ts:37](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/audio-llm.ts#L37) |
| <a id="now-1"></a> `now?` | () => `number` | Clock override for deterministic expiry checks in tests. | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`now`](/docs/reference/api/ottervoice-provider-utils/#now) | provider-utils/dist/credential.d.ts:52 |
| <a id="prepareaudio"></a> `prepareAudio?` | (`audio`, `format`) => `Promise`\<[`PreparedAudioInput`](/docs/reference/api/ottervoice-provider-openrouter/#preparedaudioinput)\> | OpenAI audio chat accepts WAV/MP3, while browsers normally record WebM. Supply a runtime-specific decoder when WebM/Opus input is possible. | - | [provider-openrouter/src/audio-llm.ts:53](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/audio-llm.ts#L53) |
| <a id="referer-2"></a> `referer?` | `string` | Sent as `HTTP-Referer` for OpenRouter rankings / allowlists. | [`HeaderOptions`](/docs/reference/api/ottervoice-provider-openrouter/#headeroptions).[`referer`](/docs/reference/api/ottervoice-provider-openrouter/#referer) | [provider-openrouter/src/chat.ts:59](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/chat.ts#L59) |
| <a id="requeststage-1"></a> `requestStage?` | `"gateway"` \| `"provider"` | Classify HTTP failures as direct provider or same-origin gateway errors. Defaults to `gateway` when `baseUrl` is customized, otherwise `provider`. | - | [provider-openrouter/src/audio-llm.ts:46](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/audio-llm.ts#L46) |
| <a id="requiredonesentinel"></a> `requireDoneSentinel?` | `boolean` | Require the SSE response to end with an explicit `[DONE]` sentinel. Disabled by default for compatibility with gateways that close a complete stream cleanly. | - | [provider-openrouter/src/audio-llm.ts:61](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/audio-llm.ts#L61) |
| <a id="servermanaged-1"></a> `serverManaged?` | `boolean` | Omit model, system prompt, voice, temperature, and token limits because a trusted gateway reconstructs them. Prefer `createOpenRouterGatewayAudioLLM`. | - | [provider-openrouter/src/audio-llm.ts:66](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/audio-llm.ts#L66) |
| <a id="title-2"></a> `title?` | `string` | Sent as `X-Title` (app name shown on OpenRouter). | [`HeaderOptions`](/docs/reference/api/ottervoice-provider-openrouter/#headeroptions).[`title`](/docs/reference/api/ottervoice-provider-openrouter/#title) | [provider-openrouter/src/chat.ts:61](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/chat.ts#L61) |
| <a id="tokenbrokercredentials-1"></a> `tokenBrokerCredentials?` | `RequestCredentials` | Browser credential mode for the broker request. Use `include` for a cross-origin cookie session. | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`tokenBrokerCredentials`](/docs/reference/api/ottervoice-provider-utils/#tokenbrokercredentials) | provider-utils/dist/credential.d.ts:48 |
| <a id="tokenbrokerheaders-1"></a> `tokenBrokerHeaders?` | `Readonly`\<`Record`\<`string`, `string`\>\> | Application-authentication headers sent only to the token broker, such as a short-lived user session bearer token. Use browser-compatible characters. | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`tokenBrokerHeaders`](/docs/reference/api/ottervoice-provider-utils/#tokenbrokerheaders) | provider-utils/dist/credential.d.ts:44 |
| <a id="tokenbrokersessionid-1"></a> `tokenBrokerSessionId?` | `string` | Application voice-session id sent to the broker for ownership checks, audit, and quotas. | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`tokenBrokerSessionId`](/docs/reference/api/ottervoice-provider-utils/#tokenbrokersessionid) | provider-utils/dist/credential.d.ts:46 |
| <a id="tokenbrokerurl-1"></a> `tokenBrokerUrl?` | `string` | Endpoint that mints short-lived, least-privilege tokens; broad provider bearer tokens are not client-safe. | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`tokenBrokerUrl`](/docs/reference/api/ottervoice-provider-utils/#tokenbrokerurl) | provider-utils/dist/credential.d.ts:39 |
| <a id="voice"></a> `voice?` | \| `"alloy"` \| `"ash"` \| `"ballad"` \| `"coral"` \| `"echo"` \| `"fable"` \| `"nova"` \| `"onyx"` \| `"sage"` \| `"shimmer"` \| `"verse"` | Output voice when the model returns spoken audio. Keep server-owned. | - | [provider-openrouter/src/audio-llm.ts:39](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/audio-llm.ts#L39) |

***

### OpenRouterGatewayASRPolicy

Defined in: provider-openrouter/src/gateway-server.ts:10

Locked server policy for speech recognition requests.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="language-1"></a> `language?` | `string` | Optional fixed recognition language. Omit to let the provider detect it. | provider-openrouter/src/gateway-server.ts:14 |
| <a id="model-3"></a> `model` | `string` | Provider model id. Never read this value from an untrusted client. | provider-openrouter/src/gateway-server.ts:12 |

***

### OpenRouterGatewayAudioLLMOptions

Defined in: [provider-openrouter/src/index.ts:185](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/index.ts#L185)

Client-safe Audio LLM gateway options. Model, prompt, voice, and generation limits stay on the server.

#### Extends

- [`OpenRouterGatewayClientOptions`](/docs/reference/api/ottervoice-provider-openrouter/#openroutergatewayclientoptions)

#### Properties

| Property | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="baseurl-2"></a> `baseUrl` | `string` | Profile-specific application base URL, such as `/api/voice/llm`. | [`OpenRouterGatewayClientOptions`](/docs/reference/api/ottervoice-provider-openrouter/#openroutergatewayclientoptions).[`baseUrl`](/docs/reference/api/ottervoice-provider-openrouter/#baseurl-3) | [provider-openrouter/src/index.ts:169](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/index.ts#L169) |
| <a id="fetch-2"></a> `fetch?` | [`FetchLike`](/docs/reference/api/ottervoice-provider-utils/#fetchlike) | Custom fetch implementation, commonly Expo's fetch adapter. | [`OpenRouterGatewayClientOptions`](/docs/reference/api/ottervoice-provider-openrouter/#openroutergatewayclientoptions).[`fetch`](/docs/reference/api/ottervoice-provider-openrouter/#fetch-3) | [provider-openrouter/src/index.ts:173](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/index.ts#L173) |
| <a id="headers-3"></a> `headers?` | `Record`\<`string`, `string`\> | Application-gateway headers, for example a short-lived session token. | [`OpenRouterGatewayClientOptions`](/docs/reference/api/ottervoice-provider-openrouter/#openroutergatewayclientoptions).[`headers`](/docs/reference/api/ottervoice-provider-openrouter/#headers-4) | [provider-openrouter/src/index.ts:171](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/index.ts#L171) |
| <a id="prepareaudio-1"></a> `prepareAudio?` | (`audio`, `format`) => `Promise`\<[`PreparedAudioInput`](/docs/reference/api/ottervoice-provider-openrouter/#preparedaudioinput)\> | Runtime conversion from browser/native capture to WAV or MP3. | - | [provider-openrouter/src/index.ts:187](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/index.ts#L187) |
| <a id="requiredonesentinel-1"></a> `requireDoneSentinel?` | `boolean` | Require the server SSE response to end with `[DONE]`. | - | [provider-openrouter/src/index.ts:189](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/index.ts#L189) |

***

### OpenRouterGatewayAudioLLMPolicy

Defined in: provider-openrouter/src/gateway-server.ts:46

Locked server policy for native Audio LLM requests.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="maxtokens"></a> `maxTokens` | `number` | Hard server-selected output-token ceiling. | provider-openrouter/src/gateway-server.ts:56 |
| <a id="model-4"></a> `model` | `string` | Provider model id. Never read this value from an untrusted client. | provider-openrouter/src/gateway-server.ts:48 |
| <a id="systemprompt"></a> `systemPrompt` | `string` | Trusted system instruction injected before client conversation history. | provider-openrouter/src/gateway-server.ts:50 |
| <a id="temperature-1"></a> `temperature?` | `number` | Server-selected sampling temperature. | provider-openrouter/src/gateway-server.ts:54 |
| <a id="voice-1"></a> `voice` | `string` | Server-selected output voice. | provider-openrouter/src/gateway-server.ts:52 |

***

### OpenRouterGatewayAuthorizationContext

Defined in: provider-openrouter/src/gateway-server.ts:75

Context passed to the application-owned gateway authorization hook.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="profile"></a> `profile` | [`OpenRouterGatewayProfile`](/docs/reference/api/ottervoice-provider-openrouter/#openroutergatewayprofile) | Server profile selected by the explicit route. | provider-openrouter/src/gateway-server.ts:81 |
| <a id="request"></a> `request` | `Request` | Original application request. | provider-openrouter/src/gateway-server.ts:77 |
| <a id="url"></a> `url` | `URL` | Parsed request URL. | provider-openrouter/src/gateway-server.ts:79 |

***

### OpenRouterGatewayClientOptions

Defined in: [provider-openrouter/src/index.ts:167](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/index.ts#L167)

Shared browser/app options for a server-managed OpenRouter gateway profile.

#### Extended by

- [`OpenRouterGatewayAudioLLMOptions`](/docs/reference/api/ottervoice-provider-openrouter/#openroutergatewayaudiollmoptions)

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="baseurl-3"></a> `baseUrl` | `string` | Profile-specific application base URL, such as `/api/voice/llm`. | [provider-openrouter/src/index.ts:169](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/index.ts#L169) |
| <a id="fetch-3"></a> `fetch?` | [`FetchLike`](/docs/reference/api/ottervoice-provider-utils/#fetchlike) | Custom fetch implementation, commonly Expo's fetch adapter. | [provider-openrouter/src/index.ts:173](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/index.ts#L173) |
| <a id="headers-4"></a> `headers?` | `Record`\<`string`, `string`\> | Application-gateway headers, for example a short-lived session token. | [provider-openrouter/src/index.ts:171](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/index.ts#L171) |

***

### OpenRouterGatewayLLMPolicy

Defined in: provider-openrouter/src/gateway-server.ts:18

Locked server policy for text LLM requests.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="maxtokens-1"></a> `maxTokens` | `number` | Hard server-selected output-token ceiling. | provider-openrouter/src/gateway-server.ts:26 |
| <a id="model-5"></a> `model` | `string` | Provider model id. Never read this value from an untrusted client. | provider-openrouter/src/gateway-server.ts:20 |
| <a id="reasoningenabled"></a> `reasoningEnabled?` | `boolean` | Server-selected OpenRouter reasoning behavior. | provider-openrouter/src/gateway-server.ts:28 |
| <a id="responseformat"></a> `responseFormat?` | `"text"` \| `"json"` | Server-selected response shape. Defaults to text. | provider-openrouter/src/gateway-server.ts:30 |
| <a id="systemprompt-1"></a> `systemPrompt` | `string` | Trusted system instruction injected before client conversation history. | provider-openrouter/src/gateway-server.ts:22 |
| <a id="temperature-2"></a> `temperature?` | `number` | Server-selected sampling temperature. | provider-openrouter/src/gateway-server.ts:24 |

***

### OpenRouterGatewayOptions

Defined in: provider-openrouter/src/gateway-server.ts:94

Options for [createOpenRouterGateway](/docs/reference/api/ottervoice-provider-openrouter/#createopenroutergateway).

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="apikey-2"></a> `apiKey?` | `string` | Long-lived OpenRouter key read only in the trusted server runtime. | provider-openrouter/src/gateway-server.ts:96 |
| <a id="authorize"></a> `authorize` | (`context`) => [`OpenRouterGatewayAuthorizationResult`](/docs/reference/api/ottervoice-provider-openrouter/#openroutergatewayauthorizationresult) | Application authorization and session-ownership check. This hook is mandatory so production integrations cannot accidentally omit the trust boundary. | provider-openrouter/src/gateway-server.ts:103 |
| <a id="fetch-4"></a> `fetch?` | [`FetchLike`](/docs/reference/api/ottervoice-provider-utils/#fetchlike) | Server-side fetch override for tests or custom runtimes. | provider-openrouter/src/gateway-server.ts:125 |
| <a id="gatewayprefix"></a> `gatewayPrefix?` | `string` | Browser-facing prefix. Defaults to `/api/voice`. | provider-openrouter/src/gateway-server.ts:107 |
| <a id="maxmessages"></a> `maxMessages?` | `number` | Maximum conversation messages accepted from a client. Defaults to 32. | provider-openrouter/src/gateway-server.ts:113 |
| <a id="maxrequestbodybytes"></a> `maxRequestBodyBytes?` | `number` | Maximum encoded request size. Defaults to 6 MiB. | provider-openrouter/src/gateway-server.ts:111 |
| <a id="maxtextcharacters"></a> `maxTextCharacters?` | `number` | Maximum cumulative client-controlled text characters. Defaults to 32,000. | provider-openrouter/src/gateway-server.ts:115 |
| <a id="policy"></a> `policy` | [`OpenRouterGatewayPolicy`](/docs/reference/api/ottervoice-provider-openrouter/#openroutergatewaypolicy) | Locked model, prompt, voice, and generation policy. | provider-openrouter/src/gateway-server.ts:98 |
| <a id="referer-3"></a> `referer?` | `string` | Server-owned HTTP Referer sent upstream. | provider-openrouter/src/gateway-server.ts:121 |
| <a id="title-3"></a> `title?` | `string` | Server-owned application title sent upstream. | provider-openrouter/src/gateway-server.ts:123 |
| <a id="ttscacheentries"></a> `ttsCacheEntries?` | `number` | Maximum in-memory TTS cache entries. Defaults to zero (disabled). | provider-openrouter/src/gateway-server.ts:119 |
| <a id="upstreambaseurl"></a> `upstreamBaseUrl?` | `string` | Provider API root. Defaults to OpenRouter's public v1 endpoint. | provider-openrouter/src/gateway-server.ts:109 |
| <a id="upstreamtimeoutms"></a> `upstreamTimeoutMs?` | `number` | Total upstream response timeout in milliseconds. Defaults to 60 seconds. | provider-openrouter/src/gateway-server.ts:117 |

***

### OpenRouterGatewayPolicy

Defined in: provider-openrouter/src/gateway-server.ts:63

Server-owned provider policy. Omit a profile to disable its route entirely.
The gateway never accepts these values from a browser or app request body.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="asr"></a> `asr?` | [`OpenRouterGatewayASRPolicy`](/docs/reference/api/ottervoice-provider-openrouter/#openroutergatewayasrpolicy) | Policy for `/asr/audio/transcriptions`. | provider-openrouter/src/gateway-server.ts:65 |
| <a id="audiollm"></a> `audioLlm?` | [`OpenRouterGatewayAudioLLMPolicy`](/docs/reference/api/ottervoice-provider-openrouter/#openroutergatewayaudiollmpolicy) | Policy for `/audio-llm/chat/completions`. | provider-openrouter/src/gateway-server.ts:71 |
| <a id="llm"></a> `llm?` | [`OpenRouterGatewayLLMPolicy`](/docs/reference/api/ottervoice-provider-openrouter/#openroutergatewayllmpolicy) | Policy for `/llm/chat/completions`. | provider-openrouter/src/gateway-server.ts:67 |
| <a id="tts"></a> `tts?` | [`OpenRouterGatewayTTSPolicy`](/docs/reference/api/ottervoice-provider-openrouter/#openroutergatewayttspolicy) | Policy for `/tts/audio/speech`. | provider-openrouter/src/gateway-server.ts:69 |

***

### OpenRouterGatewayTTSPolicy

Defined in: provider-openrouter/src/gateway-server.ts:34

Locked server policy for speech synthesis requests.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="model-6"></a> `model` | `string` | Provider model id. Never read this value from an untrusted client. | provider-openrouter/src/gateway-server.ts:36 |
| <a id="responseformat-1"></a> `responseFormat?` | `"mp3"` \| `"pcm"` | Server-selected output encoding. Defaults to MP3. | provider-openrouter/src/gateway-server.ts:42 |
| <a id="speed"></a> `speed?` | `number` | Server-selected speaking-rate multiplier. | provider-openrouter/src/gateway-server.ts:40 |
| <a id="voice-2"></a> `voice` | `string` | Server-selected voice id. | provider-openrouter/src/gateway-server.ts:38 |

***

### OpenRouterOptions

Defined in: [provider-openrouter/src/index.ts:45](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/index.ts#L45)

Options for [createOpenRouterLLM](/docs/reference/api/ottervoice-provider-openrouter/#createopenrouterllm). Use this direct provider in trusted
server/CLI runtimes. Browsers and apps should prefer
[createOpenRouterGatewayLLM](/docs/reference/api/ottervoice-provider-openrouter/#createopenroutergatewayllm) with a policy-enforcing server gateway.

#### Extends

- [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`HeaderOptions`](/docs/reference/api/ottervoice-provider-openrouter/#headeroptions)

#### Properties

| Property | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="apikey-3"></a> `apiKey?` | `string` | A long-lived key (server-side only — never ship to clients). | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`apiKey`](/docs/reference/api/ottervoice-provider-utils/#apikey) | provider-utils/dist/credential.d.ts:37 |
| <a id="baseurl-4"></a> `baseUrl?` | `string` | API base, default `https://openrouter.ai/api/v1`. | - | [provider-openrouter/src/index.ts:49](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/index.ts#L49) |
| <a id="defaulttemperature-1"></a> `defaultTemperature?` | `number` | Applied when a request does not specify its own temperature. | - | [provider-openrouter/src/index.ts:53](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/index.ts#L53) |
| <a id="fetch-5"></a> `fetch?` | [`FetchLike`](/docs/reference/api/ottervoice-provider-utils/#fetchlike) | Custom `fetch` implementation (tests / React Native polyfills). | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`fetch`](/docs/reference/api/ottervoice-provider-utils/#fetch) | provider-utils/dist/credential.d.ts:50 |
| <a id="headers-5"></a> `headers?` | `Record`\<`string`, `string`\> | Extra headers merged last (override defaults carefully). | [`HeaderOptions`](/docs/reference/api/ottervoice-provider-openrouter/#headeroptions).[`headers`](/docs/reference/api/ottervoice-provider-openrouter/#headers) | [provider-openrouter/src/chat.ts:63](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/chat.ts#L63) |
| <a id="model-7"></a> `model` | `string` | OpenRouter model id, e.g. `openai/gpt-4o-mini`. | - | [provider-openrouter/src/index.ts:47](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/index.ts#L47) |
| <a id="now-2"></a> `now?` | () => `number` | Clock override for deterministic expiry checks in tests. | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`now`](/docs/reference/api/ottervoice-provider-utils/#now) | provider-utils/dist/credential.d.ts:52 |
| <a id="reasoningenabled-1"></a> `reasoningEnabled?` | `boolean` | Explicitly enable/disable reasoning tokens on compatible models. | - | [provider-openrouter/src/index.ts:55](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/index.ts#L55) |
| <a id="referer-4"></a> `referer?` | `string` | Sent as `HTTP-Referer` for OpenRouter rankings / allowlists. | [`HeaderOptions`](/docs/reference/api/ottervoice-provider-openrouter/#headeroptions).[`referer`](/docs/reference/api/ottervoice-provider-openrouter/#referer) | [provider-openrouter/src/chat.ts:59](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/chat.ts#L59) |
| <a id="requeststage-2"></a> `requestStage?` | `"gateway"` \| `"provider"` | Classify HTTP failures as gateway/provider errors. Defaults from whether `baseUrl` is customized. | - | [provider-openrouter/src/index.ts:51](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/index.ts#L51) |
| <a id="servermanaged-2"></a> `serverManaged?` | `boolean` | Omit model, system prompt, generation controls, and response format from the browser request because a trusted policy gateway reconstructs them. Prefer [createOpenRouterGatewayLLM](/docs/reference/api/ottervoice-provider-openrouter/#createopenroutergatewayllm) instead of setting this directly. | - | [provider-openrouter/src/index.ts:61](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/index.ts#L61) |
| <a id="title-4"></a> `title?` | `string` | Sent as `X-Title` (app name shown on OpenRouter). | [`HeaderOptions`](/docs/reference/api/ottervoice-provider-openrouter/#headeroptions).[`title`](/docs/reference/api/ottervoice-provider-openrouter/#title) | [provider-openrouter/src/chat.ts:61](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/chat.ts#L61) |
| <a id="tokenbrokercredentials-2"></a> `tokenBrokerCredentials?` | `RequestCredentials` | Browser credential mode for the broker request. Use `include` for a cross-origin cookie session. | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`tokenBrokerCredentials`](/docs/reference/api/ottervoice-provider-utils/#tokenbrokercredentials) | provider-utils/dist/credential.d.ts:48 |
| <a id="tokenbrokerheaders-2"></a> `tokenBrokerHeaders?` | `Readonly`\<`Record`\<`string`, `string`\>\> | Application-authentication headers sent only to the token broker, such as a short-lived user session bearer token. Use browser-compatible characters. | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`tokenBrokerHeaders`](/docs/reference/api/ottervoice-provider-utils/#tokenbrokerheaders) | provider-utils/dist/credential.d.ts:44 |
| <a id="tokenbrokersessionid-2"></a> `tokenBrokerSessionId?` | `string` | Application voice-session id sent to the broker for ownership checks, audit, and quotas. | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`tokenBrokerSessionId`](/docs/reference/api/ottervoice-provider-utils/#tokenbrokersessionid) | provider-utils/dist/credential.d.ts:46 |
| <a id="tokenbrokerurl-2"></a> `tokenBrokerUrl?` | `string` | Endpoint that mints short-lived, least-privilege tokens; broad provider bearer tokens are not client-safe. | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`tokenBrokerUrl`](/docs/reference/api/ottervoice-provider-utils/#tokenbrokerurl) | provider-utils/dist/credential.d.ts:39 |

***

### OpenRouterTTSOptions

Defined in: [provider-openrouter/src/audio.ts:56](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/audio.ts#L56)

Options for direct OpenRouter HTTP speech synthesis in trusted server/CLI
runtimes. Browser/app integrations should use `OpenRouterGatewayClientOptions`.

#### Extends

- [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`HeaderOptions`](/docs/reference/api/ottervoice-provider-openrouter/#headeroptions)

#### Properties

| Property | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="apikey-4"></a> `apiKey?` | `string` | A long-lived key (server-side only — never ship to clients). | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`apiKey`](/docs/reference/api/ottervoice-provider-utils/#apikey) | provider-utils/dist/credential.d.ts:37 |
| <a id="baseurl-5"></a> `baseUrl?` | `string` | API root; defaults to OpenRouter's chat-compatible base URL. | - | [provider-openrouter/src/audio.ts:62](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/audio.ts#L62) |
| <a id="fetch-6"></a> `fetch?` | [`FetchLike`](/docs/reference/api/ottervoice-provider-utils/#fetchlike) | Custom `fetch` implementation (tests / React Native polyfills). | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`fetch`](/docs/reference/api/ottervoice-provider-utils/#fetch) | provider-utils/dist/credential.d.ts:50 |
| <a id="headers-6"></a> `headers?` | `Record`\<`string`, `string`\> | Extra headers merged last (override defaults carefully). | [`HeaderOptions`](/docs/reference/api/ottervoice-provider-openrouter/#headeroptions).[`headers`](/docs/reference/api/ottervoice-provider-openrouter/#headers) | [provider-openrouter/src/chat.ts:63](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/chat.ts#L63) |
| <a id="model-8"></a> `model` | `string` | OpenRouter / OpenAI-compatible TTS model id. Keep server-owned. | - | [provider-openrouter/src/audio.ts:58](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/audio.ts#L58) |
| <a id="now-3"></a> `now?` | () => `number` | Clock override for deterministic expiry checks in tests. | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`now`](/docs/reference/api/ottervoice-provider-utils/#now) | provider-utils/dist/credential.d.ts:52 |
| <a id="referer-5"></a> `referer?` | `string` | Sent as `HTTP-Referer` for OpenRouter rankings / allowlists. | [`HeaderOptions`](/docs/reference/api/ottervoice-provider-openrouter/#headeroptions).[`referer`](/docs/reference/api/ottervoice-provider-openrouter/#referer) | [provider-openrouter/src/chat.ts:59](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/chat.ts#L59) |
| <a id="requeststage-3"></a> `requestStage?` | `"gateway"` \| `"provider"` | Classify HTTP failures as gateway/provider errors. Defaults from whether `baseUrl` is customized. | - | [provider-openrouter/src/audio.ts:64](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/audio.ts#L64) |
| <a id="servermanaged-3"></a> `serverManaged?` | `boolean` | Omit provider policy fields because a trusted gateway reconstructs the request. | - | [provider-openrouter/src/audio.ts:68](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/audio.ts#L68) |
| <a id="speed-1"></a> `speed?` | `number` | Speaking rate multiplier when the upstream model supports it. Keep server-owned. | - | [provider-openrouter/src/audio.ts:66](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/audio.ts#L66) |
| <a id="title-5"></a> `title?` | `string` | Sent as `X-Title` (app name shown on OpenRouter). | [`HeaderOptions`](/docs/reference/api/ottervoice-provider-openrouter/#headeroptions).[`title`](/docs/reference/api/ottervoice-provider-openrouter/#title) | [provider-openrouter/src/chat.ts:61](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/chat.ts#L61) |
| <a id="tokenbrokercredentials-3"></a> `tokenBrokerCredentials?` | `RequestCredentials` | Browser credential mode for the broker request. Use `include` for a cross-origin cookie session. | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`tokenBrokerCredentials`](/docs/reference/api/ottervoice-provider-utils/#tokenbrokercredentials) | provider-utils/dist/credential.d.ts:48 |
| <a id="tokenbrokerheaders-3"></a> `tokenBrokerHeaders?` | `Readonly`\<`Record`\<`string`, `string`\>\> | Application-authentication headers sent only to the token broker, such as a short-lived user session bearer token. Use browser-compatible characters. | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`tokenBrokerHeaders`](/docs/reference/api/ottervoice-provider-utils/#tokenbrokerheaders) | provider-utils/dist/credential.d.ts:44 |
| <a id="tokenbrokersessionid-3"></a> `tokenBrokerSessionId?` | `string` | Application voice-session id sent to the broker for ownership checks, audit, and quotas. | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`tokenBrokerSessionId`](/docs/reference/api/ottervoice-provider-utils/#tokenbrokersessionid) | provider-utils/dist/credential.d.ts:46 |
| <a id="tokenbrokerurl-3"></a> `tokenBrokerUrl?` | `string` | Endpoint that mints short-lived, least-privilege tokens; broad provider bearer tokens are not client-safe. | [`CredentialOptions`](/docs/reference/api/ottervoice-provider-utils/#credentialoptions).[`tokenBrokerUrl`](/docs/reference/api/ottervoice-provider-utils/#tokenbrokerurl) | provider-utils/dist/credential.d.ts:39 |
| <a id="voice-3"></a> `voice` | `string` | Voice name accepted by the selected model. Keep server-owned. | - | [provider-openrouter/src/audio.ts:60](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/audio.ts#L60) |

***

### PreparedAudioInput

Defined in: [provider-openrouter/src/audio-llm.ts:23](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/audio-llm.ts#L23)

WAV/MP3 bytes ready for OpenAI-compatible audio chat.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="audio"></a> `audio` | `ArrayBuffer` | Encoded audio body. | [provider-openrouter/src/audio-llm.ts:25](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/audio-llm.ts#L25) |
| <a id="format-1"></a> `format` | `"wav"` \| `"mp3"` | Container accepted by the audio chat API. | [provider-openrouter/src/audio-llm.ts:27](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/audio-llm.ts#L27) |

## Type Aliases

### OpenRouterGatewayASROptions

```ts
type OpenRouterGatewayASROptions = OpenRouterGatewayClientOptions & Pick<OpenRouterASROptions, "format" | "partialIntervalMs" | "emptyPartialBackoffMs" | "now">;
```

Defined in: [provider-openrouter/src/index.ts:179](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/index.ts#L179)

Client-safe ASR gateway options. Provider model and language policy stay on the server.

***

### OpenRouterGatewayAuthorizationResult

```ts
type OpenRouterGatewayAuthorizationResult = boolean | Response | Promise<boolean | Response>;
```

Defined in: provider-openrouter/src/gateway-server.ts:88

Authorization result for an OpenRouter policy gateway.
Return `true` to continue, `false` to reject, or a custom response.

***

### OpenRouterGatewayProfile

```ts
type OpenRouterGatewayProfile = "asr" | "llm" | "tts" | "audio_llm";
```

Defined in: provider-openrouter/src/gateway-server.ts:7

Server-owned gateway profile selected by an explicit application route.

## Variables

### DEFAULT\_BASE\_URL

```ts
const DEFAULT_BASE_URL: "https://openrouter.ai/api/v1" = 'https://openrouter.ai/api/v1';
```

Defined in: [provider-openrouter/src/chat.ts:4](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/chat.ts#L4)

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

Defined in: [provider-openrouter/src/chat.ts:32](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/chat.ts#L32)

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

Defined in: [provider-openrouter/src/chat.ts:72](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/chat.ts#L72)

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

Defined in: [provider-openrouter/src/audio.ts:162](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/audio.ts#L162)

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

Defined in: [provider-openrouter/src/audio.ts:188](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/audio.ts#L188)

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

An [ASRProvider](/docs/reference/api/ottervoice-core/#asrprovider) for VoiceSessionConfig.providers.asr.

***

### createOpenRouterAudioLLM()

```ts
function createOpenRouterAudioLLM(options): AudioLLMProvider;
```

Defined in: [provider-openrouter/src/audio-llm.ts:183](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/audio-llm.ts#L183)

Direct OpenRouter native Audio LLM provider for trusted server/CLI runtimes.
Use the gateway factory in browser/app integrations.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | [`OpenRouterAudioLLMOptions`](/docs/reference/api/ottervoice-provider-openrouter/#openrouteraudiollmoptions) | Model, voice, credentials, and optional WebM→WAV preparer. |

#### Returns

[`AudioLLMProvider`](/docs/reference/api/ottervoice-core/#audiollmprovider)

An [AudioLLMProvider](/docs/reference/api/ottervoice-core/#audiollmprovider) for `pipeline: 'audio_llm'`.

***

### createOpenRouterGateway()

```ts
function createOpenRouterGateway(options): (request) => Promise<Response>;
```

Defined in: provider-openrouter/src/gateway-server.ts:354

Create a server-side OpenRouter gateway that reconstructs every upstream
request from a locked policy. Browser-supplied model, system/developer
messages, voice, temperature, token limits, reasoning options, and unknown
fields are never forwarded.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | [`OpenRouterGatewayOptions`](/docs/reference/api/ottervoice-provider-openrouter/#openroutergatewayoptions) | Server credentials, locked policy, authorization hook, and limits. |

#### Returns

A Fetch-compatible request handler for the four profile routes.

(`request`) => `Promise`\<`Response`\>

***

### createOpenRouterGatewayASR()

```ts
function createOpenRouterGatewayASR(options): ASRProvider;
```

Defined in: [provider-openrouter/src/index.ts:200](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/index.ts#L200)

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

Defined in: [provider-openrouter/src/index.ts:255](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/index.ts#L255)

Create an Audio LLM provider for a server-managed application gateway.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | [`OpenRouterGatewayAudioLLMOptions`](/docs/reference/api/ottervoice-provider-openrouter/#openroutergatewayaudiollmoptions) | Profile URL plus runtime audio conversion/stream validation. |

#### Returns

[`AudioLLMProvider`](/docs/reference/api/ottervoice-core/#audiollmprovider)

An Audio LLM provider that sends audio/history without business policy fields.

***

### createOpenRouterGatewayLLM()

```ts
function createOpenRouterGatewayLLM(options): LLMProvider;
```

Defined in: [provider-openrouter/src/index.ts:218](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/index.ts#L218)

Create a text LLM provider for a server-managed application gateway.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | [`OpenRouterGatewayClientOptions`](/docs/reference/api/ottervoice-provider-openrouter/#openroutergatewayclientoptions) | Profile URL and optional application authorization headers/fetch. |

#### Returns

[`LLMProvider`](/docs/reference/api/ottervoice-core/#llmprovider)

An LLM provider that sends only user/assistant history and transport mode.

***

### createOpenRouterGatewayTTS()

```ts
function createOpenRouterGatewayTTS(options): TTSProvider;
```

Defined in: [provider-openrouter/src/index.ts:236](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/index.ts#L236)

Create a TTS provider for a server-managed application gateway.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | [`OpenRouterGatewayClientOptions`](/docs/reference/api/ottervoice-provider-openrouter/#openroutergatewayclientoptions) | Profile URL and optional application authorization headers/fetch. |

#### Returns

[`TTSProvider`](/docs/reference/api/ottervoice-core/#ttsprovider)

A TTS provider that sends only text; model, voice, speed, and format stay server-side.

***

### createOpenRouterLLM()

```ts
function createOpenRouterLLM(options): LLMProvider;
```

Defined in: [provider-openrouter/src/index.ts:73](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/index.ts#L73)

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

Defined in: [provider-openrouter/src/audio.ts:449](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/audio.ts#L449)

Direct OpenRouter TTS for trusted server/CLI runtimes through the
OpenAI-compatible `/audio/speech` endpoint.

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

Defined in: [provider-openrouter/src/chat.ts:110](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/chat.ts#L110)

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

Defined in: [provider-openrouter/src/chat.ts:105](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/chat.ts#L105)

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

Defined in: [provider-openrouter/src/chat.ts:90](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/chat.ts#L90)

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

Defined in: [provider-openrouter/src/audio-llm.ts:153](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/provider-openrouter/src/audio-llm.ts#L153)

Wrap OpenAI's 24 kHz mono PCM16 stream so browser audio elements can play it.

#### Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `pcm` | `Uint8Array` | `undefined` | Interleaved little-endian PCM16 bytes. |
| `sampleRate` | `number` | `24_000` | Sample rate in Hz (OpenAI audio chat defaults to 24_000). |

#### Returns

`ArrayBuffer`

A standard WAV container buffer.
