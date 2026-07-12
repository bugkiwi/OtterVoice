import type { RuntimeAdapter } from '@ottervoice/core';
import {
  WebAudioInput,
  type GetUserMedia,
  type MediaRecorderCtor,
} from './audio-input';
import { WebAudioOutput, type AudioElementLike } from './audio-output';

export * from './audio-input';
export * from './audio-output';

export interface WebRuntimeOptions {
  getUserMedia?: GetUserMedia;
  mediaRecorder?: MediaRecorderCtor;
  createAudio?: () => AudioElementLike;
  createObjectURL?: (blob: Blob) => string;
  revokeObjectURL?: (url: string) => void;
  mimeType?: string;
  timesliceMs?: number;
  now?: () => number;
}

export interface WebRuntime extends RuntimeAdapter {
  audioInput: WebAudioInput;
  audioOutput: WebAudioOutput;
}

/**
 * Assemble a browser {@link RuntimeAdapter}. With no options it reads the
 * standard web globals (`navigator.mediaDevices`, `MediaRecorder`, `Audio`,
 * `URL`); every primitive can be overridden for testing or non-standard hosts.
 *
 * No network adapter is included — providers use the global `fetch`/`WebSocket`
 * directly.
 */
export function createWebRuntime(options: WebRuntimeOptions = {}): WebRuntime {
  const nav = globalThis.navigator as unknown as {
    mediaDevices?: { getUserMedia: GetUserMedia };
  };
  const getUserMedia =
    options.getUserMedia ?? nav?.mediaDevices?.getUserMedia?.bind(nav.mediaDevices);
  const mediaRecorder =
    options.mediaRecorder ??
    (globalThis as unknown as { MediaRecorder?: MediaRecorderCtor }).MediaRecorder;
  const AudioCtor = (globalThis as unknown as { Audio?: new () => AudioElementLike }).Audio;
  const createAudio = options.createAudio ?? (() => new AudioCtor!());
  const url = globalThis.URL as unknown as {
    createObjectURL?: (b: Blob) => string;
    revokeObjectURL?: (u: string) => void;
  };
  const createObjectURL = options.createObjectURL ?? url?.createObjectURL?.bind(url);
  const revokeObjectURL = options.revokeObjectURL ?? url?.revokeObjectURL?.bind(url);

  const inputOptions: ConstructorParameters<typeof WebAudioInput>[0] = {
    getUserMedia: getUserMedia as GetUserMedia,
    mediaRecorder: mediaRecorder as MediaRecorderCtor,
  };
  if (options.mimeType !== undefined) inputOptions.mimeType = options.mimeType;
  if (options.timesliceMs !== undefined) inputOptions.timesliceMs = options.timesliceMs;
  if (options.now !== undefined) inputOptions.now = options.now;

  const outputOptions: ConstructorParameters<typeof WebAudioOutput>[0] = { createAudio };
  if (createObjectURL !== undefined) outputOptions.createObjectURL = createObjectURL;
  if (revokeObjectURL !== undefined) outputOptions.revokeObjectURL = revokeObjectURL;

  return {
    audioInput: new WebAudioInput(inputOptions),
    audioOutput: new WebAudioOutput(outputOptions),
  };
}
