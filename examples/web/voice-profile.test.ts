import { describe, expect, it } from 'bun:test';
import { createDemoOpenRouterPolicy, DEMO_VOICE_PROFILE } from './voice-profile';

describe('web demo voice profile', () => {
  it('builds every OpenRouter model and voice from the shared profile', () => {
    const policy = createDemoOpenRouterPolicy('system prompt');

    expect(policy.asr?.model).toBe(DEMO_VOICE_PROFILE.models.asr);
    expect(policy.llm?.model).toBe(DEMO_VOICE_PROFILE.models.cascadeLlm);
    expect(policy.tts?.model).toBe(DEMO_VOICE_PROFILE.models.cascadeTts);
    expect(policy.tts?.voice).toBe(DEMO_VOICE_PROFILE.voices.cascadeTts);
    expect(policy.audioLlm?.model).toBe(DEMO_VOICE_PROFILE.models.openAiAudio);
    expect(policy.audioLlm?.voice).toBe(DEMO_VOICE_PROFILE.voices.openAiAudio);
  });

  it('keeps model ids out of the runtime consumers and static HTML', async () => {
    const consumers = await Promise.all([
      'openrouter-proxy.ts',
      'gemini-live-proxy.ts',
      'src/main.ts',
      'index.html',
      '../../docs/site/voice-proxy.ts',
    ].map((path) => Bun.file(new URL(path, import.meta.url)).text()));

    for (const model of Object.values(DEMO_VOICE_PROFILE.models)) {
      for (const consumer of consumers) expect(consumer).not.toContain(model);
    }
  });
});
