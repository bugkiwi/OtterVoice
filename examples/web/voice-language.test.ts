import { describe, expect, it } from 'bun:test';
import {
  DEMO_VOICE_LANGUAGE_HEADER,
  demoVoiceLanguageFromRequest,
  demoVoiceLanguageHeaders,
  normalizeDemoVoiceLanguage,
} from './voice-language';
import {
  createDemoVoiceSystemPrompt,
  demoSearchOutputInstruction,
} from './voice-prompts';

describe('web demo voice language policy', () => {
  it('allowlists English and defaults every other client value to Chinese', () => {
    expect(normalizeDemoVoiceLanguage('en')).toBe('en');
    expect(normalizeDemoVoiceLanguage(' EN ')).toBe('en');
    expect(normalizeDemoVoiceLanguage('zh')).toBe('zh');
    expect(normalizeDemoVoiceLanguage('fr')).toBe('zh');
    expect(normalizeDemoVoiceLanguage(null)).toBe('zh');
  });

  it('round-trips the client language through the gateway request header', () => {
    const request = new Request('https://example.test/api/voice', {
      headers: demoVoiceLanguageHeaders('en'),
    });

    expect(request.headers.get(DEMO_VOICE_LANGUAGE_HEADER)).toBe('en');
    expect(demoVoiceLanguageFromRequest(request)).toBe('en');
  });

  it('keeps English and Chinese system/search instructions in their selected language', () => {
    const zh = createDemoVoiceSystemPrompt('zh', '2026-07-30');
    const en = createDemoVoiceSystemPrompt('en', '2026-07-30');

    expect(zh).toContain('当前界面语言是中文');
    expect(demoSearchOutputInstruction('zh')).toContain('最终回答');
    expect(en).toContain('interface language is English');
    expect(en).not.toMatch(/[\u3400-\u9fff]/u);
    expect(demoSearchOutputInstruction('en')).not.toMatch(/[\u3400-\u9fff]/u);
  });
});
