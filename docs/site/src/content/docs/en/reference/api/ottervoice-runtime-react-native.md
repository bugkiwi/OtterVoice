---
title: "@ottervoice/runtime-react-native"
description: "API reference generated from source JSDoc via TypeDoc."
editUrl: false
---

[**Documentation**](../index/)

***

[Documentation](/docs/en/reference/api/index/) / @ottervoice/runtime-react-native

# @ottervoice/runtime-react-native

React Native and Expo runtime adapter for OtterVoice recording and gapless PCM
playback.

## Install

```bash
npm install @ottervoice/core @ottervoice/runtime-react-native
```

## Usage

```ts
import { createExpoRuntime } from '@ottervoice/runtime-react-native';

const runtime = createExpoRuntime({
  input: audioInputBindings,
  output: audioOutputBindings,
});
```

Native capture and playback primitives are injected so the runtime has no hard
dependency on a particular Expo audio library. See the repository's
`examples/react-native-expo` app for a complete integration.

## Links

[Documentation](https://ottervoice.vercel.app/docs/) ·
[React Native example](https://github.com/bugkiwi/OtterVoice/tree/main/examples/react-native-expo) ·
[GitHub](https://github.com/bugkiwi/OtterVoice)

## License

MIT

## Classes

### ExpoAudioInput

Defined in: [runtime-react-native/src/audio-input.ts:134](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-input.ts#L134)

Expo microphone capture with two modes:

- Expo SDK 57 native PCM streaming: continuous RMS/VAD plus a complete WAV
  emitted at turn end. Encoded capture can be suspended during assistant
  playback while the volume stream stays active for barge-in.
- Legacy file recording: one recorded-file chunk per start/stop cycle.

#### Implements

- [`AudioInputAdapter`](/docs/en/reference/api/ottervoice-core/#audioinputadapter)

#### Constructors

##### Constructor

```ts
new ExpoAudioInput(options): ExpoAudioInput;
```

Defined in: [runtime-react-native/src/audio-input.ts:147](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-input.ts#L147)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`ExpoAudioInputOptions`](/docs/en/reference/api/ottervoice-runtime-react-native/#expoaudioinputoptions) |

###### Returns

[`ExpoAudioInput`](/docs/en/reference/api/ottervoice-runtime-react-native/#expoaudioinput)

#### Methods

##### onChunk()

```ts
onChunk(cb): () => void;
```

Defined in: [runtime-react-native/src/audio-input.ts:281](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-input.ts#L281)

Subscribe to encoded / PCM chunks.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `cb` | (`chunk`) => `void` |

###### Returns

Unsubscribe function.

() => `void`

###### Implementation of

[`AudioInputAdapter`](/docs/en/reference/api/ottervoice-core/#audioinputadapter).[`onChunk`](/docs/en/reference/api/ottervoice-core/#onchunk-1)

##### onError()

```ts
onError(cb): () => void;
```

Defined in: [runtime-react-native/src/audio-input.ts:291](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-input.ts#L291)

Subscribe to capture failures.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `cb` | (`error`) => `void` |

###### Returns

Unsubscribe function.

() => `void`

###### Implementation of

[`AudioInputAdapter`](/docs/en/reference/api/ottervoice-core/#audioinputadapter).[`onError`](/docs/en/reference/api/ottervoice-core/#onerror-3)

##### onVolume()

```ts
onVolume(cb): () => void;
```

Defined in: [runtime-react-native/src/audio-input.ts:286](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-input.ts#L286)

Subscribe to normalized volume levels in `0..1` for VAD.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `cb` | (`level`) => `void` |

###### Returns

Unsubscribe function.

() => `void`

###### Implementation of

[`AudioInputAdapter`](/docs/en/reference/api/ottervoice-core/#audioinputadapter).[`onVolume`](/docs/en/reference/api/ottervoice-core/#onvolume-2)

##### pause()

```ts
pause(): Promise<void>;
```

Defined in: [runtime-react-native/src/audio-input.ts:269](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-input.ts#L269)

Pause capture without tearing down permission / hardware (optional).

###### Returns

`Promise`\<`void`\>

###### Implementation of

[`AudioInputAdapter`](/docs/en/reference/api/ottervoice-core/#audioinputadapter).[`pause`](/docs/en/reference/api/ottervoice-core/#pause-3)

##### requestPermission()

```ts
requestPermission(): Promise<boolean>;
```

Defined in: [runtime-react-native/src/audio-input.ts:151](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-input.ts#L151)

Prompt for mic permission; `false` should surface as a session error.

###### Returns

`Promise`\<`boolean`\>

###### Implementation of

[`AudioInputAdapter`](/docs/en/reference/api/ottervoice-core/#audioinputadapter).[`requestPermission`](/docs/en/reference/api/ottervoice-core/#requestpermission-1)

##### resume()

```ts
resume(): Promise<void>;
```

Defined in: [runtime-react-native/src/audio-input.ts:273](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-input.ts#L273)

Resume after [pause](/docs/en/reference/api/ottervoice-core/#pause-3).

###### Returns

`Promise`\<`void`\>

###### Implementation of

[`AudioInputAdapter`](/docs/en/reference/api/ottervoice-core/#audioinputadapter).[`resume`](/docs/en/reference/api/ottervoice-core/#resume-3)

##### resumeCapture()

```ts
resumeCapture(): Promise<void>;
```

Defined in: [runtime-react-native/src/audio-input.ts:265](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-input.ts#L265)

Resume encoded chunk capture after [suspendCapture](/docs/en/reference/api/ottervoice-core/#suspendcapture). Runtimes with a
barge-in pre-roll buffer may include it when `includePreRoll` is true.

###### Returns

`Promise`\<`void`\>

###### Implementation of

[`AudioInputAdapter`](/docs/en/reference/api/ottervoice-core/#audioinputadapter).[`resumeCapture`](/docs/en/reference/api/ottervoice-core/#resumecapture)

##### start()

```ts
start(options?): Promise<void>;
```

Defined in: [runtime-react-native/src/audio-input.ts:155](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-input.ts#L155)

Begin capture.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | [`AudioInputOptions`](/docs/en/reference/api/ottervoice-core/#audioinputoptions) | Preferred rate / encoding hints the runtime may honor. |

###### Returns

`Promise`\<`void`\>

###### Implementation of

[`AudioInputAdapter`](/docs/en/reference/api/ottervoice-core/#audioinputadapter).[`start`](/docs/en/reference/api/ottervoice-core/#start-3)

##### stop()

```ts
stop(): Promise<void>;
```

Defined in: [runtime-react-native/src/audio-input.ts:211](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-input.ts#L211)

Stop capture and release resources tied to the current start.

###### Returns

`Promise`\<`void`\>

###### Implementation of

[`AudioInputAdapter`](/docs/en/reference/api/ottervoice-core/#audioinputadapter).[`stop`](/docs/en/reference/api/ottervoice-core/#stop-4)

##### suspendCapture()

```ts
suspendCapture(): Promise<void>;
```

Defined in: [runtime-react-native/src/audio-input.ts:257](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-input.ts#L257)

Suspend encoded chunk delivery while leaving volume/VAD monitoring active.
A runtime may retain a bounded barge-in pre-roll internally.

###### Returns

`Promise`\<`void`\>

###### Implementation of

[`AudioInputAdapter`](/docs/en/reference/api/ottervoice-core/#audioinputadapter).[`suspendCapture`](/docs/en/reference/api/ottervoice-core/#suspendcapture)

***

### ExpoAudioOutput

Defined in: [runtime-react-native/src/audio-output.ts:122](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-output.ts#L122)

Expo audio playback with an optional gapless PCM response queue. The latter
lets React Native start speaking as soon as OpenRouter's first SSE audio
delta arrives instead of waiting for the complete WAV response.

#### Implements

- [`AudioOutputAdapter`](/docs/en/reference/api/ottervoice-core/#audiooutputadapter)

#### Constructors

##### Constructor

```ts
new ExpoAudioOutput(options): ExpoAudioOutput;
```

Defined in: [runtime-react-native/src/audio-output.ts:133](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-output.ts#L133)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`ExpoAudioOutputOptions`](/docs/en/reference/api/ottervoice-runtime-react-native/#expoaudiooutputoptions) |

###### Returns

[`ExpoAudioOutput`](/docs/en/reference/api/ottervoice-runtime-react-native/#expoaudiooutput)

#### Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="startpcmstream"></a> `startPcmStream?` | `readonly` | (`options`) => `Promise`\<[`AudioOutputStream`](/docs/en/reference/api/ottervoice-core/#audiooutputstream)\> | Begin incremental raw-PCM playback for low-latency speech streaming. | [runtime-react-native/src/audio-output.ts:129](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-output.ts#L129) |

#### Methods

##### onEnd()

```ts
onEnd(cb): () => void;
```

Defined in: [runtime-react-native/src/audio-output.ts:427](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-output.ts#L427)

Subscribe to playback end (natural finish or stop).

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `cb` | () => `void` |

###### Returns

Unsubscribe function.

() => `void`

###### Implementation of

[`AudioOutputAdapter`](/docs/en/reference/api/ottervoice-core/#audiooutputadapter).[`onEnd`](/docs/en/reference/api/ottervoice-core/#onend-1)

##### onError()

```ts
onError(cb): () => void;
```

Defined in: [runtime-react-native/src/audio-output.ts:432](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-output.ts#L432)

Subscribe to playback failures.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `cb` | (`error`) => `void` |

###### Returns

Unsubscribe function.

() => `void`

###### Implementation of

[`AudioOutputAdapter`](/docs/en/reference/api/ottervoice-core/#audiooutputadapter).[`onError`](/docs/en/reference/api/ottervoice-core/#onerror-4)

##### onStart()

```ts
onStart(cb): () => void;
```

Defined in: [runtime-react-native/src/audio-output.ts:422](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-output.ts#L422)

Subscribe to playback start.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `cb` | () => `void` |

###### Returns

Unsubscribe function.

() => `void`

###### Implementation of

[`AudioOutputAdapter`](/docs/en/reference/api/ottervoice-core/#audiooutputadapter).[`onStart`](/docs/en/reference/api/ottervoice-core/#onstart-1)

##### onVolume()

```ts
onVolume(cb): () => void;
```

Defined in: [runtime-react-native/src/audio-output.ts:417](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-output.ts#L417)

Subscribe to normalized RMS of the assistant audio currently being played
(used as an acoustic echo reference for barge-in).

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `cb` | (`level`, `at?`) => `void` |

###### Returns

Unsubscribe function.

() => `void`

###### Implementation of

[`AudioOutputAdapter`](/docs/en/reference/api/ottervoice-core/#audiooutputadapter).[`onVolume`](/docs/en/reference/api/ottervoice-core/#onvolume-3)

##### pause()

```ts
pause(): Promise<void>;
```

Defined in: [runtime-react-native/src/audio-output.ts:393](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-output.ts#L393)

Pause playback without discarding the current utterance (optional).

###### Returns

`Promise`\<`void`\>

###### Implementation of

[`AudioOutputAdapter`](/docs/en/reference/api/ottervoice-core/#audiooutputadapter).[`pause`](/docs/en/reference/api/ottervoice-core/#pause-4)

##### play()

```ts
play(input): Promise<void>;
```

Defined in: [runtime-react-native/src/audio-output.ts:139](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-output.ts#L139)

Play a complete encoded buffer or URL.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `input` | [`AudioPlaybackInput`](/docs/en/reference/api/ottervoice-core/#audioplaybackinput) | URL and/or in-memory bytes plus optional MIME / volume. |

###### Returns

`Promise`\<`void`\>

###### Implementation of

[`AudioOutputAdapter`](/docs/en/reference/api/ottervoice-core/#audiooutputadapter).[`play`](/docs/en/reference/api/ottervoice-core/#play-1)

##### resume()

```ts
resume(): Promise<void>;
```

Defined in: [runtime-react-native/src/audio-output.ts:401](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-output.ts#L401)

Resume after [AudioOutputAdapter.pause](/docs/en/reference/api/ottervoice-core/#pause-4).

###### Returns

`Promise`\<`void`\>

###### Implementation of

[`AudioOutputAdapter`](/docs/en/reference/api/ottervoice-core/#audiooutputadapter).[`resume`](/docs/en/reference/api/ottervoice-core/#resume-4)

##### stop()

```ts
stop(): Promise<void>;
```

Defined in: [runtime-react-native/src/audio-output.ts:382](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-output.ts#L382)

Stop current playback and cancel any open PCM stream.

###### Returns

`Promise`\<`void`\>

###### Implementation of

[`AudioOutputAdapter`](/docs/en/reference/api/ottervoice-core/#audiooutputadapter).[`stop`](/docs/en/reference/api/ottervoice-core/#stop-5)

## Interfaces

### ExpoAudioInputOptions

Defined in: [runtime-react-native/src/audio-input.ts:46](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-input.ts#L46)

Injected mic / file helpers for [ExpoAudioInput](/docs/en/reference/api/ottervoice-runtime-react-native/#expoaudioinput).
Prefer [ExpoAudioInputOptions.createPcmStream](/docs/en/reference/api/ottervoice-runtime-react-native/#createpcmstream) for full-duplex VAD;
fall back to [ExpoAudioInputOptions.createRecording](/docs/en/reference/api/ottervoice-runtime-react-native/#createrecording) for batch capture.
Wired by [createExpoRuntime](/docs/en/reference/api/ottervoice-runtime-react-native/#createexporuntime) via [ExpoRuntimeOptions.input](/docs/en/reference/api/ottervoice-runtime-react-native/#input).

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="createpcmstream"></a> `createPcmStream?` | (`options`, `onBuffer`) => \| [`ExpoPcmInputStream`](/docs/en/reference/api/ottervoice-runtime-react-native/#expopcminputstream) \| `Promise`\<[`ExpoPcmInputStream`](/docs/en/reference/api/ottervoice-runtime-react-native/#expopcminputstream)\> | Create a native PCM microphone stream. Expo SDK 57 `useAudioStream` can supply this without custom native code, so it also works in Expo Go. | [runtime-react-native/src/audio-input.ts:55](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-input.ts#L55) |
| <a id="createrecording"></a> `createRecording?` | () => `Promise`\<[`ExpoRecordingHandle`](/docs/en/reference/api/ottervoice-runtime-react-native/#exporecordinghandle)\> | Legacy file recorder factory. Prefer `createPcmStream` for full duplex. | [runtime-react-native/src/audio-input.ts:48](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-input.ts#L48) |
| <a id="now"></a> `now?` | () => `number` | Override clock used for chunk timestamps (tests). | [runtime-react-native/src/audio-input.ts:62](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-input.ts#L62) |
| <a id="readaudiofile"></a> `readAudioFile?` | (`uri`) => `Promise`\<`ArrayBuffer`\> | Read a legacy recorded file URI into an ArrayBuffer. | [runtime-react-native/src/audio-input.ts:50](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-input.ts#L50) |
| <a id="requestpermission-1"></a> `requestPermission?` | () => `Promise`\<`boolean`\> | Microphone permission (wrap `requestRecordingPermissionsAsync`). | [runtime-react-native/src/audio-input.ts:60](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-input.ts#L60) |

***

### ExpoAudioOutputOptions

Defined in: [runtime-react-native/src/audio-output.ts:71](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-output.ts#L71)

Injected playback / file helpers for [ExpoAudioOutput](/docs/en/reference/api/ottervoice-runtime-react-native/#expoaudiooutput).
Provide [ExpoAudioOutputOptions.createPcmPlaylist](/docs/en/reference/api/ottervoice-runtime-react-native/#createpcmplaylist) plus
[ExpoAudioOutputOptions.writePcmChunk](/docs/en/reference/api/ottervoice-runtime-react-native/#writepcmchunk) for streaming assistant audio;
[ExpoAudioOutputOptions.createSound](/docs/en/reference/api/ottervoice-runtime-react-native/#createsound) covers one-shot URI playback.
Wired by [createExpoRuntime](/docs/en/reference/api/ottervoice-runtime-react-native/#createexporuntime) via [ExpoRuntimeOptions.output](/docs/en/reference/api/ottervoice-runtime-react-native/#output).

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="createpcmplaylist"></a> `createPcmPlaylist?` | () => \| [`ExpoPcmPlaylist`](/docs/en/reference/api/ottervoice-runtime-react-native/#expopcmplaylist) \| `Promise`\<[`ExpoPcmPlaylist`](/docs/en/reference/api/ottervoice-runtime-react-native/#expopcmplaylist)\> | Create an Expo `AudioPlaylist` configured for frequent status updates. | [runtime-react-native/src/audio-output.ts:77](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-output.ts#L77) |
| <a id="createsound"></a> `createSound` | (`uri`) => `Promise`\<[`ExpoSound`](/docs/en/reference/api/ottervoice-runtime-react-native/#exposound)\> | Load a sound from a URI (wrap `createAudioPlayer`). | [runtime-react-native/src/audio-output.ts:73](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-output.ts#L73) |
| <a id="deleteaudiofile"></a> `deleteAudioFile?` | (`uri`) => `void` \| `Promise`\<`void`\> | Best-effort cleanup for temporary response chunk files. | [runtime-react-native/src/audio-output.ts:81](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-output.ts#L81) |
| <a id="writeaudiofile"></a> `writeAudioFile?` | (`buffer`, `mimeType`) => `Promise`\<`string`\> | Persist a complete audio buffer to a file URI. | [runtime-react-native/src/audio-output.ts:75](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-output.ts#L75) |
| <a id="writepcmchunk"></a> `writePcmChunk?` | (`input`) => `Promise`\<`string`\> | Wrap and persist one PCM16 response chunk as a small WAV file. | [runtime-react-native/src/audio-output.ts:79](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-output.ts#L79) |

***

### ExpoPcmChunkFileInput

Defined in: [runtime-react-native/src/audio-output.ts:57](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-output.ts#L57)

One PCM16 fragment to persist as a WAV URI for playlist playback.

#### Extends

- [`PcmAudioStreamOptions`](/docs/en/reference/api/ottervoice-core/#pcmaudiostreamoptions)

#### Properties

| Property | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="channels"></a> `channels` | `number` | Channel count of subsequent `write` payloads. | [`PcmAudioStreamOptions`](/docs/en/reference/api/ottervoice-core/#pcmaudiostreamoptions).[`channels`](/docs/en/reference/api/ottervoice-core/#channels-4) | core/dist/types.d.ts:724 |
| <a id="data"></a> `data` | `ArrayBuffer` | Interleaved PCM16 bytes for this chunk. | - | [runtime-react-native/src/audio-output.ts:59](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-output.ts#L59) |
| <a id="encoding"></a> `encoding` | `"pcm_s16le"` | Always linear 16-bit PCM for incremental streams. | [`PcmAudioStreamOptions`](/docs/en/reference/api/ottervoice-core/#pcmaudiostreamoptions).[`encoding`](/docs/en/reference/api/ottervoice-core/#encoding-4) | core/dist/types.d.ts:720 |
| <a id="index"></a> `index` | `number` | Monotonic chunk index used for temp filenames. | - | [runtime-react-native/src/audio-output.ts:61](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-output.ts#L61) |
| <a id="samplerate"></a> `sampleRate` | `number` | Sample rate of subsequent `write` payloads in Hz. | [`PcmAudioStreamOptions`](/docs/en/reference/api/ottervoice-core/#pcmaudiostreamoptions).[`sampleRate`](/docs/en/reference/api/ottervoice-core/#samplerate-4) | core/dist/types.d.ts:722 |
| <a id="volume"></a> `volume?` | `number` | Playback gain in `[0, 1]`. | [`PcmAudioStreamOptions`](/docs/en/reference/api/ottervoice-core/#pcmaudiostreamoptions).[`volume`](/docs/en/reference/api/ottervoice-core/#volume-1) | core/dist/types.d.ts:726 |

***

### ExpoPcmInputBuffer

Defined in: [runtime-react-native/src/audio-input.ts:17](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-input.ts#L17)

A raw PCM block produced by Expo SDK 57's `useAudioStream`.

#### Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="channels-1"></a> `channels` | `number` | [runtime-react-native/src/audio-input.ts:21](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-input.ts#L21) |
| <a id="data-1"></a> `data` | `ArrayBuffer` | [runtime-react-native/src/audio-input.ts:18](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-input.ts#L18) |
| <a id="encoding-1"></a> `encoding` | `"pcm_s16le"` | [runtime-react-native/src/audio-input.ts:19](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-input.ts#L19) |
| <a id="samplerate-1"></a> `sampleRate` | `number` | [runtime-react-native/src/audio-input.ts:20](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-input.ts#L20) |

***

### ExpoPcmInputStream

Defined in: [runtime-react-native/src/audio-input.ts:25](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-input.ts#L25)

The small part of Expo's native `AudioStream` used by the runtime.

#### Methods

##### start()

```ts
start(): Promise<void>;
```

Defined in: [runtime-react-native/src/audio-input.ts:26](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-input.ts#L26)

###### Returns

`Promise`\<`void`\>

##### stop()

```ts
stop(): void | Promise<void>;
```

Defined in: [runtime-react-native/src/audio-input.ts:27](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-input.ts#L27)

###### Returns

`void` \| `Promise`\<`void`\>

***

### ExpoPcmInputStreamOptions

Defined in: [runtime-react-native/src/audio-input.ts:31](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-input.ts#L31)

Sample format requested when creating [ExpoPcmInputStream](/docs/en/reference/api/ottervoice-runtime-react-native/#expopcminputstream).

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="channels-2"></a> `channels` | `number` | Channel count (typically `1`). | [runtime-react-native/src/audio-input.ts:35](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-input.ts#L35) |
| <a id="encoding-2"></a> `encoding` | `"pcm_s16le"` | Always linear 16-bit PCM little-endian for this runtime. | [runtime-react-native/src/audio-input.ts:37](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-input.ts#L37) |
| <a id="samplerate-2"></a> `sampleRate` | `number` | Capture sample rate in Hz. | [runtime-react-native/src/audio-input.ts:33](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-input.ts#L33) |

***

### ExpoPcmPlaylist

Defined in: [runtime-react-native/src/audio-output.ts:46](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-output.ts#L46)

Gapless Expo AudioPlaylist surface used for incremental PCM playback.

#### Methods

##### add()

```ts
add(uri): void;
```

Defined in: [runtime-react-native/src/audio-output.ts:47](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-output.ts#L47)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `uri` | `string` |

###### Returns

`void`

##### clear()

```ts
clear(): void;
```

Defined in: [runtime-react-native/src/audio-output.ts:51](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-output.ts#L51)

###### Returns

`void`

##### destroy()

```ts
destroy(): void;
```

Defined in: [runtime-react-native/src/audio-output.ts:52](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-output.ts#L52)

###### Returns

`void`

##### next()

```ts
next(): void;
```

Defined in: [runtime-react-native/src/audio-output.ts:48](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-output.ts#L48)

###### Returns

`void`

##### pause()

```ts
pause(): void | Promise<void>;
```

Defined in: [runtime-react-native/src/audio-output.ts:50](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-output.ts#L50)

###### Returns

`void` \| `Promise`\<`void`\>

##### play()

```ts
play(): void | Promise<void>;
```

Defined in: [runtime-react-native/src/audio-output.ts:49](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-output.ts#L49)

###### Returns

`void` \| `Promise`\<`void`\>

##### setOnPlaybackStatusUpdate()

```ts
setOnPlaybackStatusUpdate(cb): () => void;
```

Defined in: [runtime-react-native/src/audio-output.ts:53](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-output.ts#L53)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `cb` | (`status`) => `void` |

###### Returns

() => `void`

***

### ExpoPcmPlaylistStatus

Defined in: [runtime-react-native/src/audio-output.ts:28](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-output.ts#L28)

Status callback payload from an [ExpoPcmPlaylist](/docs/en/reference/api/ottervoice-runtime-react-native/#expopcmplaylist).

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="currentindex"></a> `currentIndex` | `number` | Index of the track currently playing or last finished. | [runtime-react-native/src/audio-output.ts:30](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-output.ts#L30) |
| <a id="currenttime"></a> `currentTime` | `number` | Playback position of the current track, in seconds. | [runtime-react-native/src/audio-output.ts:32](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-output.ts#L32) |
| <a id="didjustfinish"></a> `didJustFinish` | `boolean` | `true` when the playlist reached its end. | [runtime-react-native/src/audio-output.ts:34](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-output.ts#L34) |
| <a id="error"></a> `error?` | `string` \| `null` | Native error string when playback failed. | [runtime-react-native/src/audio-output.ts:42](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-output.ts#L42) |
| <a id="isbuffering"></a> `isBuffering?` | `boolean` | Whether playback is waiting for the current local track to become ready. | [runtime-react-native/src/audio-output.ts:38](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-output.ts#L38) |
| <a id="playing"></a> `playing` | `boolean` | Whether audio is currently audible. | [runtime-react-native/src/audio-output.ts:36](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-output.ts#L36) |
| <a id="trackcount"></a> `trackCount` | `number` | Number of URIs queued in the playlist. | [runtime-react-native/src/audio-output.ts:40](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-output.ts#L40) |

***

### ExpoPlaybackStatus

Defined in: [runtime-react-native/src/audio-output.ts:11](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-output.ts#L11)

Status callback payload from an [ExpoSound](/docs/en/reference/api/ottervoice-runtime-react-native/#exposound) player.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="didjustfinish-1"></a> `didJustFinish?` | `boolean` | `true` when playback completed successfully. | [runtime-react-native/src/audio-output.ts:13](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-output.ts#L13) |
| <a id="error-1"></a> `error?` | `string` \| `null` | Native error string when playback failed. | [runtime-react-native/src/audio-output.ts:15](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-output.ts#L15) |

***

### ExpoRecordingHandle

Defined in: [runtime-react-native/src/audio-input.ts:10](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-input.ts#L10)

An Expo file-recording handle, kept for backwards-compatible batch capture.

#### Methods

##### getURI()

```ts
getURI(): string | null;
```

Defined in: [runtime-react-native/src/audio-input.ts:13](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-input.ts#L13)

###### Returns

`string` \| `null`

##### startAsync()

```ts
startAsync(): Promise<void>;
```

Defined in: [runtime-react-native/src/audio-input.ts:11](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-input.ts#L11)

###### Returns

`Promise`\<`void`\>

##### stopAndUnloadAsync()

```ts
stopAndUnloadAsync(): Promise<void>;
```

Defined in: [runtime-react-native/src/audio-input.ts:12](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-input.ts#L12)

###### Returns

`Promise`\<`void`\>

***

### ExpoRuntime

Defined in: [runtime-react-native/src/index.ts:24](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/index.ts#L24)

Expo / React Native [RuntimeAdapter](/docs/en/reference/api/ottervoice-core/#runtimeadapter) returned by [createExpoRuntime](/docs/en/reference/api/ottervoice-runtime-react-native/#createexporuntime).
No network adapter — providers use global `fetch` / `WebSocket`.

#### Extends

- [`RuntimeAdapter`](/docs/en/reference/api/ottervoice-core/#runtimeadapter)

#### Properties

| Property | Type | Description | Overrides | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="audioinput"></a> `audioInput` | [`ExpoAudioInput`](/docs/en/reference/api/ottervoice-runtime-react-native/#expoaudioinput) | Microphone capture (PCM stream or legacy file recorder). | [`RuntimeAdapter`](/docs/en/reference/api/ottervoice-core/#runtimeadapter).[`audioInput`](/docs/en/reference/api/ottervoice-core/#audioinput-1) | - | [runtime-react-native/src/index.ts:26](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/index.ts#L26) |
| <a id="audiooutput"></a> `audioOutput` | [`ExpoAudioOutput`](/docs/en/reference/api/ottervoice-runtime-react-native/#expoaudiooutput) | One-shot and gapless PCM playlist playback. | [`RuntimeAdapter`](/docs/en/reference/api/ottervoice-core/#runtimeadapter).[`audioOutput`](/docs/en/reference/api/ottervoice-core/#audiooutput-1) | - | [runtime-react-native/src/index.ts:28](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/index.ts#L28) |
| <a id="logger"></a> `logger?` | [`LoggerAdapter`](/docs/en/reference/api/ottervoice-core/#loggeradapter) | Optional logger; core uses it sparingly. | - | [`RuntimeAdapter`](/docs/en/reference/api/ottervoice-core/#runtimeadapter).[`logger`](/docs/en/reference/api/ottervoice-core/#logger-1) | core/dist/types.d.ts:899 |
| <a id="network"></a> `network?` | [`NetworkAdapter`](/docs/en/reference/api/ottervoice-core/#networkadapter) | Optional HTTP/WebSocket hooks for providers. | - | [`RuntimeAdapter`](/docs/en/reference/api/ottervoice-core/#runtimeadapter).[`network`](/docs/en/reference/api/ottervoice-core/#network-1) | core/dist/types.d.ts:895 |
| <a id="storage"></a> `storage?` | [`RuntimeStorageAdapter`](/docs/en/reference/api/ottervoice-core/#runtimestorageadapter) | Optional persistence for caches. | - | [`RuntimeAdapter`](/docs/en/reference/api/ottervoice-core/#runtimeadapter).[`storage`](/docs/en/reference/api/ottervoice-core/#storage-1) | core/dist/types.d.ts:897 |

***

### ExpoRuntimeOptions

Defined in: [runtime-react-native/src/index.ts:13](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/index.ts#L13)

Injected Expo audio bindings for [createExpoRuntime](/docs/en/reference/api/ottervoice-runtime-react-native/#createexporuntime).
Pass platform primitives from `expo-audio` / file helpers so the package
stays free of a hard Expo dependency and remains testable.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="input"></a> `input` | [`ExpoAudioInputOptions`](/docs/en/reference/api/ottervoice-runtime-react-native/#expoaudioinputoptions) | Injected PCM capture bindings (Expo AudioStream / file helpers). | [runtime-react-native/src/index.ts:15](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/index.ts#L15) |
| <a id="output"></a> `output` | [`ExpoAudioOutputOptions`](/docs/en/reference/api/ottervoice-runtime-react-native/#expoaudiooutputoptions) | Injected playback bindings (AudioPlaylist / PCM stream). | [runtime-react-native/src/index.ts:17](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/index.ts#L17) |

***

### ExpoSound

Defined in: [runtime-react-native/src/audio-output.ts:19](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-output.ts#L19)

An Expo `AudioPlayer`-like handle (abstracted for injection/testing).

#### Methods

##### pauseAsync()?

```ts
optional pauseAsync(): Promise<void>;
```

Defined in: [runtime-react-native/src/audio-output.ts:21](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-output.ts#L21)

###### Returns

`Promise`\<`void`\>

##### playAsync()

```ts
playAsync(): Promise<void>;
```

Defined in: [runtime-react-native/src/audio-output.ts:20](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-output.ts#L20)

###### Returns

`Promise`\<`void`\>

##### setOnPlaybackStatusUpdate()

```ts
setOnPlaybackStatusUpdate(cb): void;
```

Defined in: [runtime-react-native/src/audio-output.ts:24](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-output.ts#L24)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `cb` | (`status`) => `void` |

###### Returns

`void`

##### stopAsync()

```ts
stopAsync(): Promise<void>;
```

Defined in: [runtime-react-native/src/audio-output.ts:22](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-output.ts#L22)

###### Returns

`Promise`\<`void`\>

##### unloadAsync()

```ts
unloadAsync(): Promise<void>;
```

Defined in: [runtime-react-native/src/audio-output.ts:23](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-output.ts#L23)

###### Returns

`Promise`\<`void`\>

## Functions

### createExpoRuntime()

```ts
function createExpoRuntime(options): ExpoRuntime;
```

Defined in: [runtime-react-native/src/index.ts:39](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/index.ts#L39)

Assemble an Expo [RuntimeAdapter](/docs/en/reference/api/ottervoice-core/#runtimeadapter). You inject the Expo `Audio` /
`expo-file-system` primitives (so the adapter stays testable and free of a
hard Expo dependency). No network adapter is included — providers use the
global `fetch`/`WebSocket` available in React Native.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | [`ExpoRuntimeOptions`](/docs/en/reference/api/ottervoice-runtime-react-native/#exporuntimeoptions) | Injected input/output primitives. See [ExpoRuntimeOptions](/docs/en/reference/api/ottervoice-runtime-react-native/#exporuntimeoptions). |

#### Returns

[`ExpoRuntime`](/docs/en/reference/api/ottervoice-runtime-react-native/#exporuntime)

***

### pcm16ToWav()

```ts
function pcm16ToWav(
   pcm,
   sampleRate,
   channels): ArrayBuffer;
```

Defined in: [runtime-react-native/src/audio-input.ts:83](https://github.com/bugkiwi/OtterVoice/blob/32a17b53288150ad9b34d3fe77eaca977ba2d063/packages/runtime-react-native/src/audio-input.ts#L83)

Wrap interleaved little-endian PCM16 in a standard WAV container.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `pcm` | `Uint8Array` | Interleaved PCM16 samples. |
| `sampleRate` | `number` | Sample rate in Hz. |
| `channels` | `number` | Channel count (typically `1`). |

#### Returns

`ArrayBuffer`

A standard WAV container buffer.
