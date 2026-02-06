/**
 * Session-only store: block_index -> Bitcoin address for withdrawals made this session.
 * Used so we can show "To" immediately for a withdrawal before the burn memo or status_v2 is resolved.
 */
const sessionWithdrawalByBlockIndex = new Map<string, string>();

export function setSessionWithdrawal(blockIndex: string, address: string): void {
  sessionWithdrawalByBlockIndex.set(blockIndex, address);
}

export function getSessionWithdrawal(blockIndex: string): string | undefined {
  return sessionWithdrawalByBlockIndex.get(blockIndex);
}
