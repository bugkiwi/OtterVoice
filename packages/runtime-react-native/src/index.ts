import type { RuntimeAdapter } from '@ottervoice/core';
import { ExpoAudioInput, type ExpoAudioInputOptions } from './audio-input.js';
import { ExpoAudioOutput, type ExpoAudioOutputOptions } from './audio-output.js';

export * from './audio-input.js';
export * from './audio-output.js';

/**
 * Injected Expo audio bindings for {@link createExpoRuntime}.
 * Pass platform primitives from `expo-audio` / file helpers so the package
 * stays free of a hard Expo dependency and remains testable.
 */
export interface ExpoRuntimeOptions {
  /** Injected PCM capture bindings (Expo AudioStream / file helpers). */
  input: ExpoAudioInputOptions;
  /** Injected playback bindings (AudioPlaylist / PCM stream). */
  output: ExpoAudioOutputOptions;
}

/**
 * Expo / React Native {@link RuntimeAdapter} returned by {@link createExpoRuntime}.
 * No network adapter — providers use global `fetch` / `WebSocket`.
 */
export interface ExpoRuntime extends RuntimeAdapter {
  /** Microphone capture (PCM stream or legacy file recorder). */
  audioInput: ExpoAudioInput;
  /** One-shot and gapless PCM playlist playback. */
  audioOutput: ExpoAudioOutput;
}

/**
 * Assemble an Expo {@link RuntimeAdapter}. You inject the Expo `Audio` /
 * `expo-file-system` primitives (so the adapter stays testable and free of a
 * hard Expo dependency). No network adapter is included — providers use the
 * global `fetch`/`WebSocket` available in React Native.
 *
 * @param options - Injected input/output primitives. See {@link ExpoRuntimeOptions}.
 */
export function createExpoRuntime(options: ExpoRuntimeOptions): ExpoRuntime {
  return {
    audioInput: new ExpoAudioInput(options.input),
    audioOutput: new ExpoAudioOutput(options.output),
  };
}
