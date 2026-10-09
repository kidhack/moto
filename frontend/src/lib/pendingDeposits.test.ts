import { describe, expect, it } from 'vitest';
import { applyUpdateBalance, displayTxid, type PendingDeposit } from './pendingDeposits';

const outpoint = (n: number) => ({ txid: new Uint8Array([0xab, n]), vout: 1 });
const utxo = (n: number, value: bigint) => ({ outpoint: outpoint(n), value, height: 1 });
const at = () => 1_000;

const noNewUtxos = (pending: Array<[number, bigint, number]>, suspended: Array<[number, bigint, 'small' | 'flagged']> = []) => ({
  Err: {
    NoNewUtxos: {
      current_confirmations: [] as [],
      required_confirmations: 4,
      pending_utxos: [pending.map(([n, value, confirmations]) => ({ outpoint: outpoint(n), value, confirmations }))] as [
        Array<{ outpoint: ReturnType<typeof outpoint>; value: bigint; confirmations: number }>,
      ],
      suspended_utxos: [
        suspended.map(([n, value, why]) => ({
          utxo: utxo(n, value),
          reason: why === 'small' ? { ValueTooSmall: null } : { Quarantined: null },
        })),
      ] as [Array<{ utxo: ReturnType<typeof utxo>; reason: { ValueTooSmall: null } | { Quarantined: null } }>],
    },
  },
});

describe('displayTxid', () => {
  it('reverses the minter byte order', () => {
    expect(displayTxid(new Uint8Array([0x01, 0xab]))).toBe('ab01');
  });
});

describe('applyUpdateBalance', () => {
  it('lists pending and suspended deposits from NoNewUtxos', () => {
    const next = applyUpdateBalance([], noNewUtxos([[7, 30_000n, 2]], [[8, 120n, 'small'], [9, 5_000n, 'flagged']]), at);
    expect(next).toEqual([
      { key: '07ab:1', txid: '07ab', sats: 30_000n, confirmations: 2, required: 4, firstSeen: 1_000 },
      { key: '08ab:1', txid: '08ab', sats: 120n, problem: 'tooSmall', firstSeen: 1_000 },
      { key: '09ab:1', txid: '09ab', sats: 5_000n, problem: 'flagged', firstSeen: 1_000 },
    ]);
  });

  it('replaces the list on NoNewUtxos, keeping first-seen times from the lookup', () => {
    const prev = applyUpdateBalance([], noNewUtxos([[7, 30_000n, 2]]), at);
    const next = applyUpdateBalance(prev, noNewUtxos([[7, 30_000n, 3]]), (key) => (key === '07ab:1' ? 500 : 2_000));
    expect(next).toEqual([{ key: '07ab:1', txid: '07ab', sats: 30_000n, confirmations: 3, required: 4, firstSeen: 500 }]);
    expect(applyUpdateBalance(next, noNewUtxos([]), at)).toEqual([]);
  });

  it('removes minted deposits and keeps the others on Ok', () => {
    const prev = applyUpdateBalance([], noNewUtxos([[7, 30_000n, 3], [8, 10_000n, 1]]), at);
    const next = applyUpdateBalance(prev, { Ok: [{ Minted: { block_index: 5n, minted_amount: 29_900n, utxo: utxo(7, 30_000n) } }] }, at);
    expect(next.map((d) => d.key)).toEqual(['08ab:1']);
  });

  it('marks rejected deposits and keeps checked ones pending on Ok', () => {
    const prev: PendingDeposit[] = applyUpdateBalance([], noNewUtxos([[7, 30_000n, 3]]), at);
    const next = applyUpdateBalance(prev, { Ok: [{ Checked: utxo(7, 30_000n) }, { Tainted: utxo(9, 5_000n) }] }, at);
    expect(next).toEqual([
      { key: '07ab:1', txid: '07ab', sats: 30_000n, confirmations: 4, required: 4, firstSeen: 1_000 },
      { key: '09ab:1', txid: '09ab', sats: 5_000n, problem: 'flagged', firstSeen: 1_000 },
    ]);
  });

  it('leaves the list alone on other errors', () => {
    const prev = applyUpdateBalance([], noNewUtxos([[7, 30_000n, 2]]), at);
    expect(applyUpdateBalance(prev, { Err: { AlreadyProcessing: null } }, at)).toBe(prev);
  });
});
