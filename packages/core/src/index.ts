// OtterVoice core — platform-agnostic voice conversation infrastructure.

export * from './types.js';
export * from './errors.js';
export { TypedEmitter } from './emitter.js';
export {
  StateMachine,
  canTransition,
  isTerminal,
} from './state-machine.js';
export { TranscriptBuffer } from './transcript-buffer.js';
export type { AddTurnInput } from './transcript-buffer.js';
export {
  TurnDetector,
  DEFAULT_TURN_DETECTION,
  resolveTurnDetection,
} from './turn-detector.js';
export type { TurnDetectorEvent } from './turn-detector.js';
export { UsageMeter } from './usage-meter.js';
export { BargeInSpeechGate, PlaybackEchoFilter } from './playback-echo-filter.js';
export type {
  BargeInSpeechGateOptions,
  PlaybackEchoFilterOptions,
} from './playback-echo-filter.js';
export {
  ProviderRegistry,
  providerProfiles,
  resolveProfile,
} from './provider-router.js';
export type {
  ProviderProfile,
  ProviderProfileName,
  ProviderRoutingContext,
  ProviderRegion,
  ProviderPlan,
  ProviderFeature,
  RegisteredProviders,
  ResolvedProviders,
} from './provider-router.js';
export { VoiceSession, createVoiceSession } from './session.js';
export { createIdGenerator, defaultNow } from './internal/ids.js';

// Built-in mock providers & runtime (testing + developer profile).
export {
  createMockASR,
  createMockLLM,
  createMockTTS,
  createMockPronunciation,
} from './providers/mock.js';
export type {
  MockASROptions,
  MockLLMOptions,
  MockTTSOptions,
  MockPronunciationOptions,
} from './providers/mock.js';
export {
  MockAudioInput,
  MockAudioOutput,
  createMockRuntime,
} from './providers/mock-runtime.js';
export type {
  MockRuntime,
  MockRuntimeOptions,
  MockAudioInputOptions,
  MockAudioOutputOptions,
} from './providers/mock-runtime.js';
