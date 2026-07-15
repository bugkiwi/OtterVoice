---
title: "@ottervoice/core"
description: "API reference generated from source JSDoc via TypeDoc."
editUrl: false
---

[**Documentation**](../index/)

***

[Documentation](/docs/en/reference/api/index/) / @ottervoice/core

<p align="center">
  <img src="https://raw.githubusercontent.com/bugkiwi/OtterVoice/main/assets/brand/ottervoice-icon.webp" width="96" alt="OtterVoice pixel otter mascot" />
</p>

# @ottervoice/core

Platform-agnostic core for [OtterVoice](https://github.com/bugkiwi/OtterVoice) —
a TypeScript-first SDK for real-time voice conversation, including full-duplex
barge-in.

This package contains **no DOM, Node or native dependencies**. It provides the
session state machine, typed events, provider router, transcript buffer, turn
detector, usage meter, a normalized error model, and built-in mock providers /
runtime for testing.

```bash
bun add @ottervoice/core
```

## What's inside

| Export | Purpose |
| --- | --- |
| `createVoiceSession` / `VoiceSession` | Conversation loop and full-duplex interruption policy. |
| `StateMachine`, `canTransition`, `isTerminal` | Session state transitions. |
| `TypedEmitter` | Strongly-typed, unsubscribe-returning event emitter. |
| `TranscriptBuffer` | Ordered turns → LLM message projection. |
| `TurnDetector` | Rule-based VAD / endpointing from volume samples. |
| `UsageMeter` | Per-session usage snapshot (you bill; it measures). |
| `ProviderRegistry`, `providerProfiles`, `resolveProfile` | Provider routing. |
| `createVoiceError`, `normalizeError`, `VoiceError` | Unified error model. |
| `createMockASR/LLM/TTS/Pronunciation`, `createMockRuntime` | Test doubles. |

## Provider & runtime contracts

Implement these interfaces to plug in real services / platforms:

- **`ASRProvider`** — `createSession()` → streaming partial/final transcripts.
- **`LLMProvider`** — `generate()` (and optional `stream()`).
- **`AudioLLMProvider`** — one model consumes a completed audio turn and returns
  assistant transcript + audio; set `pipeline: 'audio_llm'`. Caption ASR runs
  in parallel and does not feed the model.
- **`TTSProvider`** — `synthesize()` → audio buffer or URL.
- **`PronunciationProvider`** — `assess()` → scores.
- **`RuntimeAdapter`** — `audioInput`, `audioOutput`, optional `network` /
  `storage` / `logger`.

Every error raised by an adapter should be a `NormalizedVoiceError` (use
`createVoiceError`), so consumers handle one shape regardless of provider.

Set `VoiceSessionConfig.asrPartial` to `false` when provisional captions are not
needed. Core passes that preference to the ASR session while preserving
`asr_final`. For batch-backed rolling ASR, providers may implement
`ASRSession.setInterimResultsEnabled()`; volume-based sessions use it to defer
paid partial work until VAD confirms speech.

## Session events

`statechange`, `asr_partial`, `asr_final`, `user_audio_end`, `assistant_text`,
`assistant_audio_start`, `assistant_audio_end`, `turn`, `usage`, `finished`,
`error`. Subscribe with `session.on(event, cb)`; the returned function
unsubscribes.

## Example

See the [root README](../_media/README/#quick-start-fully-mocked-no-api-keys) for a
runnable, fully-mocked quick start, and `examples/node-cli` for an end-to-end
demo.

## License

MIT

## Classes

### BargeInSpeechGate

Defined in: [packages/core/src/playback-echo-filter.ts:44](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/playback-echo-filter.ts#L44)

Detects speech-shaped residual energy without requiring every audio frame to
be loud. Natural speech contains short gaps between syllables; a vote over a
moving window rejects isolated knocks while preserving those gaps.

#### Constructors

##### Constructor

```ts
new BargeInSpeechGate(options?): BargeInSpeechGate;
```

Defined in: [packages/core/src/playback-echo-filter.ts:50](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/playback-echo-filter.ts#L50)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`BargeInSpeechGateOptions`](/docs/en/reference/api/ottervoice-core/#bargeinspeechgateoptions) |

###### Returns

[`BargeInSpeechGate`](/docs/en/reference/api/ottervoice-core/#bargeinspeechgate)

#### Methods

##### push()

```ts
push(level): boolean;
```

Defined in: [packages/core/src/playback-echo-filter.ts:56](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/playback-echo-filter.ts#L56)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `level` | `number` |

###### Returns

`boolean`

##### reset()

```ts
reset(): void;
```

Defined in: [packages/core/src/playback-echo-filter.ts:62](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/playback-echo-filter.ts#L62)

###### Returns

`void`

***

### MockAudioInput

Defined in: [packages/core/src/providers/mock-runtime.ts:24](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock-runtime.ts#L24)

In-memory audio input. Tests drive it by calling [MockAudioInput.emitChunk](/docs/en/reference/api/ottervoice-core/#emitchunk)
/ [MockAudioInput.emitVolume](/docs/en/reference/api/ottervoice-core/#emitvolume); nothing touches a real microphone.

#### Implements

- [`AudioInputAdapter`](/docs/en/reference/api/ottervoice-core/#audioinputadapter)

#### Constructors

##### Constructor

```ts
new MockAudioInput(options?): MockAudioInput;
```

Defined in: [packages/core/src/providers/mock-runtime.ts:33](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock-runtime.ts#L33)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`MockAudioInputOptions`](/docs/en/reference/api/ottervoice-core/#mockaudioinputoptions) |

###### Returns

[`MockAudioInput`](/docs/en/reference/api/ottervoice-core/#mockaudioinput)

#### Properties

| Property | Type | Default value | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="lastoptions"></a> `lastOptions` | \| [`AudioInputOptions`](/docs/en/reference/api/ottervoice-core/#audioinputoptions) \| `undefined` | `undefined` | [packages/core/src/providers/mock-runtime.ts:31](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock-runtime.ts#L31) |
| <a id="paused"></a> `paused` | `boolean` | `false` | [packages/core/src/providers/mock-runtime.ts:30](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock-runtime.ts#L30) |
| <a id="started"></a> `started` | `boolean` | `false` | [packages/core/src/providers/mock-runtime.ts:29](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock-runtime.ts#L29) |

#### Methods

##### emitChunk()

```ts
emitChunk(chunk): void;
```

Defined in: [packages/core/src/providers/mock-runtime.ts:60](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock-runtime.ts#L60)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `chunk` | [`AudioChunk`](/docs/en/reference/api/ottervoice-core/#audiochunk) |

###### Returns

`void`

##### emitError()

```ts
emitError(error): void;
```

Defined in: [packages/core/src/providers/mock-runtime.ts:68](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock-runtime.ts#L68)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `error` | [`NormalizedVoiceError`](/docs/en/reference/api/ottervoice-core/#normalizedvoiceerror) |

###### Returns

`void`

##### emitVolume()

```ts
emitVolume(level): void;
```

Defined in: [packages/core/src/providers/mock-runtime.ts:64](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock-runtime.ts#L64)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `level` | `number` |

###### Returns

`void`

##### onChunk()

```ts
onChunk(cb): () => void;
```

Defined in: [packages/core/src/providers/mock-runtime.ts:72](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock-runtime.ts#L72)

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

Defined in: [packages/core/src/providers/mock-runtime.ts:82](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock-runtime.ts#L82)

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

Defined in: [packages/core/src/providers/mock-runtime.ts:77](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock-runtime.ts#L77)

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

Defined in: [packages/core/src/providers/mock-runtime.ts:52](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock-runtime.ts#L52)

Pause capture without tearing down permission / hardware (optional).

###### Returns

`Promise`\<`void`\>

###### Implementation of

[`AudioInputAdapter`](/docs/en/reference/api/ottervoice-core/#audioinputadapter).[`pause`](/docs/en/reference/api/ottervoice-core/#pause-3)

##### requestPermission()

```ts
requestPermission(): Promise<boolean>;
```

Defined in: [packages/core/src/providers/mock-runtime.ts:37](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock-runtime.ts#L37)

Prompt for mic permission; `false` should surface as a session error.

###### Returns

`Promise`\<`boolean`\>

###### Implementation of

[`AudioInputAdapter`](/docs/en/reference/api/ottervoice-core/#audioinputadapter).[`requestPermission`](/docs/en/reference/api/ottervoice-core/#requestpermission-1)

##### resume()

```ts
resume(): Promise<void>;
```

Defined in: [packages/core/src/providers/mock-runtime.ts:56](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock-runtime.ts#L56)

Resume after [pause](/docs/en/reference/api/ottervoice-core/#pause-3).

###### Returns

`Promise`\<`void`\>

###### Implementation of

[`AudioInputAdapter`](/docs/en/reference/api/ottervoice-core/#audioinputadapter).[`resume`](/docs/en/reference/api/ottervoice-core/#resume-3)

##### start()

```ts
start(options): Promise<void>;
```

Defined in: [packages/core/src/providers/mock-runtime.ts:41](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock-runtime.ts#L41)

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

Defined in: [packages/core/src/providers/mock-runtime.ts:47](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock-runtime.ts#L47)

Stop capture and release resources tied to the current start.

###### Returns

`Promise`\<`void`\>

###### Implementation of

[`AudioInputAdapter`](/docs/en/reference/api/ottervoice-core/#audioinputadapter).[`stop`](/docs/en/reference/api/ottervoice-core/#stop-4)

***

### MockAudioOutput

Defined in: [packages/core/src/providers/mock-runtime.ts:100](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock-runtime.ts#L100)

In-memory audio output. Records what was "played".

#### Implements

- [`AudioOutputAdapter`](/docs/en/reference/api/ottervoice-core/#audiooutputadapter)

#### Constructors

##### Constructor

```ts
new MockAudioOutput(options?): MockAudioOutput;
```

Defined in: [packages/core/src/providers/mock-runtime.ts:113](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock-runtime.ts#L113)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`MockAudioOutputOptions`](/docs/en/reference/api/ottervoice-core/#mockaudiooutputoptions) |

###### Returns

[`MockAudioOutput`](/docs/en/reference/api/ottervoice-core/#mockaudiooutput)

#### Properties

| Property | Type | Default value | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="paused-1"></a> `paused` | `number` | `0` | [packages/core/src/providers/mock-runtime.ts:109](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock-runtime.ts#L109) |
| <a id="played"></a> `played` | [`AudioPlaybackInput`](/docs/en/reference/api/ottervoice-core/#audioplaybackinput)[] | `[]` | [packages/core/src/providers/mock-runtime.ts:107](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock-runtime.ts#L107) |
| <a id="resumed"></a> `resumed` | `number` | `0` | [packages/core/src/providers/mock-runtime.ts:110](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock-runtime.ts#L110) |
| <a id="stopped"></a> `stopped` | `number` | `0` | [packages/core/src/providers/mock-runtime.ts:108](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock-runtime.ts#L108) |

#### Methods

##### emitVolume()

```ts
emitVolume(level): void;
```

Defined in: [packages/core/src/providers/mock-runtime.ts:154](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock-runtime.ts#L154)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `level` | `number` |

###### Returns

`void`

##### fireEnd()

```ts
fireEnd(): void;
```

Defined in: [packages/core/src/providers/mock-runtime.ts:148](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock-runtime.ts#L148)

###### Returns

`void`

##### onEnd()

```ts
onEnd(cb): () => void;
```

Defined in: [packages/core/src/providers/mock-runtime.ts:168](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock-runtime.ts#L168)

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

Defined in: [packages/core/src/providers/mock-runtime.ts:173](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock-runtime.ts#L173)

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

Defined in: [packages/core/src/providers/mock-runtime.ts:163](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock-runtime.ts#L163)

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

Defined in: [packages/core/src/providers/mock-runtime.ts:158](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock-runtime.ts#L158)

Subscribe to normalized RMS of the assistant audio currently being played
(used as an acoustic echo reference for barge-in).

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `cb` | (`level`) => `void` |

###### Returns

Unsubscribe function.

() => `void`

###### Implementation of

[`AudioOutputAdapter`](/docs/en/reference/api/ottervoice-core/#audiooutputadapter).[`onVolume`](/docs/en/reference/api/ottervoice-core/#onvolume-3)

##### pause()

```ts
pause(): Promise<void>;
```

Defined in: [packages/core/src/providers/mock-runtime.ts:140](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock-runtime.ts#L140)

Pause playback without discarding the current utterance (optional).

###### Returns

`Promise`\<`void`\>

###### Implementation of

[`AudioOutputAdapter`](/docs/en/reference/api/ottervoice-core/#audiooutputadapter).[`pause`](/docs/en/reference/api/ottervoice-core/#pause-4)

##### play()

```ts
play(input): Promise<void>;
```

Defined in: [packages/core/src/providers/mock-runtime.ts:118](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock-runtime.ts#L118)

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

Defined in: [packages/core/src/providers/mock-runtime.ts:144](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock-runtime.ts#L144)

Resume after [AudioOutputAdapter.pause](/docs/en/reference/api/ottervoice-core/#pause-4).

###### Returns

`Promise`\<`void`\>

###### Implementation of

[`AudioOutputAdapter`](/docs/en/reference/api/ottervoice-core/#audiooutputadapter).[`resume`](/docs/en/reference/api/ottervoice-core/#resume-4)

##### stop()

```ts
stop(): Promise<void>;
```

Defined in: [packages/core/src/providers/mock-runtime.ts:134](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock-runtime.ts#L134)

Stop current playback and cancel any open PCM stream.

###### Returns

`Promise`\<`void`\>

###### Implementation of

[`AudioOutputAdapter`](/docs/en/reference/api/ottervoice-core/#audiooutputadapter).[`stop`](/docs/en/reference/api/ottervoice-core/#stop-5)

***

### PlaybackEchoFilter

Defined in: [packages/core/src/playback-echo-filter.ts:72](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/playback-echo-filter.ts#L72)

Removes the component of microphone RMS that is correlated with assistant
playback. It searches a short delay window because browser playback,
loudspeaker travel and microphone analysis are not sample-synchronous.

#### Constructors

##### Constructor

```ts
new PlaybackEchoFilter(options?): PlaybackEchoFilter;
```

Defined in: [packages/core/src/playback-echo-filter.ts:84](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/playback-echo-filter.ts#L84)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`PlaybackEchoFilterOptions`](/docs/en/reference/api/ottervoice-core/#playbackechofilteroptions) |

###### Returns

[`PlaybackEchoFilter`](/docs/en/reference/api/ottervoice-core/#playbackechofilter)

#### Methods

##### filter()

```ts
filter(microphoneLevel, at): number;
```

Defined in: [packages/core/src/playback-echo-filter.ts:118](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/playback-echo-filter.ts#L118)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `microphoneLevel` | `number` |
| `at` | `number` |

###### Returns

`number`

##### isReady()

```ts
isReady(at): boolean;
```

Defined in: [packages/core/src/playback-echo-filter.ts:163](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/playback-echo-filter.ts#L163)

True once enough playback reference frames exist to estimate echo.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `at` | `number` |

###### Returns

`boolean`

##### pushOutput()

```ts
pushOutput(level, at): void;
```

Defined in: [packages/core/src/playback-echo-filter.ts:110](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/playback-echo-filter.ts#L110)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `level` | `number` |
| `at` | `number` |

###### Returns

`void`

##### reset()

```ts
reset(): void;
```

Defined in: [packages/core/src/playback-echo-filter.ts:155](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/playback-echo-filter.ts#L155)

###### Returns

`void`

##### start()

```ts
start(_at): void;
```

Defined in: [packages/core/src/playback-echo-filter.ts:96](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/playback-echo-filter.ts#L96)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `_at` | `number` |

###### Returns

`void`

##### stop()

```ts
stop(): void;
```

Defined in: [packages/core/src/playback-echo-filter.ts:106](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/playback-echo-filter.ts#L106)

###### Returns

`void`

***

### ProviderRegistry

Defined in: [packages/core/src/provider-router.ts:156](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L156)

Maps provider ids (as used in [ProviderProfile](/docs/en/reference/api/ottervoice-core/#providerprofile)) to concrete provider
instances, and resolves a profile into a usable [ResolvedProviders](/docs/en/reference/api/ottervoice-core/#resolvedproviders)
bundle for a import('./session').VoiceSession.

#### Constructors

##### Constructor

```ts
new ProviderRegistry(initial?): ProviderRegistry;
```

Defined in: [packages/core/src/provider-router.ts:162](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L162)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `initial?` | [`RegisteredProviders`](/docs/en/reference/api/ottervoice-core/#registeredproviders) |

###### Returns

[`ProviderRegistry`](/docs/en/reference/api/ottervoice-core/#providerregistry)

#### Methods

##### getProfile()

```ts
getProfile(name): ProviderProfile;
```

Defined in: [packages/core/src/provider-router.ts:199](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L199)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | [`ProviderProfileName`](/docs/en/reference/api/ottervoice-core/#providerprofilename-1) |

###### Returns

[`ProviderProfile`](/docs/en/reference/api/ottervoice-core/#providerprofile)

##### registerASR()

```ts
registerASR(id, provider): this;
```

Defined in: [packages/core/src/provider-router.ts:179](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L179)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `id` | `string` |
| `provider` | [`ASRProvider`](/docs/en/reference/api/ottervoice-core/#asrprovider) |

###### Returns

`this`

##### registerLLM()

```ts
registerLLM(id, provider): this;
```

Defined in: [packages/core/src/provider-router.ts:184](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L184)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `id` | `string` |
| `provider` | [`LLMProvider`](/docs/en/reference/api/ottervoice-core/#llmprovider) |

###### Returns

`this`

##### registerPronunciation()

```ts
registerPronunciation(id, provider): this;
```

Defined in: [packages/core/src/provider-router.ts:194](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L194)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `id` | `string` |
| `provider` | [`PronunciationProvider`](/docs/en/reference/api/ottervoice-core/#pronunciationprovider) |

###### Returns

`this`

##### registerTTS()

```ts
registerTTS(id, provider): this;
```

Defined in: [packages/core/src/provider-router.ts:189](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L189)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `id` | `string` |
| `provider` | [`TTSProvider`](/docs/en/reference/api/ottervoice-core/#ttsprovider) |

###### Returns

`this`

##### resolve()

```ts
resolve(profileOrName): ResolvedProviders;
```

Defined in: [packages/core/src/provider-router.ts:203](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L203)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `profileOrName` | \| [`ProviderProfileName`](/docs/en/reference/api/ottervoice-core/#providerprofilename-1) \| [`ProviderProfile`](/docs/en/reference/api/ottervoice-core/#providerprofile) |

###### Returns

[`ResolvedProviders`](/docs/en/reference/api/ottervoice-core/#resolvedproviders)

***

### StateMachine

Defined in: [packages/core/src/state-machine.ts:77](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/state-machine.ts#L77)

Pure state container. The session owns one of these and is the only thing
that mutates it via [StateMachine.transition](/docs/en/reference/api/ottervoice-core/#transition).

#### Constructors

##### Constructor

```ts
new StateMachine(initial?): StateMachine;
```

Defined in: [packages/core/src/state-machine.ts:80](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/state-machine.ts#L80)

###### Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `initial` | [`VoiceSessionState`](/docs/en/reference/api/ottervoice-core/#voicesessionstate-1) | `'idle'` |

###### Returns

[`StateMachine`](/docs/en/reference/api/ottervoice-core/#statemachine)

#### Accessors

##### state

###### Get Signature

```ts
get state(): VoiceSessionState;
```

Defined in: [packages/core/src/state-machine.ts:84](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/state-machine.ts#L84)

###### Returns

[`VoiceSessionState`](/docs/en/reference/api/ottervoice-core/#voicesessionstate-1)

#### Methods

##### can()

```ts
can(to): boolean;
```

Defined in: [packages/core/src/state-machine.ts:88](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/state-machine.ts#L88)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `to` | [`VoiceSessionState`](/docs/en/reference/api/ottervoice-core/#voicesessionstate-1) |

###### Returns

`boolean`

##### transition()

```ts
transition(to): VoiceSessionState;
```

Defined in: [packages/core/src/state-machine.ts:96](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/state-machine.ts#L96)

Move to `to`, returning the previous state. Throws a [VoiceError](/docs/en/reference/api/ottervoice-core/#voiceerror)
with code `invalid_state` when the transition is not allowed.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `to` | [`VoiceSessionState`](/docs/en/reference/api/ottervoice-core/#voicesessionstate-1) |

###### Returns

[`VoiceSessionState`](/docs/en/reference/api/ottervoice-core/#voicesessionstate-1)

***

### TranscriptBuffer

Defined in: [packages/core/src/transcript-buffer.ts:30](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/transcript-buffer.ts#L30)

Ordered store of conversation turns. Owns nothing about providers — it just
accumulates turns and projects them into the shape the LLM expects.

#### Constructors

##### Constructor

```ts
new TranscriptBuffer(generateId, now): TranscriptBuffer;
```

Defined in: [packages/core/src/transcript-buffer.ts:33](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/transcript-buffer.ts#L33)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `generateId` | () => `string` |
| `now` | () => `number` |

###### Returns

[`TranscriptBuffer`](/docs/en/reference/api/ottervoice-core/#transcriptbuffer)

#### Accessors

##### size

###### Get Signature

```ts
get size(): number;
```

Defined in: [packages/core/src/transcript-buffer.ts:63](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/transcript-buffer.ts#L63)

###### Returns

`number`

#### Methods

##### add()

```ts
add(input): VoiceTurn;
```

Defined in: [packages/core/src/transcript-buffer.ts:38](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/transcript-buffer.ts#L38)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | [`AddTurnInput`](/docs/en/reference/api/ottervoice-core/#addturninput) |

###### Returns

[`VoiceTurn`](/docs/en/reference/api/ottervoice-core/#voiceturn)

##### all()

```ts
all(): VoiceTurn[];
```

Defined in: [packages/core/src/transcript-buffer.ts:68](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/transcript-buffer.ts#L68)

Immutable snapshot of all turns.

###### Returns

[`VoiceTurn`](/docs/en/reference/api/ottervoice-core/#voiceturn)[]

##### clear()

```ts
clear(): void;
```

Defined in: [packages/core/src/transcript-buffer.ts:82](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/transcript-buffer.ts#L82)

###### Returns

`void`

##### last()

```ts
last(): 
  | VoiceTurn
  | undefined;
```

Defined in: [packages/core/src/transcript-buffer.ts:59](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/transcript-buffer.ts#L59)

The most recently added turn, or `undefined` when empty.

###### Returns

  \| [`VoiceTurn`](/docs/en/reference/api/ottervoice-core/#voiceturn)
  \| `undefined`

##### toMessages()

```ts
toMessages(): LLMMessage[];
```

Defined in: [packages/core/src/transcript-buffer.ts:73](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/transcript-buffer.ts#L73)

Project turns into LLM messages, dropping any with empty text.

###### Returns

[`LLMMessage`](/docs/en/reference/api/ottervoice-core/#llmmessage)[]

***

### TurnDetector

Defined in: [packages/core/src/turn-detector.ts:51](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/turn-detector.ts#L51)

Rule-based voice-activity / endpointing detector.

It is driven purely by `(volume, timestampMs)` samples fed via
[TurnDetector.pushVolume](/docs/en/reference/api/ottervoice-core/#pushvolume). It tracks whether the user has begun
speaking (volume over threshold for `minSpeechMs`) and when they have
stopped (volume under threshold for `silenceTimeoutMs`). This keeps the
detector free of timers so it is deterministic and trivially testable; the
session supplies the clock.

#### Constructors

##### Constructor

```ts
new TurnDetector(config?): TurnDetector;
```

Defined in: [packages/core/src/turn-detector.ts:58](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/turn-detector.ts#L58)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `config?` | [`TurnDetectionConfig`](/docs/en/reference/api/ottervoice-core/#turndetectionconfig) |

###### Returns

[`TurnDetector`](/docs/en/reference/api/ottervoice-core/#turndetector)

#### Accessors

##### isSpeaking

###### Get Signature

```ts
get isSpeaking(): boolean;
```

Defined in: [packages/core/src/turn-detector.ts:62](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/turn-detector.ts#L62)

###### Returns

`boolean`

##### options

###### Get Signature

```ts
get options(): Required<TurnDetectionConfig>;
```

Defined in: [packages/core/src/turn-detector.ts:66](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/turn-detector.ts#L66)

###### Returns

`Required`\<[`TurnDetectionConfig`](/docs/en/reference/api/ottervoice-core/#turndetectionconfig)\>

#### Methods

##### forceSpeechStart()

```ts
forceSpeechStart(timestampMs): void;
```

Defined in: [packages/core/src/turn-detector.ts:71](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/turn-detector.ts#L71)

Continue endpointing after another detector has already confirmed speech.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `timestampMs` | `number` |

###### Returns

`void`

##### pushVolume()

```ts
pushVolume(volume, timestampMs): 
  | TurnDetectorEvent
  | undefined;
```

Defined in: [packages/core/src/turn-detector.ts:86](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/turn-detector.ts#L86)

Feed a volume sample. Returns an event when a boundary is crossed, else
`undefined`.

- `speech_start` — sustained volume over threshold for `minSpeechMs`.
- `speech_end` — sustained silence for `silenceTimeoutMs` after speech.
- `max_turn` — speech has run longer than `maxTurnMs` (forced end).

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `volume` | `number` |
| `timestampMs` | `number` |

###### Returns

  \| [`TurnDetectorEvent`](/docs/en/reference/api/ottervoice-core/#turndetectorevent)
  \| `undefined`

##### reset()

```ts
reset(): void;
```

Defined in: [packages/core/src/turn-detector.ts:127](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/turn-detector.ts#L127)

###### Returns

`void`

***

### TypedEmitter

Defined in: [packages/core/src/emitter.ts:8](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/emitter.ts#L8)

Minimal, dependency-free, strongly-typed event emitter.

`EventMap` maps event names to their payload type. `on`/`once` return an
unsubscribe function so callers never need to keep references to the
original callback.

#### Type Parameters

| Type Parameter |
| ------ |
| `EventMap` *extends* `Record`\<`string`, `unknown`\> |

#### Constructors

##### Constructor

```ts
new TypedEmitter<EventMap>(): TypedEmitter<EventMap>;
```

Defined in: [packages/core/src/emitter.ts:11](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/emitter.ts#L11)

###### Returns

[`TypedEmitter`](/docs/en/reference/api/ottervoice-core/#typedemitter)\<`EventMap`\>

#### Methods

##### emit()

```ts
emit<K>(event, payload): void;
```

Defined in: [packages/core/src/emitter.ts:49](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/emitter.ts#L49)

###### Type Parameters

| Type Parameter |
| ------ |
| `K` *extends* `string` \| `number` \| `symbol` |

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | `K` |
| `payload` | `EventMap`\[`K`\] |

###### Returns

`void`

##### listenerCount()

```ts
listenerCount<K>(event): number;
```

Defined in: [packages/core/src/emitter.ts:59](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/emitter.ts#L59)

Number of registered listeners for an event (primarily for testing).

###### Type Parameters

| Type Parameter |
| ------ |
| `K` *extends* `string` \| `number` \| `symbol` |

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | `K` |

###### Returns

`number`

##### off()

```ts
off<K>(event, cb): void;
```

Defined in: [packages/core/src/emitter.ts:39](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/emitter.ts#L39)

###### Type Parameters

| Type Parameter |
| ------ |
| `K` *extends* `string` \| `number` \| `symbol` |

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | `K` |
| `cb` | (`payload`) => `void` |

###### Returns

`void`

##### on()

```ts
on<K>(event, cb): () => void;
```

Defined in: [packages/core/src/emitter.ts:15](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/emitter.ts#L15)

###### Type Parameters

| Type Parameter |
| ------ |
| `K` *extends* `string` \| `number` \| `symbol` |

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | `K` |
| `cb` | (`payload`) => `void` |

###### Returns

() => `void`

##### once()

```ts
once<K>(event, cb): () => void;
```

Defined in: [packages/core/src/emitter.ts:28](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/emitter.ts#L28)

###### Type Parameters

| Type Parameter |
| ------ |
| `K` *extends* `string` \| `number` \| `symbol` |

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | `K` |
| `cb` | (`payload`) => `void` |

###### Returns

() => `void`

##### removeAllListeners()

```ts
removeAllListeners(): void;
```

Defined in: [packages/core/src/emitter.ts:64](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/emitter.ts#L64)

Drop every listener. Called when a session is disposed.

###### Returns

`void`

***

### UsageMeter

Defined in: [packages/core/src/usage-meter.ts:7](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/usage-meter.ts#L7)

Accumulates per-session usage. The SDK measures, it does not bill — business
code consumes the [VoiceUsageSnapshot](/docs/en/reference/api/ottervoice-core/#voiceusagesnapshot) to enforce quotas/plans.

#### Constructors

##### Constructor

```ts
new UsageMeter(now): UsageMeter;
```

Defined in: [packages/core/src/usage-meter.ts:19](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/usage-meter.ts#L19)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `now` | () => `number` |

###### Returns

[`UsageMeter`](/docs/en/reference/api/ottervoice-core/#usagemeter)

#### Methods

##### addAsrAudioMs()

```ts
addAsrAudioMs(ms): void;
```

Defined in: [packages/core/src/usage-meter.ts:33](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/usage-meter.ts#L33)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `ms` | `number` |

###### Returns

`void`

##### addAssistantSpeechChars()

```ts
addAssistantSpeechChars(chars): void;
```

Defined in: [packages/core/src/usage-meter.ts:37](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/usage-meter.ts#L37)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `chars` | `number` |

###### Returns

`void`

##### addLlmUsage()

```ts
addLlmUsage(usage): void;
```

Defined in: [packages/core/src/usage-meter.ts:45](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/usage-meter.ts#L45)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `usage` | \| [`LLMUsage`](/docs/en/reference/api/ottervoice-core/#llmusage) \| `undefined` |

###### Returns

`void`

##### addProviderCost()

```ts
addProviderCost(provider, cost): void;
```

Defined in: [packages/core/src/usage-meter.ts:57](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/usage-meter.ts#L57)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `provider` | `string` |
| `cost` | `number` |

###### Returns

`void`

##### addTtsChars()

```ts
addTtsChars(chars): void;
```

Defined in: [packages/core/src/usage-meter.ts:41](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/usage-meter.ts#L41)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `chars` | `number` |

###### Returns

`void`

##### addUserSpeechMs()

```ts
addUserSpeechMs(ms): void;
```

Defined in: [packages/core/src/usage-meter.ts:29](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/usage-meter.ts#L29)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `ms` | `number` |

###### Returns

`void`

##### endSession()

```ts
endSession(at?): void;
```

Defined in: [packages/core/src/usage-meter.ts:25](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/usage-meter.ts#L25)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `at` | `number` |

###### Returns

`void`

##### snapshot()

```ts
snapshot(): VoiceUsageSnapshot;
```

Defined in: [packages/core/src/usage-meter.ts:68](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/usage-meter.ts#L68)

###### Returns

[`VoiceUsageSnapshot`](/docs/en/reference/api/ottervoice-core/#voiceusagesnapshot)

##### startSession()

```ts
startSession(at?): void;
```

Defined in: [packages/core/src/usage-meter.ts:21](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/usage-meter.ts#L21)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `at` | `number` |

###### Returns

`void`

***

### VoiceError

Defined in: [packages/core/src/errors.ts:15](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/errors.ts#L15)

Typed error wrapper so a [NormalizedVoiceError](/docs/en/reference/api/ottervoice-core/#normalizedvoiceerror) can flow through
`throw`/`catch` and `Promise` rejection while remaining structurally
inspectable.

#### Extends

- `Error`

#### Implements

- [`NormalizedVoiceError`](/docs/en/reference/api/ottervoice-core/#normalizedvoiceerror)

#### Constructors

##### Constructor

```ts
new VoiceError(error): VoiceError;
```

Defined in: [packages/core/src/errors.ts:28](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/errors.ts#L28)

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `error` | [`NormalizedVoiceError`](/docs/en/reference/api/ottervoice-core/#normalizedvoiceerror) | Normalized shape to wrap; `retryable` defaults from `code` when omitted. |

###### Returns

[`VoiceError`](/docs/en/reference/api/ottervoice-core/#voiceerror)

###### Overrides

```ts
Error.constructor
```

#### Properties

| Property | Modifier | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="cause"></a> `cause?` | `public` | `unknown` | The cause of the error. | `Error.cause` | node\_modules/.bun/typescript@5.9.3/node\_modules/typescript/lib/lib.es2022.error.d.ts:26 |
| <a id="code"></a> `code` | `readonly` | [`VoiceErrorCode`](/docs/en/reference/api/ottervoice-core/#voiceerrorcode-1) | Stable application error code. | - | [packages/core/src/errors.ts:17](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/errors.ts#L17) |
| <a id="message"></a> `message` | `public` | `string` | Human-readable message suitable for logs (not always UI-safe). | [`NormalizedVoiceError`](/docs/en/reference/api/ottervoice-core/#normalizedvoiceerror).[`message`](/docs/en/reference/api/ottervoice-core/#message-1) `Error.message` | node\_modules/.bun/typescript@5.9.3/node\_modules/typescript/lib/lib.es5.d.ts:1077 |
| <a id="name"></a> `name` | `public` | `string` | - | `Error.name` | node\_modules/.bun/typescript@5.9.3/node\_modules/typescript/lib/lib.es5.d.ts:1076 |
| <a id="provider"></a> `provider?` | `readonly` | `string` | Provider name when the failure originated in an adapter. | - | [packages/core/src/errors.ts:19](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/errors.ts#L19) |
| <a id="raw"></a> `raw?` | `readonly` | `unknown` | Original thrown value or HTTP body, when available. | - | [packages/core/src/errors.ts:23](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/errors.ts#L23) |
| <a id="retryable"></a> `retryable?` | `readonly` | `boolean` | Hint for UI retry; not enforced by the session. | - | [packages/core/src/errors.ts:21](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/errors.ts#L21) |
| <a id="stack"></a> `stack?` | `public` | `string` | - | `Error.stack` | node\_modules/.bun/typescript@5.9.3/node\_modules/typescript/lib/lib.es5.d.ts:1078 |
| <a id="stacktracelimit"></a> `stackTraceLimit` | `static` | `number` | The `Error.stackTraceLimit` property specifies the number of stack frames collected by a stack trace (whether generated by `new Error().stack` or `Error.captureStackTrace(obj)`). The default value is `10` but may be set to any valid JavaScript number. Changes will affect any stack trace captured _after_ the value has been changed. If set to a non-number value, or set to a negative number, stack traces will not capture any frames. | `Error.stackTraceLimit` | node\_modules/.bun/@types+node@26.0.1/node\_modules/@types/node/globals.d.ts:67 |

#### Methods

##### toNormalized()

```ts
toNormalized(): NormalizedVoiceError;
```

Defined in: [packages/core/src/errors.ts:41](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/errors.ts#L41)

Flatten back to a plain [NormalizedVoiceError](/docs/en/reference/api/ottervoice-core/#normalizedvoiceerror) for events / logs.

###### Returns

[`NormalizedVoiceError`](/docs/en/reference/api/ottervoice-core/#normalizedvoiceerror)

##### captureStackTrace()

###### Call Signature

```ts
static captureStackTrace(targetObject, constructorOpt?): void;
```

Defined in: node\_modules/.bun/@types+node@26.0.1/node\_modules/@types/node/globals.d.ts:51

Creates a `.stack` property on `targetObject`, which when accessed returns
a string representing the location in the code at which
`Error.captureStackTrace()` was called.

```js
const myObject = {};
Error.captureStackTrace(myObject);
myObject.stack;  // Similar to `new Error().stack`
```

The first line of the trace will be prefixed with
`${myObject.name}: ${myObject.message}`.

The optional `constructorOpt` argument accepts a function. If given, all frames
above `constructorOpt`, including `constructorOpt`, will be omitted from the
generated stack trace.

The `constructorOpt` argument is useful for hiding implementation
details of error generation from the user. For instance:

```js
function a() {
  b();
}

function b() {
  c();
}

function c() {
  // Create an error without stack trace to avoid calculating the stack trace twice.
  const { stackTraceLimit } = Error;
  Error.stackTraceLimit = 0;
  const error = new Error();
  Error.stackTraceLimit = stackTraceLimit;

  // Capture the stack trace above function b
  Error.captureStackTrace(error, b); // Neither function c, nor b is included in the stack trace
  throw error;
}

a();
```

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `targetObject` | `object` |
| `constructorOpt?` | `Function` |

###### Returns

`void`

###### Inherited from

```ts
Error.captureStackTrace
```

###### Call Signature

```ts
static captureStackTrace(targetObject, constructorOpt?): void;
```

Defined in: node\_modules/.bun/bun-types@1.3.14/node\_modules/bun-types/globals.d.ts:1042

Create .stack property on a target object

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `targetObject` | `object` |
| `constructorOpt?` | `Function` |

###### Returns

`void`

###### Inherited from

```ts
Error.captureStackTrace
```

##### isError()

```ts
static isError(value): value is Error;
```

Defined in: node\_modules/.bun/bun-types@1.3.14/node\_modules/bun-types/globals.d.ts:1037

Check if a value is an instance of Error

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `value` | `unknown` | The value to check |

###### Returns

`value is Error`

True if the value is an instance of Error, false otherwise

###### Inherited from

```ts
Error.isError
```

##### prepareStackTrace()

```ts
static prepareStackTrace(err, stackTraces): any;
```

Defined in: node\_modules/.bun/@types+node@26.0.1/node\_modules/@types/node/globals.d.ts:55

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `err` | `Error` |
| `stackTraces` | `CallSite`[] |

###### Returns

`any`

###### See

https://v8.dev/docs/stack-trace-api#customizing-stack-traces

###### Inherited from

```ts
Error.prepareStackTrace
```

***

### VoiceSession

Defined in: [packages/core/src/session.ts:69](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/session.ts#L69)

Voice conversation session with automatic turn-taking and optional
full-duplex barge-in.

Drives the loop: assistant speaks → listen → user speaks → ASR → LLM →
assistant speaks → … It is platform-agnostic; audio I/O comes from the
[RuntimeAdapter](/docs/en/reference/api/ottervoice-core/#runtimeadapter) and cloud capabilities from the providers, both
supplied through [VoiceSessionConfig](/docs/en/reference/api/ottervoice-core/#voicesessionconfig).

#### Constructors

##### Constructor

```ts
new VoiceSession(config): VoiceSession;
```

Defined in: [packages/core/src/session.ts:107](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/session.ts#L107)

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `config` | [`VoiceSessionConfig`](/docs/en/reference/api/ottervoice-core/#voicesessionconfig) |

###### Returns

[`VoiceSession`](/docs/en/reference/api/ottervoice-core/#voicesession)

#### Accessors

##### state

###### Get Signature

```ts
get state(): VoiceSessionState;
```

Defined in: [packages/core/src/session.ts:156](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/session.ts#L156)

Current finite-state machine value (see [VoiceSessionState](/docs/en/reference/api/ottervoice-core/#voicesessionstate-1)).

###### Returns

[`VoiceSessionState`](/docs/en/reference/api/ottervoice-core/#voicesessionstate-1)

#### Methods

##### dispose()

```ts
dispose(): Promise<void>;
```

Defined in: [packages/core/src/session.ts:464](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/session.ts#L464)

Tear everything down and drop all listeners. Safe to call multiple times.
Prefer [VoiceSession.finish](/docs/en/reference/api/ottervoice-core/#finish) for a graceful end that emits `finished`.

###### Returns

`Promise`\<`void`\>

##### endUserTurn()

```ts
endUserTurn(): Promise<void>;
```

Defined in: [packages/core/src/session.ts:408](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/session.ts#L408)

Manually end the current user turn (push-to-talk release, or a UI "done"
button). Flushes the ASR session so its final result drives the loop.

###### Returns

`Promise`\<`void`\>

##### finish()

```ts
finish(reason?): Promise<void>;
```

Defined in: [packages/core/src/session.ts:456](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/session.ts#L456)

End the session normally, emitting a final usage snapshot and `finished`.

###### Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `reason` | `string` | `'finished'` | Opaque reason string forwarded on the state transition. |

###### Returns

`Promise`\<`void`\>

##### getTurns()

```ts
getTurns(): VoiceTurn[];
```

Defined in: [packages/core/src/session.ts:200](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/session.ts#L200)

Committed user/assistant turns recorded so far.

###### Returns

[`VoiceTurn`](/docs/en/reference/api/ottervoice-core/#voiceturn)[]

##### getUsage()

```ts
getUsage(): VoiceUsageSnapshot;
```

Defined in: [packages/core/src/session.ts:205](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/session.ts#L205)

Aggregate usage meters for the active (or last) session.

###### Returns

[`VoiceUsageSnapshot`](/docs/en/reference/api/ottervoice-core/#voiceusagesnapshot)

##### off()

```ts
off<K>(event, cb): void;
```

Defined in: [packages/core/src/session.ts:192](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/session.ts#L192)

Remove a previously registered handler.

###### Type Parameters

| Type Parameter |
| ------ |
| `K` *extends* keyof [`VoiceSessionEventMap`](/docs/en/reference/api/ottervoice-core/#voicesessioneventmap) |

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `event` | `K` | Event name from [VoiceSessionEventMap](/docs/en/reference/api/ottervoice-core/#voicesessioneventmap). |
| `cb` | (`payload`) => `void` | The same function reference passed to [VoiceSession.on](/docs/en/reference/api/ottervoice-core/#on-1). |

###### Returns

`void`

##### on()

```ts
on<K>(event, cb): () => void;
```

Defined in: [packages/core/src/session.ts:166](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/session.ts#L166)

Subscribe to a session event. Returns an unsubscribe function.

###### Type Parameters

| Type Parameter |
| ------ |
| `K` *extends* keyof [`VoiceSessionEventMap`](/docs/en/reference/api/ottervoice-core/#voicesessioneventmap) |

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `event` | `K` | Event name from [VoiceSessionEventMap](/docs/en/reference/api/ottervoice-core/#voicesessioneventmap). |
| `cb` | (`payload`) => `void` | Handler invoked with the typed payload for that event. |

###### Returns

() => `void`

##### once()

```ts
once<K>(event, cb): () => void;
```

Defined in: [packages/core/src/session.ts:179](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/session.ts#L179)

Subscribe for a single delivery, then auto-unsubscribe.

###### Type Parameters

| Type Parameter |
| ------ |
| `K` *extends* keyof [`VoiceSessionEventMap`](/docs/en/reference/api/ottervoice-core/#voicesessioneventmap) |

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `event` | `K` | Event name from [VoiceSessionEventMap](/docs/en/reference/api/ottervoice-core/#voicesessioneventmap). |
| `cb` | (`payload`) => `void` | Handler invoked once with the typed payload. |

###### Returns

() => `void`

##### pause()

```ts
pause(): Promise<void>;
```

Defined in: [packages/core/src/session.ts:435](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/session.ts#L435)

Pause the session: cancel in-flight replies, stop mic/ASR/playback, and
enter the `paused` state. No-op if the transition is illegal.

###### Returns

`Promise`\<`void`\>

##### resume()

```ts
resume(): Promise<void>;
```

Defined in: [packages/core/src/session.ts:446](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/session.ts#L446)

Resume from `paused` by reopening the microphone for the next user turn.

###### Returns

`Promise`\<`void`\>

##### start()

```ts
start(initialPrompt?): Promise<void>;
```

Defined in: [packages/core/src/session.ts:217](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/session.ts#L217)

Begin the session. Speaks the initial assistant message (from the agent
plugin or `initialPrompt`) and then, unless disabled, opens the mic.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `initialPrompt?` | `string` | Optional opening line when no agent plugin supplies one. |

###### Returns

`Promise`\<`void`\>

##### startListening()

```ts
startListening(): Promise<void>;
```

Defined in: [packages/core/src/session.ts:246](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/session.ts#L246)

Open the microphone and wire ASR for the next user turn.

###### Returns

`Promise`\<`void`\>

##### submitUserText()

```ts
submitUserText(text): Promise<void>;
```

Defined in: [packages/core/src/session.ts:426](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/session.ts#L426)

Inject user text directly, bypassing audio/ASR. Useful for text fallback
and deterministic flows.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `text` | `string` |

###### Returns

`Promise`\<`void`\>

## Interfaces

### AddTurnInput

Defined in: [packages/core/src/transcript-buffer.ts:7](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/transcript-buffer.ts#L7)

Input for [TranscriptBuffer.add](/docs/en/reference/api/ottervoice-core/#add).
Prefer supplying `id` when the same id already appears on streaming events.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="audiourl"></a> `audioUrl?` | `string` | Optional playback URL when audio was recorded. | [packages/core/src/transcript-buffer.ts:15](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/transcript-buffer.ts#L15) |
| <a id="durationms"></a> `durationMs?` | `number` | Explicit duration; otherwise derived from `endedAt - startedAt` when possible. | [packages/core/src/transcript-buffer.ts:21](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/transcript-buffer.ts#L21) |
| <a id="endedat"></a> `endedAt?` | `number` | Epoch millis when the turn ended. | [packages/core/src/transcript-buffer.ts:19](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/transcript-buffer.ts#L19) |
| <a id="id"></a> `id?` | `string` | Supply a pre-generated id so event ids and turn ids stay in sync. | [packages/core/src/transcript-buffer.ts:13](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/transcript-buffer.ts#L13) |
| <a id="metadata"></a> `metadata?` | `Record`\<`string`, `unknown`\> | Opaque app metadata attached to the turn. | [packages/core/src/transcript-buffer.ts:23](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/transcript-buffer.ts#L23) |
| <a id="role"></a> `role` | [`TurnRole`](/docs/en/reference/api/ottervoice-core/#turnrole) | Speaker role for the new turn. | [packages/core/src/transcript-buffer.ts:9](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/transcript-buffer.ts#L9) |
| <a id="startedat"></a> `startedAt?` | `number` | Epoch millis when the turn started; defaults to now. | [packages/core/src/transcript-buffer.ts:17](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/transcript-buffer.ts#L17) |
| <a id="text"></a> `text` | `string` | Final text content. | [packages/core/src/transcript-buffer.ts:11](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/transcript-buffer.ts#L11) |

***

### AgentSessionInput

Defined in: [packages/core/src/types.ts:973](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L973)

Arguments passed to [VoiceAgentPlugin.shouldFinishSession](/docs/en/reference/api/ottervoice-core/#shouldfinishsession) and
[VoiceAgentPlugin.generateReport](/docs/en/reference/api/ottervoice-core/#generatereport).

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="turns"></a> `turns` | [`VoiceTurn`](/docs/en/reference/api/ottervoice-core/#voiceturn)[] | Completed turns in chronological order. | [packages/core/src/types.ts:975](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L975) |

***

### AgentTurnInput

Defined in: [packages/core/src/types.ts:962](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L962)

Arguments passed to [VoiceAgentPlugin.generateNextAssistantMessage](/docs/en/reference/api/ottervoice-core/#generatenextassistantmessage).
Contains the full turn history plus the latest user utterance for convenience.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="lastusertext"></a> `lastUserText` | `string` | Text of the most recent user turn. | [packages/core/src/types.ts:966](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L966) |
| <a id="turns-1"></a> `turns` | [`VoiceTurn`](/docs/en/reference/api/ottervoice-core/#voiceturn)[] | Completed turns in chronological order (includes the latest user turn). | [packages/core/src/types.ts:964](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L964) |

***

### ASRCapabilities

Defined in: [packages/core/src/types.ts:219](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L219)

Feature flags advertised by an [ASRProvider](/docs/en/reference/api/ottervoice-core/#asrprovider).
Core uses these to choose streaming vs batch capture and whether to expect
partials / endpointing.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="batch"></a> `batch` | `boolean` | True when the provider expects complete turn audio (batch / rolling). | [packages/core/src/types.ts:223](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L223) |
| <a id="confidence"></a> `confidence?` | `boolean` | Whether [ASRResult.confidence](/docs/en/reference/api/ottervoice-core/#confidence-1) may be populated. | [packages/core/src/types.ts:229](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L229) |
| <a id="endpointing"></a> `endpointing?` | `boolean` | Whether the provider can emit utterance-end / endpoint signals. | [packages/core/src/types.ts:231](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L231) |
| <a id="languages"></a> `languages` | `string`[] | BCP-47 language tags the provider claims to support (empty = unspecified). | [packages/core/src/types.ts:233](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L233) |
| <a id="partialresults"></a> `partialResults` | `boolean` | Whether provisional results are available via [ASRSession.onPartial](/docs/en/reference/api/ottervoice-core/#onpartial). | [packages/core/src/types.ts:225](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L225) |
| <a id="streaming"></a> `streaming` | `boolean` | True when the provider accepts live chunked audio over a persistent session. | [packages/core/src/types.ts:221](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L221) |
| <a id="wordtimestamps"></a> `wordTimestamps?` | `boolean` | Whether [ASRResult.words](/docs/en/reference/api/ottervoice-core/#words) may include timing. | [packages/core/src/types.ts:227](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L227) |

***

### ASRProvider

Defined in: [packages/core/src/types.ts:333](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L333)

Speech-to-text adapter. Implement this to plug a vendor ASR or a mock.
Declare [ASRCapabilities.streaming](/docs/en/reference/api/ottervoice-core/#streaming) accurately so core chooses live
chunks vs complete-turn audio.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="capabilities"></a> `capabilities` | [`ASRCapabilities`](/docs/en/reference/api/ottervoice-core/#asrcapabilities) | Declared feature flags used by the session when routing audio. | [packages/core/src/types.ts:337](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L337) |
| <a id="name-1"></a> `name` | `string` | Stable provider id used in errors and usage (e.g. `deepgram`). | [packages/core/src/types.ts:335](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L335) |

#### Methods

##### createSession()

```ts
createSession(options): Promise<ASRSession>;
```

Defined in: [packages/core/src/types.ts:343](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L343)

Open a recognition session.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | [`ASRSessionOptions`](/docs/en/reference/api/ottervoice-core/#asrsessionoptions) | Language / encoding hints for this turn or call. |

###### Returns

`Promise`\<[`ASRSession`](/docs/en/reference/api/ottervoice-core/#asrsession)\>

***

### ASRResult

Defined in: [packages/core/src/types.ts:267](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L267)

A partial or final transcript emitted by an ASR session.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="confidence-1"></a> `confidence?` | `number` | Provider confidence in `[0, 1]` when available. | [packages/core/src/types.ts:271](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L271) |
| <a id="endms"></a> `endMs?` | `number` | Utterance end offset in milliseconds. | [packages/core/src/types.ts:275](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L275) |
| <a id="raw-1"></a> `raw?` | `unknown` | Raw provider payload for debugging. | [packages/core/src/types.ts:279](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L279) |
| <a id="startms"></a> `startMs?` | `number` | Utterance start offset in milliseconds. | [packages/core/src/types.ts:273](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L273) |
| <a id="text-1"></a> `text` | `string` | Transcript text (accumulated for the current utterance). | [packages/core/src/types.ts:269](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L269) |
| <a id="words"></a> `words?` | [`ASRWord`](/docs/en/reference/api/ottervoice-core/#asrword)[] | Optional word timestamps. | [packages/core/src/types.ts:277](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L277) |

***

### ASRSession

Defined in: [packages/core/src/types.ts:287](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L287)

Live recognition session returned by [ASRProvider.createSession](/docs/en/reference/api/ottervoice-core/#createsession).
Core feeds audio via [ASRSession.sendAudio](/docs/en/reference/api/ottervoice-core/#sendaudio) and upserts UI from
[ASRSession.onPartial](/docs/en/reference/api/ottervoice-core/#onpartial) / [ASRSession.onFinal](/docs/en/reference/api/ottervoice-core/#onfinal).

#### Methods

##### close()

```ts
close(): Promise<void>;
```

Defined in: [packages/core/src/types.ts:307](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L307)

Tear down the underlying connection / resources.

###### Returns

`Promise`\<`void`\>

##### onError()

```ts
onError(cb): () => void;
```

Defined in: [packages/core/src/types.ts:325](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L325)

Subscribe to provider failures.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `cb` | (`error`) => `void` | Receives a [NormalizedVoiceError](/docs/en/reference/api/ottervoice-core/#normalizedvoiceerror); return value unsubscribes. |

###### Returns

() => `void`

##### onFinal()

```ts
onFinal(cb): () => void;
```

Defined in: [packages/core/src/types.ts:319](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L319)

Subscribe to authoritative finals for the current utterance.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `cb` | (`result`) => `void` | Invoked once per finalized segment; return value unsubscribes. |

###### Returns

() => `void`

##### onPartial()

```ts
onPartial(cb): () => void;
```

Defined in: [packages/core/src/types.ts:313](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L313)

Subscribe to provisional transcripts.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `cb` | (`result`) => `void` | Invoked on each partial; return value unsubscribes. |

###### Returns

() => `void`

##### resetAudio()?

```ts
optional resetAudio(): void | Promise<void>;
```

Defined in: [packages/core/src/types.ts:295](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L295)

Drop buffered non-user audio while keeping the session connected.

###### Returns

`void` \| `Promise`\<`void`\>

##### sendAudio()

```ts
sendAudio(chunk): void | Promise<void>;
```

Defined in: [packages/core/src/types.ts:293](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L293)

Push the next audio fragment to the provider.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `chunk` | `ArrayBuffer` | Encoded or PCM bytes matching the session encoding. |

###### Returns

`void` \| `Promise`\<`void`\>

##### setInterimResultsEnabled()?

```ts
optional setInterimResultsEnabled(enabled): void | Promise<void>;
```

Defined in: [packages/core/src/types.ts:303](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L303)

Pause or resume provisional transcript work without affecting the final
transcript. Batch-backed providers can use this to avoid paid rolling
requests until voice activity confirms that the user is speaking.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `enabled` | `boolean` | When `false`, skip rolling / interim work until re-enabled. |

###### Returns

`void` \| `Promise`\<`void`\>

##### stop()

```ts
stop(): Promise<void>;
```

Defined in: [packages/core/src/types.ts:305](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L305)

Signal end-of-audio and wait for a final transcript when applicable.

###### Returns

`Promise`\<`void`\>

***

### ASRSessionOptions

Defined in: [packages/core/src/types.ts:237](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L237)

Options passed to [ASRProvider.createSession](/docs/en/reference/api/ottervoice-core/#createsession).

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="channels"></a> `channels?` | `number` | Channel count; typically `1` for voice. | [packages/core/src/types.ts:243](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L243) |
| <a id="encoding"></a> `encoding?` | [`AudioEncoding`](/docs/en/reference/api/ottervoice-core/#audioencoding) | Encoding of audio bytes sent via [ASRSession.sendAudio](/docs/en/reference/api/ottervoice-core/#sendaudio). | [packages/core/src/types.ts:245](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L245) |
| <a id="endpointing-1"></a> `endpointing?` | `boolean` | Ask the provider to emit endpointing / utterance-end signals when available. | [packages/core/src/types.ts:249](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L249) |
| <a id="interimresults"></a> `interimResults?` | `boolean` | Request provisional partials when the provider supports them. | [packages/core/src/types.ts:247](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L247) |
| <a id="language"></a> `language?` | `string` | Preferred recognition language (e.g. `zh-CN`). | [packages/core/src/types.ts:239](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L239) |
| <a id="metadata-1"></a> `metadata?` | `Record`\<`string`, `unknown`\> | Opaque metadata forwarded to the adapter (not interpreted by core). | [packages/core/src/types.ts:251](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L251) |
| <a id="samplerate"></a> `sampleRate?` | `number` | Input sample rate in Hz when the provider needs it (e.g. PCM streams). | [packages/core/src/types.ts:241](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L241) |

***

### ASRWord

Defined in: [packages/core/src/types.ts:255](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L255)

Optional word-level timing from an ASR provider.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="confidence-2"></a> `confidence?` | `number` | Provider confidence in `[0, 1]` when available. | [packages/core/src/types.ts:263](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L263) |
| <a id="endms-1"></a> `endMs?` | `number` | Word end offset within the utterance, in milliseconds. | [packages/core/src/types.ts:261](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L261) |
| <a id="startms-1"></a> `startMs?` | `number` | Word start offset within the utterance, in milliseconds. | [packages/core/src/types.ts:259](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L259) |
| <a id="text-2"></a> `text` | `string` | Recognized token / word. | [packages/core/src/types.ts:257](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L257) |

***

### AudioChunk

Defined in: [packages/core/src/types.ts:681](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L681)

Encoded or PCM audio fragment from [AudioInputAdapter](/docs/en/reference/api/ottervoice-core/#audioinputadapter).

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="channels-1"></a> `channels?` | `number` | Channel count when known. | [packages/core/src/types.ts:691](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L691) |
| <a id="data"></a> `data` | `ArrayBuffer` | Audio bytes (container or raw PCM depending on `encoding`). | [packages/core/src/types.ts:683](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L683) |
| <a id="delivery"></a> `delivery?` | `"stream"` \| `"turn"` | `stream` is a low-latency fragment for streaming ASR; `turn` is the complete VAD-delimited recording for batch ASR and audio-LLM input. Omitted keeps the legacy behavior and makes the chunk available to both. | [packages/core/src/types.ts:699](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L699) |
| <a id="durationms-1"></a> `durationMs?` | `number` | Approximate duration of this fragment. | [packages/core/src/types.ts:687](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L687) |
| <a id="encoding-1"></a> `encoding?` | `string` | Codec / container label (e.g. `webm`, `pcm_s16le`). | [packages/core/src/types.ts:693](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L693) |
| <a id="samplerate-1"></a> `sampleRate?` | `number` | Sample rate in Hz when known (PCM). | [packages/core/src/types.ts:689](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L689) |
| <a id="timestamp"></a> `timestamp` | `number` | Capture time in epoch millis. | [packages/core/src/types.ts:685](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L685) |

***

### AudioInputAdapter

Defined in: [packages/core/src/types.ts:703](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L703)

Platform microphone capture injected via [RuntimeAdapter](/docs/en/reference/api/ottervoice-core/#runtimeadapter).

#### Methods

##### onChunk()

```ts
onChunk(cb): () => void;
```

Defined in: [packages/core/src/types.ts:735](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L735)

Subscribe to encoded / PCM chunks.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `cb` | (`chunk`) => `void` |

###### Returns

Unsubscribe function.

() => `void`

##### onError()

```ts
onError(cb): () => void;
```

Defined in: [packages/core/src/types.ts:747](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L747)

Subscribe to capture failures.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `cb` | (`error`) => `void` |

###### Returns

Unsubscribe function.

() => `void`

##### onVolume()?

```ts
optional onVolume(cb): () => void;
```

Defined in: [packages/core/src/types.ts:741](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L741)

Subscribe to normalized volume levels in `0..1` for VAD.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `cb` | (`level`) => `void` |

###### Returns

Unsubscribe function.

() => `void`

##### pause()?

```ts
optional pause(): Promise<void>;
```

Defined in: [packages/core/src/types.ts:727](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L727)

Pause capture without tearing down permission / hardware (optional).

###### Returns

`Promise`\<`void`\>

##### requestPermission()

```ts
requestPermission(): Promise<boolean>;
```

Defined in: [packages/core/src/types.ts:705](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L705)

Prompt for mic permission; `false` should surface as a session error.

###### Returns

`Promise`\<`boolean`\>

##### resume()?

```ts
optional resume(): Promise<void>;
```

Defined in: [packages/core/src/types.ts:729](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L729)

Resume after [pause](/docs/en/reference/api/ottervoice-core/#pause-3).

###### Returns

`Promise`\<`void`\>

##### resumeCapture()?

```ts
optional resumeCapture(options?): Promise<void>;
```

Defined in: [packages/core/src/types.ts:725](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L725)

Resume encoded chunk capture after [suspendCapture](/docs/en/reference/api/ottervoice-core/#suspendcapture). Runtimes with a
barge-in pre-roll buffer may include it when `includePreRoll` is true.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options?` | \{ `includePreRoll?`: `boolean`; \} | - |
| `options.includePreRoll?` | `boolean` | Flush retained pre-roll into the next chunks. |

###### Returns

`Promise`\<`void`\>

##### start()

```ts
start(options): Promise<void>;
```

Defined in: [packages/core/src/types.ts:711](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L711)

Begin capture.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | [`AudioInputOptions`](/docs/en/reference/api/ottervoice-core/#audioinputoptions) | Preferred rate / encoding hints the runtime may honor. |

###### Returns

`Promise`\<`void`\>

##### stop()

```ts
stop(): Promise<void>;
```

Defined in: [packages/core/src/types.ts:713](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L713)

Stop capture and release resources tied to the current start.

###### Returns

`Promise`\<`void`\>

##### suspendCapture()?

```ts
optional suspendCapture(): Promise<void>;
```

Defined in: [packages/core/src/types.ts:718](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L718)

Suspend encoded chunk delivery while leaving volume/VAD monitoring active.
A runtime may retain a bounded barge-in pre-roll internally.

###### Returns

`Promise`\<`void`\>

***

### AudioInputOptions

Defined in: [packages/core/src/types.ts:663](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L663)

Capture hints passed to [AudioInputAdapter.start](/docs/en/reference/api/ottervoice-core/#start-3).
Runtimes may ignore unsupported fields (e.g. browser MediaRecorder encodings).

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="autogaincontrol"></a> `autoGainControl?` | `boolean` | Request auto gain control when available. | [packages/core/src/types.ts:677](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L677) |
| <a id="channels-2"></a> `channels?` | `number` | Channel count; typically `1` for voice. | [packages/core/src/types.ts:667](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L667) |
| <a id="chunkms"></a> `chunkMs?` | `number` | Preferred encoded chunk duration in milliseconds. | [packages/core/src/types.ts:671](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L671) |
| <a id="echocancellation"></a> `echoCancellation?` | `boolean` | Request hardware / browser echo cancellation when available. | [packages/core/src/types.ts:673](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L673) |
| <a id="encoding-2"></a> `encoding?` | `"pcm_s16le"` \| `"opus"` \| `"webm"` | Encoded chunk format when the runtime can choose. | [packages/core/src/types.ts:669](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L669) |
| <a id="noisesuppression"></a> `noiseSuppression?` | `boolean` | Request noise suppression when available. | [packages/core/src/types.ts:675](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L675) |
| <a id="samplerate-2"></a> `sampleRate?` | `number` | Target sample rate in Hz (e.g. `16000` for PCM runtimes). | [packages/core/src/types.ts:665](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L665) |

***

### AudioLLMAudioChunk

Defined in: [packages/core/src/types.ts:442](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L442)

Streaming PCM fragment from an [AudioLLMProvider](/docs/en/reference/api/ottervoice-core/#audiollmprovider).

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="channels-3"></a> `channels` | `number` | Channel count of `data`. | [packages/core/src/types.ts:450](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L450) |
| <a id="data-1"></a> `data` | `ArrayBuffer` | Raw interleaved PCM bytes for immediate playback. | [packages/core/src/types.ts:444](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L444) |
| <a id="encoding-3"></a> `encoding` | `"pcm_s16le"` | Always linear 16-bit PCM for runtime players. | [packages/core/src/types.ts:446](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L446) |
| <a id="samplerate-3"></a> `sampleRate` | `number` | Sample rate of `data` in Hz. | [packages/core/src/types.ts:448](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L448) |

***

### AudioLLMGenerateInput

Defined in: [packages/core/src/types.ts:454](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L454)

Input for [AudioLLMProvider.generate](/docs/en/reference/api/ottervoice-core/#generate).

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="audio"></a> `audio` | `ArrayBuffer` | Complete audio for the current VAD-delimited user turn. | [packages/core/src/types.ts:456](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L456) |
| <a id="format"></a> `format` | [`AudioLLMInputFormat`](/docs/en/reference/api/ottervoice-core/#audiollminputformat) | Container / codec of `audio`. | [packages/core/src/types.ts:458](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L458) |
| <a id="maxtokens"></a> `maxTokens?` | `number` | Soft cap on output tokens (often shared by audio + transcript). | [packages/core/src/types.ts:466](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L466) |
| <a id="messages"></a> `messages` | [`LLMMessage`](/docs/en/reference/api/ottervoice-core/#llmmessage)[] | Text history from completed earlier turns. | [packages/core/src/types.ts:460](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L460) |
| <a id="metadata-2"></a> `metadata?` | `Record`\<`string`, `unknown`\> | Opaque metadata forwarded to the adapter. | [packages/core/src/types.ts:468](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L468) |
| <a id="onaudiochunk"></a> `onAudioChunk?` | (`chunk`) => `void` \| `Promise`\<`void`\> | Receives decoded output audio while the model response is still streaming. | [packages/core/src/types.ts:472](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L472) |
| <a id="ontranscriptdelta"></a> `onTranscriptDelta?` | (`text`) => `void` \| `Promise`\<`void`\> | Receives the model's spoken transcript while output audio is streaming. | [packages/core/src/types.ts:474](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L474) |
| <a id="signal"></a> `signal?` | `AbortSignal` | Cancels an in-flight provider request when this turn is superseded. | [packages/core/src/types.ts:470](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L470) |
| <a id="system"></a> `system?` | `string` | Optional system instruction for this request. | [packages/core/src/types.ts:462](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L462) |
| <a id="temperature"></a> `temperature?` | `number` | Sampling temperature; provider default when omitted. | [packages/core/src/types.ts:464](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L464) |

***

### AudioLLMGenerateOutput

Defined in: [packages/core/src/types.ts:478](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L478)

Completed reply from [AudioLLMProvider.generate](/docs/en/reference/api/ottervoice-core/#generate).

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="audiobuffer"></a> `audioBuffer` | `ArrayBuffer` | Full assistant audio buffer (may be empty if only streamed via callbacks). | [packages/core/src/types.ts:482](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L482) |
| <a id="mimetype"></a> `mimeType` | `string` | MIME type of `audioBuffer`. | [packages/core/src/types.ts:484](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L484) |
| <a id="raw-2"></a> `raw?` | `unknown` | Provider timing/cost metadata, when available. | [packages/core/src/types.ts:488](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L488) |
| <a id="text-3"></a> `text` | `string` | Transcript of the generated assistant audio. | [packages/core/src/types.ts:480](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L480) |
| <a id="usage"></a> `usage?` | [`LLMUsage`](/docs/en/reference/api/ottervoice-core/#llmusage) | Token usage when reported. | [packages/core/src/types.ts:486](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L486) |

***

### AudioLLMProvider

Defined in: [packages/core/src/types.ts:495](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L495)

A single model that consumes user audio and directly generates speech
(used when [VoiceSessionConfig.pipeline](/docs/en/reference/api/ottervoice-core/#pipeline) is `audio_llm`).

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="name-2"></a> `name` | `string` | Stable provider id used in errors and usage. | [packages/core/src/types.ts:497](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L497) |

#### Methods

##### generate()

```ts
generate(input): Promise<AudioLLMGenerateOutput>;
```

Defined in: [packages/core/src/types.ts:503](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L503)

Run one audio-in / audio-out turn.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `input` | [`AudioLLMGenerateInput`](/docs/en/reference/api/ottervoice-core/#audiollmgenerateinput) | Completed user audio plus history and stream callbacks. |

###### Returns

`Promise`\<[`AudioLLMGenerateOutput`](/docs/en/reference/api/ottervoice-core/#audiollmgenerateoutput)\>

***

### AudioOutputAdapter

Defined in: [packages/core/src/types.ts:795](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L795)

Platform speaker / playback side injected via [RuntimeAdapter.audioOutput](/docs/en/reference/api/ottervoice-core/#audiooutput-1).
Supports one-shot [AudioOutputAdapter.play](/docs/en/reference/api/ottervoice-core/#play-1) and optional gapless
[AudioOutputAdapter.startPcmStream](/docs/en/reference/api/ottervoice-core/#startpcmstream) for streaming TTS / audio LLMs.

#### Methods

##### onEnd()

```ts
onEnd(cb): () => void;
```

Defined in: [packages/core/src/types.ts:835](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L835)

Subscribe to playback end (natural finish or stop).

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `cb` | () => `void` |

###### Returns

Unsubscribe function.

() => `void`

##### onError()

```ts
onError(cb): () => void;
```

Defined in: [packages/core/src/types.ts:841](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L841)

Subscribe to playback failures.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `cb` | (`error`) => `void` |

###### Returns

Unsubscribe function.

() => `void`

##### onStart()

```ts
onStart(cb): () => void;
```

Defined in: [packages/core/src/types.ts:829](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L829)

Subscribe to playback start.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `cb` | () => `void` |

###### Returns

Unsubscribe function.

() => `void`

##### onVolume()?

```ts
optional onVolume(cb): () => void;
```

Defined in: [packages/core/src/types.ts:823](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L823)

Subscribe to normalized RMS of the assistant audio currently being played
(used as an acoustic echo reference for barge-in).

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `cb` | (`level`, `at?`) => `void` |

###### Returns

Unsubscribe function.

() => `void`

##### pause()?

```ts
optional pause(): Promise<void>;
```

Defined in: [packages/core/src/types.ts:814](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L814)

Pause playback without discarding the current utterance (optional).

###### Returns

`Promise`\<`void`\>

##### play()

```ts
play(input): Promise<void>;
```

Defined in: [packages/core/src/types.ts:803](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L803)

Play a complete encoded buffer or URL.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `input` | [`AudioPlaybackInput`](/docs/en/reference/api/ottervoice-core/#audioplaybackinput) | URL and/or in-memory bytes plus optional MIME / volume. |

###### Returns

`Promise`\<`void`\>

##### resume()?

```ts
optional resume(): Promise<void>;
```

Defined in: [packages/core/src/types.ts:816](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L816)

Resume after [AudioOutputAdapter.pause](/docs/en/reference/api/ottervoice-core/#pause-4).

###### Returns

`Promise`\<`void`\>

##### startPcmStream()?

```ts
optional startPcmStream(options): Promise<AudioOutputStream>;
```

Defined in: [packages/core/src/types.ts:810](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L810)

Begin incremental raw-PCM playback for low-latency speech streaming.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | [`PcmAudioStreamOptions`](/docs/en/reference/api/ottervoice-core/#pcmaudiostreamoptions) | Encoding, sample rate, and channel layout for subsequent writes. |

###### Returns

`Promise`\<[`AudioOutputStream`](/docs/en/reference/api/ottervoice-core/#audiooutputstream)\>

An [AudioOutputStream](/docs/en/reference/api/ottervoice-core/#audiooutputstream) that must be `close()`d.

##### stop()

```ts
stop(): Promise<void>;
```

Defined in: [packages/core/src/types.ts:812](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L812)

Stop current playback and cancel any open PCM stream.

###### Returns

`Promise`\<`void`\>

##### unlock()?

```ts
optional unlock(): Promise<void>;
```

Defined in: [packages/core/src/types.ts:797](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L797)

Prime browser autoplay permission from a direct user gesture.

###### Returns

`Promise`\<`void`\>

***

### AudioOutputStream

Defined in: [packages/core/src/types.ts:779](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L779)

Incremental PCM writer returned by [AudioOutputAdapter.startPcmStream](/docs/en/reference/api/ottervoice-core/#startpcmstream).
Call [AudioOutputStream.write](/docs/en/reference/api/ottervoice-core/#write) for each contiguous block, then
[AudioOutputStream.close](/docs/en/reference/api/ottervoice-core/#close-1) when the utterance ends.

#### Methods

##### close()

```ts
close(): Promise<void>;
```

Defined in: [packages/core/src/types.ts:787](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L787)

Signal end-of-stream and resolve after all queued audio has played.

###### Returns

`Promise`\<`void`\>

##### write()

```ts
write(data): Promise<void>;
```

Defined in: [packages/core/src/types.ts:785](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L785)

Queue another contiguous PCM block for playback.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `data` | `ArrayBuffer` | Interleaved PCM matching the stream's encoding / rate. |

###### Returns

`Promise`\<`void`\>

***

### AudioPlaybackInput

Defined in: [packages/core/src/types.ts:751](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L751)

Input for one-shot [AudioOutputAdapter.play](/docs/en/reference/api/ottervoice-core/#play-1).

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="audiobuffer-1"></a> `audioBuffer?` | `ArrayBuffer` | In-memory audio bytes (takes precedence when both are set, if supported). | [packages/core/src/types.ts:755](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L755) |
| <a id="audiourl-1"></a> `audioUrl?` | `string` | Remote or blob URL to fetch and play. | [packages/core/src/types.ts:753](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L753) |
| <a id="mimetype-1"></a> `mimeType?` | `string` | MIME type of the audio payload. | [packages/core/src/types.ts:757](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L757) |
| <a id="volume"></a> `volume?` | `number` | Playback gain in `[0, 1]`. | [packages/core/src/types.ts:759](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L759) |

***

### BargeInSpeechGateOptions

Defined in: [packages/core/src/playback-echo-filter.ts:30](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/playback-echo-filter.ts#L30)

Tuning knobs for [BargeInSpeechGate](/docs/en/reference/api/ottervoice-core/#bargeinspeechgate).
Raise thresholds to reduce false barge-in from knocks; lower them for quieter speech.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="requiredvoicedframes"></a> `requiredVoicedFrames?` | `number` | Voiced frames required inside the window to open the gate. Default 4. | [packages/core/src/playback-echo-filter.ts:36](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/playback-echo-filter.ts#L36) |
| <a id="volumethreshold"></a> `volumeThreshold?` | `number` | Per-frame RMS (post-echo) above which a frame counts as voiced. Default 0.008. | [packages/core/src/playback-echo-filter.ts:32](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/playback-echo-filter.ts#L32) |
| <a id="windowframes"></a> `windowFrames?` | `number` | Moving-window length in frames for the voiced-frame vote. Default 12. | [packages/core/src/playback-echo-filter.ts:34](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/playback-echo-filter.ts#L34) |

***

### CreateVoiceErrorOptions

Defined in: [packages/core/src/errors.ts:57](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/errors.ts#L57)

Optional metadata for [createVoiceError](/docs/en/reference/api/ottervoice-core/#createvoiceerror).
Omitted fields get sensible defaults (`retryable` from known network/ASR codes).

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="provider-1"></a> `provider?` | `string` | Provider name when the failure originated in an adapter. | [packages/core/src/errors.ts:59](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/errors.ts#L59) |
| <a id="raw-3"></a> `raw?` | `unknown` | Original thrown value or HTTP body, when available. | [packages/core/src/errors.ts:63](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/errors.ts#L63) |
| <a id="retryable-1"></a> `retryable?` | `boolean` | Override the default retryability for [VoiceErrorCode](/docs/en/reference/api/ottervoice-core/#voiceerrorcode-1). | [packages/core/src/errors.ts:61](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/errors.ts#L61) |

***

### LLMGenerateInput

Defined in: [packages/core/src/types.ts:369](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L369)

Input for [LLMProvider.generate](/docs/en/reference/api/ottervoice-core/#generate-1) / [LLMProvider.stream](/docs/en/reference/api/ottervoice-core/#stream).

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="maxtokens-1"></a> `maxTokens?` | `number` | Soft cap on completion tokens. | [packages/core/src/types.ts:377](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L377) |
| <a id="messages-1"></a> `messages` | [`LLMMessage`](/docs/en/reference/api/ottervoice-core/#llmmessage)[] | Chronological chat history for the model. | [packages/core/src/types.ts:373](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L373) |
| <a id="metadata-3"></a> `metadata?` | `Record`\<`string`, `unknown`\> | Opaque metadata forwarded to the adapter. | [packages/core/src/types.ts:381](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L381) |
| <a id="responseformat"></a> `responseFormat?` | `"text"` \| `"json"` | Prefer plain text or structured JSON when the model supports it. | [packages/core/src/types.ts:379](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L379) |
| <a id="signal-1"></a> `signal?` | `AbortSignal` | Cancels an in-flight provider request when this turn is superseded. | [packages/core/src/types.ts:383](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L383) |
| <a id="system-1"></a> `system?` | `string` | Optional system instruction for this request. | [packages/core/src/types.ts:371](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L371) |
| <a id="temperature-1"></a> `temperature?` | `number` | Sampling temperature; provider default when omitted. | [packages/core/src/types.ts:375](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L375) |

***

### LLMGenerateOutput

Defined in: [packages/core/src/types.ts:387](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L387)

Non-streaming completion from [LLMProvider.generate](/docs/en/reference/api/ottervoice-core/#generate-1).

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="json"></a> `json?` | `unknown` | Parsed JSON when `responseFormat` was `json`. | [packages/core/src/types.ts:391](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L391) |
| <a id="raw-4"></a> `raw?` | `unknown` | Raw provider payload for debugging. | [packages/core/src/types.ts:395](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L395) |
| <a id="text-4"></a> `text` | `string` | Assistant reply text. | [packages/core/src/types.ts:389](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L389) |
| <a id="usage-1"></a> `usage?` | [`LLMUsage`](/docs/en/reference/api/ottervoice-core/#llmusage) | Token usage when reported. | [packages/core/src/types.ts:393](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L393) |

***

### LLMMessage

Defined in: [packages/core/src/types.ts:351](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L351)

One chat message forwarded to an [LLMProvider](/docs/en/reference/api/ottervoice-core/#llmprovider).

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="content"></a> `content` | `string` | Plain text content. | [packages/core/src/types.ts:355](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L355) |
| <a id="role-1"></a> `role` | `"user"` \| `"assistant"` \| `"system"` | Message role in the conversation. | [packages/core/src/types.ts:353](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L353) |

***

### LLMProvider

Defined in: [packages/core/src/types.ts:414](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L414)

Text LLM used by the classic `asr_llm_tts` pipeline.
Prefer implementing [LLMProvider.stream](/docs/en/reference/api/ottervoice-core/#stream) so the UI can show incremental text.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="name-3"></a> `name` | `string` | Stable provider id used in errors and usage. | [packages/core/src/types.ts:416](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L416) |

#### Methods

##### generate()

```ts
generate(input): Promise<LLMGenerateOutput>;
```

Defined in: [packages/core/src/types.ts:422](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L422)

Produce a complete reply for the current turn.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `input` | [`LLMGenerateInput`](/docs/en/reference/api/ottervoice-core/#llmgenerateinput) | System prompt, history, and generation knobs. |

###### Returns

`Promise`\<[`LLMGenerateOutput`](/docs/en/reference/api/ottervoice-core/#llmgenerateoutput)\>

##### stream()?

```ts
optional stream(input): AsyncIterable<LLMStreamChunk>;
```

Defined in: [packages/core/src/types.ts:428](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L428)

Optional token stream used when available (lower time-to-first-text).

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `input` | [`LLMGenerateInput`](/docs/en/reference/api/ottervoice-core/#llmgenerateinput) | Same shape as [LLMProvider.generate](/docs/en/reference/api/ottervoice-core/#generate-1). |

###### Returns

`AsyncIterable`\<[`LLMStreamChunk`](/docs/en/reference/api/ottervoice-core/#llmstreamchunk)\>

***

### LLMStreamChunk

Defined in: [packages/core/src/types.ts:399](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L399)

One chunk from [LLMProvider.stream](/docs/en/reference/api/ottervoice-core/#stream).

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="error"></a> `error?` | [`NormalizedVoiceError`](/docs/en/reference/api/ottervoice-core/#normalizedvoiceerror) | Normalized failure for `error`. | [packages/core/src/types.ts:407](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L407) |
| <a id="text-5"></a> `text?` | `string` | New text for `text_delta`. | [packages/core/src/types.ts:403](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L403) |
| <a id="type"></a> `type` | `"error"` \| `"text_delta"` \| `"usage"` \| `"done"` | Chunk kind: text fragment, usage update, completion, or error. | [packages/core/src/types.ts:401](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L401) |
| <a id="usage-2"></a> `usage?` | [`LLMUsage`](/docs/en/reference/api/ottervoice-core/#llmusage) | Usage snapshot for `usage` / `done`. | [packages/core/src/types.ts:405](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L405) |

***

### LLMUsage

Defined in: [packages/core/src/types.ts:359](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L359)

Optional token usage reported by an LLM or Audio LLM provider.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="inputtokens"></a> `inputTokens?` | `number` | Prompt / input tokens when the provider reports them. | [packages/core/src/types.ts:361](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L361) |
| <a id="outputtokens"></a> `outputTokens?` | `number` | Completion / output tokens when the provider reports them. | [packages/core/src/types.ts:363](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L363) |
| <a id="totaltokens"></a> `totalTokens?` | `number` | Total tokens when the provider reports a combined figure. | [packages/core/src/types.ts:365](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L365) |

***

### LoggerAdapter

Defined in: [packages/core/src/types.ts:925](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L925)

Optional structured logger injected via [RuntimeAdapter.logger](/docs/en/reference/api/ottervoice-core/#logger-1).

#### Methods

##### debug()

```ts
debug(...args): void;
```

Defined in: [packages/core/src/types.ts:927](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L927)

Verbose diagnostics (disabled in production by default).

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

Defined in: [packages/core/src/types.ts:933](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L933)

Failures that typically surface as session errors.

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

Defined in: [packages/core/src/types.ts:929](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L929)

Informational lifecycle messages.

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

Defined in: [packages/core/src/types.ts:931](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L931)

Recoverable anomalies.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| ...`args` | `unknown`[] |

###### Returns

`void`

***

### MockASROptions

Defined in: [packages/core/src/providers/mock.ts:26](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock.ts#L26)

Options for [createMockASR](/docs/en/reference/api/ottervoice-core/#createmockasr).
Use when wiring tests or the developer profile without a live STT backend.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="emitpartials"></a> `emitPartials?` | `boolean` | Emit a partial (half-length) result before each final. Default true. | [packages/core/src/providers/mock.ts:30](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock.ts#L30) |
| <a id="failwith"></a> `failWith?` | [`NormalizedVoiceError`](/docs/en/reference/api/ottervoice-core/#normalizedvoiceerror) | When set, the next `sendAudio` triggers this error instead of a result. | [packages/core/src/providers/mock.ts:32](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock.ts#L32) |
| <a id="transcripts"></a> `transcripts` | `string`[] | Scripted final transcripts, emitted one per `sendAudio` call. | [packages/core/src/providers/mock.ts:28](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock.ts#L28) |

***

### MockAudioInputOptions

Defined in: [packages/core/src/providers/mock-runtime.ts:15](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock-runtime.ts#L15)

Options for [MockAudioInput](/docs/en/reference/api/ottervoice-core/#mockaudioinput).
Use when constructing a mock mic for tests without a real capture device.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="permission"></a> `permission?` | `boolean` | Permission result returned by `requestPermission`. Default true. | [packages/core/src/providers/mock-runtime.ts:17](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock-runtime.ts#L17) |

***

### MockAudioOutputOptions

Defined in: [packages/core/src/providers/mock-runtime.ts:92](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock-runtime.ts#L92)

Options for [MockAudioOutput](/docs/en/reference/api/ottervoice-core/#mockaudiooutput).
Use when tests need to control whether `play` auto-completes or fails.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="autocomplete"></a> `autoComplete?` | `boolean` | Auto-fire start/end around `play`. Default true. | [packages/core/src/providers/mock-runtime.ts:94](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock-runtime.ts#L94) |
| <a id="failwith-1"></a> `failWith?` | [`NormalizedVoiceError`](/docs/en/reference/api/ottervoice-core/#normalizedvoiceerror) | When set, `play` rejects with this error. | [packages/core/src/providers/mock-runtime.ts:96](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock-runtime.ts#L96) |

***

### MockLLMOptions

Defined in: [packages/core/src/providers/mock.ts:114](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock.ts#L114)

Options for [createMockLLM](/docs/en/reference/api/ottervoice-core/#createmockllm).
Use in tests or demos that need a deterministic text reply without a live LLM.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="failwith-2"></a> `failWith?` | [`NormalizedVoiceError`](/docs/en/reference/api/ottervoice-core/#normalizedvoiceerror) | When set, `generate`/`stream` reject with this error. | [packages/core/src/providers/mock.ts:123](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock.ts#L123) |
| <a id="reply"></a> `reply?` | (`input`, `callIndex`) => `string` | Reply generator. Receives the input and 0-based call index. Defaults to echoing the last user message. | [packages/core/src/providers/mock.ts:119](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock.ts#L119) |
| <a id="usage-3"></a> `usage?` | [`LLMUsage`](/docs/en/reference/api/ottervoice-core/#llmusage) | Token usage returned on every `generate` / stream completion. | [packages/core/src/providers/mock.ts:121](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock.ts#L121) |

***

### MockPronunciationOptions

Defined in: [packages/core/src/providers/mock.ts:239](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock.ts#L239)

Options for [createMockPronunciation](/docs/en/reference/api/ottervoice-core/#createmockpronunciation).
Use when pronunciation scoring is optional in tests but the provider slot
must still be filled.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="failwith-3"></a> `failWith?` | [`NormalizedVoiceError`](/docs/en/reference/api/ottervoice-core/#normalizedvoiceerror) | When set, `assess` rejects with this error. | [packages/core/src/providers/mock.ts:243](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock.ts#L243) |
| <a id="score"></a> `score?` | `number` | Overall / per-dimension score returned for every assessment. Default 80. | [packages/core/src/providers/mock.ts:241](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock.ts#L241) |

***

### MockRuntime

Defined in: [packages/core/src/providers/mock-runtime.ts:194](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock-runtime.ts#L194)

In-memory [RuntimeAdapter](/docs/en/reference/api/ottervoice-core/#runtimeadapter) with typed mock input/output adapters.
Prefer [createMockRuntime](/docs/en/reference/api/ottervoice-core/#createmockruntime) over constructing this shape by hand.

#### Extends

- [`RuntimeAdapter`](/docs/en/reference/api/ottervoice-core/#runtimeadapter)

#### Properties

| Property | Type | Description | Overrides | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="audioinput"></a> `audioInput` | [`MockAudioInput`](/docs/en/reference/api/ottervoice-core/#mockaudioinput) | Controllable mock microphone. | [`RuntimeAdapter`](/docs/en/reference/api/ottervoice-core/#runtimeadapter).[`audioInput`](/docs/en/reference/api/ottervoice-core/#audioinput-1) | - | [packages/core/src/providers/mock-runtime.ts:196](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock-runtime.ts#L196) |
| <a id="audiooutput"></a> `audioOutput` | [`MockAudioOutput`](/docs/en/reference/api/ottervoice-core/#mockaudiooutput) | Controllable mock speaker. | [`RuntimeAdapter`](/docs/en/reference/api/ottervoice-core/#runtimeadapter).[`audioOutput`](/docs/en/reference/api/ottervoice-core/#audiooutput-1) | - | [packages/core/src/providers/mock-runtime.ts:198](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock-runtime.ts#L198) |
| <a id="logger"></a> `logger?` | [`LoggerAdapter`](/docs/en/reference/api/ottervoice-core/#loggeradapter) | Optional logger; core uses it sparingly. | - | [`RuntimeAdapter`](/docs/en/reference/api/ottervoice-core/#runtimeadapter).[`logger`](/docs/en/reference/api/ottervoice-core/#logger-1) | [packages/core/src/types.ts:951](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L951) |
| <a id="network"></a> `network?` | [`NetworkAdapter`](/docs/en/reference/api/ottervoice-core/#networkadapter) | Optional HTTP/WebSocket hooks for providers. | - | [`RuntimeAdapter`](/docs/en/reference/api/ottervoice-core/#runtimeadapter).[`network`](/docs/en/reference/api/ottervoice-core/#network-1) | [packages/core/src/types.ts:947](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L947) |
| <a id="storage"></a> `storage?` | [`RuntimeStorageAdapter`](/docs/en/reference/api/ottervoice-core/#runtimestorageadapter) | Optional persistence for caches. | - | [`RuntimeAdapter`](/docs/en/reference/api/ottervoice-core/#runtimeadapter).[`storage`](/docs/en/reference/api/ottervoice-core/#storage-1) | [packages/core/src/types.ts:949](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L949) |

***

### MockRuntimeOptions

Defined in: [packages/core/src/providers/mock-runtime.ts:183](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock-runtime.ts#L183)

Options for [createMockRuntime](/docs/en/reference/api/ottervoice-core/#createmockruntime).
Forwards into [MockAudioInput](/docs/en/reference/api/ottervoice-core/#mockaudioinput) / [MockAudioOutput](/docs/en/reference/api/ottervoice-core/#mockaudiooutput) constructors.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="input"></a> `input?` | [`MockAudioInputOptions`](/docs/en/reference/api/ottervoice-core/#mockaudioinputoptions) | Microphone mock options. See [MockAudioInputOptions](/docs/en/reference/api/ottervoice-core/#mockaudioinputoptions). | [packages/core/src/providers/mock-runtime.ts:185](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock-runtime.ts#L185) |
| <a id="output"></a> `output?` | [`MockAudioOutputOptions`](/docs/en/reference/api/ottervoice-core/#mockaudiooutputoptions) | Speaker mock options. See [MockAudioOutputOptions](/docs/en/reference/api/ottervoice-core/#mockaudiooutputoptions). | [packages/core/src/providers/mock-runtime.ts:187](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock-runtime.ts#L187) |

***

### MockTTSOptions

Defined in: [packages/core/src/providers/mock.ts:189](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock.ts#L189)

Options for [createMockTTS](/docs/en/reference/api/ottervoice-core/#createmocktts).
Use when tests need a TTS adapter that returns synthetic audio bytes.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="durationmsperchar"></a> `durationMsPerChar?` | `number` | Estimated playback duration in ms; defaults to 60ms per character. | [packages/core/src/providers/mock.ts:191](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock.ts#L191) |
| <a id="failwith-4"></a> `failWith?` | [`NormalizedVoiceError`](/docs/en/reference/api/ottervoice-core/#normalizedvoiceerror) | When set, `synthesize` rejects with this error. | [packages/core/src/providers/mock.ts:193](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock.ts#L193) |

***

### NetworkAdapter

Defined in: [packages/core/src/types.ts:889](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L889)

Platform HTTP / WebSocket hooks used by providers that need them.

#### Methods

##### createWebSocket()

```ts
createWebSocket(url, protocols?): RuntimeWebSocket;
```

Defined in: [packages/core/src/types.ts:903](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L903)

Open a WebSocket for streaming providers.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `url` | `string` | WebSocket URL. |
| `protocols?` | `string` \| `string`[] | Optional subprotocol(s). |

###### Returns

[`RuntimeWebSocket`](/docs/en/reference/api/ottervoice-core/#runtimewebsocket)

##### fetch()

```ts
fetch(input, init?): Promise<Response>;
```

Defined in: [packages/core/src/types.ts:896](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L896)

Fetch implementation (browser `fetch`, undici, etc.).

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `input` | `RequestInfo` \| `URL` | Request URL or `RequestInfo`. |
| `init?` | `RequestInit` | Optional fetch init. |

###### Returns

`Promise`\<`Response`\>

***

### NormalizedVoiceError

Defined in: [packages/core/src/types.ts:69](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L69)

Vendor-neutral error shape used by session events, providers, and [VoiceError](/docs/en/reference/api/ottervoice-core/#voiceerror).
Construct via [createVoiceError](/docs/en/reference/api/ottervoice-core/#createvoiceerror) when possible so `retryable` defaults apply.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="code-1"></a> `code` | [`VoiceErrorCode`](/docs/en/reference/api/ottervoice-core/#voiceerrorcode-1) | Stable application error code. | [packages/core/src/types.ts:71](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L71) |
| <a id="message-1"></a> `message` | `string` | Human-readable message suitable for logs (not always UI-safe). | [packages/core/src/types.ts:73](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L73) |
| <a id="provider-2"></a> `provider?` | `string` | Provider name when the failure originated in an adapter. | [packages/core/src/types.ts:75](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L75) |
| <a id="raw-5"></a> `raw?` | `unknown` | Original thrown value or HTTP body, when available. | [packages/core/src/types.ts:79](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L79) |
| <a id="retryable-2"></a> `retryable?` | `boolean` | Hint for UI retry; not enforced by the session. | [packages/core/src/types.ts:77](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L77) |

***

### PcmAudioStreamOptions

Defined in: [packages/core/src/types.ts:763](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L763)

Options for [AudioOutputAdapter.startPcmStream](/docs/en/reference/api/ottervoice-core/#startpcmstream).

#### Extended by

- [`ExpoPcmChunkFileInput`](/docs/en/reference/api/ottervoice-runtime-react-native/#expopcmchunkfileinput)

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="channels-4"></a> `channels` | `number` | Channel count of subsequent `write` payloads. | [packages/core/src/types.ts:769](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L769) |
| <a id="encoding-4"></a> `encoding` | `"pcm_s16le"` | Always linear 16-bit PCM for incremental streams. | [packages/core/src/types.ts:765](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L765) |
| <a id="samplerate-4"></a> `sampleRate` | `number` | Sample rate of subsequent `write` payloads in Hz. | [packages/core/src/types.ts:767](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L767) |
| <a id="volume-1"></a> `volume?` | `number` | Playback gain in `[0, 1]`. | [packages/core/src/types.ts:771](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L771) |

***

### PlaybackEchoFilterOptions

Defined in: [packages/core/src/playback-echo-filter.ts:6](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/playback-echo-filter.ts#L6)

Tuning knobs for [PlaybackEchoFilter](/docs/en/reference/api/ottervoice-core/#playbackechofilter).
Use when default delay/warmup margins are too aggressive or too timid for a
given device or speaker layout.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="echomargin"></a> `echoMargin?` | `number` | Multiplier on estimated echo gain before subtracting from mic RMS. Default 1.12. | [packages/core/src/playback-echo-filter.ts:16](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/playback-echo-filter.ts#L16) |
| <a id="framems"></a> `frameMs?` | `number` | Step size (ms) when searching for playback↔mic delay alignment. Default 50. | [packages/core/src/playback-echo-filter.ts:8](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/playback-echo-filter.ts#L8) |
| <a id="historyms"></a> `historyMs?` | `number` | How long (ms) of mic/output samples to retain for correlation. Default 1200. | [packages/core/src/playback-echo-filter.ts:12](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/playback-echo-filter.ts#L12) |
| <a id="maxdelayms"></a> `maxDelayMs?` | `number` | Maximum acoustic delay (ms) to consider when correlating echo. Default 300. | [packages/core/src/playback-echo-filter.ts:10](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/playback-echo-filter.ts#L10) |
| <a id="noisefloor"></a> `noiseFloor?` | `number` | Absolute RMS floor subtracted after echo estimate (avoids digital noise trips). Default 0.003. | [packages/core/src/playback-echo-filter.ts:18](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/playback-echo-filter.ts#L18) |
| <a id="warmupms"></a> `warmupMs?` | `number` | Suppress barge-in for this many ms after playback reference begins. Default 350. | [packages/core/src/playback-echo-filter.ts:14](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/playback-echo-filter.ts#L14) |

***

### PronunciationInput

Defined in: [packages/core/src/types.ts:600](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L600)

Input for optional pronunciation / speaking assessment providers.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="audio-1"></a> `audio?` | `string` \| `ArrayBuffer` | Raw audio bytes or a remote URL the provider can fetch. | [packages/core/src/types.ts:602](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L602) |
| <a id="durationms-2"></a> `durationMs?` | `number` | Spoken duration in milliseconds when known. | [packages/core/src/types.ts:610](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L610) |
| <a id="language-1"></a> `language?` | `string` | BCP-47 language for scoring models. | [packages/core/src/types.ts:608](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L608) |
| <a id="metadata-4"></a> `metadata?` | `Record`\<`string`, `unknown`\> | Opaque adapter metadata. | [packages/core/src/types.ts:614](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L614) |
| <a id="referencetext"></a> `referenceText?` | `string` | Expected reference sentence when scoring against a prompt. | [packages/core/src/types.ts:606](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L606) |
| <a id="transcript"></a> `transcript` | `string` | Recognized or user-submitted spoken text. | [packages/core/src/types.ts:604](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L604) |
| <a id="words-1"></a> `words?` | [`ASRWord`](/docs/en/reference/api/ottervoice-core/#asrword)[] | Optional word timings from ASR to align scoring. | [packages/core/src/types.ts:612](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L612) |

***

### PronunciationProvider

Defined in: [packages/core/src/types.ts:643](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L643)

Optional adapter for scoring user pronunciation after a turn.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="name-4"></a> `name` | `string` | Stable provider id used in errors and usage. | [packages/core/src/types.ts:645](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L645) |

#### Methods

##### assess()

```ts
assess(input): Promise<PronunciationResult>;
```

Defined in: [packages/core/src/types.ts:652](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L652)

Score a spoken utterance.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `input` | [`PronunciationInput`](/docs/en/reference/api/ottervoice-core/#pronunciationinput) | Audio and/or transcript to assess. |

###### Returns

`Promise`\<[`PronunciationResult`](/docs/en/reference/api/ottervoice-core/#pronunciationresult)\>

Normalized [PronunciationResult](/docs/en/reference/api/ottervoice-core/#pronunciationresult).

***

### PronunciationResult

Defined in: [packages/core/src/types.ts:618](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L618)

Normalized scores from a [PronunciationProvider](/docs/en/reference/api/ottervoice-core/#pronunciationprovider).

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="accuracy"></a> `accuracy?` | `number` | Pronunciation accuracy component. | [packages/core/src/types.ts:622](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L622) |
| <a id="completeness"></a> `completeness?` | `number` | Completeness vs reference text. | [packages/core/src/types.ts:626](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L626) |
| <a id="fluency"></a> `fluency?` | `number` | Fluency / pacing component. | [packages/core/src/types.ts:624](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L624) |
| <a id="overall"></a> `overall?` | `number` | Overall 0–100 (or provider scale) score when available. | [packages/core/src/types.ts:620](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L620) |
| <a id="prosody"></a> `prosody?` | `number` | Prosody / intonation component. | [packages/core/src/types.ts:628](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L628) |
| <a id="raw-6"></a> `raw?` | `unknown` | Original upstream payload for debugging. | [packages/core/src/types.ts:639](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L639) |
| <a id="words-2"></a> `words?` | \{ `errorType?`: `string`; `score?`: `number`; `text`: `string`; \}[] | Per-word diagnostics when the provider returns them. | [packages/core/src/types.ts:630](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L630) |

***

### ProviderProfile

Defined in: [packages/core/src/provider-router.ts:23](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L23)

Provider-id recipe for one product mode. String values are registry keys
resolved by [ProviderRegistry](/docs/en/reference/api/ottervoice-core/#providerregistry) into concrete adapters — never vendor SDK imports.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="asr"></a> `asr` | `string` | Registered ASR provider id. | [packages/core/src/provider-router.ts:27](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L27) |
| <a id="llmconversation"></a> `llmConversation` | `string` | Registered LLM used for conversational turns. | [packages/core/src/provider-router.ts:29](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L29) |
| <a id="llmscoring"></a> `llmScoring?` | `string` | Optional LLM used for scoring / reports; defaults to conversation LLM. | [packages/core/src/provider-router.ts:31](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L31) |
| <a id="name-5"></a> `name` | `string` | Stable profile id (usually matches a [ProviderProfileName](/docs/en/reference/api/ottervoice-core/#providerprofilename-1)). | [packages/core/src/provider-router.ts:25](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L25) |
| <a id="pronunciation"></a> `pronunciation?` | `string` | Optional pronunciation / assessment provider id. | [packages/core/src/provider-router.ts:35](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L35) |
| <a id="tts"></a> `tts?` | `string` | Optional TTS provider id for the classic pipeline. | [packages/core/src/provider-router.ts:33](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L33) |

***

### ProviderRoutingContext

Defined in: [packages/core/src/provider-router.ts:97](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L97)

Inputs for [resolveProfile](/docs/en/reference/api/ottervoice-core/#resolveprofile).
Prefer setting [ProviderRoutingContext.region](/docs/en/reference/api/ottervoice-core/#region) and
[ProviderRoutingContext.plan](/docs/en/reference/api/ottervoice-core/#plan); latency/cost are forward-compatible knobs.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="costpreference"></a> `costPreference?` | `"low"` \| `"balanced"` \| `"quality"` | Prefer lower cost when a future policy uses it. | [packages/core/src/provider-router.ts:107](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L107) |
| <a id="feature"></a> `feature?` | [`ProviderFeature`](/docs/en/reference/api/ottervoice-core/#providerfeature) | Feature being selected (optional; ignored by the default policy). | [packages/core/src/provider-router.ts:103](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L103) |
| <a id="latencypreference"></a> `latencyPreference?` | `"low"` \| `"balanced"` \| `"quality"` | Prefer lower latency when a future policy uses it. | [packages/core/src/provider-router.ts:105](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L105) |
| <a id="plan"></a> `plan?` | [`ProviderPlan`](/docs/en/reference/api/ottervoice-core/#providerplan) | Subscription tier. | [packages/core/src/provider-router.ts:101](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L101) |
| <a id="region"></a> `region?` | [`ProviderRegion`](/docs/en/reference/api/ottervoice-core/#providerregion) | User / deployment region. | [packages/core/src/provider-router.ts:99](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L99) |

***

### RegisteredProviders

Defined in: [packages/core/src/provider-router.ts:123](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L123)

Initial map of provider ids → instances for the [ProviderRegistry](/docs/en/reference/api/ottervoice-core/#providerregistry)
constructor. Keys must match those used in [ProviderProfile](/docs/en/reference/api/ottervoice-core/#providerprofile).

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="asr-1"></a> `asr?` | `Record`\<`string`, [`ASRProvider`](/docs/en/reference/api/ottervoice-core/#asrprovider)\> | ASR adapters keyed by profile `asr` id. | [packages/core/src/provider-router.ts:125](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L125) |
| <a id="llm"></a> `llm?` | `Record`\<`string`, [`LLMProvider`](/docs/en/reference/api/ottervoice-core/#llmprovider)\> | LLM adapters keyed by conversation / scoring ids. | [packages/core/src/provider-router.ts:127](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L127) |
| <a id="pronunciation-1"></a> `pronunciation?` | `Record`\<`string`, [`PronunciationProvider`](/docs/en/reference/api/ottervoice-core/#pronunciationprovider)\> | Pronunciation adapters keyed by profile `pronunciation` id. | [packages/core/src/provider-router.ts:131](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L131) |
| <a id="tts-1"></a> `tts?` | `Record`\<`string`, [`TTSProvider`](/docs/en/reference/api/ottervoice-core/#ttsprovider)\> | TTS adapters keyed by profile `tts` id. | [packages/core/src/provider-router.ts:129](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L129) |

***

### ResolvedProviders

Defined in: [packages/core/src/provider-router.ts:138](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L138)

Concrete provider bundle produced by [ProviderRegistry.resolve](/docs/en/reference/api/ottervoice-core/#resolve).
Ready to pass into a import('./session').VoiceSession config.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="asr-2"></a> `asr` | [`ASRProvider`](/docs/en/reference/api/ottervoice-core/#asrprovider) | Live ASR for the classic pipeline. | [packages/core/src/provider-router.ts:140](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L140) |
| <a id="llm-1"></a> `llm` | [`LLMProvider`](/docs/en/reference/api/ottervoice-core/#llmprovider) | Conversational text LLM. | [packages/core/src/provider-router.ts:142](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L142) |
| <a id="llmscoring-1"></a> `llmScoring` | [`LLMProvider`](/docs/en/reference/api/ottervoice-core/#llmprovider) | LLM used for scoring / reports (may alias [ResolvedProviders.llm](/docs/en/reference/api/ottervoice-core/#llm-1)). | [packages/core/src/provider-router.ts:144](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L144) |
| <a id="pronunciation-2"></a> `pronunciation?` | [`PronunciationProvider`](/docs/en/reference/api/ottervoice-core/#pronunciationprovider) | Optional pronunciation assessor. | [packages/core/src/provider-router.ts:148](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L148) |
| <a id="tts-2"></a> `tts?` | [`TTSProvider`](/docs/en/reference/api/ottervoice-core/#ttsprovider) | Optional TTS when synthesizing speech separately. | [packages/core/src/provider-router.ts:146](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L146) |

***

### RuntimeAdapter

Defined in: [packages/core/src/types.ts:941](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L941)

Platform boundary: microphone + playback (+ optional network/storage/logger).
Created by `@ottervoice/runtime-web`, `runtime-react-native`, `runtime-node`,
or [createMockRuntime](/docs/en/reference/api/ottervoice-core/#createmockruntime).

#### Extended by

- [`MockRuntime`](/docs/en/reference/api/ottervoice-core/#mockruntime)
- [`WebRuntime`](/docs/en/reference/api/ottervoice-runtime-web/#webruntime)
- [`ExpoRuntime`](/docs/en/reference/api/ottervoice-runtime-react-native/#exporuntime)
- [`NodeRuntime`](/docs/en/reference/api/ottervoice-runtime-node/#noderuntime)

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="audioinput-1"></a> `audioInput` | [`AudioInputAdapter`](/docs/en/reference/api/ottervoice-core/#audioinputadapter) | Microphone / capture side. | [packages/core/src/types.ts:943](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L943) |
| <a id="audiooutput-1"></a> `audioOutput` | [`AudioOutputAdapter`](/docs/en/reference/api/ottervoice-core/#audiooutputadapter) | Speaker / playback side. | [packages/core/src/types.ts:945](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L945) |
| <a id="logger-1"></a> `logger?` | [`LoggerAdapter`](/docs/en/reference/api/ottervoice-core/#loggeradapter) | Optional logger; core uses it sparingly. | [packages/core/src/types.ts:951](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L951) |
| <a id="network-1"></a> `network?` | [`NetworkAdapter`](/docs/en/reference/api/ottervoice-core/#networkadapter) | Optional HTTP/WebSocket hooks for providers. | [packages/core/src/types.ts:947](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L947) |
| <a id="storage-1"></a> `storage?` | [`RuntimeStorageAdapter`](/docs/en/reference/api/ottervoice-core/#runtimestorageadapter) | Optional persistence for caches. | [packages/core/src/types.ts:949](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L949) |

***

### RuntimeStorageAdapter

Defined in: [packages/core/src/types.ts:907](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L907)

Optional key/value store for adapter caches (not required by core).

#### Methods

##### get()

```ts
get(key): Promise<string | null>;
```

Defined in: [packages/core/src/types.ts:912](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L912)

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | `string` | Storage key. |

###### Returns

`Promise`\<`string` \| `null`\>

Stored string or `null` when missing.

##### remove()

```ts
remove(key): Promise<void>;
```

Defined in: [packages/core/src/types.ts:921](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L921)

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | `string` | Storage key to delete. |

###### Returns

`Promise`\<`void`\>

##### set()

```ts
set(key, value): Promise<void>;
```

Defined in: [packages/core/src/types.ts:917](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L917)

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | `string` | Storage key. |
| `value` | `string` | Value to persist. |

###### Returns

`Promise`\<`void`\>

***

### RuntimeWebSocket

Defined in: [packages/core/src/types.ts:848](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L848)

Minimal WebSocket surface returned by [NetworkAdapter.createWebSocket](/docs/en/reference/api/ottervoice-core/#createwebsocket).
Keeps providers free of DOM/`ws` type coupling; subscribe via the `on*` helpers.

#### Methods

##### close()

```ts
close(code?, reason?): void;
```

Defined in: [packages/core/src/types.ts:861](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L861)

Close the socket.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `code?` | `number` | Optional WebSocket close code. |
| `reason?` | `string` | Optional human-readable reason. |

###### Returns

`void`

##### onClose()

```ts
onClose(cb): () => void;
```

Defined in: [packages/core/src/types.ts:885](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L885)

Subscribe to close.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `cb` | () => `void` |

###### Returns

Unsubscribe function.

() => `void`

##### onError()

```ts
onError(cb): () => void;
```

Defined in: [packages/core/src/types.ts:879](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L879)

Subscribe to socket-level errors.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `cb` | (`error`) => `void` |

###### Returns

Unsubscribe function.

() => `void`

##### onMessage()

```ts
onMessage(cb): () => void;
```

Defined in: [packages/core/src/types.ts:873](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L873)

Subscribe to inbound frames.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `cb` | (`data`) => `void` |

###### Returns

Unsubscribe function.

() => `void`

##### onOpen()

```ts
onOpen(cb): () => void;
```

Defined in: [packages/core/src/types.ts:867](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L867)

Subscribe to the open event.

###### Parameters

| Parameter | Type |
| ------ | ------ |
| `cb` | () => `void` |

###### Returns

Unsubscribe function.

() => `void`

##### send()

```ts
send(data): void;
```

Defined in: [packages/core/src/types.ts:854](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L854)

Send a text or binary frame.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `data` | `string` \| `ArrayBuffer` | UTF-8 text or binary payload. |

###### Returns

`void`

***

### TTSCapabilities

Defined in: [packages/core/src/types.ts:531](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L531)

Declared voices / formats for a [TTSProvider](/docs/en/reference/api/ottervoice-core/#ttsprovider).

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="formats"></a> `formats` | [`TTSFormat`](/docs/en/reference/api/ottervoice-core/#ttsformat)[] | Output formats the adapter can produce. | [packages/core/src/types.ts:537](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L537) |
| <a id="languages-1"></a> `languages` | `string`[] | BCP-47 language tags supported for synthesis. | [packages/core/src/types.ts:539](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L539) |
| <a id="streaming-1"></a> `streaming` | `boolean` | Whether the provider can stream partial audio (future use). | [packages/core/src/types.ts:533](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L533) |
| <a id="voices"></a> `voices` | [`TTSVoice`](/docs/en/reference/api/ottervoice-core/#ttsvoice)[] | Voices advertised by the adapter. | [packages/core/src/types.ts:535](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L535) |

***

### TTSInput

Defined in: [packages/core/src/types.ts:543](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L543)

Input for [TTSProvider.synthesize](/docs/en/reference/api/ottervoice-core/#synthesize).

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="cachekey"></a> `cacheKey?` | `string` | Optional cache key for adapters that memoize synthesis. | [packages/core/src/types.ts:557](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L557) |
| <a id="format-1"></a> `format?` | [`TTSFormat`](/docs/en/reference/api/ottervoice-core/#ttsformat) | Preferred output container / codec. | [packages/core/src/types.ts:555](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L555) |
| <a id="language-2"></a> `language?` | `string` | Preferred language for multilingual voices. | [packages/core/src/types.ts:549](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L549) |
| <a id="metadata-5"></a> `metadata?` | `Record`\<`string`, `unknown`\> | Opaque metadata forwarded to the adapter. | [packages/core/src/types.ts:559](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L559) |
| <a id="pitch"></a> `pitch?` | `number` | Pitch adjustment (provider-specific scale). | [packages/core/src/types.ts:553](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L553) |
| <a id="speed"></a> `speed?` | `number` | Speaking rate multiplier (provider-specific scale). | [packages/core/src/types.ts:551](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L551) |
| <a id="text-6"></a> `text` | `string` | Text to speak. | [packages/core/src/types.ts:545](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L545) |
| <a id="voice"></a> `voice?` | `string` | Provider voice id / name. | [packages/core/src/types.ts:547](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L547) |

***

### TTSOutput

Defined in: [packages/core/src/types.ts:563](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L563)

Audio returned by [TTSProvider.synthesize](/docs/en/reference/api/ottervoice-core/#synthesize).

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="audiobuffer-2"></a> `audioBuffer?` | `ArrayBuffer` | In-memory audio bytes (preferred for local playback). | [packages/core/src/types.ts:567](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L567) |
| <a id="audiourl-2"></a> `audioUrl?` | `string` | Remote or blob URL for playback when buffering is inconvenient. | [packages/core/src/types.ts:565](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L565) |
| <a id="cached"></a> `cached?` | `boolean` | True when served from an adapter cache. | [packages/core/src/types.ts:573](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L573) |
| <a id="durationms-3"></a> `durationMs?` | `number` | Estimated duration when known. | [packages/core/src/types.ts:571](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L571) |
| <a id="mimetype-2"></a> `mimeType` | `string` | MIME type of `audioUrl` / `audioBuffer`. | [packages/core/src/types.ts:569](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L569) |
| <a id="raw-7"></a> `raw?` | `unknown` | Raw provider payload for debugging. | [packages/core/src/types.ts:575](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L575) |

***

### TTSProvider

Defined in: [packages/core/src/types.ts:582](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L582)

Text-to-speech adapter for the classic `asr_llm_tts` pipeline.
Required when [VoiceSessionConfig.pipeline](/docs/en/reference/api/ottervoice-core/#pipeline) is `asr_llm_tts`.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="capabilities-1"></a> `capabilities` | [`TTSCapabilities`](/docs/en/reference/api/ottervoice-core/#ttscapabilities) | Declared voices and formats. | [packages/core/src/types.ts:586](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L586) |
| <a id="name-6"></a> `name` | `string` | Stable provider id used in errors and usage. | [packages/core/src/types.ts:584](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L584) |

#### Methods

##### synthesize()

```ts
synthesize(input): Promise<TTSOutput>;
```

Defined in: [packages/core/src/types.ts:592](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L592)

Synthesize speech for the given text.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `input` | [`TTSInput`](/docs/en/reference/api/ottervoice-core/#ttsinput) | Text plus optional voice / format hints. |

###### Returns

`Promise`\<[`TTSOutput`](/docs/en/reference/api/ottervoice-core/#ttsoutput)\>

***

### TTSVoice

Defined in: [packages/core/src/types.ts:517](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L517)

A synthesizable voice advertised by a [TTSProvider](/docs/en/reference/api/ottervoice-core/#ttsprovider).

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="gender"></a> `gender?` | `"male"` \| `"female"` \| `"neutral"` | Optional gender metadata for filtering. | [packages/core/src/types.ts:525](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L525) |
| <a id="id-1"></a> `id` | `string` | Stable voice id passed to [TTSInput.voice](/docs/en/reference/api/ottervoice-core/#voice). | [packages/core/src/types.ts:519](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L519) |
| <a id="language-3"></a> `language` | `string` | Primary BCP-47 language for this voice. | [packages/core/src/types.ts:523](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L523) |
| <a id="name-7"></a> `name` | `string` | Human-readable display name for UI pickers. | [packages/core/src/types.ts:521](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L521) |
| <a id="style"></a> `style?` | `string`[] | Optional style tags (e.g. `cheerful`, `news`). | [packages/core/src/types.ts:527](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L527) |

***

### TurnDetectionConfig

Defined in: [packages/core/src/types.ts:1027](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L1027)

Voice-activity and endpointing knobs while listening for the user.
Passed via [VoiceSessionConfig.turnDetection](/docs/en/reference/api/ottervoice-core/#turndetection); pair with
[VoiceSessionConfig.interruptionDetection](/docs/en/reference/api/ottervoice-core/#interruptiondetection) for barge-in thresholds.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="maxturnms"></a> `maxTurnMs?` | `number` | Hard cap on a single user turn length. | [packages/core/src/types.ts:1035](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L1035) |
| <a id="minspeechms"></a> `minSpeechMs?` | `number` | Minimum voiced time before speech is considered started. | [packages/core/src/types.ts:1031](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L1031) |
| <a id="silencetimeoutms"></a> `silenceTimeoutMs?` | `number` | Quiet time after speech before the turn is closed. | [packages/core/src/types.ts:1033](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L1033) |
| <a id="strategy"></a> `strategy` | [`TurnDetectionStrategy`](/docs/en/reference/api/ottervoice-core/#turndetectionstrategy) | How end-of-utterance is decided. | [packages/core/src/types.ts:1029](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L1029) |
| <a id="volumethreshold-1"></a> `volumeThreshold?` | `number` | RMS threshold when using volume-based strategies (≈0–1). | [packages/core/src/types.ts:1037](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L1037) |

***

### VoiceAgentPlugin

Defined in: [packages/core/src/types.ts:982](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L982)

Optional higher-level dialog controller (opening line, next line, finish rule).
When set, the session may call these instead of / in addition to a raw LLM.

#### Methods

##### generateNextAssistantMessage()

```ts
generateNextAssistantMessage(input): Promise<string>;
```

Defined in: [packages/core/src/types.ts:990](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L990)

Produce the next assistant line after a completed user turn.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `input` | [`AgentTurnInput`](/docs/en/reference/api/ottervoice-core/#agentturninput) | Full history plus the latest user text. |

###### Returns

`Promise`\<`string`\>

##### generateReport()?

```ts
optional generateReport(input): Promise<unknown>;
```

Defined in: [packages/core/src/types.ts:1002](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L1002)

Optional end-of-session artifact (scores, summary, etc.).

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `input` | [`AgentSessionInput`](/docs/en/reference/api/ottervoice-core/#agentsessioninput) | Full turn history. |

###### Returns

`Promise`\<`unknown`\>

##### getInitialAssistantMessage()

```ts
getInitialAssistantMessage(): Promise<string>;
```

Defined in: [packages/core/src/types.ts:984](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L984)

Spoken (or displayed) opening line after [VoiceSession.start](/docs/en/reference/api/ottervoice-core/#start-2).

###### Returns

`Promise`\<`string`\>

##### shouldFinishSession()

```ts
shouldFinishSession(input): boolean;
```

Defined in: [packages/core/src/types.ts:996](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L996)

Return `true` to end the session after the latest turn.

###### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `input` | [`AgentSessionInput`](/docs/en/reference/api/ottervoice-core/#agentsessioninput) | Full turn history. |

###### Returns

`boolean`

***

### VoiceSessionConfig

Defined in: [packages/core/src/types.ts:1085](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L1085)

Top-level configuration for [createVoiceSession](/docs/en/reference/api/ottervoice-core/#createvoicesession) / [VoiceSession](/docs/en/reference/api/ottervoice-core/#voicesession).
Create at the application composition root; keep provider credentials out of UI code.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="agent"></a> `agent?` | [`VoiceAgentPlugin`](/docs/en/reference/api/ottervoice-core/#voiceagentplugin) | Optional higher-level dialog plugin (opening line, next line, finish rule). | [packages/core/src/types.ts:1129](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L1129) |
| <a id="asrpartial"></a> `asrPartial?` | `boolean` | Emit provisional `asr_partial` results. Defaults to true. Disabling this does not affect the authoritative `asr_final` transcript. | [packages/core/src/types.ts:1096](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L1096) |
| <a id="audiollmmaxtokens"></a> `audioLlmMaxTokens?` | `number` | Cap native audio LLM output tokens (audio + transcript share this budget). Omit to use the model's default maximum — required for long-form speech. | [packages/core/src/types.ts:1103](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L1103) |
| <a id="audiollmstarttiming"></a> `audioLlmStartTiming?` | `"after_audio"` \| `"after_asr_final"` | Choose when an Audio LLM request begins. `after_audio` starts as soon as VAD finalizes the user audio and runs caption ASR in parallel for the lowest response latency. `after_asr_final` waits for the authoritative caption first, avoiding provider spend when a natural pause is superseded. Defaults to `after_asr_final`. | [packages/core/src/types.ts:1111](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L1111) |
| <a id="audiollmsystemprompt"></a> `audioLlmSystemPrompt?` | `string` | Optional system instruction forwarded to a native audio LLM. | [packages/core/src/types.ts:1098](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L1098) |
| <a id="generateid"></a> `generateId?` | () => `string` | Override id generation (useful for deterministic tests). | [packages/core/src/types.ts:1141](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L1141) |
| <a id="interruptiondetection"></a> `interruptionDetection?` | `Partial`\<`Omit`\<[`TurnDetectionConfig`](/docs/en/reference/api/ottervoice-core/#turndetectionconfig), `"strategy"`\>\> | Stricter VAD used only while assistant audio is playing. Keeping this separate prevents taps and playback echo from triggering barge-in without making normal listening less sensitive. | [packages/core/src/types.ts:1137](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L1137) |
| <a id="language-4"></a> `language?` | `string` | Preferred ASR language; omit to let compatible providers auto-detect. | [packages/core/src/types.ts:1113](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L1113) |
| <a id="metadata-6"></a> `metadata?` | `Record`\<`string`, `unknown`\> | Opaque app metadata (not interpreted by core). | [packages/core/src/types.ts:1145](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L1145) |
| <a id="mode"></a> `mode` | [`VoiceSessionMode`](/docs/en/reference/api/ottervoice-core/#voicesessionmode) | Duplex / PTT mode. See [VoiceSessionMode](/docs/en/reference/api/ottervoice-core/#voicesessionmode). | [packages/core/src/types.ts:1089](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L1089) |
| <a id="now"></a> `now?` | () => `number` | Override the clock (useful for deterministic tests). | [packages/core/src/types.ts:1143](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L1143) |
| <a id="pipeline"></a> `pipeline?` | `"asr_llm_tts"` \| `"audio_llm"` | Defaults to the classic ASR -\> LLM -\> TTS cascade. | [packages/core/src/types.ts:1091](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L1091) |
| <a id="policy"></a> `policy?` | [`VoiceSessionPolicy`](/docs/en/reference/api/ottervoice-core/#voicesessionpolicy) | Session-level timers and barge-in recovery knobs. | [packages/core/src/types.ts:1139](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L1139) |
| <a id="providers"></a> `providers` | \{ `asr`: [`ASRProvider`](/docs/en/reference/api/ottervoice-core/#asrprovider); `audioLlm?`: [`AudioLLMProvider`](/docs/en/reference/api/ottervoice-core/#audiollmprovider); `llm`: [`LLMProvider`](/docs/en/reference/api/ottervoice-core/#llmprovider); `pronunciation?`: [`PronunciationProvider`](/docs/en/reference/api/ottervoice-core/#pronunciationprovider); `tts?`: [`TTSProvider`](/docs/en/reference/api/ottervoice-core/#ttsprovider); \} | - | [packages/core/src/types.ts:1116](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L1116) |
| `providers.asr` | [`ASRProvider`](/docs/en/reference/api/ottervoice-core/#asrprovider) | Speech-to-text provider (required for live captions / classic pipeline). | [packages/core/src/types.ts:1118](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L1118) |
| `providers.audioLlm?` | [`AudioLLMProvider`](/docs/en/reference/api/ottervoice-core/#audiollmprovider) | Required when `pipeline` is `audio_llm`; ASR supplies captions while request timing follows [VoiceSessionConfig.audioLlmStartTiming](/docs/en/reference/api/ottervoice-core/#audiollmstarttiming). | [packages/core/src/types.ts:1124](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L1124) |
| `providers.llm` | [`LLMProvider`](/docs/en/reference/api/ottervoice-core/#llmprovider) | Text LLM used by `asr_llm_tts` (and optional agents). | [packages/core/src/types.ts:1120](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L1120) |
| `providers.pronunciation?` | [`PronunciationProvider`](/docs/en/reference/api/ottervoice-core/#pronunciationprovider) | Optional pronunciation scoring after a user turn. | [packages/core/src/types.ts:1126](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L1126) |
| `providers.tts?` | [`TTSProvider`](/docs/en/reference/api/ottervoice-core/#ttsprovider) | Text-to-speech; required when `pipeline` is `asr_llm_tts`. | [packages/core/src/types.ts:1122](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L1122) |
| <a id="runtime"></a> `runtime` | [`RuntimeAdapter`](/docs/en/reference/api/ottervoice-core/#runtimeadapter) | Platform audio (and optional network/storage/logger) adapter. | [packages/core/src/types.ts:1115](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L1115) |
| <a id="turndetection"></a> `turnDetection?` | [`TurnDetectionConfig`](/docs/en/reference/api/ottervoice-core/#turndetectionconfig) | VAD / endpointing while listening for the user. | [packages/core/src/types.ts:1131](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L1131) |

***

### VoiceSessionPolicy

Defined in: [packages/core/src/types.ts:1058](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L1058)

Session-level timers and barge-in recovery knobs.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="allowinterruption"></a> `allowInterruption?` | `boolean` | Allow barge-in while the assistant is speaking. | [packages/core/src/types.ts:1068](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L1068) |
| <a id="autostartlistening"></a> `autoStartListening?` | `boolean` | After `start()`, automatically enter listening. Defaults to true. | [packages/core/src/types.ts:1066](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L1066) |
| <a id="falseinterruptionsilencems"></a> `falseInterruptionSilenceMs?` | `number` | Silence after a tentative pause before playback is resumed as a false interruption. | [packages/core/src/types.ts:1070](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L1070) |
| <a id="falseinterruptiontimeoutms"></a> `falseInterruptionTimeoutMs?` | `number` | Maximum time to keep playback tentatively paused without confirming speech. | [packages/core/src/types.ts:1072](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L1072) |
| <a id="interruptioncooldownms"></a> `interruptionCooldownMs?` | `number` | Ignore new barge-in candidates shortly after resuming a false interruption. | [packages/core/src/types.ts:1076](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L1076) |
| <a id="interruptiontailignorems"></a> `interruptionTailIgnoreMs?` | `number` | Ignore microphone energy right after a tentative pause while speaker echo decays. Defaults to 200 ms. | [packages/core/src/types.ts:1074](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L1074) |
| <a id="maxsessiondurationms"></a> `maxSessionDurationMs?` | `number` | Force-finish the session after this wall-clock duration. | [packages/core/src/types.ts:1064](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L1064) |
| <a id="maxturndurationms"></a> `maxTurnDurationMs?` | `number` | Hard cap on one user turn. | [packages/core/src/types.ts:1062](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L1062) |
| <a id="postplaybackvadrearmms"></a> `postPlaybackVadRearmMs?` | `number` | Maximum time to wait for a quiet microphone baseline after assistant playback. Defaults to 300 ms. | [packages/core/src/types.ts:1078](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L1078) |
| <a id="silencetimeoutms-1"></a> `silenceTimeoutMs?` | `number` | Quiet time that ends a listening turn when no other detector wins. | [packages/core/src/types.ts:1060](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L1060) |

***

### VoiceTurn

Defined in: [packages/core/src/types.ts:93](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L93)

One conversation turn recorded by the session / [TranscriptBuffer](/docs/en/reference/api/ottervoice-core/#transcriptbuffer).
Emitted on `turn` / `turn_end` events and available via transcript APIs.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="audiourl-3"></a> `audioUrl?` | `string` | Optional local or remote playback URL when recorded. | [packages/core/src/types.ts:101](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L101) |
| <a id="durationms-4"></a> `durationMs?` | `number` | Convenience duration (`endedAt - startedAt`) when known. | [packages/core/src/types.ts:107](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L107) |
| <a id="endedat-1"></a> `endedAt?` | `number` | Epoch millis when the turn ended. | [packages/core/src/types.ts:105](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L105) |
| <a id="id-2"></a> `id` | `string` | Stable turn id shared with streaming events. | [packages/core/src/types.ts:95](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L95) |
| <a id="metadata-7"></a> `metadata?` | `Record`\<`string`, `unknown`\> | Opaque app metadata attached to the turn. | [packages/core/src/types.ts:109](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L109) |
| <a id="role-2"></a> `role` | [`TurnRole`](/docs/en/reference/api/ottervoice-core/#turnrole) | Who spoke this turn. | [packages/core/src/types.ts:97](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L97) |
| <a id="startedat-1"></a> `startedAt` | `number` | Epoch millis when the turn started. | [packages/core/src/types.ts:103](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L103) |
| <a id="text-7"></a> `text` | `string` | Final transcript or assistant text for the turn. | [packages/core/src/types.ts:99](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L99) |

***

### VoiceUsageSnapshot

Defined in: [packages/core/src/types.ts:116](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L116)

Cumulative usage counters for a live [VoiceSession](/docs/en/reference/api/ottervoice-core/#voicesession).
Emitted periodically / on finish for cost and latency dashboards.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="asraudioms"></a> `asrAudioMs` | `number` | Audio milliseconds forwarded to ASR. | [packages/core/src/types.ts:124](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L124) |
| <a id="assistantspeechchars"></a> `assistantSpeechChars` | `number` | Assistant spoken character count (approx). | [packages/core/src/types.ts:122](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L122) |
| <a id="llminputtokens"></a> `llmInputTokens?` | `number` | Accumulated LLM prompt tokens when providers report usage. | [packages/core/src/types.ts:128](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L128) |
| <a id="llmoutputtokens"></a> `llmOutputTokens?` | `number` | Accumulated LLM completion tokens when providers report usage. | [packages/core/src/types.ts:130](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L130) |
| <a id="providercosts"></a> `providerCosts?` | `Record`\<`string`, `number`\> | Optional per-provider cost estimates in billable units. | [packages/core/src/types.ts:132](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L132) |
| <a id="sessiondurationms"></a> `sessionDurationMs` | `number` | Wall time since [VoiceSession.start](/docs/en/reference/api/ottervoice-core/#start-2). | [packages/core/src/types.ts:118](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L118) |
| <a id="ttschars"></a> `ttsChars` | `number` | Characters sent to TTS. | [packages/core/src/types.ts:126](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L126) |
| <a id="userspeechms"></a> `userSpeechMs` | `number` | Accumulated user speech duration when runtimes report chunk durations. | [packages/core/src/types.ts:120](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L120) |

## Type Aliases

### AudioEncoding

```ts
type AudioEncoding = "pcm_s16le" | "opus" | "webm" | "wav" | "mp3";
```

Defined in: [packages/core/src/types.ts:212](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L212)

Wire encoding of audio bytes sent to ASR / Audio LLM adapters.
Runtimes stamp this on [AudioChunk](/docs/en/reference/api/ottervoice-core/#audiochunk); providers may narrow further.

***

### AudioLLMInputFormat

```ts
type AudioLLMInputFormat = "webm" | "wav" | "mp3" | "opus";
```

Defined in: [packages/core/src/types.ts:439](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L439)

Container / codec accepted by [AudioLLMGenerateInput.format](/docs/en/reference/api/ottervoice-core/#format).
WebM/Opus often need a runtime `prepareAudio` step before OpenAI-style APIs.

***

### ProviderFeature

```ts
type ProviderFeature = "conversation" | "transcription" | "scoring" | "pronunciation";
```

Defined in: [packages/core/src/provider-router.ts:86](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L86)

Feature being routed (reserved for finer policy; [resolveProfile](/docs/en/reference/api/ottervoice-core/#resolveprofile)
currently keys primarily on region / plan).

***

### ProviderPlan

```ts
type ProviderPlan = "free" | "basic" | "pro";
```

Defined in: [packages/core/src/provider-router.ts:81](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L81)

Commercial plan hint for [resolveProfile](/docs/en/reference/api/ottervoice-core/#resolveprofile).

***

### ProviderProfileName

```ts
type ProviderProfileName = "global_budget" | "global_pro" | "china_fallback" | "developer_test";
```

Defined in: [packages/core/src/provider-router.ts:13](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L13)

Built-in named stacks in [providerProfiles](/docs/en/reference/api/ottervoice-core/#providerprofiles).
Pass to [ProviderRegistry.resolve](/docs/en/reference/api/ottervoice-core/#resolve) or [resolveProfile](/docs/en/reference/api/ottervoice-core/#resolveprofile).

***

### ProviderRegion

```ts
type ProviderRegion = "global" | "china" | "unknown";
```

Defined in: [packages/core/src/provider-router.ts:79](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L79)

Deployment region hint for [resolveProfile](/docs/en/reference/api/ottervoice-core/#resolveprofile).

***

### TTSFormat

```ts
type TTSFormat = "mp3" | "wav" | "ogg" | "opus" | "pcm";
```

Defined in: [packages/core/src/types.ts:514](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L514)

Output audio container requested from a [TTSProvider](/docs/en/reference/api/ottervoice-core/#ttsprovider).
Passed via [TTSInput.format](/docs/en/reference/api/ottervoice-core/#format-1) and listed in [TTSCapabilities.formats](/docs/en/reference/api/ottervoice-core/#formats).

***

### TurnDetectionStrategy

```ts
type TurnDetectionStrategy = "volume" | "asr_endpointing" | "manual" | "hybrid";
```

Defined in: [packages/core/src/types.ts:1016](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L1016)

How end-of-utterance is decided while listening:
- `volume` — local RMS VAD ([TurnDetectionConfig.volumeThreshold](/docs/en/reference/api/ottervoice-core/#volumethreshold-1))
- `asr_endpointing` — trust provider utterance-end signals
- `manual` — caller drives [VoiceSession.endUserTurn](/docs/en/reference/api/ottervoice-core/#enduserturn)
- `hybrid` — combine ASR speech confirmation / endpointing with local silence

***

### TurnDetectorEvent

```ts
type TurnDetectorEvent = "speech_start" | "speech_end" | "max_turn";
```

Defined in: [packages/core/src/turn-detector.ts:39](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/turn-detector.ts#L39)

Boundary event returned by [TurnDetector.pushVolume](/docs/en/reference/api/ottervoice-core/#pushvolume) when a threshold
is crossed (`undefined` when the sample does not change state).

***

### TurnRole

```ts
type TurnRole = "user" | "assistant" | "system";
```

Defined in: [packages/core/src/types.ts:87](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L87)

Speaker role for a [VoiceTurn](/docs/en/reference/api/ottervoice-core/#voiceturn) in the transcript.

***

### VoiceErrorCode

```ts
type VoiceErrorCode = 
  | "permission_denied"
  | "microphone_unavailable"
  | "network_error"
  | "asr_connection_failed"
  | "asr_timeout"
  | "llm_failed"
  | "tts_failed"
  | "audio_playback_failed"
  | "provider_rate_limited"
  | "provider_quota_exceeded"
  | "unsupported_runtime"
  | "invalid_state"
  | "aborted"
  | "unknown";
```

Defined in: [packages/core/src/types.ts:49](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L49)

Stable application error codes for voice sessions and providers.
Prefer these over free-form strings when building [NormalizedVoiceError](/docs/en/reference/api/ottervoice-core/#normalizedvoiceerror)
or [createVoiceError](/docs/en/reference/api/ottervoice-core/#createvoiceerror).

***

### VoiceSessionEventMap

```ts
type VoiceSessionEventMap = {
  asr_final: {
     confidence?: number;
     durationMs?: number;
     text: string;
     turnId: string;
  };
  asr_partial: {
     confidence?: number;
     text: string;
     turnId: string;
  };
  assistant_audio_end: {
     turnId: string;
  };
  assistant_audio_start: {
     turnId: string;
  };
  assistant_text: {
     text: string;
     turnId: string;
  };
  assistant_text_delta: {
     delta: string;
     text: string;
     turnId: string;
  };
  error: NormalizedVoiceError;
  finished: {
     turns: VoiceTurn[];
  };
  statechange: {
     from: VoiceSessionState;
     reason?: string;
     to: VoiceSessionState;
  };
  turn: {
     turn: VoiceTurn;
  };
  usage: VoiceUsageSnapshot;
  user_audio_end: {
     at: number;
     turnId: string;
  };
};
```

Defined in: [packages/core/src/types.ts:143](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L143)

Strongly typed event payloads for [VoiceSession](/docs/en/reference/api/ottervoice-core/#voicesession).
Subscribe with `session.on('eventName', handler)`.

#### Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="asr_final"></a> `asr_final` | \{ `confidence?`: `number`; `durationMs?`: `number`; `text`: `string`; `turnId`: `string`; \} | Authoritative user transcript for the turn. | [packages/core/src/types.ts:158](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L158) |
| `asr_final.confidence?` | `number` | - | [packages/core/src/types.ts:161](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L161) |
| `asr_final.durationMs?` | `number` | - | [packages/core/src/types.ts:162](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L162) |
| `asr_final.text` | `string` | - | [packages/core/src/types.ts:159](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L159) |
| `asr_final.turnId` | `string` | - | [packages/core/src/types.ts:160](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L160) |
| <a id="asr_partial"></a> `asr_partial` | \{ `confidence?`: `number`; `text`: `string`; `turnId`: `string`; \} | Provisional ASR caption; upsert by `turnId`. | [packages/core/src/types.ts:151](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L151) |
| `asr_partial.confidence?` | `number` | - | [packages/core/src/types.ts:155](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L155) |
| `asr_partial.text` | `string` | Accumulated provisional transcript. | [packages/core/src/types.ts:153](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L153) |
| `asr_partial.turnId` | `string` | - | [packages/core/src/types.ts:154](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L154) |
| <a id="assistant_audio_end"></a> `assistant_audio_end` | \{ `turnId`: `string`; \} | Assistant audio playback ended (completed or interrupted). | [packages/core/src/types.ts:187](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L187) |
| `assistant_audio_end.turnId` | `string` | - | [packages/core/src/types.ts:188](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L188) |
| <a id="assistant_audio_start"></a> `assistant_audio_start` | \{ `turnId`: `string`; \} | Assistant audio playback began for this turn. | [packages/core/src/types.ts:183](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L183) |
| `assistant_audio_start.turnId` | `string` | - | [packages/core/src/types.ts:184](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L184) |
| <a id="assistant_text"></a> `assistant_text` | \{ `text`: `string`; `turnId`: `string`; \} | Final assistant text for the turn (may normalize streaming text). | [packages/core/src/types.ts:170](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L170) |
| `assistant_text.text` | `string` | - | [packages/core/src/types.ts:171](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L171) |
| `assistant_text.turnId` | `string` | - | [packages/core/src/types.ts:172](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L172) |
| <a id="assistant_text_delta"></a> `assistant_text_delta` | \{ `delta`: `string`; `text`: `string`; `turnId`: `string`; \} | Incremental assistant transcript emitted before `assistant_text`. | [packages/core/src/types.ts:175](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L175) |
| `assistant_text_delta.delta` | `string` | Newly received text fragment. | [packages/core/src/types.ts:177](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L177) |
| `assistant_text_delta.text` | `string` | Complete assistant text accumulated for this turn so far. | [packages/core/src/types.ts:179](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L179) |
| `assistant_text_delta.turnId` | `string` | - | [packages/core/src/types.ts:180](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L180) |
| <a id="error-2"></a> `error` | [`NormalizedVoiceError`](/docs/en/reference/api/ottervoice-core/#normalizedvoiceerror) | Normalized failure; see [NormalizedVoiceError](/docs/en/reference/api/ottervoice-core/#normalizedvoiceerror). | [packages/core/src/types.ts:201](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L201) |
| <a id="finished"></a> `finished` | \{ `turns`: [`VoiceTurn`](/docs/en/reference/api/ottervoice-core/#voiceturn)[]; \} | Session completed gracefully; turns are the full history. | [packages/core/src/types.ts:197](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L197) |
| `finished.turns` | [`VoiceTurn`](/docs/en/reference/api/ottervoice-core/#voiceturn)[] | - | [packages/core/src/types.ts:198](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L198) |
| <a id="statechange"></a> `statechange` | \{ `from`: [`VoiceSessionState`](/docs/en/reference/api/ottervoice-core/#voicesessionstate-1); `reason?`: `string`; `to`: [`VoiceSessionState`](/docs/en/reference/api/ottervoice-core/#voicesessionstate-1); \} | FSM transition with optional reason string. | [packages/core/src/types.ts:145](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L145) |
| `statechange.from` | [`VoiceSessionState`](/docs/en/reference/api/ottervoice-core/#voicesessionstate-1) | - | [packages/core/src/types.ts:146](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L146) |
| `statechange.reason?` | `string` | - | [packages/core/src/types.ts:148](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L148) |
| `statechange.to` | [`VoiceSessionState`](/docs/en/reference/api/ottervoice-core/#voicesessionstate-1) | - | [packages/core/src/types.ts:147](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L147) |
| <a id="turn"></a> `turn` | \{ `turn`: [`VoiceTurn`](/docs/en/reference/api/ottervoice-core/#voiceturn); \} | A committed [VoiceTurn](/docs/en/reference/api/ottervoice-core/#voiceturn) was added to history. | [packages/core/src/types.ts:191](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L191) |
| `turn.turn` | [`VoiceTurn`](/docs/en/reference/api/ottervoice-core/#voiceturn) | - | [packages/core/src/types.ts:192](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L192) |
| <a id="usage-4"></a> `usage` | [`VoiceUsageSnapshot`](/docs/en/reference/api/ottervoice-core/#voiceusagesnapshot) | Latest usage meters. | [packages/core/src/types.ts:195](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L195) |
| <a id="user_audio_end"></a> `user_audio_end` | \{ `at`: `number`; `turnId`: `string`; \} | VAD/manual boundary used as the response-latency start point. | [packages/core/src/types.ts:165](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L165) |
| `user_audio_end.at` | `number` | - | [packages/core/src/types.ts:167](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L167) |
| `user_audio_end.turnId` | `string` | - | [packages/core/src/types.ts:166](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L166) |

***

### VoiceSessionMode

```ts
type VoiceSessionMode = "half_duplex" | "full_duplex" | "push_to_talk" | "streaming_transcript";
```

Defined in: [packages/core/src/types.ts:1051](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L1051)

Conversation duplex mode:
- `half_duplex` — listen only after assistant playback finishes
- `full_duplex` — keep listening (and allow barge-in) while speaking
- `push_to_talk` — caller drives [VoiceSession.endUserTurn](/docs/en/reference/api/ottervoice-core/#enduserturn)
- `streaming_transcript` — captions without the full reply loop

***

### VoiceSessionState

```ts
type VoiceSessionState = 
  | "idle"
  | "starting"
  | "assistant_speaking"
  | "listening"
  | "user_speaking"
  | "processing"
  | "scoring"
  | "paused"
  | "finished"
  | "error";
```

Defined in: [packages/core/src/types.ts:18](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/types.ts#L18)

Finite-state machine states for [VoiceSession](/docs/en/reference/api/ottervoice-core/#voicesession).
Subscribe via the `statechange` event on [VoiceSessionEventMap](/docs/en/reference/api/ottervoice-core/#voicesessioneventmap).

## Variables

### DEFAULT\_TURN\_DETECTION

```ts
const DEFAULT_TURN_DETECTION: Required<TurnDetectionConfig>;
```

Defined in: [packages/core/src/turn-detector.ts:7](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/turn-detector.ts#L7)

Default [TurnDetectionConfig](/docs/en/reference/api/ottervoice-core/#turndetectionconfig) values used by [resolveTurnDetection](/docs/en/reference/api/ottervoice-core/#resolveturndetection)
and [TurnDetector](/docs/en/reference/api/ottervoice-core/#turndetector) when the session omits knobs.

***

### providerProfiles

```ts
const providerProfiles: {
  china_fallback: {
     asr: string;
     llmConversation: string;
     llmScoring: string;
     name: string;
     pronunciation: string;
     tts: string;
  };
  developer_test: {
     asr: string;
     llmConversation: string;
     llmScoring: string;
     name: string;
     pronunciation: string;
     tts: string;
  };
  global_budget: {
     asr: string;
     llmConversation: string;
     llmScoring: string;
     name: string;
     pronunciation: string;
     tts: string;
  };
  global_pro: {
     asr: string;
     llmConversation: string;
     llmScoring: string;
     name: string;
     pronunciation: string;
     tts: string;
  };
};
```

Defined in: [packages/core/src/provider-router.ts:43](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L43)

Built-in profiles. The string values are *provider ids* that a
[ProviderRegistry](/docs/en/reference/api/ottervoice-core/#providerregistry) resolves into concrete provider instances — the
router never imports a vendor SDK itself.

#### Type Declaration

| Name | Type | Default value | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-china_fallback"></a> `china_fallback` | \{ `asr`: `string`; `llmConversation`: `string`; `llmScoring`: `string`; `name`: `string`; `pronunciation`: `string`; `tts`: `string`; \} | - | [packages/core/src/provider-router.ts:60](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L60) |
| `china_fallback.asr` | `string` | `'xfyun_streaming'` | [packages/core/src/provider-router.ts:62](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L62) |
| `china_fallback.llmConversation` | `string` | `'deepseek_or_qwen'` | [packages/core/src/provider-router.ts:63](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L63) |
| `china_fallback.llmScoring` | `string` | `'deepseek_or_qwen'` | [packages/core/src/provider-router.ts:64](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L64) |
| `china_fallback.name` | `string` | `'china_fallback'` | [packages/core/src/provider-router.ts:61](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L61) |
| `china_fallback.pronunciation` | `string` | `'xfyun_or_approximation'` | [packages/core/src/provider-router.ts:66](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L66) |
| `china_fallback.tts` | `string` | `'xfyun_tts'` | [packages/core/src/provider-router.ts:65](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L65) |
| <a id="property-developer_test"></a> `developer_test` | \{ `asr`: `string`; `llmConversation`: `string`; `llmScoring`: `string`; `name`: `string`; `pronunciation`: `string`; `tts`: `string`; \} | - | [packages/core/src/provider-router.ts:68](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L68) |
| `developer_test.asr` | `string` | `'mock_asr'` | [packages/core/src/provider-router.ts:70](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L70) |
| `developer_test.llmConversation` | `string` | `'mock_llm'` | [packages/core/src/provider-router.ts:71](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L71) |
| `developer_test.llmScoring` | `string` | `'mock_llm'` | [packages/core/src/provider-router.ts:72](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L72) |
| `developer_test.name` | `string` | `'developer_test'` | [packages/core/src/provider-router.ts:69](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L69) |
| `developer_test.pronunciation` | `string` | `'mock_pronunciation'` | [packages/core/src/provider-router.ts:74](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L74) |
| `developer_test.tts` | `string` | `'mock_tts'` | [packages/core/src/provider-router.ts:73](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L73) |
| <a id="property-global_budget"></a> `global_budget` | \{ `asr`: `string`; `llmConversation`: `string`; `llmScoring`: `string`; `name`: `string`; `pronunciation`: `string`; `tts`: `string`; \} | - | [packages/core/src/provider-router.ts:44](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L44) |
| `global_budget.asr` | `string` | `'elevenlabs_scribe_realtime'` | [packages/core/src/provider-router.ts:46](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L46) |
| `global_budget.llmConversation` | `string` | `'openrouter_gemini_flash_lite'` | [packages/core/src/provider-router.ts:47](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L47) |
| `global_budget.llmScoring` | `string` | `'openrouter_gemini_flash'` | [packages/core/src/provider-router.ts:48](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L48) |
| `global_budget.name` | `string` | `'global_budget'` | [packages/core/src/provider-router.ts:45](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L45) |
| `global_budget.pronunciation` | `string` | `'approximation'` | [packages/core/src/provider-router.ts:50](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L50) |
| `global_budget.tts` | `string` | `'azure_neural_tts'` | [packages/core/src/provider-router.ts:49](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L49) |
| <a id="property-global_pro"></a> `global_pro` | \{ `asr`: `string`; `llmConversation`: `string`; `llmScoring`: `string`; `name`: `string`; `pronunciation`: `string`; `tts`: `string`; \} | - | [packages/core/src/provider-router.ts:52](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L52) |
| `global_pro.asr` | `string` | `'deepgram_nova_streaming'` | [packages/core/src/provider-router.ts:54](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L54) |
| `global_pro.llmConversation` | `string` | `'openrouter_gemini_flash'` | [packages/core/src/provider-router.ts:55](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L55) |
| `global_pro.llmScoring` | `string` | `'openai_or_claude'` | [packages/core/src/provider-router.ts:56](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L56) |
| `global_pro.name` | `string` | `'global_pro'` | [packages/core/src/provider-router.ts:53](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L53) |
| `global_pro.pronunciation` | `string` | `'azure_pronunciation'` | [packages/core/src/provider-router.ts:58](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L58) |
| `global_pro.tts` | `string` | `'elevenlabs_flash'` | [packages/core/src/provider-router.ts:57](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L57) |

## Functions

### canTransition()

```ts
function canTransition(from, to): boolean;
```

Defined in: [packages/core/src/state-machine.ts:65](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/state-machine.ts#L65)

Whether a direct transition from `from` → `to` is allowed by the session FSM.
Same-state transitions always return `false`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `from` | [`VoiceSessionState`](/docs/en/reference/api/ottervoice-core/#voicesessionstate-1) | Current state. |
| `to` | [`VoiceSessionState`](/docs/en/reference/api/ottervoice-core/#voicesessionstate-1) | Desired next state. |

#### Returns

`boolean`

***

### createIdGenerator()

```ts
function createIdGenerator(prefix?): () => string;
```

Defined in: [packages/core/src/internal/ids.ts:5](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/internal/ids.ts#L5)

Default monotonic-ish id generator. Avoids a crypto dependency so the core
stays runtime-agnostic; sessions may inject their own via config.

#### Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `prefix` | `string` | `'id'` |

#### Returns

() => `string`

***

### createMockASR()

```ts
function createMockASR(options): ASRProvider;
```

Defined in: [packages/core/src/providers/mock.ts:42](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock.ts#L42)

Deterministic ASR for tests and the developer profile. Each `sendAudio`
advances through `transcripts`; partial + final callbacks fire synchronously.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | [`MockASROptions`](/docs/en/reference/api/ottervoice-core/#mockasroptions) | Scripted transcripts and failure overrides. See [MockASROptions](/docs/en/reference/api/ottervoice-core/#mockasroptions). |

#### Returns

[`ASRProvider`](/docs/en/reference/api/ottervoice-core/#asrprovider)

An [ASRProvider](/docs/en/reference/api/ottervoice-core/#asrprovider) with name `mock_asr`.

***

### createMockLLM()

```ts
function createMockLLM(options?): LLMProvider;
```

Defined in: [packages/core/src/providers/mock.ts:141](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock.ts#L141)

Deterministic [LLMProvider](/docs/en/reference/api/ottervoice-core/#llmprovider) for tests and the developer profile.
`generate` returns a full string; `stream` yields word-sized text deltas.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | [`MockLLMOptions`](/docs/en/reference/api/ottervoice-core/#mockllmoptions) | Reply, usage, and failure overrides. See [MockLLMOptions](/docs/en/reference/api/ottervoice-core/#mockllmoptions). |

#### Returns

[`LLMProvider`](/docs/en/reference/api/ottervoice-core/#llmprovider)

An [LLMProvider](/docs/en/reference/api/ottervoice-core/#llmprovider) with name `mock_llm`.

***

### createMockPronunciation()

```ts
function createMockPronunciation(options?): PronunciationProvider;
```

Defined in: [packages/core/src/providers/mock.ts:254](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock.ts#L254)

Deterministic [PronunciationProvider](/docs/en/reference/api/ottervoice-core/#pronunciationprovider) for tests and demos.
Splits the transcript into words and assigns [MockPronunciationOptions.score](/docs/en/reference/api/ottervoice-core/#score)
to each dimension.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | [`MockPronunciationOptions`](/docs/en/reference/api/ottervoice-core/#mockpronunciationoptions) | Score and failure overrides. See [MockPronunciationOptions](/docs/en/reference/api/ottervoice-core/#mockpronunciationoptions). |

#### Returns

[`PronunciationProvider`](/docs/en/reference/api/ottervoice-core/#pronunciationprovider)

A [PronunciationProvider](/docs/en/reference/api/ottervoice-core/#pronunciationprovider) with name `mock_pronunciation`.

***

### createMockRuntime()

```ts
function createMockRuntime(options?): MockRuntime;
```

Defined in: [packages/core/src/providers/mock-runtime.ts:207](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock-runtime.ts#L207)

Assemble a fully in-memory [RuntimeAdapter](/docs/en/reference/api/ottervoice-core/#runtimeadapter) for tests and Node demos.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | [`MockRuntimeOptions`](/docs/en/reference/api/ottervoice-core/#mockruntimeoptions) | Optional input/output mock knobs. See [MockRuntimeOptions](/docs/en/reference/api/ottervoice-core/#mockruntimeoptions). |

#### Returns

[`MockRuntime`](/docs/en/reference/api/ottervoice-core/#mockruntime)

A [MockRuntime](/docs/en/reference/api/ottervoice-core/#mockruntime) with [MockAudioInput](/docs/en/reference/api/ottervoice-core/#mockaudioinput) and [MockAudioOutput](/docs/en/reference/api/ottervoice-core/#mockaudiooutput).

***

### createMockTTS()

```ts
function createMockTTS(options?): TTSProvider;
```

Defined in: [packages/core/src/providers/mock.ts:204](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/providers/mock.ts#L204)

Deterministic [TTSProvider](/docs/en/reference/api/ottervoice-core/#ttsprovider) for tests and demos.
Encodes the input text as UTF-8 bytes and reports a duration from
[MockTTSOptions.durationMsPerChar](/docs/en/reference/api/ottervoice-core/#durationmsperchar).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | [`MockTTSOptions`](/docs/en/reference/api/ottervoice-core/#mockttsoptions) | Duration and failure overrides. See [MockTTSOptions](/docs/en/reference/api/ottervoice-core/#mockttsoptions). |

#### Returns

[`TTSProvider`](/docs/en/reference/api/ottervoice-core/#ttsprovider)

A [TTSProvider](/docs/en/reference/api/ottervoice-core/#ttsprovider) with name `mock_tts`.

***

### createVoiceError()

```ts
function createVoiceError(
   code, 
   message, 
   options?): NormalizedVoiceError;
```

Defined in: [packages/core/src/errors.ts:74](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/errors.ts#L74)

Build a [NormalizedVoiceError](/docs/en/reference/api/ottervoice-core/#normalizedvoiceerror) with sensible `retryable` defaults.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `code` | [`VoiceErrorCode`](/docs/en/reference/api/ottervoice-core/#voiceerrorcode-1) | Stable [VoiceErrorCode](/docs/en/reference/api/ottervoice-core/#voiceerrorcode-1). |
| `message` | `string` | Human-readable message for logs. |
| `options` | [`CreateVoiceErrorOptions`](/docs/en/reference/api/ottervoice-core/#createvoiceerroroptions) | Optional provider, retryable, and raw. See [CreateVoiceErrorOptions](/docs/en/reference/api/ottervoice-core/#createvoiceerroroptions). |

#### Returns

[`NormalizedVoiceError`](/docs/en/reference/api/ottervoice-core/#normalizedvoiceerror)

A plain [NormalizedVoiceError](/docs/en/reference/api/ottervoice-core/#normalizedvoiceerror) (not a thrown `Error`).

***

### createVoiceSession()

```ts
function createVoiceSession(config): VoiceSession;
```

Defined in: [packages/core/src/session.ts:1703](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/session.ts#L1703)

Create a [VoiceSession](/docs/en/reference/api/ottervoice-core/#voicesession) from a fully wired [VoiceSessionConfig](/docs/en/reference/api/ottervoice-core/#voicesessionconfig).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `config` | [`VoiceSessionConfig`](/docs/en/reference/api/ottervoice-core/#voicesessionconfig) | Runtime adapter, providers, mode/pipeline, VAD, and policy. |

#### Returns

[`VoiceSession`](/docs/en/reference/api/ottervoice-core/#voicesession)

A session that must be [dispose()](/docs/en/reference/api/ottervoice-core/#dispose)d when finished.

***

### defaultNow()

```ts
function defaultNow(): number;
```

Defined in: [packages/core/src/internal/ids.ts:15](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/internal/ids.ts#L15)

Default wall-clock used by sessions when no `now` override is injected.

#### Returns

`number`

***

### isTerminal()

```ts
function isTerminal(state): boolean;
```

Defined in: [packages/core/src/state-machine.ts:54](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/state-machine.ts#L54)

Whether `state` ends the session lifecycle (currently only `finished`).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `state` | [`VoiceSessionState`](/docs/en/reference/api/ottervoice-core/#voicesessionstate-1) | Candidate [VoiceSessionState](/docs/en/reference/api/ottervoice-core/#voicesessionstate-1). |

#### Returns

`boolean`

***

### normalizeError()

```ts
function normalizeError(
   value, 
   fallbackCode?, 
   provider?): NormalizedVoiceError;
```

Defined in: [packages/core/src/errors.ts:129](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/errors.ts#L129)

Coerce an arbitrary thrown value into a [NormalizedVoiceError](/docs/en/reference/api/ottervoice-core/#normalizedvoiceerror).

Used by the session and provider adapters so that every error surfaced to
consumers shares one shape, regardless of where it originated.

#### Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `value` | `unknown` | `undefined` | Unknown thrown/rejected value. |
| `fallbackCode` | [`VoiceErrorCode`](/docs/en/reference/api/ottervoice-core/#voiceerrorcode-1) | `'unknown'` | Code used when `value` has no recognized shape. Defaults to `unknown`. |
| `provider?` | `string` | `undefined` | Optional provider name attached when missing on `value`. |

#### Returns

[`NormalizedVoiceError`](/docs/en/reference/api/ottervoice-core/#normalizedvoiceerror)

A [NormalizedVoiceError](/docs/en/reference/api/ottervoice-core/#normalizedvoiceerror) suitable for session `error` events.

***

### resolveProfile()

```ts
function resolveProfile(ctx?): ProviderProfileName;
```

Defined in: [packages/core/src/provider-router.ts:111](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/provider-router.ts#L111)

Default policy: China routes to the fallback profile, Pro plans to pro.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `ctx` | [`ProviderRoutingContext`](/docs/en/reference/api/ottervoice-core/#providerroutingcontext) |

#### Returns

[`ProviderProfileName`](/docs/en/reference/api/ottervoice-core/#providerprofilename-1)

***

### resolveTurnDetection()

```ts
function resolveTurnDetection(config?): Required<TurnDetectionConfig>;
```

Defined in: [packages/core/src/turn-detector.ts:21](https://github.com/bugkiwi/OtterVoice/blob/38d35fd4265628fb518c48aee7e4049fa48cc69f/packages/core/src/turn-detector.ts#L21)

Merge a partial [TurnDetectionConfig](/docs/en/reference/api/ottervoice-core/#turndetectionconfig) with [DEFAULT\_TURN\_DETECTION](/docs/en/reference/api/ottervoice-core/#default_turn_detection).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `config?` | [`TurnDetectionConfig`](/docs/en/reference/api/ottervoice-core/#turndetectionconfig) | Optional overrides from import('./types').VoiceSessionConfig.turnDetection. |

#### Returns

`Required`\<[`TurnDetectionConfig`](/docs/en/reference/api/ottervoice-core/#turndetectionconfig)\>

A fully populated config object (no missing fields).
