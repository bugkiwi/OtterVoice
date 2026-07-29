import { describe, expect, it } from 'bun:test';
import { createVoiceProxy } from './voice-proxy';

describe('production voice proxy', () => {
  it('dispatches Google Live routes separately from OpenRouter routes', async () => {
    const calls: string[] = [];
    const proxy = createVoiceProxy({
      openRouter: async (request) => {
        calls.push(`openrouter:${new URL(request.url).pathname}`);
        return new Response('openrouter');
      },
      geminiLive: async (request) => {
        calls.push(`google:${new URL(request.url).pathname}`);
        return new Response('google');
      },
    });

    await proxy(new Request('https://app.test/api/voice/asr/audio/transcriptions'));
    await proxy(new Request('https://app.test/api/voice/asr-llm-tts/chat/completions'));
    await proxy(new Request('https://app.test/api/voice/google/audio-llm/chat/completions'));
    await proxy(new Request('https://app.test/api/voice/google/online/audio-llm/chat/completions'));

    expect(calls).toEqual([
      'openrouter:/api/voice/asr/audio/transcriptions',
      'openrouter:/api/voice/asr-llm-tts/chat/completions',
      'google:/api/voice/google/audio-llm/chat/completions',
      'google:/api/voice/google/online/audio-llm/chat/completions',
    ]);
  });

  it('ships a Vercel function entry for every browser gateway route', async () => {
    const entries = [
      'api/voice/asr/audio/transcriptions.ts',
      'api/voice/audio-llm/chat/completions.ts',
      'api/voice/asr-llm-tts/chat/completions.ts',
      'api/voice/online/asr-llm-tts/chat/completions.ts',
      'api/voice/google/audio-llm/chat/completions.ts',
      'api/voice/google/online/audio-llm/chat/completions.ts',
    ];

    for (const entry of entries) {
      expect(await Bun.file(new URL(entry, import.meta.url)).exists()).toBe(true);
    }
  });
});
