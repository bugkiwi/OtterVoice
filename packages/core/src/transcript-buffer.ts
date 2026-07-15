import type { LLMMessage, TurnRole, VoiceTurn } from './types.js';

/**
 * Input for {@link TranscriptBuffer.add}.
 * Prefer supplying `id` when the same id already appears on streaming events.
 */
export interface AddTurnInput {
  /** Speaker role for the new turn. */
  role: TurnRole;
  /** Final text content. */
  text: string;
  /** Supply a pre-generated id so event ids and turn ids stay in sync. */
  id?: string;
  /** Optional playback URL when audio was recorded. */
  audioUrl?: string;
  /** Epoch millis when the turn started; defaults to now. */
  startedAt?: number;
  /** Epoch millis when the turn ended. */
  endedAt?: number;
  /** Explicit duration; otherwise derived from `endedAt - startedAt` when possible. */
  durationMs?: number;
  /** Opaque app metadata attached to the turn. */
  metadata?: Record<string, unknown>;
}

/**
 * Ordered store of conversation turns. Owns nothing about providers — it just
 * accumulates turns and projects them into the shape the LLM expects.
 */
export class TranscriptBuffer {
  private readonly turns: VoiceTurn[] = [];

  constructor(
    private readonly generateId: () => string,
    private readonly now: () => number,
  ) {}

  add(input: AddTurnInput): VoiceTurn {
    const startedAt = input.startedAt ?? this.now();
    const turn: VoiceTurn = {
      id: input.id ?? this.generateId(),
      role: input.role,
      text: input.text,
      startedAt,
    };
    if (input.audioUrl !== undefined) turn.audioUrl = input.audioUrl;
    if (input.endedAt !== undefined) turn.endedAt = input.endedAt;
    if (input.durationMs !== undefined) {
      turn.durationMs = input.durationMs;
    } else if (input.endedAt !== undefined) {
      turn.durationMs = input.endedAt - startedAt;
    }
    if (input.metadata !== undefined) turn.metadata = input.metadata;
    this.turns.push(turn);
    return turn;
  }

  /** The most recently added turn, or `undefined` when empty. */
  last(): VoiceTurn | undefined {
    return this.turns[this.turns.length - 1];
  }

  get size(): number {
    return this.turns.length;
  }

  /** Immutable snapshot of all turns. */
  all(): VoiceTurn[] {
    return this.turns.map((t) => ({ ...t }));
  }

  /** Project turns into LLM messages, dropping any with empty text. */
  toMessages(): LLMMessage[] {
    const messages: LLMMessage[] = [];
    for (const turn of this.turns) {
      if (turn.text.length === 0) continue;
      messages.push({ role: turn.role, content: turn.text });
    }
    return messages;
  }

  clear(): void {
    this.turns.length = 0;
  }
}
