import { describe, expect, it } from 'bun:test';
import {
  buildChatBody,
  buildHeaders,
  extractDelta,
  extractText,
  mapUsage,
} from '../src/chat';

describe('buildChatBody', () => {
  it('prepends the system prompt and copies messages', () => {
    const body = buildChatBody('m', {
      system: 'sys',
      messages: [{ role: 'user', content: 'hi' }],
    });
    expect(body.messages).toEqual([
      { role: 'system', content: 'sys' },
      { role: 'user', content: 'hi' },
    ]);
  });

  it('prefers the input temperature, then the default', () => {
    expect(buildChatBody('m', { messages: [], temperature: 0.1 }).temperature).toBe(0.1);
    expect(buildChatBody('m', { messages: [] }, { temperature: 0.5 }).temperature).toBe(0.5);
    expect(buildChatBody('m', { messages: [] }).temperature).toBeUndefined();
  });

  it('sets max_tokens, stream and json response format when requested', () => {
    const body = buildChatBody(
      'm',
      { messages: [], maxTokens: 64, responseFormat: 'json' },
      { stream: true },
    );
    expect(body.max_tokens).toBe(64);
    expect(body.stream).toBe(true);
    expect(body.response_format).toEqual({ type: 'json_object' });
  });

  it('can explicitly disable OpenRouter reasoning', () => {
    expect(
      buildChatBody('m', { messages: [] }, {}, { reasoningEnabled: false }),
    ).toMatchObject({ reasoning: { enabled: false } });
  });

  it('omits optional fields by default', () => {
    const body = buildChatBody('m', { messages: [{ role: 'user', content: 'x' }] });
    expect(body.max_tokens).toBeUndefined();
    expect(body.stream).toBeUndefined();
    expect(body.response_format).toBeUndefined();
  });
});

describe('buildHeaders', () => {
  it('includes auth and content type, merging extra headers', () => {
    const h = buildHeaders('tok', { headers: { 'x-extra': '1' } });
    expect(h.authorization).toBe('Bearer tok');
    expect(h['content-type']).toBe('application/json');
    expect(h['x-extra']).toBe('1');
  });

  it('adds attribution headers when present and omits them otherwise', () => {
    expect(buildHeaders('t', { referer: 'https://app', title: 'App' })).toMatchObject({
      'http-referer': 'https://app',
      'x-title': 'App',
    });
    const bare = buildHeaders('t', {});
    expect('http-referer' in bare).toBe(false);
    expect('x-title' in bare).toBe(false);
  });
});

describe('mapUsage', () => {
  it('returns undefined for missing usage', () => {
    expect(mapUsage(undefined)).toBeUndefined();
    expect(mapUsage(null)).toBeUndefined();
  });

  it('maps the OpenAI token fields', () => {
    expect(mapUsage({ prompt_tokens: 3, completion_tokens: 5, total_tokens: 8 })).toEqual({
      inputTokens: 3,
      outputTokens: 5,
      totalTokens: 8,
    });
  });

  it('maps partial usage', () => {
    expect(mapUsage({ prompt_tokens: 3 })).toEqual({ inputTokens: 3 });
  });
});

describe('extractText / extractDelta', () => {
  it('reads message and delta content', () => {
    expect(extractText({ choices: [{ message: { content: 'full' } }] })).toBe('full');
    expect(extractDelta({ choices: [{ delta: { content: 'part' } }] })).toBe('part');
  });

  it('falls back to empty string', () => {
    expect(extractText({})).toBe('');
    expect(extractDelta({ choices: [{}] })).toBe('');
  });
});
