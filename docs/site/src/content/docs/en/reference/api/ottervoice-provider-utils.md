---
title: "@ottervoice/provider-utils"
description: "API reference generated from source JSDoc via TypeDoc."
editUrl: false
---

[**Documentation**](../index/)

***

[Documentation](/docs/en/reference/api/index/) / @ottervoice/provider-utils

# @ottervoice/provider-utils

Shared utilities for authors of OtterVoice providers, including client-safe
credential brokers, HTTP error normalization, SSE parsing, and WebSocket ASR
session helpers.

## Install

```bash
npm install @ottervoice/core @ottervoice/provider-utils
```

## Usage

```ts
import {
  createCredentialResolver,
  normalizeHttpError,
  parseSSEStream,
} from '@ottervoice/provider-utils';
```

Application code normally consumes one of the official provider packages
instead of importing this package directly.

## Links

[Documentation](https://ottervoice.vercel.app/docs/) ·
[GitHub](https://github.com/bugkiwi/OtterVoice)

## License

MIT

## Interfaces

### ASRDecodeResult

Defined in: [websocket.ts:48](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/provider-utils/src/websocket.ts#L48)

Result of decoding one vendor WebSocket text frame inside
[WebSocketASRConfig.decode](/docs/en/reference/api/ottervoice-provider-utils/#decode). Omit fields that do not apply; return
`undefined` from `decode` to skip the message entirely.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="error"></a> `error?` | [`NormalizedVoiceError`](/docs/en/reference/api/ottervoice-core/#normalizedvoiceerror) | Provider-reported or decode-time failure for this frame. | [websocket.ts:54](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/provider-utils/src/websocket.ts#L54) |
| <a id="final"></a> `final?` | [`ASRResult`](/docs/en/reference/api/ottervoice-core/#asrresult) | Finalized transcript segment, if this frame ends an utterance. | [websocket.ts:52](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/provider-utils/src/websocket.ts#L52) |
| <a id="partial"></a> `partial?` | [`ASRResult`](/docs/en/reference/api/ottervoice-core/#asrresult) | Incremental (non-final) transcript, if this frame carries one. | [websocket.ts:50](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/provider-utils/src/websocket.ts#L50) |

***

### BrokerRequest

Defined in: [credential.ts:11](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/provider-utils/src/credential.ts#L11)

Body posted to [CredentialOptions.tokenBrokerUrl](/docs/en/reference/api/ottervoice-provider-utils/#tokenbrokerurl).

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="provider"></a> `provider` | `string` | Vendor id echoed to the broker (e.g. `deepgram`, `openrouter`). | [credential.ts:13](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/provider-utils/src/credential.ts#L13) |
| <a id="purpose"></a> `purpose` | [`CredentialPurpose`](/docs/en/reference/api/ottervoice-provider-utils/#credentialpurpose) | Why the token is needed so the broker can scope permissions. | [credential.ts:15](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/provider-utils/src/credential.ts#L15) |
| <a id="sessionid"></a> `sessionId?` | `string` | Optional client session id for audit / rate limits. | [credential.ts:17](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/provider-utils/src/credential.ts#L17) |

***

### BrokerToken

Defined in: [credential.ts:24](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/provider-utils/src/credential.ts#L24)

Short-lived auth material returned by a token broker (or synthesized from
[CredentialOptions.apiKey](/docs/en/reference/api/ottervoice-provider-utils/#apikey)). Use via [createCredentialResolver](/docs/en/reference/api/ottervoice-provider-utils/#createcredentialresolver).

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="expiresat"></a> `expiresAt?` | `number` | Epoch millis after which the token must be refreshed. | [credential.ts:30](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/provider-utils/src/credential.ts#L30) |
| <a id="token"></a> `token` | `string` | Bearer / API token used for upstream auth. | [credential.ts:28](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/provider-utils/src/credential.ts#L28) |
| <a id="url"></a> `url?` | `string` | Optional signed URL (e.g. a websocket endpoint) returned by the broker. | [credential.ts:26](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/provider-utils/src/credential.ts#L26) |

***

### CredentialOptions

Defined in: [credential.ts:38](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/provider-utils/src/credential.ts#L38)

Auth input for provider factories. Prefer [CredentialOptions.tokenBrokerUrl](/docs/en/reference/api/ottervoice-provider-utils/#tokenbrokerurl)
on browsers and apps; reserve [CredentialOptions.apiKey](/docs/en/reference/api/ottervoice-provider-utils/#apikey) for trusted
server-side runtimes only.

#### Extended by

- [`DeepgramOptions`](/docs/en/reference/api/ottervoice-provider-deepgram/#deepgramoptions)
- [`ElevenLabsASROptions`](/docs/en/reference/api/ottervoice-provider-elevenlabs/#elevenlabsasroptions)
- [`OpenRouterASROptions`](/docs/en/reference/api/ottervoice-provider-openrouter/#openrouterasroptions)
- [`OpenRouterAudioLLMOptions`](/docs/en/reference/api/ottervoice-provider-openrouter/#openrouteraudiollmoptions)
- [`OpenRouterOptions`](/docs/en/reference/api/ottervoice-provider-openrouter/#openrouteroptions)
- [`OpenRouterTTSOptions`](/docs/en/reference/api/ottervoice-provider-openrouter/#openrouterttsoptions)

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="apikey"></a> `apiKey?` | `string` | A long-lived key (server-side only — never ship to clients). | [credential.ts:40](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/provider-utils/src/credential.ts#L40) |
| <a id="fetch"></a> `fetch?` | [`FetchLike`](/docs/en/reference/api/ottervoice-provider-utils/#fetchlike) | Custom `fetch` implementation (tests / React Native polyfills). | [credential.ts:44](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/provider-utils/src/credential.ts#L44) |
| <a id="now"></a> `now?` | () => `number` | Clock override for deterministic expiry checks in tests. | [credential.ts:46](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/provider-utils/src/credential.ts#L46) |
| <a id="tokenbrokerurl"></a> `tokenBrokerUrl?` | `string` | Endpoint that mints short-lived tokens (client-safe). | [credential.ts:42](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/provider-utils/src/credential.ts#L42) |

***

### HttpErrorOptions

Defined in: [http.ts:30](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/provider-utils/src/http.ts#L30)

Options for [normalizeHttpError](/docs/en/reference/api/ottervoice-provider-utils/#normalizehttperror). Use when mapping vendor HTTP
failures into OtterVoice's shared error shape.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="failurecode"></a> `failureCode?` | [`VoiceErrorCode`](/docs/en/reference/api/ottervoice-core/#voiceerrorcode-1) | Code to use for ordinary 4xx failures (e.g. `llm_failed`, `tts_failed`). | [http.ts:34](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/provider-utils/src/http.ts#L34) |
| <a id="provider-1"></a> `provider?` | `string` | Vendor id attached to the resulting [NormalizedVoiceError](/docs/en/reference/api/ottervoice-core/#normalizedvoiceerror). | [http.ts:32](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/provider-utils/src/http.ts#L32) |

***

### WebSocketASRConfig

Defined in: [websocket.ts:62](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/provider-utils/src/websocket.ts#L62)

Vendor-agnostic knobs for [createWebSocketASRSession](/docs/en/reference/api/ottervoice-provider-utils/#createwebsocketasrsession). Wire
`encodeAudio` / `decode` to the specific ASR protocol; this config owns only
the session plumbing.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="decode"></a> `decode` | (`data`) => \| [`ASRDecodeResult`](/docs/en/reference/api/ottervoice-provider-utils/#asrdecoderesult) \| `undefined` | Decode a (text) server message into transcripts. Return `undefined` to skip. | [websocket.ts:70](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/provider-utils/src/websocket.ts#L70) |
| <a id="encodeaudio"></a> `encodeAudio` | (`chunk`) => `string` \| `ArrayBufferLike` \| `ArrayBufferView`\<`ArrayBufferLike`\> | Encode an audio chunk into a WS payload. | [websocket.ts:68](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/provider-utils/src/websocket.ts#L68) |
| <a id="finishmessage"></a> `finishMessage?` | `string` | Optional message sent on `stop()` to flush the stream. | [websocket.ts:72](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/provider-utils/src/websocket.ts#L72) |
| <a id="provider-2"></a> `provider` | `string` | Vendor id used in emitted [NormalizedVoiceError](/docs/en/reference/api/ottervoice-core/#normalizedvoiceerror)s. | [websocket.ts:66](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/provider-utils/src/websocket.ts#L66) |
| <a id="ws"></a> `ws` | [`WebSocketLike`](/docs/en/reference/api/ottervoice-provider-utils/#websocketlike) | Open (or about-to-open) socket used for the ASR stream. | [websocket.ts:64](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/provider-utils/src/websocket.ts#L64) |

***

### WebSocketLike

Defined in: [websocket.ts:13](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/provider-utils/src/websocket.ts#L13)

Minimal browser/Node WebSocket surface used by [createWebSocketASRSession](/docs/en/reference/api/ottervoice-provider-utils/#createwebsocketasrsession).
Prefer the platform constructor via [resolveWebSocket](/docs/en/reference/api/ottervoice-provider-utils/#resolvewebsocket), or inject a mock
in tests.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="binarytype"></a> `binaryType?` | `string` | Prefer `'arraybuffer'` when the peer sends binary frames. | [websocket.ts:15](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/provider-utils/src/websocket.ts#L15) |

#### Methods

##### addEventListener()

```ts
addEventListener(type, listener): void;
```

Defined in: [websocket.ts:21](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/provider-utils/src/websocket.ts#L21)

Subscribe to `open` / `message` / `error` / `close` (and peers).

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `type` | `string` |
| `listener` | (`event`) => `void` |

###### Returns

`void`

##### close()

```ts
close(code?, reason?): void;
```

Defined in: [websocket.ts:19](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/provider-utils/src/websocket.ts#L19)

Close the socket; optional close code and reason.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `code?` | `number` |
| `reason?` | `string` |

###### Returns

`void`

##### send()

```ts
send(data): void;
```

Defined in: [websocket.ts:17](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/provider-utils/src/websocket.ts#L17)

Send a text or binary frame to the peer.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `data` | `string` \| `ArrayBufferLike` \| `ArrayBufferView`\<`ArrayBufferLike`\> |

###### Returns

`void`

## Type Aliases

### CredentialPurpose

```ts
type CredentialPurpose = "asr" | "llm" | "tts" | "pronunciation";
```

Defined in: [credential.ts:8](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/provider-utils/src/credential.ts#L8)

Why a short-lived credential is being minted. Sent as
[BrokerRequest.purpose](/docs/en/reference/api/ottervoice-provider-utils/#purpose) so the broker can scope permissions.

***

### FetchLike

```ts
type FetchLike = (input, init?) => Promise<Response>;
```

Defined in: [http.ts:11](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/provider-utils/src/http.ts#L11)

Minimal `fetch`-compatible callable. Inject a custom impl for tests or
React Native polyfills; otherwise [resolveFetch](/docs/en/reference/api/ottervoice-provider-utils/#resolvefetch) uses `globalThis.fetch`.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | `RequestInfo` \| `URL` |
| `init?` | `RequestInit` |

#### Returns

`Promise`\<`Response`\>

***

### WebSocketCtor

```ts
type WebSocketCtor = (url, protocols?) => WebSocketLike;
```

Defined in: [websocket.ts:28](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/provider-utils/src/websocket.ts#L28)

Constructible WebSocket type returning a [WebSocketLike](/docs/en/reference/api/ottervoice-provider-utils/#websocketlike). Passed to
[resolveWebSocket](/docs/en/reference/api/ottervoice-provider-utils/#resolvewebsocket) when the runtime has no global `WebSocket`.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `url` | `string` |
| `protocols?` | `string` \| `string`[] |

#### Returns

[`WebSocketLike`](/docs/en/reference/api/ottervoice-provider-utils/#websocketlike)

## Functions

### createCredentialResolver()

```ts
function createCredentialResolver(options, request): () => Promise<BrokerToken>;
```

Defined in: [credential.ts:61](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/provider-utils/src/credential.ts#L61)

Returns a resolver that yields a usable [BrokerToken](/docs/en/reference/api/ottervoice-provider-utils/#brokertoken). Prefers a static
`apiKey`; otherwise calls the token broker and caches the result until just
before it expires.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | [`CredentialOptions`](/docs/en/reference/api/ottervoice-provider-utils/#credentialoptions) | Static key and/or broker URL. |
| `request` | [`BrokerRequest`](/docs/en/reference/api/ottervoice-provider-utils/#brokerrequest) | Provider + purpose posted to the broker when minting. |

#### Returns

Async function that resolves a fresh-enough [BrokerToken](/docs/en/reference/api/ottervoice-provider-utils/#brokertoken).

() => `Promise`\<[`BrokerToken`](/docs/en/reference/api/ottervoice-provider-utils/#brokertoken)\>

***

### createWebSocketASRSession()

```ts
function createWebSocketASRSession(config): ASRSession;
```

Defined in: [websocket.ts:84](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/provider-utils/src/websocket.ts#L84)

Build an [ASRSession](/docs/en/reference/api/ottervoice-core/#asrsession) over a WebSocket. Audio sent before the socket
opens is queued and flushed on open. Vendor specifics live entirely in
`encodeAudio`/`decode`, keeping this plumbing reusable and testable.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `config` | [`WebSocketASRConfig`](/docs/en/reference/api/ottervoice-provider-utils/#websocketasrconfig) | Socket, provider id, and encode/decode hooks. See [WebSocketASRConfig](/docs/en/reference/api/ottervoice-provider-utils/#websocketasrconfig). |

#### Returns

[`ASRSession`](/docs/en/reference/api/ottervoice-core/#asrsession)

An [ASRSession](/docs/en/reference/api/ottervoice-core/#asrsession) bound to the given socket.

***

### normalizeHttpError()

```ts
function normalizeHttpError(
   status, 
   body, 
   options?): NormalizedVoiceError;
```

Defined in: [http.ts:46](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/provider-utils/src/http.ts#L46)

Map an HTTP status + body into a [NormalizedVoiceError](/docs/en/reference/api/ottervoice-core/#normalizedvoiceerror), with sensible
retryable/quota/rate-limit handling shared by every HTTP provider.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `status` | `number` | HTTP status code from the failed response. |
| `body` | `string` | Response body text (may be empty). |
| `options` | [`HttpErrorOptions`](/docs/en/reference/api/ottervoice-provider-utils/#httperroroptions) | Provider id and non-2xx / non-5xx failure code. |

#### Returns

[`NormalizedVoiceError`](/docs/en/reference/api/ottervoice-core/#normalizedvoiceerror)

A normalized error suitable for `VoiceError` or event emission.

***

### parseSSEStream()

```ts
function parseSSEStream(stream): AsyncGenerator<string>;
```

Defined in: [sse.ts:9](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/provider-utils/src/sse.ts#L9)

Parse a Server-Sent-Events byte stream into successive `data:` payload
strings. Comment lines (`:`), blank lines, and non-`data:` fields are
skipped. Lines split across chunk boundaries are buffered.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `stream` | `ReadableStream`\<`Uint8Array`\<`ArrayBufferLike`\>\> | Byte stream from `Response.body` (or a test fixture). |

#### Returns

`AsyncGenerator`\<`string`\>

Async generator yielding trimmed `data:` field values.

***

### readBody()

```ts
function readBody(res): Promise<string>;
```

Defined in: [http.ts:83](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/provider-utils/src/http.ts#L83)

Read a response body as text, returning `''` if the body cannot be read.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `res` | `Response` | Fetch Response whose body to consume. |

#### Returns

`Promise`\<`string`\>

Body text, or an empty string on read failure.

***

### resolveFetch()

```ts
function resolveFetch(fetchImpl?): FetchLike;
```

Defined in: [http.ts:22](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/provider-utils/src/http.ts#L22)

Resolve the `fetch` implementation, preferring an injected one.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `fetchImpl?` | [`FetchLike`](/docs/en/reference/api/ottervoice-provider-utils/#fetchlike) | Optional override; when omitted, uses `globalThis.fetch`. |

#### Returns

[`FetchLike`](/docs/en/reference/api/ottervoice-provider-utils/#fetchlike)

A [FetchLike](/docs/en/reference/api/ottervoice-provider-utils/#fetchlike) ready for HTTP calls.

***

### resolveWebSocket()

```ts
function resolveWebSocket(ctor?): WebSocketCtor;
```

Defined in: [websocket.ts:39](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/provider-utils/src/websocket.ts#L39)

Resolve the WebSocket constructor, preferring an injected one.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `ctor?` | [`WebSocketCtor`](/docs/en/reference/api/ottervoice-provider-utils/#websocketctor) | Optional override for tests or non-browser runtimes. |

#### Returns

[`WebSocketCtor`](/docs/en/reference/api/ottervoice-provider-utils/#websocketctor)

A [WebSocketCtor](/docs/en/reference/api/ottervoice-provider-utils/#websocketctor) ready to open sockets.

***

### streamFromStrings()

```ts
function streamFromStrings(chunks): ReadableStream<Uint8Array<ArrayBufferLike>>;
```

Defined in: [sse.ts:46](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/provider-utils/src/sse.ts#L46)

Build a `ReadableStream<Uint8Array>` from string chunks (handy for tests).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `chunks` | `string`[] | UTF-8 string fragments enqueued in order. |

#### Returns

`ReadableStream`\<`Uint8Array`\<`ArrayBufferLike`\>\>

A readable byte stream suitable for [parseSSEStream](/docs/en/reference/api/ottervoice-provider-utils/#parsessestream).
