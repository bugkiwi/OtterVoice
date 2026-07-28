export type TurnLogRole = 'user' | 'assistant';

/**
 * Decide whether a newly observed turn belongs in the preceding user row.
 *
 * Batch ASR can split one spoken question into several turn ids around short
 * pauses. Keeping adjacent user turns in one row avoids rendering each stable
 * segment as a separate question while an assistant row still creates a clear
 * conversation boundary. A confirmed assistant interruption is also an
 * explicit boundary, even when no assistant text was available to render.
 *
 * @param role - Role of the incoming transcript event.
 * @param turnId - Stable turn identifier assigned by the voice session.
 * @param previousIsUser - Whether the last rendered row belongs to the user.
 * @param forceNewRow - Whether a conversation boundary requires a new row.
 * @returns Whether the incoming text should be appended to the previous row.
 */
export function shouldMergeAdjacentUserTurn(
  role: TurnLogRole,
  turnId: string | undefined,
  previousIsUser: boolean,
  forceNewRow = false,
): boolean {
  return role === 'user' && turnId !== undefined && previousIsUser && !forceNewRow;
}
