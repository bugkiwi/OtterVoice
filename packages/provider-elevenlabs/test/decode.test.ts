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
    expect(parsed.searchParams.get('audio_format')).toBe('pcm_16000');
    expect(parsed.searchParams.get('commit_strategy')).toBe('manual');
  });

  it('uses manual commits with the requested sample rate', () => {
    const parsed = new URL(buildElevenLabsUrl(
      DEFAULT_BASE_URL,
      {},
      { sampleRate: 24_000 },
    ));
    expect(parsed.searchParams.get('audio_format')).toBe('pcm_24000');
    expect(parsed.searchParams.get('commit_strategy')).toBe('manual');
  });
});

describe('decodeElevenLabs', () => {
  it('decodes finals and partials, with confidence', () => {
    const done = { text: 'done', is_final: true, confidence: 0.8 };
    expect(decodeElevenLabs(JSON.stringify(done))).toEqual({
      final: { text: 'done', confidence: 0.8 },
    });
    expect(decodeElevenLabs(JSON.stringify({ transcript: 'par' }))).toEqual({
      partial: { text: 'par' },
    });
    const final = { text: 'x', type: 'final' };
    expect(decodeElevenLabs(JSON.stringify(final))).toEqual({
      final: { text: 'x' },
    });
    expect(decodeElevenLabs(JSON.stringify({ text: 'y', isFinal: false }))).toEqual({
      partial: { text: 'y' },
    });
  });

  it('keeps provisional and committed transcripts separate', () => {
    expect(decodeElevenLabs(JSON.stringify({
      message_type: 'final_transcript',
      text: 'still settling',
    }))).toEqual({ partial: { text: 'still settling' } });
    const committed = {
      message_type: 'committed_transcript',
      text: 'complete turn',
    };
    expect(decodeElevenLabs(JSON.stringify(committed))).toEqual({
      final: { text: 'complete turn' },
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
