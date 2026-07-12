import { describe, expect, it } from 'bun:test';
import {
  azureOutputFormat,
  buildSSML,
  escapeXml,
  mimeTypeForFormat,
  ratePercent,
} from '../src/ssml';

describe('format maps', () => {
  it('maps every TTS format to an Azure output format and mime type', () => {
    for (const f of ['mp3', 'wav', 'pcm', 'ogg', 'opus'] as const) {
      expect(typeof azureOutputFormat(f)).toBe('string');
      expect(mimeTypeForFormat(f)).toMatch(/^audio\//);
    }
    expect(mimeTypeForFormat('mp3')).toBe('audio/mpeg');
  });
});

describe('escapeXml', () => {
  it('escapes all five predefined entities', () => {
    expect(escapeXml(`<a> & "b" 'c'`)).toBe('&lt;a&gt; &amp; &quot;b&quot; &apos;c&apos;');
  });
});

describe('ratePercent', () => {
  it('formats positive and negative rates', () => {
    expect(ratePercent(1)).toBe('+0%');
    expect(ratePercent(1.5)).toBe('+50%');
    expect(ratePercent(0.8)).toBe('-20%');
  });
});

describe('buildSSML', () => {
  const defaults = { voice: 'en-US-Jenny', language: 'en-US' };

  it('wraps escaped text in voice/speak with defaults', () => {
    const ssml = buildSSML({ text: 'Hi <there>' }, defaults);
    expect(ssml).toContain('xml:lang="en-US"');
    expect(ssml).toContain('<voice name="en-US-Jenny">Hi &lt;there&gt;</voice>');
    expect(ssml).not.toContain('<prosody');
  });

  it('overrides voice and language from the input', () => {
    const ssml = buildSSML({ text: 'x', voice: 'en-GB-Ryan', language: 'en-GB' }, defaults);
    expect(ssml).toContain('xml:lang="en-GB"');
    expect(ssml).toContain('name="en-GB-Ryan"');
  });

  it('adds a prosody wrapper for speed only', () => {
    const ssml = buildSSML({ text: 'x', speed: 1.5 }, defaults);
    expect(ssml).toContain('<prosody rate="+50%">x</prosody>');
    expect(ssml).not.toContain('pitch=');
  });

  it('adds a prosody wrapper for pitch only', () => {
    const ssml = buildSSML({ text: 'x', pitch: 0.5 }, defaults);
    expect(ssml).toContain('<prosody pitch="-50%">x</prosody>');
    expect(ssml).not.toContain('rate=');
  });

  it('combines speed and pitch', () => {
    const ssml = buildSSML({ text: 'x', speed: 1.2, pitch: 1.1 }, defaults);
    expect(ssml).toContain('rate="+20%"');
    expect(ssml).toContain('pitch="+10%"');
  });
});
