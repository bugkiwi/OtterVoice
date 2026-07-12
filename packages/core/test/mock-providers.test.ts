import { describe, expect, it } from 'bun:test';
import {
  createMockASR,
  createMockLLM,
  createMockPronunciation,
  createMockTTS,
} from '../src/providers/mock';
import type { ASRResult, NormalizedVoiceError } from '../src/types';

const someError: NormalizedVoiceError = {
  code: 'asr_connection_failed',
  message: 'down',
  retryable: true,
};

describe('createMockASR', () => {
  it('emits a partial then a final per sendAudio, advancing across sessions', async () => {
    const asr = createMockASR({ transcripts: ['hello world', 'second turn'] });
    const partials: string[] = [];
    const finals: string[] = [];

    const s1 = await asr.createSession({});
    s1.onPartial((r) => partials.push(r.text));
    s1.onFinal((r) => finals.push(r.text));
    s1.sendAudio(new ArrayBuffer(1));
    await s1.close();

    const s2 = await asr.createSession({});
    s2.onFinal((r) => finals.push(r.text));
    s2.sendAudio(new ArrayBuffer(1));

    expect(partials[0]).toBe('hello'); // first half of "hello world"
    expect(finals).toEqual(['hello world', 'second turn']);
  });

  it('can suppress partials', async () => {
    const asr = createMockASR({ transcripts: ['hi'], emitPartials: false });
    const session = await asr.createSession({});
    const partials: ASRResult[] = [];
    session.onPartial((r) => partials.push(r));
    session.onFinal(() => {});
    session.sendAudio(new ArrayBuffer(1));
    expect(partials).toHaveLength(0);
  });

  it('yields an empty final when transcripts run out', async () => {
    const asr = createMockASR({ transcripts: [] });
    const session = await asr.createSession({});
    let final: ASRResult | undefined;
    session.onFinal((r) => (final = r));
    session.sendAudio(new ArrayBuffer(1));
    expect(final?.text).toBe('');
  });

  it('routes failWith to onError', async () => {
    const asr = createMockASR({ transcripts: ['x'], failWith: someError });
    const session = await asr.createSession({});
    let err: NormalizedVoiceError | undefined;
    session.onError((e) => (err = e));
    session.sendAudio(new ArrayBuffer(1));
    expect(err).toBe(someError);
  });

  it('stops emitting after close and supports unsubscribing', async () => {
    const asr = createMockASR({ transcripts: ['a', 'b'] });
    const session = await asr.createSession({});
    const finals: string[] = [];
    const off = session.onFinal((r) => finals.push(r.text));
    const offP = session.onPartial(() => {});
    const offE = session.onError(() => {});
    off();
    offP();
    offE();
    session.sendAudio(new ArrayBuffer(1)); // no listeners
    await session.stop();
    await session.close();
    session.sendAudio(new ArrayBuffer(1)); // closed → ignored
    expect(finals).toHaveLength(0);
  });
});

describe('createMockLLM', () => {
  it('echoes the last user message by default', async () => {
    const llm = createMockLLM();
    const out = await llm.generate({
      messages: [
        { role: 'assistant', content: 'hi' },
        { role: 'user', content: 'how are you' },
      ],
    });
    expect(out.text).toBe('You said: how are you');
    expect(out.usage?.totalTokens).toBe(15);
  });

  it('returns empty echo when there is no user message', async () => {
    const llm = createMockLLM();
    const out = await llm.generate({ messages: [{ role: 'system', content: 's' }] });
    expect(out.text).toBe('You said: ');
  });

  it('passes the call index to a custom reply', async () => {
    const llm = createMockLLM({ reply: (_i, n) => `call-${n}` });
    expect((await llm.generate({ messages: [] })).text).toBe('call-0');
    expect((await llm.generate({ messages: [] })).text).toBe('call-1');
  });

  it('parses JSON output when responseFormat is json', async () => {
    const llm = createMockLLM({ reply: () => '{"a":1}' });
    const out = await llm.generate({ messages: [], responseFormat: 'json' });
    expect(out.json).toEqual({ a: 1 });
  });

  it('wraps invalid JSON as { text }', async () => {
    const llm = createMockLLM({ reply: () => 'not json' });
    const out = await llm.generate({ messages: [], responseFormat: 'json' });
    expect(out.json).toEqual({ text: 'not json' });
  });

  it('rejects generate() with failWith', async () => {
    const llm = createMockLLM({ failWith: someError });
    await expect(llm.generate({ messages: [] })).rejects.toBe(someError);
  });

  it('streams text deltas, usage and done', async () => {
    const llm = createMockLLM({ reply: () => 'a b' });
    const chunks = [];
    for await (const c of llm.stream!({ messages: [] })) chunks.push(c);
    expect(chunks.map((c) => c.type)).toEqual([
      'text_delta',
      'text_delta',
      'usage',
      'done',
    ]);
  });

  it('streams an error chunk for failWith', async () => {
    const llm = createMockLLM({ failWith: someError });
    const chunks = [];
    for await (const c of llm.stream!({ messages: [] })) chunks.push(c);
    expect(chunks).toEqual([{ type: 'error', error: someError }]);
  });
});

describe('createMockTTS', () => {
  it('synthesizes an audio buffer with mime and duration', async () => {
    const tts = createMockTTS();
    const out = await tts.synthesize({ text: 'hello', format: 'wav' });
    expect(out.mimeType).toBe('audio/wav');
    expect(out.durationMs).toBe(5 * 60);
    expect(out.audioBuffer).toBeInstanceOf(ArrayBuffer);
    expect(out.cached).toBe(false);
  });

  it('defaults format to mp3 and marks cached when cacheKey present', async () => {
    const tts = createMockTTS({ durationMsPerChar: 1 });
    const out = await tts.synthesize({ text: 'ab', cacheKey: 'k' });
    expect(out.mimeType).toBe('audio/mp3');
    expect(out.durationMs).toBe(2);
    expect(out.cached).toBe(true);
  });

  it('rejects with failWith', async () => {
    const tts = createMockTTS({ failWith: someError });
    await expect(tts.synthesize({ text: 'x' })).rejects.toBe(someError);
  });

  it('advertises capabilities', () => {
    expect(createMockTTS().capabilities.voices[0]?.id).toBe('mock-voice');
  });
});

describe('createMockPronunciation', () => {
  it('scores each non-empty word', async () => {
    const p = createMockPronunciation({ score: 90 });
    const res = await p.assess({ transcript: 'one  two ' });
    expect(res.overall).toBe(90);
    expect(res.words).toEqual([
      { text: 'one', score: 90 },
      { text: 'two', score: 90 },
    ]);
  });

  it('defaults the score to 80', async () => {
    const res = await createMockPronunciation().assess({ transcript: 'hi' });
    expect(res.accuracy).toBe(80);
  });

  it('rejects with failWith', async () => {
    const p = createMockPronunciation({ failWith: someError });
    await expect(p.assess({ transcript: 'x' })).rejects.toBe(someError);
  });
});
