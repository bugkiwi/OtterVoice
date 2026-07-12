import { describe, expect, it } from 'bun:test';
import {
  canTransition,
  isTerminal,
  StateMachine,
} from '../src/state-machine';
import { VoiceError } from '../src/errors';

describe('canTransition / isTerminal', () => {
  it('allows documented forward transitions', () => {
    expect(canTransition('idle', 'starting')).toBe(true);
    expect(canTransition('listening', 'user_speaking')).toBe(true);
    expect(canTransition('processing', 'assistant_speaking')).toBe(true);
    expect(canTransition('scoring', 'finished')).toBe(true);
    expect(canTransition('paused', 'listening')).toBe(true);
    expect(canTransition('error', 'idle')).toBe(true);
    expect(canTransition('finished', 'idle')).toBe(true);
  });

  it('rejects invalid and self transitions', () => {
    expect(canTransition('idle', 'listening')).toBe(false);
    expect(canTransition('finished', 'assistant_speaking')).toBe(false);
    expect(canTransition('listening', 'listening')).toBe(false);
  });

  it('marks only finished as terminal', () => {
    expect(isTerminal('finished')).toBe(true);
    expect(isTerminal('idle')).toBe(false);
    expect(isTerminal('error')).toBe(false);
  });
});

describe('StateMachine', () => {
  it('defaults to idle and reports state', () => {
    expect(new StateMachine().state).toBe('idle');
  });

  it('accepts a custom initial state', () => {
    expect(new StateMachine('listening').state).toBe('listening');
  });

  it('can() reflects allowed transitions', () => {
    const m = new StateMachine('idle');
    expect(m.can('starting')).toBe(true);
    expect(m.can('finished')).toBe(false);
  });

  it('transition() moves state and returns the previous one', () => {
    const m = new StateMachine('idle');
    expect(m.transition('starting')).toBe('idle');
    expect(m.state).toBe('starting');
  });

  it('transition() throws a VoiceError on an invalid move', () => {
    const m = new StateMachine('finished');
    expect(() => m.transition('assistant_speaking')).toThrow(VoiceError);
    try {
      m.transition('assistant_speaking');
    } catch (e) {
      expect((e as VoiceError).code).toBe('invalid_state');
    }
  });
});
