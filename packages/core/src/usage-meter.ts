import type { LLMUsage, VoiceUsageSnapshot } from './types';

/**
 * Accumulates per-session usage. The SDK measures, it does not bill — business
 * code consumes the {@link VoiceUsageSnapshot} to enforce quotas/plans.
 */
export class UsageMeter {
  private sessionStartedAt: number | undefined;
  private sessionEndedAt: number | undefined;
  private userSpeechMs = 0;
  private assistantSpeechChars = 0;
  private asrAudioMs = 0;
  private ttsChars = 0;
  private llmInputTokens = 0;
  private llmOutputTokens = 0;
  private hasLlmUsage = false;
  private providerCosts: Record<string, number> | undefined;

  constructor(private readonly now: () => number) {}

  startSession(at: number = this.now()): void {
    this.sessionStartedAt = at;
  }

  endSession(at: number = this.now()): void {
    this.sessionEndedAt = at;
  }

  addUserSpeechMs(ms: number): void {
    if (ms > 0) this.userSpeechMs += ms;
  }

  addAsrAudioMs(ms: number): void {
    if (ms > 0) this.asrAudioMs += ms;
  }

  addAssistantSpeechChars(chars: number): void {
    if (chars > 0) this.assistantSpeechChars += chars;
  }

  addTtsChars(chars: number): void {
    if (chars > 0) this.ttsChars += chars;
  }

  addLlmUsage(usage: LLMUsage | undefined): void {
    if (!usage) return;
    if (usage.inputTokens !== undefined) {
      this.llmInputTokens += usage.inputTokens;
      this.hasLlmUsage = true;
    }
    if (usage.outputTokens !== undefined) {
      this.llmOutputTokens += usage.outputTokens;
      this.hasLlmUsage = true;
    }
  }

  addProviderCost(provider: string, cost: number): void {
    if (!this.providerCosts) this.providerCosts = {};
    this.providerCosts[provider] = (this.providerCosts[provider] ?? 0) + cost;
  }

  private sessionDurationMs(): number {
    if (this.sessionStartedAt === undefined) return 0;
    const end = this.sessionEndedAt ?? this.now();
    return Math.max(0, end - this.sessionStartedAt);
  }

  snapshot(): VoiceUsageSnapshot {
    const snap: VoiceUsageSnapshot = {
      sessionDurationMs: this.sessionDurationMs(),
      userSpeechMs: this.userSpeechMs,
      assistantSpeechChars: this.assistantSpeechChars,
      asrAudioMs: this.asrAudioMs,
      ttsChars: this.ttsChars,
    };
    if (this.hasLlmUsage) {
      snap.llmInputTokens = this.llmInputTokens;
      snap.llmOutputTokens = this.llmOutputTokens;
    }
    if (this.providerCosts) snap.providerCosts = { ...this.providerCosts };
    return snap;
  }
}
