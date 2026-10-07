import type { TransactionStatus } from '../backend';

/**
 * Map the ckBTC minter's retrieve_btc_status_v2 variant to a transaction status. A withdrawal burns
 * ckBTC immediately but is only complete once the Bitcoin transaction confirms; a reimbursed or
 * too-small request never pays out.
 */
export function withdrawalStatus(statusV2: Record<string, unknown> | null | undefined): TransactionStatus {
  if (!statusV2) return 'pending';
  if ('Confirmed' in statusV2) return 'confirmed';
  if ('Reimbursed' in statusV2 || 'WillReimburse' in statusV2 || 'AmountTooLow' in statusV2) return 'failed';
  return 'pending'; // Unknown, Pending, Signing, Sending, Submitted
}
