import type { RuntimeAdapter } from '@ottervoice/core';
import {
  NodeAudioInput,
  NodeAudioOutput,
  type NodeAudioInputOptions,
  type NodeAudioOutputOptions,
} from './audio';
import { NodeNetworkAdapter, type NodeNetworkOptions } from './network';
import { ConsoleLogger, type ConsoleLike } from './logger';

export * from './network';
export * from './audio';
export * from './logger';

export interface NodeRuntimeOptions {
  audioInput?: NodeAudioInputOptions;
  audioOutput?: NodeAudioOutputOptions;
  network?: NodeNetworkOptions;
  /** Provide `false` to omit the logger, or a console to redirect it. */
  logger?: ConsoleLike | false;
}

export interface NodeRuntime extends RuntimeAdapter {
  audioInput: NodeAudioInput;
  audioOutput: NodeAudioOutput;
  network: NodeNetworkAdapter;
}

/** Assemble a Node.js {@link RuntimeAdapter}. */
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
