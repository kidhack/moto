/**
 * Bitcoin deposits the minter has seen but not yet credited, shown as pending rows in the history.
 * The minter only reports a deposit once it has its first confirmation; it disappears from here
 * when it's minted (the ledger's mint row takes over) and stays as "not credited" if rejected.
 */
import type { UpdateBalanceResult } from './depositNotices';

type Outpoint = { txid: Uint8Array | number[]; vout: number };

export interface PendingDeposit {
  /** Bitcoin txid (display byte order) + output index. */
  key: string;
  txid: string;
  sats: bigint;
  confirmations?: number;
  required?: number;
  /** Set when the minter won't credit it. */
  problem?: 'tooSmall' | 'flagged';
  /** Unix seconds when the app first saw it (the row's date). */
  firstSeen: number;
}

/** The minter returns txids in internal byte order; explorers show them reversed. */
export function displayTxid(txid: Outpoint['txid']): string {
  return Array.from(txid as ArrayLike<number>)
    .reverse()
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Fold one update_balance result into the current list.
 * NoNewUtxos is a full picture (everything still waiting or suspended), so it replaces the list.
 * Ok only lists UTXOs processed by this call, so it updates those and keeps the rest.
 * Other errors (e.g. AlreadyProcessing) say nothing about deposits.
 */
export function applyUpdateBalance(
  current: PendingDeposit[],
  result: UpdateBalanceResult,
  firstSeen: (key: string) => number
): PendingDeposit[] {
  const make = (outpoint: Outpoint, sats: bigint, extra: Partial<PendingDeposit> = {}): PendingDeposit => {
    const txid = displayTxid(outpoint.txid);
    const key = `${txid}:${outpoint.vout}`;
    return { key, txid, sats, firstSeen: firstSeen(key), ...extra };
  };

  if ('Ok' in result) {
    const byKey = new Map(current.map((d) => [d.key, d]));
    for (const status of result.Ok) {
      if ('Minted' in status) {
        const d = make(status.Minted.utxo.outpoint, 0n);
        byKey.delete(d.key);
      } else if ('Checked' in status) {
        const d = make(status.Checked.outpoint, status.Checked.value);
        const prev = byKey.get(d.key);
        byKey.set(d.key, { ...d, confirmations: prev?.required ?? prev?.confirmations, required: prev?.required });
      } else if ('ValueTooSmall' in status) {
        const d = make(status.ValueTooSmall.outpoint, status.ValueTooSmall.value, { problem: 'tooSmall' });
        byKey.set(d.key, d);
      } else if ('Tainted' in status) {
        const d = make(status.Tainted.outpoint, status.Tainted.value, { problem: 'flagged' });
        byKey.set(d.key, d);
      }
    }
    return [...byKey.values()];
  }

  const err = result.Err;
  if (!('NoNewUtxos' in err) || !err.NoNewUtxos) return current;
  const info = err.NoNewUtxos as Extract<typeof err, { NoNewUtxos: unknown }>['NoNewUtxos'];
  const next: PendingDeposit[] = [];
  for (const utxo of info.pending_utxos[0] ?? []) {
    next.push(make(utxo.outpoint, utxo.value, { confirmations: utxo.confirmations, required: info.required_confirmations }));
  }
  for (const s of info.suspended_utxos[0] ?? []) {
    next.push(make(s.utxo.outpoint, s.utxo.value, { problem: 'ValueTooSmall' in s.reason ? 'tooSmall' : 'flagged' }));
  }
  return next;
}

// --- Shared store (several hook instances poll the minter; they all feed and read one list) ---

const FIRST_SEEN_KEY = 'moto_deposit_first_seen';
let deposits: PendingDeposit[] = [];
const listeners = new Set<() => void>();

function loadFirstSeen(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(FIRST_SEEN_KEY) ?? '{}');
  } catch {
    return {};
  }
}

export function recordUpdateBalance(result: UpdateBalanceResult): void {
  const seen = loadFirstSeen();
  const now = Math.floor(Date.now() / 1000);
  const next = applyUpdateBalance(deposits, result, (key) => seen[key] ?? now);
  if (next === deposits) return;
  // Keep first-seen times only for deposits still listed, so the date survives a reload.
  try {
    localStorage.setItem(FIRST_SEEN_KEY, JSON.stringify(Object.fromEntries(next.map((d) => [d.key, d.firstSeen]))));
  } catch { /* storage unavailable */ }
  deposits = next;
  listeners.forEach((l) => l());
}

export function clearPendingDeposits(): void {
  if (deposits.length === 0) return;
  deposits = [];
  listeners.forEach((l) => l());
}

export function subscribePendingDeposits(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPendingDeposits(): PendingDeposit[] {
  return deposits;
}
