import type { VoiceSessionState } from './types.js';
import { VoiceError } from './errors.js';

/**
 * Allowed transitions for the voice session state machine.
 *
 * `error` and `finished` are reachable from every non-terminal state; the map
 * below only lists the *forward* transitions plus the recovery edges out of
 * `error`/`paused`/`finished`.
 */
const TRANSITIONS: Record<VoiceSessionState, readonly VoiceSessionState[]> = {
  idle: ['starting', 'error'],
  starting: ['assistant_speaking', 'listening', 'finished', 'error'],
  assistant_speaking: [
    'listening',
    'user_speaking',
    'processing',
    'paused',
    'finished',
    'error',
  ],
  listening: [
    'assistant_speaking',
    'user_speaking',
    'processing',
    'paused',
    'finished',
    'error',
  ],
  user_speaking: ['processing', 'listening', 'paused', 'finished', 'error'],
  processing: [
    'assistant_speaking',
    'user_speaking',
    'scoring',
    'listening',
    'finished',
    'error',
  ],
  scoring: ['assistant_speaking', 'finished', 'error'],
  paused: ['listening', 'assistant_speaking', 'idle', 'finished', 'error'],
  finished: ['idle'],
  error: ['idle', 'finished'],
};

const TERMINAL_STATES: ReadonlySet<VoiceSessionState> = new Set<VoiceSessionState>([
  'finished',
]);

/**
 * Whether `state` ends the session lifecycle (currently only `finished`).
 *
 * @param state - Candidate {@link VoiceSessionState}.
 */
export function isTerminal(state: VoiceSessionState): boolean {
  return TERMINAL_STATES.has(state);
}

/**
 * Whether a direct transition from `from` → `to` is allowed by the session FSM.
 * Same-state transitions always return `false`.
 *
 * @param from - Current state.
 * @param to - Desired next state.
 */
export function canTransition(
  from: VoiceSessionState,
  to: VoiceSessionState,
): boolean {
  if (from === to) return false;
  return TRANSITIONS[from].includes(to);
}

/**
 * Pure state container. The session owns one of these and is the only thing
 * that mutates it via {@link StateMachine.transition}.
 */
export class StateMachine {
  private current: VoiceSessionState;

  constructor(initial: VoiceSessionState = 'idle') {
    this.current = initial;
  }

  get state(): VoiceSessionState {
    return this.current;
  }

  can(to: VoiceSessionState): boolean {
    return canTransition(this.current, to);
  }

  /**
   * Move to `to`, returning the previous state. Throws a {@link VoiceError}
   * with code `invalid_state` when the transition is not allowed.
   */
  transition(to: VoiceSessionState): VoiceSessionState {
    if (!this.can(to)) {
      throw new VoiceError({
        code: 'invalid_state',
        message: `Invalid transition: ${this.current} -> ${to}`,
        retryable: false,
      });
    }
    const previous = this.current;
    this.current = to;
    return previous;
  }
}
