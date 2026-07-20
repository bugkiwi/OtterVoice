---
title: "@ottervoice/runtime-node"
description: "由 TypeDoc 从源码 JSDoc 生成的 API 参考（英文注释）。"
editUrl: false
---

[**Documentation**](../index/)

***

[Documentation](/docs/reference/api/index/) / @ottervoice/runtime-node

# @ottervoice/runtime-node

Node.js runtime adapter for OtterVoice, with network, stream-based audio I/O,
and console logging adapters.

## Install

```bash
npm install @ottervoice/core @ottervoice/runtime-node
```

## Usage

```ts
import { createNodeRuntime } from '@ottervoice/runtime-node';

const runtime = createNodeRuntime();
```

Pass the returned runtime to your OtterVoice session configuration. Every
adapter can be overridden for custom audio, network, and logging integration.

## Links

[Documentation](https://ottervoice.vercel.app/docs/) ·
[GitHub](https://github.com/bugkiwi/OtterVoice)

## License

MIT

## Classes

### ConsoleLogger

Defined in: [runtime-node/src/logger.ts:15](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/logger.ts#L15)

[LoggerAdapter](/docs/reference/api/ottervoice-core/#loggeradapter) that forwards to `console` (or an injected console).

#### Implements

- [`LoggerAdapter`](/docs/reference/api/ottervoice-core/#loggeradapter)

#### Constructors

##### Constructor

```ts
new ConsoleLogger(out?): ConsoleLogger;
```

Defined in: [runtime-node/src/logger.ts:16](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/logger.ts#L16)

###### Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `out` | [`ConsoleLike`](/docs/reference/api/ottervoice-runtime-node/#consolelike) | `console` |

###### Returns

[`ConsoleLogger`](/docs/reference/api/ottervoice-runtime-node/#consolelogger)

#### Methods

##### debug()

```ts
debug(...args): void;
```

Defined in: [runtime-node/src/logger.ts:18](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/logger.ts#L18)

Verbose diagnostics (disabled in production by default).

###### Parameters

| Parameter | Type |
| ------ | ------ |
| ...`args` | `unknown`[] |

###### Returns

`void`

###### Implementation of

[`LoggerAdapter`](/docs/reference/api/ottervoice-core/#loggeradapter).[`debug`](/docs/reference/api/ottervoice-core/#debug)

##### error()

```ts
error(...args): void;
```

Defined in: [runtime-node/src/logger.ts:30](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/logger.ts#L30)

Failures that typically surface as session errors.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| ...`args` | `unknown`[] |

###### Returns

`void`

###### Implementation of

[`LoggerAdapter`](/docs/reference/api/ottervoice-core/#loggeradapter).[`error`](/docs/reference/api/ottervoice-core/#error-1)

##### info()

```ts
info(...args): void;
```

Defined in: [runtime-node/src/logger.ts:22](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/logger.ts#L22)

Informational lifecycle messages.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| ...`args` | `unknown`[] |

###### Returns

`void`

###### Implementation of

[`LoggerAdapter`](/docs/reference/api/ottervoice-core/#loggeradapter).[`info`](/docs/reference/api/ottervoice-core/#info)

##### warn()

```ts
warn(...args): void;
```

Defined in: [runtime-node/src/logger.ts:26](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/logger.ts#L26)

Recoverable anomalies.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| ...`args` | `unknown`[] |

###### Returns

`void`

###### Implementation of

[`LoggerAdapter`](/docs/reference/api/ottervoice-core/#loggeradapter).[`warn`](/docs/reference/api/ottervoice-core/#warn)

***

### NodeAudioInput

Defined in: [runtime-node/src/audio.ts:43](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/audio.ts#L43)

Reads audio bytes from an async iterable (a mic subprocess, a file stream, …)
and emits [AudioChunk](/docs/reference/api/ottervoice-core/#audiochunk)s. Node has no permission model, so
`requestPermission` always resolves `true`.

#### Implements

- [`AudioInputAdapter`](/docs/reference/api/ottervoice-core/#audioinputadapter)

#### Constructors

##### Constructor

```ts
new NodeAudioInput(options?): NodeAudioInput;
```

Defined in: [runtime-node/src/audio.ts:52](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/audio.ts#L52)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`NodeAudioInputOptions`](/docs/reference/api/ottervoice-runtime-node/#nodeaudioinputoptions) |

###### Returns

[`NodeAudioInput`](/docs/reference/api/ottervoice-runtime-node/#nodeaudioinput)

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="whendrained"></a> `whenDrained` | `Promise`\<`void`\> | Resolves when the source has been fully consumed (or stopped). | [runtime-node/src/audio.ts:50](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/audio.ts#L50) |

#### Methods

##### onChunk()

```ts
onChunk(cb): () => void;
```

Defined in: [runtime-node/src/audio.ts:107](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/audio.ts#L107)

Subscribe to encoded / PCM chunks.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `cb` | (`chunk`) => `void` |

###### Returns

Unsubscribe function.

() => `void`

###### Implementation of

[`AudioInputAdapter`](/docs/reference/api/ottervoice-core/#audioinputadapter).[`onChunk`](/docs/reference/api/ottervoice-core/#onchunk-1)

##### onError()

```ts
onError(cb): () => void;
```

Defined in: [runtime-node/src/audio.ts:112](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/audio.ts#L112)

Subscribe to capture failures.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `cb` | (`error`) => `void` |

###### Returns

Unsubscribe function.

() => `void`

###### Implementation of

[`AudioInputAdapter`](/docs/reference/api/ottervoice-core/#audioinputadapter).[`onError`](/docs/reference/api/ottervoice-core/#onerror-3)

##### pause()

```ts
pause(): Promise<void>;
```

Defined in: [runtime-node/src/audio.ts:99](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/audio.ts#L99)

Pause capture without tearing down permission / hardware (optional).

###### Returns

`Promise`\<`void`\>

###### Implementation of

[`AudioInputAdapter`](/docs/reference/api/ottervoice-core/#audioinputadapter).[`pause`](/docs/reference/api/ottervoice-core/#pause-3)

##### requestPermission()

```ts
requestPermission(): Promise<boolean>;
```

Defined in: [runtime-node/src/audio.ts:56](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/audio.ts#L56)

Prompt for mic permission; `false` should surface as a session error.

###### Returns

`Promise`\<`boolean`\>

###### Implementation of

[`AudioInputAdapter`](/docs/reference/api/ottervoice-core/#audioinputadapter).[`requestPermission`](/docs/reference/api/ottervoice-core/#requestpermission-1)

##### resume()

```ts
resume(): Promise<void>;
```

Defined in: [runtime-node/src/audio.ts:103](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/audio.ts#L103)

Resume after [pause](/docs/reference/api/ottervoice-core/#pause-3).

###### Returns

`Promise`\<`void`\>

###### Implementation of

[`AudioInputAdapter`](/docs/reference/api/ottervoice-core/#audioinputadapter).[`resume`](/docs/reference/api/ottervoice-core/#resume-3)

##### start()

```ts
start(startOptions?): Promise<void>;
```

Defined in: [runtime-node/src/audio.ts:60](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/audio.ts#L60)

Begin capture.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `startOptions` | [`AudioInputOptions`](/docs/reference/api/ottervoice-core/#audioinputoptions) | Preferred rate / encoding hints the runtime may honor. |

###### Returns

`Promise`\<`void`\>

###### Implementation of

[`AudioInputAdapter`](/docs/reference/api/ottervoice-core/#audioinputadapter).[`start`](/docs/reference/api/ottervoice-core/#start-3)

##### stop()

```ts
stop(): Promise<void>;
```

Defined in: [runtime-node/src/audio.ts:95](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/audio.ts#L95)

Stop capture and release resources tied to the current start.

###### Returns

`Promise`\<`void`\>

###### Implementation of

[`AudioInputAdapter`](/docs/reference/api/ottervoice-core/#audioinputadapter).[`stop`](/docs/reference/api/ottervoice-core/#stop-4)

***

### NodeAudioOutput

Defined in: [runtime-node/src/audio.ts:135](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/audio.ts#L135)

Node has no built-in UI playback. By default this records what would have
played; supply a `sink` to actually emit audio (file/speaker subprocess).

#### Implements

- [`AudioOutputAdapter`](/docs/reference/api/ottervoice-core/#audiooutputadapter)

#### Constructors

##### Constructor

```ts
new NodeAudioOutput(options?): NodeAudioOutput;
```

Defined in: [runtime-node/src/audio.ts:142](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/audio.ts#L142)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`NodeAudioOutputOptions`](/docs/reference/api/ottervoice-runtime-node/#nodeaudiooutputoptions) |

###### Returns

[`NodeAudioOutput`](/docs/reference/api/ottervoice-runtime-node/#nodeaudiooutput)

#### Properties

| Property | Type | Default value | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="played"></a> `played` | [`AudioPlaybackInput`](/docs/reference/api/ottervoice-core/#audioplaybackinput)[] | `[]` | [runtime-node/src/audio.ts:140](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/audio.ts#L140) |

#### Methods

##### onEnd()

```ts
onEnd(cb): () => void;
```

Defined in: [runtime-node/src/audio.ts:180](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/audio.ts#L180)

Subscribe to playback end (natural finish or stop).

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `cb` | () => `void` |

###### Returns

Unsubscribe function.

() => `void`

###### Implementation of

[`AudioOutputAdapter`](/docs/reference/api/ottervoice-core/#audiooutputadapter).[`onEnd`](/docs/reference/api/ottervoice-core/#onend-1)

##### onError()

```ts
onError(cb): () => void;
```

Defined in: [runtime-node/src/audio.ts:185](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/audio.ts#L185)

Subscribe to playback failures.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `cb` | (`error`) => `void` |

###### Returns

Unsubscribe function.

() => `void`

###### Implementation of

[`AudioOutputAdapter`](/docs/reference/api/ottervoice-core/#audiooutputadapter).[`onError`](/docs/reference/api/ottervoice-core/#onerror-4)

##### onPlaybackRequested()

```ts
onPlaybackRequested(cb): () => void;
```

Defined in: [runtime-node/src/audio.ts:170](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/audio.ts#L170)

Subscribe when an input is about to be passed to the configured sink.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `cb` | () => `void` | Called once for every call to [NodeAudioOutput.play](/docs/reference/api/ottervoice-runtime-node/#play). |

###### Returns

Unsubscribe function.

() => `void`

###### Implementation of

[`AudioOutputAdapter`](/docs/reference/api/ottervoice-core/#audiooutputadapter).[`onPlaybackRequested`](/docs/reference/api/ottervoice-core/#onplaybackrequested-1)

##### onStart()

```ts
onStart(cb): () => void;
```

Defined in: [runtime-node/src/audio.ts:175](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/audio.ts#L175)

Subscribe to confirmed playback start. Adapters with playback telemetry
fire this once per utterance when the platform first reports active
playback; headless adapters use their closest output acknowledgement.
Resuming a paused utterance does not fire it again.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `cb` | () => `void` | Called when playback first becomes active. |

###### Returns

Unsubscribe function.

() => `void`

###### Implementation of

[`AudioOutputAdapter`](/docs/reference/api/ottervoice-core/#audiooutputadapter).[`onStart`](/docs/reference/api/ottervoice-core/#onstart-1)

##### play()

```ts
play(input): Promise<void>;
```

Defined in: [runtime-node/src/audio.ts:144](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/audio.ts#L144)

Play a complete encoded buffer or URL.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `input` | [`AudioPlaybackInput`](/docs/reference/api/ottervoice-core/#audioplaybackinput) | URL and/or in-memory bytes plus optional MIME / volume. |

###### Returns

`Promise`\<`void`\>

###### Implementation of

[`AudioOutputAdapter`](/docs/reference/api/ottervoice-core/#audiooutputadapter).[`play`](/docs/reference/api/ottervoice-core/#play-1)

##### stop()

```ts
stop(): Promise<void>;
```

Defined in: [runtime-node/src/audio.ts:160](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/audio.ts#L160)

Stop current playback and cancel any open PCM stream.

###### Returns

`Promise`\<`void`\>

###### Implementation of

[`AudioOutputAdapter`](/docs/reference/api/ottervoice-core/#audiooutputadapter).[`stop`](/docs/reference/api/ottervoice-core/#stop-5)

***

### NodeNetworkAdapter

Defined in: [runtime-node/src/network.ts:99](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/network.ts#L99)

[NetworkAdapter](/docs/reference/api/ottervoice-core/#networkadapter) backed by global (or injected) `fetch`/`WebSocket`.

#### Implements

- [`NetworkAdapter`](/docs/reference/api/ottervoice-core/#networkadapter)

#### Constructors

##### Constructor

```ts
new NodeNetworkAdapter(options?): NodeNetworkAdapter;
```

Defined in: [runtime-node/src/network.ts:103](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/network.ts#L103)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`NodeNetworkOptions`](/docs/reference/api/ottervoice-runtime-node/#nodenetworkoptions) |

###### Returns

[`NodeNetworkAdapter`](/docs/reference/api/ottervoice-runtime-node/#nodenetworkadapter)

#### Methods

##### createWebSocket()

```ts
createWebSocket(url, protocols?): RuntimeWebSocket;
```

Defined in: [runtime-node/src/network.ts:112](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/network.ts#L112)

Open a WebSocket for streaming providers.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `url` | `string` | WebSocket URL. |
| `protocols?` | `string` \| `string`[] | Optional subprotocol(s). |

###### Returns

[`RuntimeWebSocket`](/docs/reference/api/ottervoice-core/#runtimewebsocket)

###### Implementation of

[`NetworkAdapter`](/docs/reference/api/ottervoice-core/#networkadapter).[`createWebSocket`](/docs/reference/api/ottervoice-core/#createwebsocket)

##### fetch()

```ts
fetch(input, init?): Promise<Response>;
```

Defined in: [runtime-node/src/network.ts:108](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/network.ts#L108)

Fetch implementation (browser `fetch`, undici, etc.).

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `input` | `RequestInfo` \| `URL` | Request URL or `RequestInfo`. |
| `init?` | `RequestInit` | Optional fetch init. |

###### Returns

`Promise`\<`Response`\>

###### Implementation of

[`NetworkAdapter`](/docs/reference/api/ottervoice-core/#networkadapter).[`fetch`](/docs/reference/api/ottervoice-core/#fetch)

***

### NodeRuntimeWebSocket

Defined in: [runtime-node/src/network.ts:49](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/network.ts#L49)

Adapts a [WebSocketLike](/docs/reference/api/ottervoice-runtime-node/#websocketlike) to the core [RuntimeWebSocket](/docs/reference/api/ottervoice-core/#runtimewebsocket) contract.

#### Implements

- [`RuntimeWebSocket`](/docs/reference/api/ottervoice-core/#runtimewebsocket)

#### Constructors

##### Constructor

```ts
new NodeRuntimeWebSocket(ws): NodeRuntimeWebSocket;
```

Defined in: [runtime-node/src/network.ts:50](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/network.ts#L50)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `ws` | [`WebSocketLike`](/docs/reference/api/ottervoice-runtime-node/#websocketlike) |

###### Returns

[`NodeRuntimeWebSocket`](/docs/reference/api/ottervoice-runtime-node/#noderuntimewebsocket)

#### Methods

##### close()

```ts
close(code?, reason?): void;
```

Defined in: [runtime-node/src/network.ts:58](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/network.ts#L58)

Close the socket.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `code?` | `number` | Optional WebSocket close code. |
| `reason?` | `string` | Optional human-readable reason. |

###### Returns

`void`

###### Implementation of

[`RuntimeWebSocket`](/docs/reference/api/ottervoice-core/#runtimewebsocket).[`close`](/docs/reference/api/ottervoice-core/#close-2)

##### onClose()

```ts
onClose(cb): () => void;
```

Defined in: [runtime-node/src/network.ts:80](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/network.ts#L80)

Subscribe to close.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `cb` | () => `void` |

###### Returns

Unsubscribe function.

() => `void`

###### Implementation of

[`RuntimeWebSocket`](/docs/reference/api/ottervoice-core/#runtimewebsocket).[`onClose`](/docs/reference/api/ottervoice-core/#onclose)

##### onError()

```ts
onError(cb): () => void;
```

Defined in: [runtime-node/src/network.ts:74](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/network.ts#L74)

Subscribe to socket-level errors.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `cb` | (`error`) => `void` |

###### Returns

Unsubscribe function.

() => `void`

###### Implementation of

[`RuntimeWebSocket`](/docs/reference/api/ottervoice-core/#runtimewebsocket).[`onError`](/docs/reference/api/ottervoice-core/#onerror-5)

##### onMessage()

```ts
onMessage(cb): () => void;
```

Defined in: [runtime-node/src/network.ts:68](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/network.ts#L68)

Subscribe to inbound frames.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `cb` | (`data`) => `void` |

###### Returns

Unsubscribe function.

() => `void`

###### Implementation of

[`RuntimeWebSocket`](/docs/reference/api/ottervoice-core/#runtimewebsocket).[`onMessage`](/docs/reference/api/ottervoice-core/#onmessage)

##### onOpen()

```ts
onOpen(cb): () => void;
```

Defined in: [runtime-node/src/network.ts:62](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/network.ts#L62)

Subscribe to the open event.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `cb` | () => `void` |

###### Returns

Unsubscribe function.

() => `void`

###### Implementation of

[`RuntimeWebSocket`](/docs/reference/api/ottervoice-core/#runtimewebsocket).[`onOpen`](/docs/reference/api/ottervoice-core/#onopen)

##### send()

```ts
send(data): void;
```

Defined in: [runtime-node/src/network.ts:54](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/network.ts#L54)

Send a text or binary frame.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `data` | `string` \| `ArrayBuffer` | UTF-8 text or binary payload. |

###### Returns

`void`

###### Implementation of

[`RuntimeWebSocket`](/docs/reference/api/ottervoice-core/#runtimewebsocket).[`send`](/docs/reference/api/ottervoice-core/#send)

## Interfaces

### ConsoleLike

Defined in: [runtime-node/src/logger.ts:7](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/logger.ts#L7)

Minimal console surface accepted by [ConsoleLogger](/docs/reference/api/ottervoice-runtime-node/#consolelogger) and
[NodeRuntimeOptions.logger](/docs/reference/api/ottervoice-runtime-node/#logger-1).

#### Methods

##### debug()

```ts
debug(...args): void;
```

Defined in: [runtime-node/src/logger.ts:8](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/logger.ts#L8)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| ...`args` | `unknown`[] |

###### Returns

`void`

##### error()

```ts
error(...args): void;
```

Defined in: [runtime-node/src/logger.ts:11](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/logger.ts#L11)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| ...`args` | `unknown`[] |

###### Returns

`void`

##### info()

```ts
info(...args): void;
```

Defined in: [runtime-node/src/logger.ts:9](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/logger.ts#L9)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| ...`args` | `unknown`[] |

###### Returns

`void`

##### warn()

```ts
warn(...args): void;
```

Defined in: [runtime-node/src/logger.ts:10](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/logger.ts#L10)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| ...`args` | `unknown`[] |

###### Returns

`void`

***

### NodeAudioInputOptions

Defined in: [runtime-node/src/audio.ts:24](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/audio.ts#L24)

Options for [NodeAudioInput](/docs/reference/api/ottervoice-runtime-node/#nodeaudioinput). Pass a [NodeAudioInputOptions.source](/docs/reference/api/ottervoice-runtime-node/#source)
to stream bytes from a subprocess or file; omit it for a no-op / caller-driven
input under [createNodeRuntime](/docs/reference/api/ottervoice-runtime-node/#createnoderuntime).

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="encoding"></a> `encoding?` | `string` | Default encoding stamped on chunks when `start` does not override. | [runtime-node/src/audio.ts:35](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/audio.ts#L35) |
| <a id="now"></a> `now?` | () => `number` | Override clock used for [AudioChunk.timestamp](/docs/reference/api/ottervoice-core/#timestamp) (tests). | [runtime-node/src/audio.ts:31](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/audio.ts#L31) |
| <a id="samplerate"></a> `sampleRate?` | `number` | Default sample rate stamped on chunks when `start` does not override. | [runtime-node/src/audio.ts:33](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/audio.ts#L33) |
| <a id="source"></a> `source?` | `AsyncIterable`\<`ArrayBuffer` \| `Uint8Array`\<`ArrayBufferLike`\>, `any`, `any`\> | The PCM/byte source — e.g. a child process stdout exposed as an async iterable. When omitted, the input produces nothing (caller-driven). | [runtime-node/src/audio.ts:29](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/audio.ts#L29) |

***

### NodeAudioOutputOptions

Defined in: [runtime-node/src/audio.ts:123](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/audio.ts#L123)

Options for [NodeAudioOutput](/docs/reference/api/ottervoice-runtime-node/#nodeaudiooutput). Supply a [NodeAudioOutputOptions.sink](/docs/reference/api/ottervoice-runtime-node/#sink)
to emit audio; otherwise played inputs accumulate in
[NodeAudioOutput.played](/docs/reference/api/ottervoice-runtime-node/#played) for inspection.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="sink"></a> `sink?` | (`input`) => `void` \| `Promise`\<`void`\> | Where to send synthesized audio — write a file, pipe to a speaker process, etc. When omitted, audio is collected in [NodeAudioOutput.played](/docs/reference/api/ottervoice-runtime-node/#played). | [runtime-node/src/audio.ts:128](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/audio.ts#L128) |

***

### NodeNetworkOptions

Defined in: [runtime-node/src/network.ts:91](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/network.ts#L91)

Injected HTTP / WebSocket constructors for [NodeNetworkAdapter](/docs/reference/api/ottervoice-runtime-node/#nodenetworkadapter).
Defaults to `globalThis.fetch` and `globalThis.WebSocket` when omitted.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="fetch-1"></a> `fetch?` | [`FetchLike`](/docs/reference/api/ottervoice-runtime-node/#fetchlike) | Override `fetch` (defaults to the global). | [runtime-node/src/network.ts:93](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/network.ts#L93) |
| <a id="websocket"></a> `webSocket?` | [`WebSocketCtor`](/docs/reference/api/ottervoice-runtime-node/#websocketctor) | Override the WebSocket constructor (defaults to the global). | [runtime-node/src/network.ts:95](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/network.ts#L95) |

***

### NodeRuntime

Defined in: [runtime-node/src/index.ts:36](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/index.ts#L36)

Node.js [RuntimeAdapter](/docs/reference/api/ottervoice-core/#runtimeadapter) returned by [createNodeRuntime](/docs/reference/api/ottervoice-runtime-node/#createnoderuntime).
Includes audio adapters plus a [NodeNetworkAdapter](/docs/reference/api/ottervoice-runtime-node/#nodenetworkadapter) for providers
that need explicit `fetch` / WebSocket hooks.

#### Extends

- [`RuntimeAdapter`](/docs/reference/api/ottervoice-core/#runtimeadapter)

#### Properties

| Property | Type | Description | Overrides | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="audioinput"></a> `audioInput` | [`NodeAudioInput`](/docs/reference/api/ottervoice-runtime-node/#nodeaudioinput) | Byte-source microphone (async iterable or caller-driven). | [`RuntimeAdapter`](/docs/reference/api/ottervoice-core/#runtimeadapter).[`audioInput`](/docs/reference/api/ottervoice-core/#audioinput-1) | - | [runtime-node/src/index.ts:38](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/index.ts#L38) |
| <a id="audiooutput"></a> `audioOutput` | [`NodeAudioOutput`](/docs/reference/api/ottervoice-runtime-node/#nodeaudiooutput) | Sink or in-memory playback recorder. | [`RuntimeAdapter`](/docs/reference/api/ottervoice-core/#runtimeadapter).[`audioOutput`](/docs/reference/api/ottervoice-core/#audiooutput-1) | - | [runtime-node/src/index.ts:40](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/index.ts#L40) |
| <a id="logger"></a> `logger?` | [`LoggerAdapter`](/docs/reference/api/ottervoice-core/#loggeradapter) | Optional logger; core uses it sparingly. | - | [`RuntimeAdapter`](/docs/reference/api/ottervoice-core/#runtimeadapter).[`logger`](/docs/reference/api/ottervoice-core/#logger-1) | core/dist/types.d.ts:913 |
| <a id="network"></a> `network` | [`NodeNetworkAdapter`](/docs/reference/api/ottervoice-runtime-node/#nodenetworkadapter) | HTTP / WebSocket adapter for providers. | [`RuntimeAdapter`](/docs/reference/api/ottervoice-core/#runtimeadapter).[`network`](/docs/reference/api/ottervoice-core/#network-1) | - | [runtime-node/src/index.ts:42](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/index.ts#L42) |
| <a id="storage"></a> `storage?` | [`RuntimeStorageAdapter`](/docs/reference/api/ottervoice-core/#runtimestorageadapter) | Optional persistence for caches. | - | [`RuntimeAdapter`](/docs/reference/api/ottervoice-core/#runtimeadapter).[`storage`](/docs/reference/api/ottervoice-core/#storage-1) | core/dist/types.d.ts:911 |

***

### NodeRuntimeOptions

Defined in: [runtime-node/src/index.ts:20](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/index.ts#L20)

Optional overrides for [createNodeRuntime](/docs/reference/api/ottervoice-runtime-node/#createnoderuntime).
Use when piping a subprocess mic, writing audio to a sink, stubbing
`fetch`/`WebSocket`, or redirecting / disabling the console logger.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="audioinput-1"></a> `audioInput?` | [`NodeAudioInputOptions`](/docs/reference/api/ottervoice-runtime-node/#nodeaudioinputoptions) | Optional overrides for the default in-memory / stdin-style audio input. | [runtime-node/src/index.ts:22](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/index.ts#L22) |
| <a id="audiooutput-1"></a> `audioOutput?` | [`NodeAudioOutputOptions`](/docs/reference/api/ottervoice-runtime-node/#nodeaudiooutputoptions) | Optional overrides for the default console/file audio output. | [runtime-node/src/index.ts:24](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/index.ts#L24) |
| <a id="logger-1"></a> `logger?` | \| `false` \| [`ConsoleLike`](/docs/reference/api/ottervoice-runtime-node/#consolelike) | Provide `false` to omit the logger, or a console to redirect it. | [runtime-node/src/index.ts:28](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/index.ts#L28) |
| <a id="network-1"></a> `network?` | [`NodeNetworkOptions`](/docs/reference/api/ottervoice-runtime-node/#nodenetworkoptions) | Optional overrides for `fetch` / WebSocket. | [runtime-node/src/index.ts:26](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/index.ts#L26) |

***

### WebSocketLike

Defined in: [runtime-node/src/network.ts:4](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/network.ts#L4)

Minimal surface of a browser/Bun/`ws` WebSocket the wrapper relies on.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="binarytype"></a> `binaryType?` | `string` | Prefer `'arraybuffer'` when the peer sends binary frames. | [runtime-node/src/network.ts:6](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/network.ts#L6) |

#### Methods

##### addEventListener()

```ts
addEventListener(type, listener): void;
```

Defined in: [runtime-node/src/network.ts:12](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/network.ts#L12)

Subscribe to socket events (`open` / `message` / `error` / `close`).

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

Defined in: [runtime-node/src/network.ts:10](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/network.ts#L10)

Close the socket; optional close code and reason.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `code?` | `number` |
| `reason?` | `string` |

###### Returns

`void`

##### removeEventListener()

```ts
removeEventListener(type, listener): void;
```

Defined in: [runtime-node/src/network.ts:14](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/network.ts#L14)

Unsubscribe a listener previously added with [WebSocketLike.addEventListener](/docs/reference/api/ottervoice-runtime-node/#addeventlistener).

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `type` | `string` |
| `listener` | (`event`) => `void` |

###### Returns

`void`

##### send()

```ts
send(data): void;
```

Defined in: [runtime-node/src/network.ts:8](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/network.ts#L8)

Send a text or binary frame to the peer.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `data` | `string` \| `ArrayBufferLike` \| `ArrayBufferView`\<`ArrayBufferLike`\> |

###### Returns

`void`

## Type Aliases

### FetchLike

```ts
type FetchLike = (input, init?) => Promise<Response>;
```

Defined in: [runtime-node/src/network.ts:24](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/network.ts#L24)

`fetch`-compatible HTTP entry point used by [NodeNetworkAdapter](/docs/reference/api/ottervoice-runtime-node/#nodenetworkadapter).

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

Defined in: [runtime-node/src/network.ts:18](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/network.ts#L18)

Constructor for [WebSocketLike](/docs/reference/api/ottervoice-runtime-node/#websocketlike) (global `WebSocket` or `ws`).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `url` | `string` |
| `protocols?` | `string` \| `string`[] |

#### Returns

[`WebSocketLike`](/docs/reference/api/ottervoice-runtime-node/#websocketlike)

## Functions

### createNodeRuntime()

```ts
function createNodeRuntime(options?): NodeRuntime;
```

Defined in: [runtime-node/src/index.ts:50](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/index.ts#L50)

Assemble a Node.js [RuntimeAdapter](/docs/reference/api/ottervoice-core/#runtimeadapter).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | [`NodeRuntimeOptions`](/docs/reference/api/ottervoice-runtime-node/#noderuntimeoptions) | Optional audio, network, and logger overrides. See [NodeRuntimeOptions](/docs/reference/api/ottervoice-runtime-node/#noderuntimeoptions). |

#### Returns

[`NodeRuntime`](/docs/reference/api/ottervoice-runtime-node/#noderuntime)

***

### normalizeWsData()

```ts
function normalizeWsData(data): string | ArrayBuffer;
```

Defined in: [runtime-node/src/network.ts:35](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-node/src/network.ts#L35)

Normalize a WebSocket `message` event's `data` to `string | ArrayBuffer`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `data` | `unknown` | Raw `MessageEvent.data` (string, ArrayBuffer, or TypedArray view). |

#### Returns

`string` \| `ArrayBuffer`

A copy suitable for [RuntimeWebSocket](/docs/reference/api/ottervoice-core/#runtimewebsocket) callbacks.
