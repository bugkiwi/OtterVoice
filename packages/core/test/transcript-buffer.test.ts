import { beforeEach, describe, expect, it } from 'bun:test';
import { TranscriptBuffer } from '../src/transcript-buffer';

describe('TranscriptBuffer', () => {
  let ids: number;
  let clock: number;
  let buffer: TranscriptBuffer;

  beforeEach(() => {
    ids = 0;
    clock = 1000;
    buffer = new TranscriptBuffer(
      () => `t${(ids += 1)}`,
      () => clock,
    );
  });

  it('adds a turn with generated id and clock-based startedAt', () => {
    const turn = buffer.add({ role: 'user', text: 'hi' });
    expect(turn).toMatchObject({ id: 't1', role: 'user', text: 'hi', startedAt: 1000 });
    expect(turn.durationMs).toBeUndefined();
  });

  it('honours a supplied id and timing fields', () => {
    const turn = buffer.add({
      id: 'fixed',
      role: 'assistant',
      text: 'yo',
      startedAt: 5,
      endedAt: 25,
      audioUrl: 'http://a',
      metadata: { k: 1 },
    });
    expect(turn.id).toBe('fixed');
    expect(turn.durationMs).toBe(20);
    expect(turn.audioUrl).toBe('http://a');
    expect(turn.metadata).toEqual({ k: 1 });
  });

  it('prefers an explicit durationMs over endedAt math', () => {
    const turn = buffer.add({
      role: 'user',
      text: 'x',
      startedAt: 0,
      endedAt: 100,
      durationMs: 42,
    });
    expect(turn.durationMs).toBe(42);
  });

  it('tracks last() and size()', () => {
    expect(buffer.last()).toBeUndefined();
    buffer.add({ role: 'user', text: 'a' });
    buffer.add({ role: 'assistant', text: 'b' });
    expect(buffer.size).toBe(2);
    expect(buffer.last()?.text).toBe('b');
  });

  it('all() returns detached copies', () => {
    buffer.add({ role: 'user', text: 'a' });
    const snap = buffer.all();
    snap[0]!.text = 'mutated';
    expect(buffer.last()?.text).toBe('a');
  });

  it('toMessages() drops empty-text turns', () => {
    buffer.add({ role: 'system', text: 'sys' });
    buffer.add({ role: 'user', text: '' });
    buffer.add({ role: 'assistant', text: 'hello' });
    expect(buffer.toMessages()).toEqual([
      { role: 'system', content: 'sys' },
      { role: 'assistant', content: 'hello' },
    ]);
  });

  it('clear() empties the buffer', () => {
    buffer.add({ role: 'user', text: 'a' });
    buffer.clear();
    expect(buffer.size).toBe(0);
    expect(buffer.last()).toBeUndefined();
  });
});
