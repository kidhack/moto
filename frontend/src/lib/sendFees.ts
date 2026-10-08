/**
 * Send/withdraw fee math. Pure functions (no React, no network) so they can be unit-tested.
 *
 * Who pays what:
 * - Instant (ckBTC to a principal): sender pays amount + ledger fee, plus app fee + ledger fee
 *   for the separate fee transfer. Recipient receives exactly `amount`.
 * - Withdraw (ckBTC -> BTC): sender pays ledger fee for the ICRC-2 approve, the minter burns
 *   `amount` (no ledger fee on burns), plus app fee + ledger fee. The minter deducts its own fee
 *   and the Bitcoin miner fee from `amount`, so the recipient receives less than `amount`.
 */

export const SATS_PER_BTC = 100_000_000n;
/** ckBTC ledger transfer fee (icrc1_fee) at the time of writing; prefer the live value. */
export const DEFAULT_LEDGER_FEE = 10n;

export type SendMode = 'ckbtc' | 'btc';

export interface AppFeeConfig {
  /** Percent of the amount, e.g. 0.5 for 0.5%. */
  percent: number;
  /** Cap in USD. Only applied when a valid BTC/USD price is available. */
  capUsd: number;
}

export interface WithdrawalFees {
  minterFee: bigint;
  bitcoinFee: bigint;
}

export interface SendQuote {
  amount: bigint;
  appFee: bigint;
  /** Ledger fees paid by the sender (transfer/approve + fee transfer). */
  ledgerFees: bigint;
  /** Everything the sender pays on top of `amount` (app fee + ledger fees). */
  senderFee: bigint;
  /** Total debited from the sender's ckBTC balance. */
  totalDebit: bigint;
  /** Fees taken out of `amount` by the minter (withdrawals only). */
  networkFee: bigint;
  /** What the recipient ends up with (estimate for withdrawals). */
  recipientReceives: bigint;
}

/**
 * App fee in sats: `percent` of the amount, capped at `capUsd` worth of BTC, never more than the amount.
 * Without a valid price the cap can't be computed, so the uncapped percentage is charged rather than
 * guessing a price (a wrong guess could make the fee far too high or zero).
 */
export function computeAppFee(amountSats: bigint, btcPriceUsd: number | null | undefined, config: AppFeeConfig): bigint {
  if (amountSats <= 0n || !(config.percent > 0)) return 0n;
  const basisPoints = BigInt(Math.round(config.percent * 100)); // 0.5% -> 50 bp
  const percentFee = (amountSats * basisPoints) / 10_000n;
  let fee = percentFee;
  if (btcPriceUsd && Number.isFinite(btcPriceUsd) && btcPriceUsd > 0 && config.capUsd > 0) {
    const capSats = BigInt(Math.floor((config.capUsd * Number(SATS_PER_BTC)) / btcPriceUsd));
    if (capSats < fee) fee = capSats;
  }
  return fee > amountSats ? amountSats : fee;
}

export function quoteSend(params: {
  mode: SendMode;
  amount: bigint;
  appFee: bigint;
  ledgerFee: bigint;
  withdrawalFees?: WithdrawalFees | null;
}): SendQuote {
  const { mode, amount, appFee, ledgerFee, withdrawalFees } = params;
  const feeTransferCost = appFee > 0n ? appFee + ledgerFee : 0n;
  // Instant: the transfer itself pays a ledger fee. Withdraw: the approve pays it (burns are free).
  const ledgerFees = ledgerFee + (appFee > 0n ? ledgerFee : 0n);
  const senderFee = ledgerFee + feeTransferCost;
  const networkFee = mode === 'btc' && withdrawalFees ? withdrawalFees.minterFee + withdrawalFees.bitcoinFee : 0n;
  const received = amount - networkFee;
  return {
    amount,
    appFee,
    ledgerFees,
    senderFee,
    totalDebit: amount + senderFee,
    networkFee,
    recipientReceives: received > 0n ? received : 0n,
  };
}

/**
 * Largest amount whose total debit (amount + app fee + ledger fees) fits in `balance`.
 * The app fee depends on the amount, so binary-search instead of solving algebraically.
 */
export function maxSendable(params: {
  balance: bigint;
  mode: SendMode;
  ledgerFee: bigint;
  appFeeFor: (amount: bigint) => bigint;
}): bigint {
  const { balance, mode, ledgerFee, appFeeFor } = params;
  const fits = (amount: bigint) =>
    quoteSend({ mode, amount, appFee: appFeeFor(amount), ledgerFee }).totalDebit <= balance;
  let lo = 0n;
  let hi = balance;
  if (hi <= 0n) return 0n;
  while (lo < hi) {
    const mid = (lo + hi + 1n) / 2n;
    if (fits(mid)) lo = mid;
    else hi = mid - 1n;
  }
  return lo;
}

/**
 * Parse a user-entered BTC amount ("0.29", "1,000.5") to sats exactly, without floating point.
 * Digits past 8 decimal places are truncated. Returns 0n for empty/invalid input.
 */
export function parseBtcToSats(input: string): bigint {
  const clean = input.replace(/,/g, '').trim();
  if (!/^\d*\.?\d*$/.test(clean) || clean === '' || clean === '.') return 0n;
  const [whole = '', frac = ''] = clean.split('.');
  const fracPadded = (frac + '00000000').slice(0, 8);
  return BigInt(whole || '0') * SATS_PER_BTC + BigInt(fracPadded);
}
