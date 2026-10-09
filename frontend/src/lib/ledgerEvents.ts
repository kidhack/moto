/**
 * "The account's ledger state just changed" signal, so the history refreshes right away instead of
 * waiting for its own 30s poll. Fired when the polled balance changes and after a send succeeds.
 */
const listeners = new Set<() => void>();

export function notifyLedgerChanged(): void {
  listeners.forEach((l) => l());
}

export function onLedgerChanged(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
