import { describe, expect, it } from 'vitest';
import { withdrawalStatus } from './withdrawalStatus';

describe('withdrawalStatus', () => {
  it('is confirmed only once the Bitcoin transaction confirms', () => {
    expect(withdrawalStatus({ Confirmed: { txid: [] } })).toBe('confirmed');
    for (const s of ['Unknown', 'Pending', 'Signing']) expect(withdrawalStatus({ [s]: null })).toBe('pending');
    expect(withdrawalStatus({ Sending: { txid: [] } })).toBe('pending');
    expect(withdrawalStatus({ Submitted: { txid: [] } })).toBe('pending');
    expect(withdrawalStatus(null)).toBe('pending');
  });
  it('is failed when the minter will not pay out', () => {
    expect(withdrawalStatus({ AmountTooLow: null })).toBe('failed');
    expect(withdrawalStatus({ Reimbursed: {} })).toBe('failed');
    expect(withdrawalStatus({ WillReimburse: {} })).toBe('failed');
  });
});
