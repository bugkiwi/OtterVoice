import { describe, expect, it } from 'bun:test';
import { languageFromLocales } from './i18n';

describe('languageFromLocales', () => {
  it('uses Chinese for an iOS Chinese locale', () => {
    expect(languageFromLocales([{ languageCode: 'zh', languageTag: 'zh-Hans-CN' }])).toBe('zh');
  });

  it('falls back to the language tag and defaults other locales to English', () => {
    expect(languageFromLocales([{ languageCode: null, languageTag: 'zh-Hant-TW' }])).toBe('zh');
    expect(languageFromLocales([{ languageCode: 'en', languageTag: 'en-US' }])).toBe('en');
    expect(languageFromLocales([])).toBe('en');
  });
});
