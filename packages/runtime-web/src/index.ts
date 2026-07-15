import type { RuntimeAdapter } from '@ottervoice/core';
import {
  WebAudioInput,
  type AudioContextCtor,
  type GetUserMedia,
  type MediaRecorderCtor,
} from './audio-input.js';
import {
  WebAudioOutput,
  type AudioElementLike,
  type PcmAudioContextLike,
} from './audio-output.js';
import { measureBrowserAudioEnvelope } from './audio-conversion.js';

export * from './audio-input.js';
export * from './audio-output.js';
export * from './audio-conversion.js';

/**
 * Capture, metering, and playback overrides for {@link createWebRuntime}.
 * Omit fields to use browser globals (`navigator.mediaDevices`, `MediaRecorder`,
 * `Audio`, `URL`, `AudioContext`). Inject stubs in tests or non-standard hosts.
 */
export interface WebRuntimeOptions {
  /** Inject `navigator.mediaDevices.getUserMedia` (defaults to the browser global). */
  getUserMedia?: GetUserMedia;
  /** Inject `MediaRecorder` (defaults to the browser global). */
  mediaRecorder?: MediaRecorderCtor;
  /** Factory for HTMLAudioElement-like playback targets. */
  createAudio?: () => AudioElementLike;
  /** Inject `URL.createObjectURL`. */
  createObjectURL?: (blob: Blob) => string;
  /** Inject `URL.revokeObjectURL`. */
  revokeObjectURL?: (url: string) => void;
  /**
   * MediaRecorder MIME type, e.g. `audio/webm;codecs=opus`.
   * When omitted, the runtime picks a browser-supported Opus/WebM type.
   */
  mimeType?: string;
  /** Encode a chunk every N ms (MediaRecorder timeslice). Default `100`. */
  timesliceMs?: number;
  /** Poll microphone RMS every N ms for VAD / barge-in. Default `50`. */
  volumePollMs?: number;
  /**
   * Encoded audio retained while assistant playback is filtered.
   * Released only after a confirmed barge-in so opening syllables survive. Default `500`.
   */
  bargeInPreRollMs?: number;
  /** Override `AudioContext` used for RMS metering. */
  audioContext?: AudioContextCtor;
  /** Override factory used for PCM streaming playback. */
  createPcmAudioContext?: () => PcmAudioContextLike;
  /** Override clock (tests). */
  now?: () => number;
}

/**
 * Browser {@link RuntimeAdapter} returned by {@link createWebRuntime}.
 * Exposes typed {@link WebAudioInput} / {@link WebAudioOutput}; no network
 * adapter — providers use global `fetch` / `WebSocket`.
 */
export interface WebRuntime extends RuntimeAdapter {
  /** Microphone capture via MediaRecorder + optional RMS metering. */
  audioInput: WebAudioInput;
  /** Encoded and incremental PCM playback. */
  audioOutput: WebAudioOutput;
}

/**
 * Assemble a browser {@link RuntimeAdapter}. With no options it reads the
 * standard web globals (`navigator.mediaDevices`, `MediaRecorder`, `Audio`,
 * `URL`); every primitive can be overridden for testing or non-standard hosts.
 *
 * No network adapter is included — providers use the global `fetch`/`WebSocket`
 * directly.
 *
 * @param options - Capture, metering, and playback overrides. See {@link WebRuntimeOptions}.
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
  if (options.volumePollMs !== undefined) inputOptions.volumePollMs = options.volumePollMs;
  if (options.bargeInPreRollMs !== undefined) {
    inputOptions.bargeInPreRollMs = options.bargeInPreRollMs;
  }
  if (options.audioContext !== undefined) inputOptions.audioContext = options.audioContext;
  if (options.now !== undefined) inputOptions.now = options.now;

  const outputOptions: ConstructorParameters<typeof WebAudioOutput>[0] = { createAudio };
  const audioGlobals = globalThis as unknown as {
    AudioContext?: new () => PcmAudioContextLike;
    webkitAudioContext?: new () => PcmAudioContextLike;
  };
  const PcmAudioContextCtor =
    audioGlobals.AudioContext ?? audioGlobals.webkitAudioContext;
  const hasAudioContext = Boolean(PcmAudioContextCtor);
  if (hasAudioContext) outputOptions.measureAudio = measureBrowserAudioEnvelope;
  const createPcmAudioContext = options.createPcmAudioContext ??
    (PcmAudioContextCtor ? () => new PcmAudioContextCtor() : undefined);
  if (createPcmAudioContext) {
    outputOptions.createPcmAudioContext = createPcmAudioContext;
  }
  if (options.now !== undefined) outputOptions.now = options.now;
  if (createObjectURL !== undefined) outputOptions.createObjectURL = createObjectURL;
  if (revokeObjectURL !== undefined) outputOptions.revokeObjectURL = revokeObjectURL;

  return {
    audioInput: new WebAudioInput(inputOptions),
    audioOutput: new WebAudioOutput(outputOptions),
  };
}
