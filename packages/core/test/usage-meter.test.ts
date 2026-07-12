import { describe, expect, it } from 'bun:test';
import { UsageMeter } from '../src/usage-meter';

describe('UsageMeter', () => {
  it('reports zero duration before the session starts', () => {
    const m = new UsageMeter(() => 100);
    expect(m.snapshot().sessionDurationMs).toBe(0);
  });

  it('measures duration between explicit start and end', () => {
    let t = 0;
    const m = new UsageMeter(() => t);
    m.startSession();
    t = 5000;
    m.endSession();
    t = 9999;
    expect(m.snapshot().sessionDurationMs).toBe(5000);
  });

  it('uses the live clock when not yet ended', () => {
    let t = 1000;
    const m = new UsageMeter(() => t);
    m.startSession(1000);
    t = 1750;
    expect(m.snapshot().sessionDurationMs).toBe(750);
  });

  it('accepts explicit start/end timestamps', () => {
    const m = new UsageMeter(() => 0);
    m.startSession(10);
    m.endSession(60);
    expect(m.snapshot().sessionDurationMs).toBe(50);
  });

  it('accumulates positive metrics and ignores non-positive', () => {
    const m = new UsageMeter(() => 0);
    m.addUserSpeechMs(100);
    m.addUserSpeechMs(0);
    m.addUserSpeechMs(-5);
    m.addAsrAudioMs(200);
    m.addAsrAudioMs(0);
    m.addAssistantSpeechChars(10);
    m.addAssistantSpeechChars(0);
    m.addTtsChars(20);
    m.addTtsChars(-1);
    const s = m.snapshot();
    expect(s).toMatchObject({
      userSpeechMs: 100,
      asrAudioMs: 200,
      assistantSpeechChars: 10,
      ttsChars: 20,
    });
  });

  it('omits llm tokens until usage is recorded', () => {
    const m = new UsageMeter(() => 0);
    m.addLlmUsage(undefined);
    expect(m.snapshot().llmInputTokens).toBeUndefined();
  });

  it('accumulates partial llm usage', () => {
    const m = new UsageMeter(() => 0);
    m.addLlmUsage({ inputTokens: 3 });
    m.addLlmUsage({ outputTokens: 4 });
    const s = m.snapshot();
    expect(s.llmInputTokens).toBe(3);
    expect(s.llmOutputTokens).toBe(4);
  });

  it('tracks per-provider costs', () => {
    const m = new UsageMeter(() => 0);
    m.addProviderCost('eleven', 0.5);
    m.addProviderCost('eleven', 0.25);
    m.addProviderCost('azure', 1);
    expect(m.snapshot().providerCosts).toEqual({ eleven: 0.75, azure: 1 });
  });

  it('omits providerCosts when none recorded', () => {
    expect(new UsageMeter(() => 0).snapshot().providerCosts).toBeUndefined();
  });
});
