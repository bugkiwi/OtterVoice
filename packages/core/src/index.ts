// OtterVoice core — platform-agnostic voice conversation infrastructure.

export * from './types';
export * from './errors';
export { TypedEmitter } from './emitter';
export {
  StateMachine,
  canTransition,
  isTerminal,
} from './state-machine';
export { TranscriptBuffer } from './transcript-buffer';
export type { AddTurnInput } from './transcript-buffer';
export {
  TurnDetector,
  DEFAULT_TURN_DETECTION,
  resolveTurnDetection,
} from './turn-detector';
export type { TurnDetectorEvent } from './turn-detector';
export { UsageMeter } from './usage-meter';
export {
  ProviderRegistry,
  providerProfiles,
  resolveProfile,
} from './provider-router';
export type {
  ProviderProfile,
  ProviderProfileName,
  ProviderRoutingContext,
  ProviderRegion,
  ProviderPlan,
  ProviderFeature,
  RegisteredProviders,
  ResolvedProviders,
} from './provider-router';
export { VoiceSession, createVoiceSession } from './session';
export { createIdGenerator, defaultNow } from './internal/ids';

// Built-in mock providers & runtime (testing + developer profile).
export {
  createMockASR,
  createMockLLM,
  createMockTTS,
  createMockPronunciation,
} from './providers/mock';
export type {
  MockASROptions,
  MockLLMOptions,
  MockTTSOptions,
  MockPronunciationOptions,
} from './providers/mock';
export {
  MockAudioInput,
  MockAudioOutput,
  createMockRuntime,
} from './providers/mock-runtime';
export type {
  MockRuntime,
  MockRuntimeOptions,
  MockAudioInputOptions,
  MockAudioOutputOptions,
} from './providers/mock-runtime';
