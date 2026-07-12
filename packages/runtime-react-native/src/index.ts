import type { RuntimeAdapter } from '@ottervoice/core';
import { ExpoAudioInput, type ExpoAudioInputOptions } from './audio-input';
import { ExpoAudioOutput, type ExpoAudioOutputOptions } from './audio-output';

export * from './audio-input';
export * from './audio-output';

export interface ExpoRuntimeOptions {
  input: ExpoAudioInputOptions;
  output: ExpoAudioOutputOptions;
}

export interface ExpoRuntime extends RuntimeAdapter {
  audioInput: ExpoAudioInput;
  audioOutput: ExpoAudioOutput;
}

/**
 * Assemble an Expo {@link RuntimeAdapter}. You inject the Expo `Audio` /
 * `expo-file-system` primitives (so the adapter stays testable and free of a
 * hard Expo dependency). No network adapter is included — providers use the
 * global `fetch`/`WebSocket` available in React Native.
 */
export function createExpoRuntime(options: ExpoRuntimeOptions): ExpoRuntime {
  return {
    audioInput: new ExpoAudioInput(options.input),
    audioOutput: new ExpoAudioOutput(options.output),
  };
}
