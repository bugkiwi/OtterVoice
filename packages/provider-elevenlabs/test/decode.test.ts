import { describe, expect, it } from 'bun:test';
import {
  buildElevenLabsUrl,
  decodeElevenLabs,
  DEFAULT_BASE_URL,
} from '../src/decode';

describe('buildElevenLabsUrl', () => {
  it('sets model and language, preferring the session language', () => {
    const url = buildElevenLabsUrl(
      DEFAULT_BASE_URL,
      { modelId: 'scribe_v1', language: 'en' },
      { language: 'fr' },
    );
    const parsed = new URL(url);
    expect(parsed.searchParams.get('model_id')).toBe('scribe_v1');
    expect(parsed.searchParams.get('language_code')).toBe('fr');
  });

  it('omits unset parameters', () => {
    expect(new URL(buildElevenLabsUrl(DEFAULT_BASE_URL, {}, {})).search).toBe('');
  });
});

describe('decodeElevenLabs', () => {
  it('decodes finals and partials, with confidence', () => {
    expect(decodeElevenLabs(JSON.stringify({ text: 'done', is_final: true, confidence: 0.8 }))).toEqual(
      { final: { text: 'done', confidence: 0.8 } },
    );
    expect(decodeElevenLabs(JSON.stringify({ transcript: 'par' }))).toEqual({
      partial: { text: 'par' },
    });
    expect(decodeElevenLabs(JSON.stringify({ text: 'x', type: 'final' }))).toEqual({
      final: { text: 'x' },
    });
    expect(decodeElevenLabs(JSON.stringify({ text: 'y', isFinal: false }))).toEqual({
      partial: { text: 'y' },
    });
  });

  it('maps error messages', () => {
    expect(decodeElevenLabs(JSON.stringify({ type: 'error', message: 'bad' }))?.error?.code).toBe(
      'asr_connection_failed',
    );
    expect(decodeElevenLabs(JSON.stringify({ error: 'nope' }))?.error?.message).toBe('nope');
  });

  it('skips empty text and malformed JSON', () => {
    expect(decodeElevenLabs(JSON.stringify({ text: '' }))).toBeUndefined();
    expect(decodeElevenLabs('not json')).toBeUndefined();
  });
});
