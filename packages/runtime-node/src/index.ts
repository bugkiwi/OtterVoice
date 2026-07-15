import type { RuntimeAdapter } from '@ottervoice/core';
import {
  NodeAudioInput,
  NodeAudioOutput,
  type NodeAudioInputOptions,
  type NodeAudioOutputOptions,
} from './audio.js';
import { NodeNetworkAdapter, type NodeNetworkOptions } from './network.js';
import { ConsoleLogger, type ConsoleLike } from './logger.js';

export * from './network.js';
export * from './audio.js';
export * from './logger.js';

/**
 * Optional overrides for {@link createNodeRuntime}.
 * Use when piping a subprocess mic, writing audio to a sink, stubbing
 * `fetch`/`WebSocket`, or redirecting / disabling the console logger.
 */
export interface NodeRuntimeOptions {
  /** Optional overrides for the default in-memory / stdin-style audio input. */
  audioInput?: NodeAudioInputOptions;
  /** Optional overrides for the default console/file audio output. */
  audioOutput?: NodeAudioOutputOptions;
  /** Optional overrides for `fetch` / WebSocket. */
  network?: NodeNetworkOptions;
  /** Provide `false` to omit the logger, or a console to redirect it. */
  logger?: ConsoleLike | false;
}

/**
 * Node.js {@link RuntimeAdapter} returned by {@link createNodeRuntime}.
 * Includes audio adapters plus a {@link NodeNetworkAdapter} for providers
 * that need explicit `fetch` / WebSocket hooks.
 */
export interface NodeRuntime extends RuntimeAdapter {
  /** Byte-source microphone (async iterable or caller-driven). */
  audioInput: NodeAudioInput;
  /** Sink or in-memory playback recorder. */
  audioOutput: NodeAudioOutput;
  /** HTTP / WebSocket adapter for providers. */
  network: NodeNetworkAdapter;
}

/**
 * Assemble a Node.js {@link RuntimeAdapter}.
 *
 * @param options - Optional audio, network, and logger overrides. See {@link NodeRuntimeOptions}.
 */
export function createNodeRuntime(options: NodeRuntimeOptions = {}): NodeRuntime {
  const runtime: NodeRuntime = {
    audioInput: new NodeAudioInput(options.audioInput),
    audioOutput: new NodeAudioOutput(options.audioOutput),
    network: new NodeNetworkAdapter(options.network),
  };
  if (options.logger !== false) {
    runtime.logger = new ConsoleLogger(
      options.logger === undefined ? console : options.logger,
    );
  }
  return runtime;
}
