import { describe, expect, it } from 'bun:test';
import { buildDeepgramUrl, decodeDeepgram, DEFAULT_BASE_URL } from '../src/decode';

describe('buildDeepgramUrl', () => {
  it('applies provider options and ASR-session overrides', () => {
    const url = buildDeepgramUrl(
      DEFAULT_BASE_URL,
      {
        model: 'nova-2',
        language: 'en',
        encoding: 'linear16',
        sampleRate: 16000,
        interimResults: true,
        punctuate: true,
        smartFormat: false,
      },
      { language: 'es', sampleRate: 8000 },
    );
    const parsed = new URL(url);
    expect(parsed.searchParams.get('model')).toBe('nova-2');
    expect(parsed.searchParams.get('language')).toBe('es'); // session override wins
    expect(parsed.searchParams.get('sample_rate')).toBe('8000');
    expect(parsed.searchParams.get('encoding')).toBe('linear16');
    expect(parsed.searchParams.get('interim_results')).toBe('true');
    expect(parsed.searchParams.get('punctuate')).toBe('true');
    expect(parsed.searchParams.get('smart_format')).toBe('false');
  });

  it('omits unset parameters', () => {
    const url = buildDeepgramUrl(DEFAULT_BASE_URL, {}, {});
    expect(new URL(url).search).toBe('');
  });
});

describe('decodeDeepgram', () => {
  const results = (transcript: string, is_final: boolean, confidence?: number) =>
    JSON.stringify({
      type: 'Results',
      is_final,
      channel: { alternatives: [{ transcript, ...(confidence !== undefined ? { confidence } : {}) }] },
    });

  it('returns a final with confidence', () => {
    expect(decodeDeepgram(results('hello world', true, 0.97))).toEqual({
      final: { text: 'hello world', confidence: 0.97 },
    });
  });

  it('returns a partial without confidence', () => {
    expect(decodeDeepgram(results('hel', false))).toEqual({ partial: { text: 'hel' } });
  });

  it('skips empty transcripts, non-Results and malformed JSON', () => {
    expect(decodeDeepgram(results('', true))).toBeUndefined();
    expect(decodeDeepgram(JSON.stringify({ type: 'Metadata' }))).toBeUndefined();
    expect(decodeDeepgram('not json')).toBeUndefined();
  });
});
