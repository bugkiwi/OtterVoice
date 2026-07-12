import { describe, expect, it } from 'bun:test';
import {
  ProviderRegistry,
  providerProfiles,
  resolveProfile,
} from '../src/provider-router';
import { VoiceError } from '../src/errors';
import {
  createMockASR,
  createMockLLM,
  createMockPronunciation,
  createMockTTS,
} from '../src/providers/mock';

describe('resolveProfile', () => {
  it('routes China to the fallback profile', () => {
    expect(resolveProfile({ region: 'china', plan: 'pro' })).toBe('china_fallback');
  });

  it('routes pro plans to the pro profile', () => {
    expect(resolveProfile({ plan: 'pro' })).toBe('global_pro');
  });

  it('defaults to the budget profile', () => {
    expect(resolveProfile()).toBe('global_budget');
    expect(resolveProfile({ region: 'global', plan: 'free' })).toBe('global_budget');
  });
});

const devProfile = providerProfiles.developer_test;

function fullRegistry(): ProviderRegistry {
  return new ProviderRegistry({
    asr: { [devProfile.asr]: createMockASR({ transcripts: [] }) },
    llm: { [devProfile.llmConversation]: createMockLLM() },
    tts: { [devProfile.tts]: createMockTTS() },
    pronunciation: { [devProfile.pronunciation]: createMockPronunciation() },
  });
}

describe('ProviderRegistry', () => {
  it('exposes built-in profiles', () => {
    expect(providerProfiles.global_budget.asr).toBe('elevenlabs_scribe_realtime');
    expect(new ProviderRegistry().getProfile('global_pro').tts).toBe(
      'elevenlabs_flash',
    );
  });

  it('resolves a profile by name into concrete providers', () => {
    const resolved = fullRegistry().resolve('developer_test');
    expect(resolved.asr.name).toBe('mock_asr');
    expect(resolved.llm.name).toBe('mock_llm');
    expect(resolved.tts?.name).toBe('mock_tts');
    expect(resolved.pronunciation?.name).toBe('mock_pronunciation');
  });

  it('resolves a profile object directly', () => {
    const resolved = fullRegistry().resolve(devProfile);
    expect(resolved.llmScoring.name).toBe('mock_llm');
  });

  it('falls back to the conversation LLM when no scoring LLM is set', () => {
    const reg = new ProviderRegistry()
      .registerASR('a', createMockASR({ transcripts: [] }))
      .registerLLM('l', createMockLLM());
    const resolved = reg.resolve({ name: 'x', asr: 'a', llmConversation: 'l' });
    expect(resolved.llmScoring).toBe(resolved.llm);
    expect(resolved.tts).toBeUndefined();
    expect(resolved.pronunciation).toBeUndefined();
  });

  it('uses a distinct scoring LLM when configured', () => {
    const conv = createMockLLM();
    const score = createMockLLM();
    const reg = new ProviderRegistry()
      .registerASR('a', createMockASR({ transcripts: [] }))
      .registerLLM('conv', conv)
      .registerLLM('score', score);
    const resolved = reg.resolve({
      name: 'x',
      asr: 'a',
      llmConversation: 'conv',
      llmScoring: 'score',
    });
    expect(resolved.llm).toBe(conv);
    expect(resolved.llmScoring).toBe(score);
  });

  it('throws a VoiceError for an unregistered provider id', () => {
    const reg = new ProviderRegistry().registerLLM('l', createMockLLM());
    expect(() => reg.resolve({ name: 'x', asr: 'missing', llmConversation: 'l' })).toThrow(
      VoiceError,
    );
    try {
      reg.resolve({ name: 'x', asr: 'missing', llmConversation: 'l' });
    } catch (e) {
      expect((e as VoiceError).code).toBe('unsupported_runtime');
      expect((e as VoiceError).message).toContain('asr');
    }
  });
});
