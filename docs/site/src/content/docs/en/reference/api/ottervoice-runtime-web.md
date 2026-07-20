---
title: "@ottervoice/runtime-web"
description: "API reference generated from source JSDoc via TypeDoc."
editUrl: false
---

[**Documentation**](../index/)

***

[Documentation](/docs/en/reference/api/index/) / @ottervoice/runtime-web

# @ottervoice/runtime-web

Browser runtime adapter for OtterVoice, with microphone capture, VAD metering,
barge-in pre-roll, and audio playback.

## Install

```bash
npm install @ottervoice/core @ottervoice/runtime-web
```

## Usage

```ts
import { createWebRuntime } from '@ottervoice/runtime-web';

const runtime = createWebRuntime();
```

The default runtime uses `getUserMedia`, `MediaRecorder`, `AudioContext`, and
`HTMLAudioElement`. These browser primitives can be injected for tests or
non-standard hosts.

## Links

[Documentation](https://ottervoice.vercel.app/docs/) ·
[Web example](https://github.com/bugkiwi/OtterVoice/tree/main/examples/web) ·
[GitHub](https://github.com/bugkiwi/OtterVoice)

## License

MIT

## Classes

### WebAudioInput

Defined in: [runtime-web/src/audio-input.ts:109](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-input.ts#L109)

Microphone capture via `getUserMedia` + `MediaRecorder` timeslices. Suitable
for near-real-time ASR; streaming PCM (AudioWorklet) is a future enhancement.

When an AudioContext is available, [WebAudioInput.onVolume](/docs/en/reference/api/ottervoice-runtime-web/#onvolume)
reports RMS levels for rule-based turn detection.

Platform primitives are injected; [createWebRuntime](/docs/en/reference/api/ottervoice-runtime-web/#createwebruntime) supplies the
browser globals by default.

#### Implements

- [`AudioInputAdapter`](/docs/en/reference/api/ottervoice-core/#audioinputadapter)

#### Constructors

##### Constructor

```ts
new WebAudioInput(options): WebAudioInput;
```

Defined in: [runtime-web/src/audio-input.ts:128](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-input.ts#L128)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`WebAudioInputOptions`](/docs/en/reference/api/ottervoice-runtime-web/#webaudioinputoptions) |

###### Returns

[`WebAudioInput`](/docs/en/reference/api/ottervoice-runtime-web/#webaudioinput)

#### Methods

##### onChunk()

```ts
onChunk(cb): () => void;
```

Defined in: [runtime-web/src/audio-input.ts:350](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-input.ts#L350)

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

Defined in: [runtime-web/src/audio-input.ts:360](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-input.ts#L360)

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

Defined in: [runtime-web/src/audio-input.ts:355](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-input.ts#L355)

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

Defined in: [runtime-web/src/audio-input.ts:296](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-input.ts#L296)

Pause capture without tearing down permission / hardware (optional).

###### Returns

`Promise`\<`void`\>

###### Implementation of

[`AudioInputAdapter`](/docs/en/reference/api/ottervoice-core/#audioinputadapter).[`pause`](/docs/en/reference/api/ottervoice-core/#pause-3)

##### requestPermission()

```ts
requestPermission(): Promise<boolean>;
```

Defined in: [runtime-web/src/audio-input.ts:138](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-input.ts#L138)

Prompt for mic permission; `false` should surface as a session error.

###### Returns

`Promise`\<`boolean`\>

###### Implementation of

[`AudioInputAdapter`](/docs/en/reference/api/ottervoice-core/#audioinputadapter).[`requestPermission`](/docs/en/reference/api/ottervoice-core/#requestpermission-1)

##### resume()

```ts
resume(): Promise<void>;
```

Defined in: [runtime-web/src/audio-input.ts:300](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-input.ts#L300)

Resume after [pause](/docs/en/reference/api/ottervoice-core/#pause-3).

###### Returns

`Promise`\<`void`\>

###### Implementation of

[`AudioInputAdapter`](/docs/en/reference/api/ottervoice-core/#audioinputadapter).[`resume`](/docs/en/reference/api/ottervoice-core/#resume-3)

##### resumeCapture()

```ts
resumeCapture(options?): Promise<void>;
```

Defined in: [runtime-web/src/audio-input.ts:313](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-input.ts#L313)

Resume encoded chunk capture after [suspendCapture](/docs/en/reference/api/ottervoice-core/#suspendcapture). Runtimes with a
barge-in pre-roll buffer may include it when `includePreRoll` is true.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | \{ `includePreRoll?`: `boolean`; \} | - |
| `options.includePreRoll?` | `boolean` | Flush retained pre-roll into the next chunks. |

###### Returns

`Promise`\<`void`\>

###### Implementation of

[`AudioInputAdapter`](/docs/en/reference/api/ottervoice-core/#audioinputadapter).[`resumeCapture`](/docs/en/reference/api/ottervoice-core/#resumecapture)

##### start()

```ts
start(options?): Promise<void>;
```

Defined in: [runtime-web/src/audio-input.ts:148](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-input.ts#L148)

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

Defined in: [runtime-web/src/audio-input.ts:272](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-input.ts#L272)

Stop capture and release resources tied to the current start.

###### Returns

`Promise`\<`void`\>

###### Implementation of

[`AudioInputAdapter`](/docs/en/reference/api/ottervoice-core/#audioinputadapter).[`stop`](/docs/en/reference/api/ottervoice-core/#stop-4)

##### suspendCapture()

```ts
suspendCapture(): Promise<void>;
```

Defined in: [runtime-web/src/audio-input.ts:304](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-input.ts#L304)

Suspend encoded chunk delivery while leaving volume/VAD monitoring active.
A runtime may retain a bounded barge-in pre-roll internally.

###### Returns

`Promise`\<`void`\>

###### Implementation of

[`AudioInputAdapter`](/docs/en/reference/api/ottervoice-core/#audioinputadapter).[`suspendCapture`](/docs/en/reference/api/ottervoice-core/#suspendcapture)

***

### WebAudioOutput

Defined in: [runtime-web/src/audio-output.ts:96](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-output.ts#L96)

Playback via an `HTMLAudioElement`. `audioUrl` plays directly; an
`audioBuffer` is wrapped in an object URL (which requires `createObjectURL`).

#### Implements

- [`AudioOutputAdapter`](/docs/en/reference/api/ottervoice-core/#audiooutputadapter)

#### Constructors

##### Constructor

```ts
new WebAudioOutput(options): WebAudioOutput;
```

Defined in: [runtime-web/src/audio-output.ts:115](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-output.ts#L115)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`WebAudioOutputOptions`](/docs/en/reference/api/ottervoice-runtime-web/#webaudiooutputoptions) |

###### Returns

[`WebAudioOutput`](/docs/en/reference/api/ottervoice-runtime-web/#webaudiooutput)

#### Methods

##### onEnd()

```ts
onEnd(cb): () => void;
```

Defined in: [runtime-web/src/audio-output.ts:614](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-output.ts#L614)

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

Defined in: [runtime-web/src/audio-output.ts:619](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-output.ts#L619)

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

##### onPlaybackRequested()

```ts
onPlaybackRequested(cb): () => void;
```

Defined in: [runtime-web/src/audio-output.ts:593](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-output.ts#L593)

Subscribe when element or PCM playback is requested.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `cb` | () => `void` | Called once immediately before the browser playback primitive. |

###### Returns

Unsubscribe function.

() => `void`

###### Implementation of

[`AudioOutputAdapter`](/docs/en/reference/api/ottervoice-core/#audiooutputadapter).[`onPlaybackRequested`](/docs/en/reference/api/ottervoice-core/#onplaybackrequested-1)

##### onStart()

```ts
onStart(cb): () => void;
```

Defined in: [runtime-web/src/audio-output.ts:604](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-output.ts#L604)

Subscribe when element playback is active or scheduled PCM reaches its start.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `cb` | () => `void` | Called once at the first confirmed or scheduled audible frame. |

###### Returns

Unsubscribe function.

() => `void`

###### Implementation of

[`AudioOutputAdapter`](/docs/en/reference/api/ottervoice-core/#audiooutputadapter).[`onStart`](/docs/en/reference/api/ottervoice-core/#onstart-1)

##### onVolume()

```ts
onVolume(cb): () => void;
```

Defined in: [runtime-web/src/audio-output.ts:609](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-output.ts#L609)

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

Defined in: [runtime-web/src/audio-output.ts:406](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-output.ts#L406)

Pause playback without discarding the current utterance (optional).

###### Returns

`Promise`\<`void`\>

###### Implementation of

[`AudioOutputAdapter`](/docs/en/reference/api/ottervoice-core/#audiooutputadapter).[`pause`](/docs/en/reference/api/ottervoice-core/#pause-4)

##### play()

```ts
play(input): Promise<void>;
```

Defined in: [runtime-web/src/audio-output.ts:132](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-output.ts#L132)

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

Defined in: [runtime-web/src/audio-output.ts:421](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-output.ts#L421)

Resume after [AudioOutputAdapter.pause](/docs/en/reference/api/ottervoice-core/#pause-4).

###### Returns

`Promise`\<`void`\>

###### Implementation of

[`AudioOutputAdapter`](/docs/en/reference/api/ottervoice-core/#audiooutputadapter).[`resume`](/docs/en/reference/api/ottervoice-core/#resume-4)

##### startPcmStream()

```ts
startPcmStream(options): Promise<AudioOutputStream>;
```

Defined in: [runtime-web/src/audio-output.ts:239](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-output.ts#L239)

Begin incremental raw-PCM playback for low-latency speech streaming.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | [`PcmAudioStreamOptions`](/docs/en/reference/api/ottervoice-core/#pcmaudiostreamoptions) | Encoding, sample rate, and channel layout for subsequent writes. |

###### Returns

`Promise`\<[`AudioOutputStream`](/docs/en/reference/api/ottervoice-core/#audiooutputstream)\>

An [AudioOutputStream](/docs/en/reference/api/ottervoice-core/#audiooutputstream) that must be `close()`d.

###### Implementation of

[`AudioOutputAdapter`](/docs/en/reference/api/ottervoice-core/#audiooutputadapter).[`startPcmStream`](/docs/en/reference/api/ottervoice-core/#startpcmstream)

##### stop()

```ts
stop(): Promise<void>;
```

Defined in: [runtime-web/src/audio-output.ts:444](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-output.ts#L444)

Stop current playback and cancel any open PCM stream.

###### Returns

`Promise`\<`void`\>

###### Implementation of

[`AudioOutputAdapter`](/docs/en/reference/api/ottervoice-core/#audiooutputadapter).[`stop`](/docs/en/reference/api/ottervoice-core/#stop-5)

##### unlock()

```ts
unlock(): Promise<void>;
```

Defined in: [runtime-web/src/audio-output.ts:117](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-output.ts#L117)

Prime browser autoplay permission from a direct user gesture.

###### Returns

`Promise`\<`void`\>

###### Implementation of

[`AudioOutputAdapter`](/docs/en/reference/api/ottervoice-core/#audiooutputadapter).[`unlock`](/docs/en/reference/api/ottervoice-core/#unlock)

## Interfaces

### AnalyserNodeLike

Defined in: [runtime-web/src/audio-input.ts:56](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-input.ts#L56)

Minimal `AnalyserNode` surface for time-domain RMS metering.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="fftsize"></a> `fftSize` | `number` | FFT size controlling analyser resolution. | [runtime-web/src/audio-input.ts:58](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-input.ts#L58) |
| <a id="frequencybincount"></a> `frequencyBinCount` | `number` | Number of bins available from [AnalyserNodeLike.getByteTimeDomainData](/docs/en/reference/api/ottervoice-runtime-web/#getbytetimedomaindata). | [runtime-web/src/audio-input.ts:60](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-input.ts#L60) |

#### Methods

##### getByteTimeDomainData()

```ts
getByteTimeDomainData(array): void;
```

Defined in: [runtime-web/src/audio-input.ts:62](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-input.ts#L62)

Fill `array` with uint8 time-domain samples.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `array` | `Uint8Array` |

###### Returns

`void`

***

### AudioContextLike

Defined in: [runtime-web/src/audio-input.ts:66](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-input.ts#L66)

Minimal `AudioContext` surface for mic metering (not full Web Audio).

#### Methods

##### close()

```ts
close(): Promise<void>;
```

Defined in: [runtime-web/src/audio-input.ts:69](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-input.ts#L69)

###### Returns

`Promise`\<`void`\>

##### createAnalyser()

```ts
createAnalyser(): AnalyserNodeLike;
```

Defined in: [runtime-web/src/audio-input.ts:68](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-input.ts#L68)

###### Returns

[`AnalyserNodeLike`](/docs/en/reference/api/ottervoice-runtime-web/#analysernodelike)

##### createMediaStreamSource()

```ts
createMediaStreamSource(stream): {
  connect: void;
};
```

Defined in: [runtime-web/src/audio-input.ts:67](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-input.ts#L67)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `stream` | [`MediaStreamLike`](/docs/en/reference/api/ottervoice-runtime-web/#mediastreamlike) |

###### Returns

```ts
{
  connect: void;
}
```

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `connect()` | (`node`) => `void` | [runtime-web/src/audio-input.ts:67](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-input.ts#L67) |

***

### AudioElementLike

Defined in: [runtime-web/src/audio-output.ts:15](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-output.ts#L15)

Minimal `HTMLAudioElement` / `Audio` surface for one-shot encoded playback.
Injected via [WebAudioOutputOptions.createAudio](/docs/en/reference/api/ottervoice-runtime-web/#createaudio).

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="src"></a> `src` | `string` | Object URL or remote URL to play. | [runtime-web/src/audio-output.ts:17](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-output.ts#L17) |
| <a id="volume"></a> `volume` | `number` | Playback gain in `[0, 1]`. | [runtime-web/src/audio-output.ts:19](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-output.ts#L19) |

#### Methods

##### addEventListener()

```ts
addEventListener(type, listener): void;
```

Defined in: [runtime-web/src/audio-output.ts:22](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-output.ts#L22)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `type` | `string` |
| `listener` | () => `void` |

###### Returns

`void`

##### pause()

```ts
pause(): void;
```

Defined in: [runtime-web/src/audio-output.ts:21](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-output.ts#L21)

###### Returns

`void`

##### play()

```ts
play(): Promise<void>;
```

Defined in: [runtime-web/src/audio-output.ts:20](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-output.ts#L20)

###### Returns

`Promise`\<`void`\>

***

### AudioEnvelope

Defined in: [runtime-web/src/audio-conversion.ts:22](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-conversion.ts#L22)

Short RMS timeline of decoded assistant audio.
Produced by [measureBrowserAudioEnvelope](/docs/en/reference/api/ottervoice-runtime-web/#measurebrowseraudioenvelope) and used as a playback
reference for echo-aware barge-in.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="framems"></a> `frameMs` | `number` | Duration of each frame in milliseconds. | [runtime-web/src/audio-conversion.ts:26](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-conversion.ts#L26) |
| <a id="levels"></a> `levels` | `number`[] | Per-frame RMS levels in roughly `[0, 1]`. | [runtime-web/src/audio-conversion.ts:24](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-conversion.ts#L24) |

***

### BlobLike

Defined in: [runtime-web/src/audio-input.ts:22](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-input.ts#L22)

Minimal `Blob` surface for MediaRecorder `dataavailable` payloads.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="size"></a> `size` | `number` | Byte length of the blob. | [runtime-web/src/audio-input.ts:24](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-input.ts#L24) |

#### Methods

##### arrayBuffer()

```ts
arrayBuffer(): Promise<ArrayBuffer>;
```

Defined in: [runtime-web/src/audio-input.ts:26](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-input.ts#L26)

Copy blob contents into an ArrayBuffer.

###### Returns

`Promise`\<`ArrayBuffer`\>

***

### MediaRecorderLike

Defined in: [runtime-web/src/audio-input.ts:33](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-input.ts#L33)

Minimal `MediaRecorder` surface for chunked mic encoding.
Injected via [WebAudioInputOptions.mediaRecorder](/docs/en/reference/api/ottervoice-runtime-web/#mediarecorder) / browser global.

#### Methods

##### addEventListener()

```ts
addEventListener(type, listener): void;
```

Defined in: [runtime-web/src/audio-input.ts:43](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-input.ts#L43)

Subscribe to recorder events (e.g. `dataavailable`, `error`, `stop`).

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `type` | `string` |
| `listener` | (`event`) => `void` |

###### Returns

`void`

##### pause()

```ts
pause(): void;
```

Defined in: [runtime-web/src/audio-input.ts:39](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-input.ts#L39)

Pause encoding without ending the recording.

###### Returns

`void`

##### resume()

```ts
resume(): void;
```

Defined in: [runtime-web/src/audio-input.ts:41](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-input.ts#L41)

Resume after [MediaRecorderLike.pause](/docs/en/reference/api/ottervoice-runtime-web/#pause-3).

###### Returns

`void`

##### start()

```ts
start(timeslice?): void;
```

Defined in: [runtime-web/src/audio-input.ts:35](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-input.ts#L35)

Begin encoding; optional timeslice (ms) for periodic `dataavailable` events.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `timeslice?` | `number` |

###### Returns

`void`

##### stop()

```ts
stop(): void;
```

Defined in: [runtime-web/src/audio-input.ts:37](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-input.ts#L37)

Stop encoding and release the recorder.

###### Returns

`void`

***

### MediaStreamLike

Defined in: [runtime-web/src/audio-input.ts:16](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-input.ts#L16)

Minimal `MediaStream` surface used by [WebAudioInput](/docs/en/reference/api/ottervoice-runtime-web/#webaudioinput).

#### Methods

##### getTracks()

```ts
getTracks(): MediaTrackLike[];
```

Defined in: [runtime-web/src/audio-input.ts:18](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-input.ts#L18)

Tracks belonging to the stream (mic, etc.).

###### Returns

[`MediaTrackLike`](/docs/en/reference/api/ottervoice-runtime-web/#mediatracklike)[]

***

### MediaTrackLike

Defined in: [runtime-web/src/audio-input.ts:10](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-input.ts#L10)

Minimal `MediaStreamTrack` surface used to stop capture.

#### Methods

##### stop()

```ts
stop(): void;
```

Defined in: [runtime-web/src/audio-input.ts:12](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-input.ts#L12)

End this track (releases the microphone).

###### Returns

`void`

***

### PcmAudioBufferLike

Defined in: [runtime-web/src/audio-output.ts:26](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-output.ts#L26)

Minimal `AudioBuffer` surface for scheduling PCM frames.

#### Methods

##### getChannelData()

```ts
getChannelData(channel): Float32Array;
```

Defined in: [runtime-web/src/audio-output.ts:28](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-output.ts#L28)

Mutable float samples for one channel.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `channel` | `number` |

###### Returns

`Float32Array`

***

### PcmAudioBufferSourceLike

Defined in: [runtime-web/src/audio-output.ts:32](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-output.ts#L32)

Minimal `AudioBufferSourceNode` surface for gapless PCM streaming.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="buffer"></a> `buffer` | \| [`PcmAudioBufferLike`](/docs/en/reference/api/ottervoice-runtime-web/#pcmaudiobufferlike) \| `null` | Buffer to play, or `null` before assignment. | [runtime-web/src/audio-output.ts:34](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-output.ts#L34) |

#### Methods

##### addEventListener()

```ts
addEventListener(type, listener): void;
```

Defined in: [runtime-web/src/audio-output.ts:38](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-output.ts#L38)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `type` | `"ended"` |
| `listener` | () => `void` |

###### Returns

`void`

##### connect()

```ts
connect(destination): unknown;
```

Defined in: [runtime-web/src/audio-output.ts:35](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-output.ts#L35)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `destination` | `unknown` |

###### Returns

`unknown`

##### start()

```ts
start(when?): void;
```

Defined in: [runtime-web/src/audio-output.ts:36](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-output.ts#L36)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `when?` | `number` |

###### Returns

`void`

##### stop()

```ts
stop(): void;
```

Defined in: [runtime-web/src/audio-output.ts:37](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-output.ts#L37)

###### Returns

`void`

***

### PcmAudioContextLike

Defined in: [runtime-web/src/audio-output.ts:45](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-output.ts#L45)

Minimal Web Audio context used for incremental PCM playback and echo reference.
Distinct from the mic-metering context shim on [WebAudioInput](/docs/en/reference/api/ottervoice-runtime-web/#webaudioinput).

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="currenttime"></a> `currentTime` | `number` | AudioContext clock in seconds. | [runtime-web/src/audio-output.ts:47](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-output.ts#L47) |
| <a id="destination"></a> `destination` | `unknown` | Default output destination. | [runtime-web/src/audio-output.ts:49](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-output.ts#L49) |

#### Methods

##### createBuffer()

```ts
createBuffer(
   numberOfChannels,
   length,
   sampleRate): PcmAudioBufferLike;
```

Defined in: [runtime-web/src/audio-output.ts:52](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-output.ts#L52)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `numberOfChannels` | `number` |
| `length` | `number` |
| `sampleRate` | `number` |

###### Returns

[`PcmAudioBufferLike`](/docs/en/reference/api/ottervoice-runtime-web/#pcmaudiobufferlike)

##### createBufferSource()

```ts
createBufferSource(): PcmAudioBufferSourceLike;
```

Defined in: [runtime-web/src/audio-output.ts:57](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-output.ts#L57)

###### Returns

[`PcmAudioBufferSourceLike`](/docs/en/reference/api/ottervoice-runtime-web/#pcmaudiobuffersourcelike)

##### resume()

```ts
resume(): Promise<void>;
```

Defined in: [runtime-web/src/audio-output.ts:50](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-output.ts#L50)

###### Returns

`Promise`\<`void`\>

##### suspend()

```ts
suspend(): Promise<void>;
```

Defined in: [runtime-web/src/audio-output.ts:51](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-output.ts#L51)

###### Returns

`Promise`\<`void`\>

***

### PrepareBrowserAudioOptions

Defined in: [runtime-web/src/audio-conversion.ts:33](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-conversion.ts#L33)

Options for [prepareBrowserAudio](/docs/en/reference/api/ottervoice-runtime-web/#preparebrowseraudio) when converting browser capture to WAV.
Use to cap capture length or downsample before sending to an Audio LLM.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="maxdurationms"></a> `maxDurationMs?` | `number` | Keep only the newest portion of a long capture. | [runtime-web/src/audio-conversion.ts:37](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-conversion.ts#L37) |
| <a id="samplerate"></a> `sampleRate?` | `number` | PCM sample rate written to the WAV. Defaults to the decoded source rate. | [runtime-web/src/audio-conversion.ts:35](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-conversion.ts#L35) |

***

### WebAudioInputOptions

Defined in: [runtime-web/src/audio-input.ts:80](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-input.ts#L80)

Injected primitives and timing knobs for [WebAudioInput](/docs/en/reference/api/ottervoice-runtime-web/#webaudioinput).
Prefer [createWebRuntime](/docs/en/reference/api/ottervoice-runtime-web/#createwebruntime) to wire browser globals; construct directly
only when substituting stubs or a custom capture stack.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="audiocontext"></a> `audioContext?` | [`AudioContextCtor`](/docs/en/reference/api/ottervoice-runtime-web/#audiocontextctor) | Override AudioContext (defaults to the browser global). | [runtime-web/src/audio-input.ts:94](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-input.ts#L94) |
| <a id="bargeinprerollms"></a> `bargeInPreRollMs?` | `number` | Encoded audio retained while playback is filtered for barge-in. Default 500 ms. | [runtime-web/src/audio-input.ts:92](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-input.ts#L92) |
| <a id="getusermedia"></a> `getUserMedia` | [`GetUserMedia`](/docs/en/reference/api/ottervoice-runtime-web/#getusermedia-2) | Microphone permission + stream factory (`getUserMedia`). | [runtime-web/src/audio-input.ts:82](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-input.ts#L82) |
| <a id="mediarecorder"></a> `mediaRecorder` | [`MediaRecorderCtor`](/docs/en/reference/api/ottervoice-runtime-web/#mediarecorderctor) | Encoder constructor (`MediaRecorder`). | [runtime-web/src/audio-input.ts:84](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-input.ts#L84) |
| <a id="mimetype"></a> `mimeType?` | `string` | MIME type for the recorder, e.g. `audio/webm`. | [runtime-web/src/audio-input.ts:86](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-input.ts#L86) |
| <a id="now"></a> `now?` | () => `number` | Override clock used for chunk timestamps and timers (tests). | [runtime-web/src/audio-input.ts:96](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-input.ts#L96) |
| <a id="timeslicems"></a> `timesliceMs?` | `number` | Emit a chunk every N ms (MediaRecorder timeslice). Default 100. | [runtime-web/src/audio-input.ts:88](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-input.ts#L88) |
| <a id="volumepollms"></a> `volumePollMs?` | `number` | Poll microphone RMS level every N ms for VAD. Default 50. | [runtime-web/src/audio-input.ts:90](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-input.ts#L90) |

***

### WebAudioOutputOptions

Defined in: [runtime-web/src/audio-output.ts:65](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-output.ts#L65)

Injected playback primitives for [WebAudioOutput](/docs/en/reference/api/ottervoice-runtime-web/#webaudiooutput).
Prefer [createWebRuntime](/docs/en/reference/api/ottervoice-runtime-web/#createwebruntime) to wire browser `Audio` / `URL` / `AudioContext`;
pass stubs when testing or embedding outside a full DOM.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="createaudio"></a> `createAudio` | () => [`AudioElementLike`](/docs/en/reference/api/ottervoice-runtime-web/#audioelementlike) | Create a playback element (default `() => new Audio()` in the browser). | [runtime-web/src/audio-output.ts:67](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-output.ts#L67) |
| <a id="createobjecturl"></a> `createObjectURL?` | (`blob`) => `string` | Required for `audioBuffer` playback; turns a Blob into a URL. | [runtime-web/src/audio-output.ts:69](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-output.ts#L69) |
| <a id="createpcmaudiocontext"></a> `createPcmAudioContext?` | () => [`PcmAudioContextLike`](/docs/en/reference/api/ottervoice-runtime-web/#pcmaudiocontextlike) | Create a Web Audio context used for gapless incremental PCM playback. | [runtime-web/src/audio-output.ts:75](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-output.ts#L75) |
| <a id="measureaudio"></a> `measureAudio?` | (`audio`) => `Promise`\<[`AudioEnvelope`](/docs/en/reference/api/ottervoice-runtime-web/#audioenvelope)\> | Decode encoded audio into RMS frames used as an acoustic echo reference. | [runtime-web/src/audio-output.ts:73](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-output.ts#L73) |
| <a id="now-1"></a> `now?` | () => `number` | Override clock used for envelope timing (tests). | [runtime-web/src/audio-output.ts:77](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-output.ts#L77) |
| <a id="revokeobjecturl"></a> `revokeObjectURL?` | (`url`) => `void` | Release an object URL from [WebAudioOutputOptions.createObjectURL](/docs/en/reference/api/ottervoice-runtime-web/#createobjecturl). | [runtime-web/src/audio-output.ts:71](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-output.ts#L71) |

***

### WebRuntime

Defined in: [runtime-web/src/index.ts:62](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/index.ts#L62)

Browser [RuntimeAdapter](/docs/en/reference/api/ottervoice-core/#runtimeadapter) returned by [createWebRuntime](/docs/en/reference/api/ottervoice-runtime-web/#createwebruntime).
Exposes typed [WebAudioInput](/docs/en/reference/api/ottervoice-runtime-web/#webaudioinput) / [WebAudioOutput](/docs/en/reference/api/ottervoice-runtime-web/#webaudiooutput); no network
adapter — providers use global `fetch` / `WebSocket`.

#### Extends

- [`RuntimeAdapter`](/docs/en/reference/api/ottervoice-core/#runtimeadapter)

#### Properties

| Property | Type | Description | Overrides | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="audioinput"></a> `audioInput` | [`WebAudioInput`](/docs/en/reference/api/ottervoice-runtime-web/#webaudioinput) | Microphone capture via MediaRecorder + optional RMS metering. | [`RuntimeAdapter`](/docs/en/reference/api/ottervoice-core/#runtimeadapter).[`audioInput`](/docs/en/reference/api/ottervoice-core/#audioinput-1) | - | [runtime-web/src/index.ts:64](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/index.ts#L64) |
| <a id="audiooutput"></a> `audioOutput` | [`WebAudioOutput`](/docs/en/reference/api/ottervoice-runtime-web/#webaudiooutput) | Encoded and incremental PCM playback. | [`RuntimeAdapter`](/docs/en/reference/api/ottervoice-core/#runtimeadapter).[`audioOutput`](/docs/en/reference/api/ottervoice-core/#audiooutput-1) | - | [runtime-web/src/index.ts:66](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/index.ts#L66) |
| <a id="logger"></a> `logger?` | [`LoggerAdapter`](/docs/en/reference/api/ottervoice-core/#loggeradapter) | Optional logger; core uses it sparingly. | - | [`RuntimeAdapter`](/docs/en/reference/api/ottervoice-core/#runtimeadapter).[`logger`](/docs/en/reference/api/ottervoice-core/#logger-1) | core/dist/types.d.ts:913 |
| <a id="network"></a> `network?` | [`NetworkAdapter`](/docs/en/reference/api/ottervoice-core/#networkadapter) | Optional HTTP/WebSocket hooks for providers. | - | [`RuntimeAdapter`](/docs/en/reference/api/ottervoice-core/#runtimeadapter).[`network`](/docs/en/reference/api/ottervoice-core/#network-1) | core/dist/types.d.ts:909 |
| <a id="storage"></a> `storage?` | [`RuntimeStorageAdapter`](/docs/en/reference/api/ottervoice-core/#runtimestorageadapter) | Optional persistence for caches. | - | [`RuntimeAdapter`](/docs/en/reference/api/ottervoice-core/#runtimeadapter).[`storage`](/docs/en/reference/api/ottervoice-core/#storage-1) | core/dist/types.d.ts:911 |

***

### WebRuntimeOptions

Defined in: [runtime-web/src/index.ts:24](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/index.ts#L24)

Capture, metering, and playback overrides for [createWebRuntime](/docs/en/reference/api/ottervoice-runtime-web/#createwebruntime).
Omit fields to use browser globals (`navigator.mediaDevices`, `MediaRecorder`,
`Audio`, `URL`, `AudioContext`). Inject stubs in tests or non-standard hosts.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="audiocontext-1"></a> `audioContext?` | [`AudioContextCtor`](/docs/en/reference/api/ottervoice-runtime-web/#audiocontextctor) | Override `AudioContext` used for RMS metering. | [runtime-web/src/index.ts:50](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/index.ts#L50) |
| <a id="bargeinprerollms-1"></a> `bargeInPreRollMs?` | `number` | Encoded audio retained while assistant playback is filtered. Released only after a confirmed barge-in so opening syllables survive. Default `500`. | [runtime-web/src/index.ts:48](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/index.ts#L48) |
| <a id="createaudio-1"></a> `createAudio?` | () => [`AudioElementLike`](/docs/en/reference/api/ottervoice-runtime-web/#audioelementlike) | Factory for HTMLAudioElement-like playback targets. | [runtime-web/src/index.ts:30](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/index.ts#L30) |
| <a id="createobjecturl-1"></a> `createObjectURL?` | (`blob`) => `string` | Inject `URL.createObjectURL`. | [runtime-web/src/index.ts:32](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/index.ts#L32) |
| <a id="createpcmaudiocontext-1"></a> `createPcmAudioContext?` | () => [`PcmAudioContextLike`](/docs/en/reference/api/ottervoice-runtime-web/#pcmaudiocontextlike) | Override factory used for PCM streaming playback. | [runtime-web/src/index.ts:52](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/index.ts#L52) |
| <a id="getusermedia-1"></a> `getUserMedia?` | [`GetUserMedia`](/docs/en/reference/api/ottervoice-runtime-web/#getusermedia-2) | Inject `navigator.mediaDevices.getUserMedia` (defaults to the browser global). | [runtime-web/src/index.ts:26](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/index.ts#L26) |
| <a id="mediarecorder-1"></a> `mediaRecorder?` | [`MediaRecorderCtor`](/docs/en/reference/api/ottervoice-runtime-web/#mediarecorderctor) | Inject `MediaRecorder` (defaults to the browser global). | [runtime-web/src/index.ts:28](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/index.ts#L28) |
| <a id="mimetype-1"></a> `mimeType?` | `string` | MediaRecorder MIME type, e.g. `audio/webm;codecs=opus`. When omitted, the runtime picks a browser-supported Opus/WebM type. | [runtime-web/src/index.ts:39](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/index.ts#L39) |
| <a id="now-2"></a> `now?` | () => `number` | Override clock (tests). | [runtime-web/src/index.ts:54](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/index.ts#L54) |
| <a id="revokeobjecturl-1"></a> `revokeObjectURL?` | (`url`) => `void` | Inject `URL.revokeObjectURL`. | [runtime-web/src/index.ts:34](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/index.ts#L34) |
| <a id="timeslicems-1"></a> `timesliceMs?` | `number` | Encode a chunk every N ms (MediaRecorder timeslice). Default `100`. | [runtime-web/src/index.ts:41](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/index.ts#L41) |
| <a id="volumepollms-1"></a> `volumePollMs?` | `number` | Poll microphone RMS every N ms for VAD / barge-in. Default `50`. | [runtime-web/src/index.ts:43](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/index.ts#L43) |

## Type Aliases

### AudioContextCtor

```ts
type AudioContextCtor = () => AudioContextLike;
```

Defined in: [runtime-web/src/audio-input.ts:73](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-input.ts#L73)

Constructor for [AudioContextLike](/docs/en/reference/api/ottervoice-runtime-web/#audiocontextlike) (browser `AudioContext`).

#### Returns

[`AudioContextLike`](/docs/en/reference/api/ottervoice-runtime-web/#audiocontextlike)

***

### GetUserMedia

```ts
type GetUserMedia = (constraints) => Promise<MediaStreamLike>;
```

Defined in: [runtime-web/src/audio-input.ts:53](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-input.ts#L53)

`navigator.mediaDevices.getUserMedia`-compatible capture entry point.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `constraints` | `unknown` |

#### Returns

`Promise`\<[`MediaStreamLike`](/docs/en/reference/api/ottervoice-runtime-web/#mediastreamlike)\>

***

### MediaRecorderCtor

```ts
type MediaRecorderCtor = (stream, options?) => MediaRecorderLike;
```

Defined in: [runtime-web/src/audio-input.ts:47](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-input.ts#L47)

Constructor for [MediaRecorderLike](/docs/en/reference/api/ottervoice-runtime-web/#mediarecorderlike) (browser `MediaRecorder`).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `stream` | [`MediaStreamLike`](/docs/en/reference/api/ottervoice-runtime-web/#mediastreamlike) |
| `options?` | \{ `mimeType?`: `string`; \} |
| `options.mimeType?` | `string` |

#### Returns

[`MediaRecorderLike`](/docs/en/reference/api/ottervoice-runtime-web/#mediarecorderlike)

## Functions

### createWebRuntime()

```ts
function createWebRuntime(options?): WebRuntime;
```

Defined in: [runtime-web/src/index.ts:79](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/index.ts#L79)

Assemble a browser [RuntimeAdapter](/docs/en/reference/api/ottervoice-core/#runtimeadapter). With no options it reads the
standard web globals (`navigator.mediaDevices`, `MediaRecorder`, `Audio`,
`URL`); every primitive can be overridden for testing or non-standard hosts.

No network adapter is included — providers use the global `fetch`/`WebSocket`
directly.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | [`WebRuntimeOptions`](/docs/en/reference/api/ottervoice-runtime-web/#webruntimeoptions) | Capture, metering, and playback overrides. See [WebRuntimeOptions](/docs/en/reference/api/ottervoice-runtime-web/#webruntimeoptions). |

#### Returns

[`WebRuntime`](/docs/en/reference/api/ottervoice-runtime-web/#webruntime)

***

### encodeMonoWav()

```ts
function encodeMonoWav(audio, options?): ArrayBuffer;
```

Defined in: [runtime-web/src/audio-conversion.ts:40](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-conversion.ts#L40)

Encode decoded Web Audio samples as mono PCM16 WAV.
Exported for tests; prefer [prepareBrowserAudio](/docs/en/reference/api/ottervoice-runtime-web/#preparebrowseraudio) in app code.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `audio` | `DecodedAudioLike` |
| `options` | [`PrepareBrowserAudioOptions`](/docs/en/reference/api/ottervoice-runtime-web/#preparebrowseraudiooptions) |

#### Returns

`ArrayBuffer`

***

### measureBrowserAudioEnvelope()

```ts
function measureBrowserAudioEnvelope(input, frameMs?): Promise<AudioEnvelope>;
```

Defined in: [runtime-web/src/audio-conversion.ts:141](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-conversion.ts#L141)

Decode an encoded assistant reply into short RMS frames for echo-aware VAD.

#### Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `input` | `ArrayBuffer` | `undefined` |
| `frameMs` | `number` | `50` |

#### Returns

`Promise`\<[`AudioEnvelope`](/docs/en/reference/api/ottervoice-runtime-web/#audioenvelope)\>

***

### prepareBrowserAudio()

```ts
function prepareBrowserAudio(
   input,
   format,
   options?): Promise<{
  audio: ArrayBuffer;
  format: "wav" | "mp3";
}>;
```

Defined in: [runtime-web/src/audio-conversion.ts:123](https://github.com/bugkiwi/OtterVoice/blob/41d5b5074fb5a1c9544dc1e71c1ed72b362bdfeb/packages/runtime-web/src/audio-conversion.ts#L123)

Decode browser-recorded WebM/Opus and return a WAV accepted by audio LLMs.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | `ArrayBuffer` |
| `format` | [`AudioLLMInputFormat`](/docs/en/reference/api/ottervoice-core/#audiollminputformat) |
| `options` | [`PrepareBrowserAudioOptions`](/docs/en/reference/api/ottervoice-runtime-web/#preparebrowseraudiooptions) |

#### Returns

`Promise`\<\{
  `audio`: `ArrayBuffer`;
  `format`: `"wav"` \| `"mp3"`;
\}\>
