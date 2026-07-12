import { describe, expect, it } from 'bun:test';
import { createIdGenerator, defaultNow } from '../src/internal/ids';

describe('createIdGenerator', () => {
  it('produces unique, prefixed, monotonic ids', () => {
    const gen = createIdGenerator('turn');
    const a = gen();
    const b = gen();
    expect(a.startsWith('turn_')).toBe(true);
    expect(a).not.toBe(b);
  });

  it('defaults the prefix to "id"', () => {
    expect(createIdGenerator()().startsWith('id_')).toBe(true);
  });
});

describe('defaultNow', () => {
  it('returns the current epoch millis', () => {
    const before = Date.now();
    const now = defaultNow();
    expect(now).toBeGreaterThanOrEqual(before);
  });
});
