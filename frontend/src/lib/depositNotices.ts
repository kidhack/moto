/**
 * Turn the ckBTC minter's update_balance result into user-facing deposit notices.
 * Without these, a deposit that's too small or flagged by the minter's Bitcoin check just never
 * shows up, which looks like lost money.
 */

type Outpoint = { txid: Uint8Array | number[]; vout: number };
type Utxo = { outpoint: Outpoint; value: bigint };

export type UtxoStatus =
  | { ValueTooSmall: Utxo }
  | { Tainted: Utxo }
  | { Checked: Utxo }
  | { Minted: { block_index: bigint; minted_amount: bigint; utxo: Utxo } };

export type UpdateBalanceResult =
  | { Ok: UtxoStatus[] }
  | {
      Err:
        | {
            NoNewUtxos: {
              current_confirmations: [] | [number];
              required_confirmations: number;
              pending_utxos: [] | [Array<{ outpoint: Outpoint; value: bigint; confirmations: number }>];
              suspended_utxos: [] | [Array<{ utxo: Utxo; reason: { ValueTooSmall: null } | { Quarantined: null } }>];
            };
          }
        | Record<string, unknown>;
    };

export type DepositNoticeKind = 'pending' | 'minted' | 'tooSmall' | 'flagged';

export interface DepositNotice {
  /** Stable per UTXO + kind, so each notice is shown once. */
  key: string;
  kind: DepositNoticeKind;
  sats: bigint;
  confirmations?: number;
  required?: number;
}

function outpointKey(outpoint: Outpoint): string {
  const bytes = Array.from(outpoint.txid as ArrayLike<number>);
  return `${bytes.map((b) => b.toString(16).padStart(2, '0')).join('')}:${outpoint.vout}`;
}

export function depositNotices(result: UpdateBalanceResult | null | undefined): DepositNotice[] {
  if (!result) return [];
  const notices: DepositNotice[] = [];
  const add = (kind: DepositNoticeKind, outpoint: Outpoint, sats: bigint, extra?: Partial<DepositNotice>) =>
    notices.push({ key: `${kind}:${outpointKey(outpoint)}`, kind, sats, ...extra });

  if ('Ok' in result) {
    for (const status of result.Ok) {
      if ('Minted' in status) add('minted', status.Minted.utxo.outpoint, status.Minted.minted_amount);
      else if ('ValueTooSmall' in status) add('tooSmall', status.ValueTooSmall.outpoint, status.ValueTooSmall.value);
      else if ('Tainted' in status) add('flagged', status.Tainted.outpoint, status.Tainted.value);
      // Checked: passed the check, minting will complete on a later update_balance. Nothing to tell.
    }
    return notices;
  }

  const err = result.Err;
  if ('NoNewUtxos' in err && err.NoNewUtxos) {
    const info = err.NoNewUtxos as Extract<typeof err, { NoNewUtxos: unknown }>['NoNewUtxos'];
    for (const utxo of info.pending_utxos[0] ?? []) {
      add('pending', utxo.outpoint, utxo.value, {
        confirmations: utxo.confirmations,
        required: info.required_confirmations,
      });
    }
    for (const suspended of info.suspended_utxos[0] ?? []) {
      const kind = 'ValueTooSmall' in suspended.reason ? 'tooSmall' : 'flagged';
      add(kind, suspended.utxo.outpoint, suspended.utxo.value);
    }
  }
  return notices;
}
