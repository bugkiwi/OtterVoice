import { describe, expect, it } from 'bun:test';
import { shouldMergeAdjacentUserTurn, type TurnLogRole } from './turn-log';

describe('web transcript turn grouping', () => {
  it('keeps adjacent ASR turns in one user row', () => {
    const rows: TurnLogRole[] = ['assistant'];

    for (const turnId of ['user-1', 'user-2', 'user-3']) {
      const previousIsUser = rows.at(-1) === 'user';
      if (!shouldMergeAdjacentUserTurn('user', turnId, previousIsUser)) {
        rows.push('user');
      }
    }

    expect(rows).toEqual(['assistant', 'user']);
  });

  it('starts a new user row after an assistant response', () => {
    expect(shouldMergeAdjacentUserTurn('user', 'user-2', false)).toBe(false);
    expect(shouldMergeAdjacentUserTurn('assistant', 'assistant-1', true)).toBe(false);
  });

  it('starts a new user row after a confirmed assistant interruption', () => {
    expect(shouldMergeAdjacentUserTurn('user', 'user-3', true, true)).toBe(false);
  });
});
