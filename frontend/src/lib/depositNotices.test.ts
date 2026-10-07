import { describe, expect, it } from 'vitest';
import { depositNotices } from './depositNotices';

const outpoint = (n: number) => ({ txid: new Uint8Array([n, 0xab]), vout: 1 });
const utxo = (n: number, value: bigint) => ({ outpoint: outpoint(n), value, height: 1 });

describe('depositNotices', () => {
  it('reports minted, too-small, and flagged UTXOs from Ok', () => {
    const notices = depositNotices({
      Ok: [
        { Minted: { block_index: 5n, minted_amount: 9_900n, utxo: utxo(1, 10_000n) } },
        { ValueTooSmall: utxo(2, 50n) },
        { Tainted: utxo(3, 20_000n) },
        { Checked: utxo(4, 1_000n) },
      ],
    });
    expect(notices.map((n) => [n.kind, n.sats])).toEqual([
      ['minted', 9_900n],
      ['tooSmall', 50n],
      ['flagged', 20_000n],
    ]);
    expect(notices[0].key).toBe('minted:01ab:1');
  });

  it('reports pending confirmations and suspended UTXOs from NoNewUtxos', () => {
    const notices = depositNotices({
      Err: {
        NoNewUtxos: {
          current_confirmations: [],
          required_confirmations: 4,
          pending_utxos: [[{ outpoint: outpoint(7), value: 30_000n, confirmations: 1 }]],
          suspended_utxos: [[
            { utxo: utxo(8, 120n), reason: { ValueTooSmall: null } },
            { utxo: utxo(9, 5_000n), reason: { Quarantined: null } },
          ]],
        },
      },
    });
    expect(notices).toEqual([
      { key: 'pending:07ab:1', kind: 'pending', sats: 30_000n, confirmations: 1, required: 4 },
      { key: 'tooSmall:08ab:1', kind: 'tooSmall', sats: 120n },
      { key: 'flagged:09ab:1', kind: 'flagged', sats: 5_000n },
    ]);
  });

  it('is empty for other errors and missing results', () => {
    expect(depositNotices({ Err: { AlreadyProcessing: null } })).toEqual([]);
    expect(depositNotices({ Err: { NoNewUtxos: { current_confirmations: [], required_confirmations: 4, pending_utxos: [], suspended_utxos: [] } } })).toEqual([]);
    expect(depositNotices(null)).toEqual([]);
  });
});
