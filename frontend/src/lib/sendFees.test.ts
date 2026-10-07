import { describe, expect, it } from 'vitest';
import { computeAppFee, maxSendable, parseBtcToSats, quoteSend } from './sendFees';

const CONFIG = { percent: 0.5, capUsd: 100 };
const PRICE = 100_000; // $100k/BTC -> $100 cap = 100_000 sats

describe('computeAppFee', () => {
  it('charges 0.5% below the cap', () => {
    expect(computeAppFee(1_000_000n, PRICE, CONFIG)).toBe(5_000n);
  });

  it('caps at $100 worth of BTC', () => {
    // 0.5% of 1 BTC = 500_000 sats, cap = 100_000 sats
    expect(computeAppFee(100_000_000n, PRICE, CONFIG)).toBe(100_000n);
  });

  it('charges the uncapped percentage when no price is available (never free)', () => {
    expect(computeAppFee(100_000_000n, null, CONFIG)).toBe(500_000n);
    expect(computeAppFee(100_000_000n, 0, CONFIG)).toBe(500_000n);
    expect(computeAppFee(100_000_000n, NaN, CONFIG)).toBe(500_000n);
  });

  it('is zero for zero amounts or a zero percent config', () => {
    expect(computeAppFee(0n, PRICE, CONFIG)).toBe(0n);
    expect(computeAppFee(1_000_000n, PRICE, { percent: 0, capUsd: 100 })).toBe(0n);
  });

  it('rounds down for tiny amounts', () => {
    expect(computeAppFee(199n, PRICE, CONFIG)).toBe(0n);
    expect(computeAppFee(200n, PRICE, CONFIG)).toBe(1n);
  });
});

describe('quoteSend', () => {
  it('instant: sender pays amount + app fee + two ledger fees; recipient gets amount', () => {
    const q = quoteSend({ mode: 'ckbtc', amount: 1_000_000n, appFee: 5_000n, ledgerFee: 10n });
    expect(q.senderFee).toBe(5_020n);
    expect(q.totalDebit).toBe(1_005_020n);
    expect(q.recipientReceives).toBe(1_000_000n);
    expect(q.networkFee).toBe(0n);
  });

  it('instant with no app fee: only one ledger fee', () => {
    const q = quoteSend({ mode: 'ckbtc', amount: 100n, appFee: 0n, ledgerFee: 10n });
    expect(q.totalDebit).toBe(110n);
  });

  it('withdraw: minter + bitcoin fees come out of the amount, not on top', () => {
    const q = quoteSend({
      mode: 'btc',
      amount: 100_000n,
      appFee: 500n,
      ledgerFee: 10n,
      withdrawalFees: { minterFee: 300n, bitcoinFee: 212n },
    });
    expect(q.totalDebit).toBe(100_520n); // amount + approve fee + app fee + fee-transfer fee
    expect(q.networkFee).toBe(512n);
    expect(q.recipientReceives).toBe(99_488n);
  });

  it('withdraw: recipient amount never goes negative', () => {
    const q = quoteSend({
      mode: 'btc',
      amount: 100n,
      appFee: 0n,
      ledgerFee: 10n,
      withdrawalFees: { minterFee: 300n, bitcoinFee: 212n },
    });
    expect(q.recipientReceives).toBe(0n);
  });
});

describe('maxSendable', () => {
  const appFeeFor = (amount: bigint) => computeAppFee(amount, PRICE, CONFIG);

  it('uses the whole balance exactly, fees included', () => {
    for (const balance of [1n, 25n, 10_000n, 1_234_567n, 100_000_000n, 2_100_000_000_000_000n]) {
      for (const mode of ['ckbtc', 'btc'] as const) {
        const max = maxSendable({ balance, mode, ledgerFee: 10n, appFeeFor });
        const debit = (a: bigint) => quoteSend({ mode, amount: a, appFee: appFeeFor(a), ledgerFee: 10n }).totalDebit;
        if (max > 0n) expect(debit(max)).toBeLessThanOrEqual(balance);
        expect(debit(max + 1n)).toBeGreaterThan(balance);
      }
    }
  });

  it('is zero when the balance cannot cover the ledger fee', () => {
    expect(maxSendable({ balance: 10n, mode: 'ckbtc', ledgerFee: 10n, appFeeFor })).toBe(0n);
    expect(maxSendable({ balance: 0n, mode: 'ckbtc', ledgerFee: 10n, appFeeFor })).toBe(0n);
  });
});

describe('parseBtcToSats', () => {
  it('parses exactly where floating point would not', () => {
    // parseFloat('0.29') * 1e8 = 28999999.999999996 -> floor = 28999999
    expect(parseBtcToSats('0.29')).toBe(29_000_000n);
    expect(parseBtcToSats('0.57')).toBe(57_000_000n);
    expect(parseBtcToSats('1.00000001')).toBe(100_000_001n);
  });

  it('handles commas, whole numbers, and leading/trailing dots', () => {
    expect(parseBtcToSats('1,000')).toBe(100_000_000_000n);
    expect(parseBtcToSats('.5')).toBe(50_000_000n);
    expect(parseBtcToSats('2.')).toBe(200_000_000n);
  });

  it('truncates beyond 8 decimals and rejects junk', () => {
    expect(parseBtcToSats('0.123456789')).toBe(12_345_678n);
    expect(parseBtcToSats('')).toBe(0n);
    expect(parseBtcToSats('.')).toBe(0n);
    expect(parseBtcToSats('1e3')).toBe(0n);
    expect(parseBtcToSats('-1')).toBe(0n);
    expect(parseBtcToSats('abc')).toBe(0n);
  });
});
