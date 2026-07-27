export type TurnLogRole = 'user' | 'assistant';

/**
 * Decide whether a newly observed turn belongs in the preceding user row.
 *
 * Batch ASR can split one spoken question into several turn ids around short
 * pauses. Keeping adjacent user turns in one row avoids rendering each stable
 * segment as a separate question while an assistant row still creates a clear
 * conversation boundary.
 */
export function shouldMergeAdjacentUserTurn(
  role: TurnLogRole,
  turnId: string | undefined,
  previousIsUser: boolean,
): boolean {
  return role === 'user' && turnId !== undefined && previousIsUser;
}
