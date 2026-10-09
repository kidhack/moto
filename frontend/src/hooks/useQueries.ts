import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Principal } from '@dfinity/principal';
import { HttpAgent, Actor } from '@dfinity/agent';
import { IcrcLedgerCanister, IcrcTransferError } from '@dfinity/ledger-icrc';
import { computeAppFee, type WithdrawalFees } from '../lib/sendFees';
import { useActor } from './useActor';
import { IC_HOST } from '../lib/ic';
import { useCkBTCMinter, createCkBTCMinterIDL, CKBTC_MINTER_CANISTER_ID, type CkBTCMinter } from './useCkBTCMinter';
import { useCkBTCLedger, CKBTC_LEDGER_CANISTER_ID } from './useCkBTCLedger';
import { useCkBTCTransactions } from './useCkBTCTransactions';
import { useInternetIdentity } from './useInternetIdentity';
import type { UserWallet, CanisterWallet, BitcoinAddress, Transaction, BitcoinWalletActor } from '../backend';
import { setSessionWithdrawal } from '../lib/sessionWithdrawalStore';
import { isValidBitcoinAddress } from '../utils/addressValidation';
import { checkPendingDeposits } from '../utils/bitcoinTestnetChecker';

/** Which price sources contributed (for transparency / FAQ system status) */
export interface PriceSourceStatus {
  coinGecko: boolean;
  mempool: boolean;
  coinDesk?: boolean;
  binance?: boolean;
  /** True when proxy (allorigins) was used - indicates degraded source */
  proxyUsed?: boolean;
}

export interface BTCPriceData {
  /** BTC price in each fiat currency, keyed by lowercase code (e.g. 'usd', 'eur') */
  prices: Record<string, number>;
  /** Convenience accessor — always returns the USD price (or fallback) */
  usd: number;
  lastUpdated: number;
  /** Which sources contributed to this price (undefined when using cached/stale data) */
  priceSourceStatus?: PriceSourceStatus;
}

const BTC_PRICE_STORAGE_KEY = 'moto_btc_price_v2';
const STALE_PRICE_THRESHOLD_SEC = 5 * 60; // 5 min

function getStoredBtcPrice(): BTCPriceData | null {
  try {
    const raw = localStorage.getItem(BTC_PRICE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.prices && typeof parsed.prices === 'object' && typeof parsed.lastUpdated === 'number') {
      const priceSourceStatus = parsed.priceSourceStatus && typeof parsed.priceSourceStatus.coinGecko === 'boolean' && typeof parsed.priceSourceStatus.mempool === 'boolean'
        ? parsed.priceSourceStatus as PriceSourceStatus
        : undefined;
      return {
        prices: parsed.prices,
        usd: parsed.prices.usd ?? 0,
        lastUpdated: parsed.lastUpdated,
        priceSourceStatus,
      };
    }
    // Migrate from old v1 format { usd, lastUpdated }
    if (typeof parsed?.usd === 'number' && typeof parsed?.lastUpdated === 'number') {
      const migrated: BTCPriceData = { prices: { usd: parsed.usd }, usd: parsed.usd, lastUpdated: parsed.lastUpdated };
      setStoredBtcPrice(migrated);
      return migrated;
    }
  } catch {
    // ignore
  }
  return null;
}

function setStoredBtcPrice(data: BTCPriceData): void {
  try {
    localStorage.setItem(BTC_PRICE_STORAGE_KEY, JSON.stringify({
      prices: data.prices,
      lastUpdated: data.lastUpdated,
      priceSourceStatus: data.priceSourceStatus,
    }));
  } catch {
    // ignore
  }
}

/** True when price data is missing or older than STALE_PRICE_THRESHOLD_SEC. */
export function isPriceStale(data: BTCPriceData | undefined): boolean {
  if (!data) return true;
  const ageSec = Date.now() / 1000 - data.lastUpdated;
  return ageSec > STALE_PRICE_THRESHOLD_SEC;
}

// --- App fee (0.5%, max $100, no minimum) ---
function envNumber(value: string | undefined, fallback: number): number {
  const n = value === undefined || value.trim() === '' ? NaN : Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}
const APP_FEE_CONFIG = {
  percent: envNumber(import.meta.env.VITE_FEE_PERCENT, 0.5),
  capUsd: envNumber(import.meta.env.VITE_FEE_CAP_USD, 100),
};
/** Treasury principal that receives app fees (ckBTC). */
export const FEE_TREASURY_PRINCIPAL =
  (import.meta.env.VITE_FEE_TREASURY_PRINCIPAL as string)?.trim() ||
  'c65im-m2qxx-7nvqc-fl62p-4xqmt-emdce-tmtqf-fggqq-3zh4d-yhdre-2qe';

/** App fee in sats for an amount (see computeAppFee). Pass null when no live price is available. */
export function computeFeeSats(amountSats: bigint, btcPriceUsd: number | null | undefined): bigint {
  return computeAppFee(amountSats, btcPriceUsd, APP_FEE_CONFIG);
}

export function useWalletInfo() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const ensureWallet = useEnsureWallet();
  const { balance: ckbtcBalance, isFetching: isCkbtcBalanceFetching, principalUsed: ledgerPrincipal } = useCkBTCLedger();
  const { address: ckbtcAddress, principalUsed: minterPrincipal } = useCkBTCMinter();
  const queryClient = useQueryClient();
  
  // Get real Bitcoin address for transaction queries
  const realBitcoinAddress = ckbtcAddress && isValidBitcoinAddress(ckbtcAddress) ? ckbtcAddress : '';
  const { transactions: ckbtcTransactions } = useCkBTCTransactions(realBitcoinAddress);

  // Enable query when we have an actor and it's ready
  // Don't require ensureWallet.isSuccess - we'll refetch when it succeeds
  const isEnabled = !!actor && !isFetching;
  
  // Refetch wallet info when ensureWallet succeeds
  useEffect(() => {
    if (ensureWallet.isSuccess && actor && !isFetching) {
      console.log('useWalletInfo: ensureWallet succeeded, refetching wallet info...');
      queryClient.invalidateQueries({ queryKey: ['walletInfo'] });
    }
  }, [ensureWallet.isSuccess, actor, isFetching, queryClient]);

  // Refetch wallet info when ckBTC balance becomes available (important for initial load)
  useEffect(() => {
    if (ckbtcBalance !== null && ckbtcBalance !== undefined && actor && !isFetching && !isCkbtcBalanceFetching) {
      console.log('useWalletInfo: ckBTC balance available, invalidating query to refetch wallet info...');
      queryClient.invalidateQueries({ queryKey: ['walletInfo'] });
    }
  }, [ckbtcBalance, actor, isFetching, isCkbtcBalanceFetching, queryClient]);
  
  // Refetch wallet info when ckBTC transactions change (including a pending deposit's
  // confirmation count, or one disappearing once it's credited)
  const ckbtcTransactionsKey = ckbtcTransactions
    .map((tx) => `${tx.id}:${tx.status}:${tx.deposit?.confirmations ?? ''}`)
    .join('|');
  useEffect(() => {
    if (actor && !isFetching) {
      queryClient.invalidateQueries({ queryKey: ['walletInfo'] });
    }
  }, [ckbtcTransactionsKey, actor, isFetching, queryClient]);
  
  // Debug logging
  useEffect(() => {
    console.log('useWalletInfo: Query state', {
      enabled: isEnabled,
      hasActor: !!actor,
      isFetching,
      ensureWalletSuccess: ensureWallet.isSuccess,
      ensureWalletError: ensureWallet.isError,
      ensureWalletPending: ensureWallet.isPending,
      ckbtcBalance: ckbtcBalance?.toString(),
      isCkbtcBalanceFetching,
      ledgerPrincipal,
      minterPrincipal,
      principalsMatch: ledgerPrincipal === minterPrincipal,
    });
    
    // Verify principal consistency
    if (ledgerPrincipal && minterPrincipal) {
      if (ledgerPrincipal !== minterPrincipal) {
        console.warn('⚠️ PRINCIPAL MISMATCH DETECTED!');
        console.warn('  Ledger principal:', ledgerPrincipal);
        console.warn('  Minter principal:', minterPrincipal);
        console.warn('  This could cause balance display issues!');
      } else {
        console.log('✅ Principal verification: Ledger and Minter principals match');
      }
    }
  }, [isEnabled, actor, isFetching, ensureWallet.isSuccess, ensureWallet.isError, ensureWallet.isPending, ckbtcBalance, isCkbtcBalanceFetching, ledgerPrincipal, minterPrincipal]);

  return useQuery<UserWallet | null>({
    queryKey: ['walletInfo', ckbtcBalance?.toString(), ckbtcAddress, ckbtcTransactions.length],
    queryFn: async () => {
      if (!actor) {
        console.log('useWalletInfo: No actor available');
        return null;
      }
      
      try {
        console.log('useWalletInfo: Fetching wallet info...');
        let wallet: CanisterWallet | null = null;
        try {
          const raw = await actor.getWalletInfo();
          // Candid opt returns [value] for Some, [] for None in @dfinity/agent
          wallet = raw.length > 0 ? raw[0] ?? null : null;
        } catch (error) {
          // Wallet might not exist in custom canister yet - that's OK, we can still show balance from ledger
          console.log('useWalletInfo: Wallet not found in custom canister (this is OK if we have ledger balance)');
        }
        
        // The ckBTC ledger is the only balance source; the canister stores metadata only.
        const finalBalance = ckbtcBalance ?? BigInt(0);

        // NEVER use fake address from custom canister - only use real ckBTC address
        const realBitcoinAddress = ckbtcAddress && isValidBitcoinAddress(ckbtcAddress) 
          ? ckbtcAddress 
          : '';
        
        // Check Bitcoin testnet for pending deposits (if in testnet mode and we have an address)
        // Check for pending Bitcoin deposits (both testnet and mainnet)
        if (realBitcoinAddress && identity) {
          try {
            const principal = identity.getPrincipal();
            const principalText = principal.toText();
            
            console.log('useWalletInfo: Checking for pending Bitcoin deposits...');
            const depositCheck = await checkPendingDeposits(realBitcoinAddress, principalText);
            
            if (depositCheck.hasPendingDeposits) {
              console.warn('useWalletInfo: ⚠️⚠️⚠️ PENDING BITCOIN DEPOSIT DETECTED ⚠️⚠️⚠️');
              console.warn('useWalletInfo: Pending amount:', depositCheck.pendingAmount, 'satoshis');
              console.warn('useWalletInfo: Pending amount (BTC):', depositCheck.pendingAmount / 100000000);
              console.warn('useWalletInfo: Unconfirmed transactions:', depositCheck.transactions.length);
              console.warn('useWalletInfo: This deposit has NOT been converted to ckBTC yet');
              console.warn('useWalletInfo: The minter should process this within 10-30 minutes');
              console.warn('useWalletInfo: Principal:', principalText);
              console.warn('useWalletInfo: If it\'s been hours, check the minter dashboard or contact support');
              
              // Log each pending transaction
              depositCheck.transactions.forEach((tx, index) => {
                console.warn(`useWalletInfo: Pending TX ${index + 1}:`, {
                  txid: tx.txid,
                  amount: tx.amount,
                  amountBTC: tx.amount / 100000000,
                  confirmed: tx.confirmed,
                });
              });
            } else if (depositCheck.confirmedAmount > 0) {
              console.log('useWalletInfo: ✅ All Bitcoin deposits are confirmed');
              console.log('useWalletInfo: Confirmed amount:', depositCheck.confirmedAmount, 'satoshis');
              console.log('useWalletInfo: Confirmed amount (BTC):', depositCheck.confirmedAmount / 100000000);
              console.log('useWalletInfo: If balance is still 0, the minter may still be processing the conversion');
            } else {
              console.log('useWalletInfo: No Bitcoin deposits found for this address');
            }
          } catch (btcError) {
            console.warn('useWalletInfo: Could not check Bitcoin deposits:', btcError);
          }
        }
        
        // Deduplicate ledger transactions by ID and sort by timestamp (newest first)
        const allTransactions: Transaction[] = [...ckbtcTransactions];
        
        // Deduplicate transactions by ID
        const transactionMap = new Map<string, Transaction>();
        allTransactions.forEach(tx => {
          // Keep the transaction with the most recent timestamp if duplicates exist
          const existing = transactionMap.get(tx.id);
          if (!existing || Number(tx.timestamp) > Number(existing.timestamp)) {
            transactionMap.set(tx.id, tx);
          }
        });
        
        // Sort by timestamp (newest first)
        const mergedTransactions = Array.from(transactionMap.values())
          .sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
        
        // If we have a balance from the ledger, create a wallet object even if custom canister doesn't have one
        // This ensures the balance is displayed even if the wallet hasn't been created in the custom canister yet
        const mergedWallet: UserWallet | null = wallet ? {
          ...wallet,
          balance: finalBalance,
          bitcoinAddress: realBitcoinAddress, // Use real address or empty string (never fake)
          transactions: mergedTransactions, // Use merged transactions from both sources
        } : (finalBalance > 0 || realBitcoinAddress || mergedTransactions.length > 0) ? {
          principal: identity ? identity.getPrincipal() : Principal.anonymous(),
          bitcoinAddress: realBitcoinAddress,
          transactions: mergedTransactions,
          balance: finalBalance,
          onboardingComplete: true,
          walletName: '',
          preferredCurrency: '',
          preferredLanguage: '',
          createdAt: BigInt(Date.now()),
          lastUpdated: BigInt(Date.now()),
        } : null;
        
        console.log('useWalletInfo: Wallet info received:', mergedWallet ? {
          balance: mergedWallet.balance.toString(),
          transactionsCount: mergedWallet.transactions?.length || 0,
          address: mergedWallet.bitcoinAddress,
          hasWalletInCanister: !!wallet,
        } : 'null');
        
        return mergedWallet;
      } catch (error) {
        console.error('useWalletInfo: Error fetching wallet info:', error);
        // If wallet doesn't exist, return null instead of throwing
        // This prevents 503 errors when wallet hasn't been created yet
        if (error instanceof Error && (error.message.includes('Wallet not found') || error.message.includes('does not exist'))) {
          console.log('useWalletInfo: Wallet not found, returning null');
          return null;
        }
        throw error;
      }
    },
    // Enable when:
    // 1. Using dummy data, OR
    // 2. We have an actor AND actor is ready
    // We'll refetch when ensureWallet succeeds via useEffect
    enabled: isEnabled,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    refetchOnMount: true,
    refetchInterval: 10000,
    staleTime: 0, // Always consider data stale to ensure frequent updates
  });
}

export function useWalletAddress() {
  // Use ckBTC minter to get address directly from principal (no custom canister needed)
  // NEVER fall back to fake address from custom canister - only use real ckBTC address
  const { address: ckbtcAddress, isFetching: isCkbtcFetching, error: ckbtcError } = useCkBTCMinter();

  return useQuery<BitcoinAddress>({
    queryKey: ['walletAddress', ckbtcAddress],
    queryFn: async () => {
      // Wait for ckBTC minter to finish loading
      if (isCkbtcFetching) {
        throw new Error('Waiting for ckBTC minter to load address...');
      }

      // If we have a ckBTC address, validate it and use it (this is the real Bitcoin address)
      if (ckbtcAddress) {
        if (!isValidBitcoinAddress(ckbtcAddress)) {
          console.error('useWalletAddress: ckBTC minter returned invalid address:', ckbtcAddress);
          throw new Error(`Invalid Bitcoin address received from ckBTC minter: ${ckbtcAddress}`);
        }
        console.log('useWalletAddress: Using validated ckBTC minter address:', ckbtcAddress);
        return ckbtcAddress;
      }

      // If ckBTC minter failed, throw error - don't use fake address
      if (ckbtcError) {
        console.error('useWalletAddress: ckBTC minter failed, not using fake address:', ckbtcError);
        throw new Error(`Failed to get Bitcoin address from ckBTC minter: ${ckbtcError.message}`);
      }

      // If we get here, ckBTC minter hasn't loaded yet or returned null
      throw new Error('Failed to get wallet address: ckBTC minter did not return an address');
    },
    enabled: !isCkbtcFetching,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
}

export function useOnboardingStatus() {
  const { actor, isFetching } = useActor();
  const ensureWallet = useEnsureWallet();
  const { address: ckbtcAddress, isFetching: isCkbtcFetching } = useCkBTCMinter();

  return useQuery<boolean>({
    queryKey: ['onboardingStatus'],
    queryFn: async () => {
      if (!actor) return false;
      try {
        return await actor.isOnboardingComplete();
      } catch (error) {
        console.error('Error fetching onboarding status:', error);
        // If wallet doesn't exist yet, onboarding is not complete
        // Don't throw - return false instead to prevent 503 errors
        return false;
      }
    },
    enabled: Boolean(!!actor && !isFetching && (!isCkbtcFetching || !!ckbtcAddress || ensureWallet.isSuccess || ensureWallet.isError)),
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(500 * 2 ** attemptIndex, 5000),
    staleTime: 0, // Always refetch to ensure we have the latest status
  });
}

export function useEnsureWallet() {
  // Use ckBTC minter to get address (no custom canister needed for address on production)
  // ckBTC minter works from both localhost and production - it provides a Bitcoin address for each principal
  const { address: ckbtcAddress, isFetching: isCkbtcFetching, error: ckbtcError } = useCkBTCMinter();
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<BitcoinAddress, Error>({
    mutationFn: async () => {
      console.log('useEnsureWallet: Ensuring wallet exists...', {
        ckbtcAddress,
        isCkbtcFetching,
        ckbtcError: ckbtcError?.message,
        hasActor: !!actor,
      });
      const startTime = Date.now();

      try {
        // Always ensure wallet exists in the custom canister (even if we have ckBTC address)
        // This is needed to create the wallet record so we can fetch balance and transactions
        if (!actor) {
          throw new Error('Actor not available. Cannot ensure wallet exists.');
        }

        const timeout = <T,>(promise: Promise<T>, label: string) =>
          Promise.race([
            promise,
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error(`${label} timed out after 30 seconds. Please check your connection and try again.`)), 30000)
            ),
          ]);

        await timeout(actor.ensureWalletExists(), 'Wallet setup');

        // The canister asks the ckBTC minter for this principal's deposit address (never trusts the client),
        // so other MOTO users sending to it get an instant ckBTC transfer. Non-fatal: without it, incoming
        // sends from MOTO users fall back to a normal Bitcoin deposit.
        let registered = '';
        try {
          registered = await timeout(actor.registerDepositAddress(), 'Address registration');
        } catch (err) {
          console.warn('useEnsureWallet: registerDepositAddress failed (non-fatal):', err);
        }
        if (registered && ckbtcAddress && registered.toLowerCase() !== ckbtcAddress.toLowerCase()) {
          // Backend minter config doesn't match this build's network (e.g. testnet vs mainnet).
          console.error('useEnsureWallet: registered deposit address does not match minter address shown in app');
        }
        console.log(`useEnsureWallet: wallet ready in ${Date.now() - startTime}ms`);
        return registered;
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`useEnsureWallet: Error after ${duration}ms:`, error);
        
        if (error instanceof Error) {
          throw error;
        }
        throw new Error(`Failed to ensure wallet exists: ${String(error)}`);
      }
    },
    onSuccess: () => {
      // DO NOT cache the fake address from custom canister
      // Only the ckBTC minter provides real Bitcoin addresses
      // The custom canister address is only used internally for wallet setup
      // Invalidate related queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['walletInfo'] });
      queryClient.invalidateQueries({ queryKey: ['onboardingStatus'] });
      // DO NOT set walletAddress cache - let useWalletAddress handle it with real ckBTC address
    },
    onError: (error) => {
      console.error('useEnsureWallet: onError called:', error);
    },
    retry: 1,
    retryDelay: 2000,
  });
}

export function useCompleteOnboarding() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<void, Error>({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      try {
        await actor.completeOnboarding();
      } catch (error) {
        console.error('Error completing onboarding:', error);
        throw error;
      }
    },
    onSuccess: () => {
      // Update cache immediately to show dashboard
      queryClient.setQueryData(['onboardingStatus'], true);
      // Then invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['onboardingStatus'] });
      queryClient.invalidateQueries({ queryKey: ['walletInfo'] });
    },
    retry: 2,
    retryDelay: 1000,
  });
}

export function useResetOnboarding() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<void, Error>({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      try {
        await actor.resetOnboarding();
      } catch (error) {
        console.error('Error resetting onboarding:', error);
        throw error;
      }
    },
    onSuccess: () => {
      // Update cache immediately
      queryClient.setQueryData(['onboardingStatus'], false);
      // Then invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['onboardingStatus'] });
      queryClient.invalidateQueries({ queryKey: ['walletInfo'] });
    },
    retry: 2,
  });
}

export function useSignOutAndReset() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<void, Error>({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      try {
        await actor.signOutAndReset();
      } catch (error) {
        console.error('Error signing out and resetting:', error);
        throw error;
      }
    },
    onSuccess: () => {
      // Clear all cached queries
      queryClient.clear();
    },
    retry: 1,
  });
}

/** Normalize Bitcoin address for lookup: bech32 (bc1/tb1) is case-insensitive, use lowercase to match canister. */
function normalizeAddressForLookup(address: string): string {
  const t = address.trim();
  if (/^(bc1|tb1)/i.test(t)) return t.toLowerCase();
  return t;
}

function optPrincipalText(raw: [] | [Principal]): string | null {
  return raw.length > 0 && raw[0] ? raw[0].toText() : null;
}

/**
 * Re-check, with an update call (agreed on by the subnet rather than one replica), that a Bitcoin
 * address still resolves to the principal the user confirmed. Throws if it doesn't.
 */
async function verifyRecipient(actor: BitcoinWalletActor, address: string, expectedPrincipal: string) {
  const resolved = optPrincipalText(await actor.resolveRecipient(normalizeAddressForLookup(address)));
  if (resolved !== expectedPrincipal) {
    throw new Error('Recipient could not be verified. Please review the address and try again.');
  }
}

/** Look up principal by Bitcoin address (for smart send: instant ckBTC vs withdraw to BTC). */
export function usePrincipalByBitcoinAddress(address: string | null) {
  const { actor } = useActor();
  const normalized = address && address.trim() ? normalizeAddressForLookup(address) : '';
  return useQuery<string | null>({
    queryKey: ['principalByBitcoinAddress', normalized || ''],
    queryFn: async () => {
      if (!actor || !normalized) return null;
      try {
        const raw = await actor.getPrincipalByBitcoinAddress(normalized);
        return optPrincipalText(raw);
      } catch (e) {
        console.warn('getPrincipalByBitcoinAddress: backend call failed', e);
        return null;
      }
    },
    enabled: Boolean(actor && normalized.length > 0),
    staleTime: 0, // always refetch so we never show stale "Bitcoin" after receiver syncs
  });
}

/** How long the minter's ICRC-2 allowance stays valid for a withdrawal. */
const WITHDRAW_APPROVAL_TTL_NS = 10n * 60n * 1_000_000_000n;

/**
 * created_at_time (ns) for one confirmed send. Create it once when the user reaches the confirm step
 * and reuse it for every attempt: the ckBTC ledger rejects an identical call within 24h as Duplicate,
 * so a retry after a timeout can't charge or pay twice.
 */
export function newSendTimestamp(): bigint {
  return BigInt(Date.now() + networkTimeOffsetMs) * 1_000_000n;
}

/**
 * IC network time minus device time. The ledger rejects created_at_time more than ~1 min in the
 * future or over 24h old, so a wrong device clock would otherwise make every send fail.
 */
let networkTimeOffsetMs = 0;

async function createSyncedAgent(identity?: unknown) {
  const agent = await HttpAgent.create({ identity: identity as never, host: IC_HOST, shouldSyncTime: true });
  const diff = agent.getTimeDiffMsecs();
  if (Number.isFinite(diff) && diff !== 0) networkTimeOffsetMs = diff;
  return agent;
}

async function createLedgerSession(identity: unknown) {
  const agent = await createSyncedAgent(identity);
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (isLocal) {
    try {
      await agent.fetchRootKey();
    } catch {
      // ignore
    }
  }
  const ledger = IcrcLedgerCanister.create({ agent, canisterId: Principal.fromText(CKBTC_LEDGER_CANISTER_ID) });
  return { agent, ledger };
}

/** Run a ledger call; a Duplicate rejection means this exact call already succeeded, so return its block. */
async function idempotentLedgerCall(call: () => Promise<bigint>): Promise<bigint> {
  try {
    return await call();
  } catch (err) {
    const errorType = err instanceof IcrcTransferError ? (err.errorType as Record<string, unknown>) : null;
    if (errorType && typeof errorType === 'object' && 'Duplicate' in errorType) {
      return (errorType.Duplicate as { duplicate_of: bigint }).duplicate_of;
    }
    throw err;
  }
}

/**
 * Pay the app fee to the treasury. Runs only after the user's send succeeded, and never fails the send:
 * the user's money already moved, so a failed fee transfer is our loss, not their error.
 */
async function collectAppFee(ledger: IcrcLedgerCanister, appFee: bigint, createdAt: bigint) {
  if (!FEE_TREASURY_PRINCIPAL || appFee <= 0n) return;
  try {
    await idempotentLedgerCall(() =>
      ledger.transfer({
        to: { owner: Principal.fromText(FEE_TREASURY_PRINCIPAL), subaccount: [] },
        amount: appFee,
        created_at_time: createdAt,
      })
    );
  } catch (err) {
    console.error('App fee transfer failed (send itself succeeded):', err);
  }
}

/**
 * Instant ckBTC transfer to another principal. The send goes first; the app fee (computed by the
 * caller, so it matches the confirm screen) is collected after it succeeds.
 */
export function useTransferCkBTC() {
  const { identity } = useInternetIdentity();
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<
    { block_index: bigint },
    Error,
    {
      toPrincipal: string;
      amount: bigint;
      appFee: bigint;
      /** From newSendTimestamp(), reused across retries of the same send. */
      createdAt: bigint;
      /** The Bitcoin address the principal was looked up from (omit for a pasted principal). */
      viaAddress?: string;
    }
  >({
    mutationFn: async ({ toPrincipal, amount, appFee, createdAt, viaAddress }) => {
      if (!identity) throw new Error('Not authenticated');
      if (viaAddress) {
        if (!actor) throw new Error('Not connected');
        await verifyRecipient(actor, viaAddress, toPrincipal);
      }
      const { ledger } = await createLedgerSession(identity);
      const blockIndex = await idempotentLedgerCall(() =>
        ledger.transfer({
          to: { owner: Principal.fromText(toPrincipal), subaccount: [] },
          amount,
          created_at_time: createdAt,
        })
      );
      await collectAppFee(ledger, appFee, createdAt);
      return { block_index: blockIndex };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['walletInfo'] });
    },
    // Never auto-retry money movement. Re-tapping Confirm reuses createdAt, so the ledger dedups it.
    retry: 0,
  });
}

async function listWithdrawalBlocks(minter: CkBTCMinter, owner: Principal): Promise<Set<string> | null> {
  try {
    const rows = await minter.retrieve_btc_status_v2_by_account([{ owner, subaccount: [] }]);
    return new Set(rows.map((r) => r.block_index.toString()));
  } catch {
    return null;
  }
}

/** ckBTC -> BTC withdrawal: ICRC-2 approve, then minter retrieve_btc_with_approval, then the app fee. */
export function useRetrieveBtc() {
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation<
    { block_index: bigint },
    Error,
    { toAddress: string; amount: bigint; appFee: bigint; createdAt: bigint }
  >({
    mutationFn: async ({ toAddress, amount, appFee, createdAt }) => {
      if (!identity) throw new Error('Not authenticated');
      const { agent, ledger } = await createLedgerSession(identity);
      const owner = (identity as { getPrincipal: () => Principal }).getPrincipal();
      const minterActor = Actor.createActor(createCkBTCMinterIDL(), {
        agent,
        canisterId: CKBTC_MINTER_CANISTER_ID,
      }) as unknown as CkBTCMinter;

      const before = await listWithdrawalBlocks(minterActor, owner);

      // Same createdAt/expires_at on every attempt: a repeat approve is a ledger Duplicate (no new
      // allowance), so a retry can't let the minter burn twice.
      await idempotentLedgerCall(() =>
        ledger.approve({
          amount,
          spender: { owner: Principal.fromText(CKBTC_MINTER_CANISTER_ID), subaccount: [] },
          created_at_time: createdAt,
          expires_at: createdAt + WITHDRAW_APPROVAL_TTL_NS,
        })
      );

      type RetrieveResult = Awaited<ReturnType<CkBTCMinter['retrieve_btc_with_approval']>>;
      let result: RetrieveResult;
      try {
        result = await minterActor.retrieve_btc_with_approval({ address: toAddress, amount, from_subaccount: [] });
      } catch {
        // Network error / timeout: the request may still have gone through. Look before reporting failure.
        const after = before ? await listWithdrawalBlocks(minterActor, owner) : null;
        const added = after && before ? [...after].filter((b) => !before.has(b)) : [];
        if (added.length !== 1) {
          throw new Error('Could not confirm the withdrawal. Check your history before trying again.');
        }
        result = { Ok: { block_index: BigInt(added[0]) } };
      }

      if ('Err' in result) {
        const err = result.Err;
        if ('MalformedAddress' in err) throw new Error(`Invalid address: ${err.MalformedAddress}`);
        if ('AlreadyProcessing' in err) throw new Error('A withdrawal is already in progress. Please wait.');
        if ('AmountTooLow' in err) throw new Error(`Amount below minimum: ${err.AmountTooLow} satoshis`);
        if ('InsufficientFunds' in err) throw new Error(`Insufficient balance. Available: ${err.InsufficientFunds.balance} satoshis`);
        if ('InsufficientAllowance' in err) {
          // A repeat attempt reuses the original approve (ledger Duplicate), whose allowance an earlier
          // successful attempt already used up.
          throw new Error('This withdrawal may already have been submitted. Check your history before trying again.');
        }
        if ('TemporarilyUnavailable' in err) throw new Error(err.TemporarilyUnavailable);
        if ('GenericError' in err) throw new Error(err.GenericError.error_message);
        throw new Error('Withdrawal failed');
      }
      const blockIndex = result.Ok.block_index;

      await collectAppFee(ledger, appFee, createdAt);
      return { block_index: blockIndex };
    },
    onSuccess: (data, variables) => {
      setSessionWithdrawal(data.block_index.toString(), variables.toAddress);
      queryClient.invalidateQueries({ queryKey: ['walletInfo'] });
    },
    retry: 0,
  });
}

/** Live ckBTC ledger transfer fee (icrc1_fee). */
export function useLedgerFee() {
  return useQuery<bigint>({
    queryKey: ['ckbtcLedgerFee'],
    queryFn: async () => {
      // Also syncs the network clock offset before the user reaches Confirm.
      const agent = await createSyncedAgent();
      const ledger = IcrcLedgerCanister.create({ agent, canisterId: Principal.fromText(CKBTC_LEDGER_CANISTER_ID) });
      return ledger.transactionFee({ certified: false });
    },
    staleTime: 60 * 60 * 1000,
    retry: 2,
  });
}

export interface WithdrawalInfo {
  minAmount: bigint;
  minConfirmations: number;
  /** Minimum BTC deposit the minter will convert; smaller UTXOs are ignored. */
  minDeposit: bigint | null;
}

function createMinterQueryActor(agent: HttpAgent) {
  return Actor.createActor(createCkBTCMinterIDL(), {
    agent,
    canisterId: CKBTC_MINTER_CANISTER_ID,
  }) as unknown as CkBTCMinter;
}

/** Minter parameters for withdrawals/deposits (live from the minter canister). */
export function useWithdrawalInfo() {
  return useQuery<WithdrawalInfo>({
    queryKey: ['ckbtcMinterInfo'],
    queryFn: async () => {
      const info = await createMinterQueryActor(await HttpAgent.create({ host: IC_HOST })).get_minter_info();
      return {
        minAmount: info.retrieve_btc_min_amount,
        minConfirmations: Number(info.min_confirmations),
        minDeposit: info.deposit_btc_min_amount?.[0] ?? null,
      };
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: 1500,
  });
}

/** Fees the minter will deduct from a withdrawal of `amount` (estimate; set by the Bitcoin network). */
export function useWithdrawalFeeEstimate(amount: bigint, enabled: boolean) {
  return useQuery<WithdrawalFees>({
    queryKey: ['ckbtcWithdrawalFee', amount.toString()],
    queryFn: async () => {
      const fee = await createMinterQueryActor(await HttpAgent.create({ host: IC_HOST })).estimate_withdrawal_fee({
        amount: amount > 0n ? [amount] : [],
      });
      return { minterFee: fee.minter_fee, bitcoinFee: fee.bitcoin_fee };
    },
    enabled,
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
    retry: 2,
  });
}


import { LIVE_CURRENCY_CG_KEYS } from '../data/currencies';

const ENABLE_PROXY_FALLBACK = import.meta.env.VITE_ENABLE_PROXY_FALLBACK === 'true';

const COINGECKO_PRICE_URL =
  `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=${LIVE_CURRENCY_CG_KEYS.join(',')}&include_last_updated_at=true`;
// Test coins have no price of their own; testnet builds show the mainnet BTC price.
const MEMPOOL_PRICE_URL = 'https://mempool.space/api/v1/prices';
const COINDESK_PRICE_URL = 'https://api.coindesk.com/v1/bpi/currentprice.json';
const BINANCE_PRICE_URL = 'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT';

/** Mempool currencies: USD, EUR, GBP, CAD, CHF, AUD, JPY (lowercase keys) */
const MEMPOOL_CURRENCY_KEYS = ['usd', 'eur', 'gbp', 'cad', 'chf', 'aud', 'jpy'] as const;

const PRICE_AGREEMENT_THRESHOLD = 0.02;   // 2% max divergence
const PRICE_SANITY_JUMP_THRESHOLD = 0.20; // 20% max jump from last good

/** No price known: every fiat lookup returns 0 ("unavailable"). Never a made-up number. */
function makeFallbackPriceData(): BTCPriceData {
  return { prices: {}, usd: 0, lastUpdated: 0 };
}

function isPriceValid(price: number): boolean {
  return typeof price === 'number' && !Number.isNaN(price) && price > 0 && Number.isFinite(price);
}

function isPriceWithinBounds(price: number, lastGoodUsd: number | undefined): boolean {
  if (lastGoodUsd == null || lastGoodUsd <= 0) return true;
  const ratio = price / lastGoodUsd;
  return ratio >= 1 - PRICE_SANITY_JUMP_THRESHOLD && ratio <= 1 + PRICE_SANITY_JUMP_THRESHOLD;
}

async function fetchBtcPriceFromCoinGecko(url: string): Promise<BTCPriceData> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch BTC price: ${response.statusText}`);
  const data = await response.json();
  if (!data.bitcoin || typeof data.bitcoin.usd !== 'number') {
    throw new Error('Invalid response format from CoinGecko API');
  }
  const prices: Record<string, number> = {};
  for (const [key, val] of Object.entries(data.bitcoin)) {
    if (typeof val === 'number' && key !== 'last_updated_at' && isPriceValid(val as number)) {
      prices[key.toLowerCase()] = val as number;
    }
  }
  const usd = prices.usd;
  if (usd === undefined) throw new Error('CoinGecko response has no USD price');
  const lastUpdated = data.bitcoin.last_updated_at ?? Date.now() / 1000;
  return { prices, usd, lastUpdated };
}

/** Mempool.space returns { time, USD, EUR, ... } with flat numbers */
async function fetchBtcPriceFromMempool(): Promise<{ usd: number; prices: Record<string, number>; lastUpdated: number }> {
  const response = await fetch(MEMPOOL_PRICE_URL);
  if (!response.ok) throw new Error(`Failed to fetch from Mempool: ${response.statusText}`);
  const data = await response.json();
  const lastUpdated = typeof data.time === 'number' ? data.time : Date.now() / 1000;
  const prices: Record<string, number> = {};
  for (const k of MEMPOOL_CURRENCY_KEYS) {
    const val = data[k.toUpperCase()];
    if (typeof val === 'number' && isPriceValid(val)) {
      prices[k] = val;
    }
  }
  const usd = prices.usd;
  if (usd === undefined) throw new Error('Mempool response has no USD price');
  return { usd, prices, lastUpdated };
}

/** CoinDesk returns { bpi: { USD: { rate_float }, EUR: { rate_float }, ... }, time: { updatedISO } } */
async function fetchBtcPriceFromCoinDesk(): Promise<{ usd: number; prices: Record<string, number>; lastUpdated: number }> {
  const response = await fetch(COINDESK_PRICE_URL);
  if (!response.ok) throw new Error(`Failed to fetch from CoinDesk: ${response.statusText}`);
  const data = await response.json();
  const bpi = data?.bpi;
  if (!bpi || typeof bpi !== 'object') throw new Error('Invalid CoinDesk response format');

  const prices: Record<string, number> = {};
  for (const [code, entry] of Object.entries(bpi as Record<string, { rate_float?: number }>)) {
    const value = (entry as { rate_float?: number })?.rate_float;
    if (typeof value === 'number' && isPriceValid(value)) {
      prices[code.toLowerCase()] = value;
    }
  }
  const usd = prices.usd;
  if (usd === undefined) throw new Error('CoinDesk response has no USD price');
  const updatedIso = data?.time?.updatedISO;
  const parsedTs = typeof updatedIso === 'string' ? Date.parse(updatedIso) : NaN;
  const lastUpdated = Number.isFinite(parsedTs) ? parsedTs / 1000 : Date.now() / 1000;
  return { usd, prices, lastUpdated };
}

/** Binance returns { price: string } in USD for BTCUSDT. */
async function fetchBtcPriceFromBinance(): Promise<{ usd: number; prices: Record<string, number>; lastUpdated: number }> {
  const response = await fetch(BINANCE_PRICE_URL);
  if (!response.ok) throw new Error(`Failed to fetch from Binance: ${response.statusText}`);
  const data = await response.json();
  const usd = Number(data?.price);
  if (!isPriceValid(usd)) throw new Error('Invalid Binance response format');
  return {
    usd,
    prices: { usd },
    lastUpdated: Date.now() / 1000,
  };
}

export function useBTCPrice() {
  return useQuery<BTCPriceData>({
    queryKey: ['btcPrice'],
    initialData: () => getStoredBtcPrice() ?? undefined,
    queryFn: async () => {
      const lastStored = getStoredBtcPrice();
      const lastGoodUsd = lastStored?.usd;

      const runCoinGecko = (url: string) =>
        fetchBtcPriceFromCoinGecko(url).then((r) => ({ source: 'coinGecko' as const, data: r, proxy: false }));
      const runMempool = () =>
        fetchBtcPriceFromMempool().then((r) => ({ source: 'mempool' as const, data: r, proxy: false }));
      const runCoinDesk = () =>
        fetchBtcPriceFromCoinDesk().then((r) => ({ source: 'coinDesk' as const, data: r, proxy: false }));
      const runBinance = () =>
        fetchBtcPriceFromBinance().then((r) => ({ source: 'binance' as const, data: r, proxy: false }));

      const [cgResult, mempoolResult, coinDeskResult, binanceResult] = await Promise.allSettled([
        runCoinGecko(COINGECKO_PRICE_URL),
        runMempool(),
        runCoinDesk(),
        runBinance(),
      ]);

      const cgOk = cgResult.status === 'fulfilled' ? cgResult.value : null;
      const mempoolOk = mempoolResult.status === 'fulfilled' ? mempoolResult.value : null;
      const coinDeskOk = coinDeskResult.status === 'fulfilled' ? coinDeskResult.value : null;
      const binanceOk = binanceResult.status === 'fulfilled' ? binanceResult.value : null;

      type SourceResult = {
        source: 'coinGecko' | 'mempool' | 'coinDesk' | 'binance';
        data: { usd: number; prices: Record<string, number>; lastUpdated: number };
      };

      const candidates: SourceResult[] = [];
      if (cgOk?.data) candidates.push({ source: 'coinGecko', data: cgOk.data });
      if (mempoolOk?.data) candidates.push({ source: 'mempool', data: mempoolOk.data });
      if (coinDeskOk?.data) candidates.push({ source: 'coinDesk', data: coinDeskOk.data });
      if (binanceOk?.data) candidates.push({ source: 'binance', data: binanceOk.data });

      const chosen = candidates.find((candidate) => {
        const price = candidate.data.usd;
        if (!isPriceValid(price)) return false;
        if (!isPriceWithinBounds(price, lastGoodUsd)) return false;
        if (candidate.source === 'coinGecko' && mempoolOk?.data) {
          const mp = mempoolOk.data;
          const diverged =
            isPriceValid(mp.usd) &&
            Math.abs(price - mp.usd) / Math.max(price, mp.usd) > PRICE_AGREEMENT_THRESHOLD;
          if (diverged && candidate.data.lastUpdated < mp.lastUpdated) return false;
        }
        return true;
      });

      if (chosen) {
        const result: BTCPriceData = {
          prices: chosen.data.prices,
          usd: chosen.data.usd,
          lastUpdated: chosen.data.lastUpdated,
          priceSourceStatus: {
            coinGecko: chosen.source === 'coinGecko',
            mempool: chosen.source === 'mempool',
            coinDesk: chosen.source === 'coinDesk',
            binance: chosen.source === 'binance',
            proxyUsed: false,
          },
        };
        setStoredBtcPrice(result);
        return result;
      }

      if (ENABLE_PROXY_FALLBACK) {
        try {
          const proxyRes = await fetchBtcPriceFromCoinGecko(
            `https://api.allorigins.win/raw?url=${encodeURIComponent(COINGECKO_PRICE_URL)}`
          );
          if (proxyRes && isPriceValid(proxyRes.usd) && isPriceWithinBounds(proxyRes.usd, lastGoodUsd)) {
            const result: BTCPriceData = {
              ...proxyRes,
              priceSourceStatus: { coinGecko: true, mempool: false, coinDesk: false, binance: false, proxyUsed: true },
            };
            setStoredBtcPrice(result);
            return result;
          }
        } catch {
          // ignore
        }
      }

      const stored = getStoredBtcPrice();
      if (stored) return stored;
      return makeFallbackPriceData();
    },
    refetchInterval: 60 * 1000,
    staleTime: 2 * 60 * 1000,
    retry: 1,
    retryDelay: 2000,
    placeholderData: (previousData) => previousData ?? getStoredBtcPrice() ?? makeFallbackPriceData(),
  });
}

/** Get BTC price in a specific fiat currency from the price data. Falls back to USD conversion. */
/**
 * BTC price in a fiat currency, or 0 when unknown. Callers must treat 0 as "unavailable".
 * Never substitutes another currency's price (a USD number shown as ¥ would be wildly wrong).
 */
export function getBTCPriceInCurrency(priceData: BTCPriceData | undefined, currencyCode: string): number {
  const price = priceData?.prices[currencyCode.toLowerCase()];
  return price != null && isPriceValid(price) ? price : 0;
}

/** BTC price at the time of a transaction. Uses CoinGecko market_chart/range and picks the closest point to the tx timestamp. */
export function useBTCPriceAtTime(timestampSeconds: number | bigint, currencyCode: string = 'USD') {
  const ts = Number(timestampSeconds);
  const rangeSec = 3600;
  const from = Math.max(0, ts - rangeSec);
  const to = ts + rangeSec;
  const vsCurrency = currencyCode.toLowerCase();
  const historicalUrl = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range?vs_currency=${vsCurrency}&from=${from}&to=${to}`;

  return useQuery<number | null>({
    queryKey: ['btcPriceAtTime', ts, vsCurrency],
    queryFn: async () => {
      const tryFetch = async (url: string): Promise<number> => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed: ${response.statusText}`);
        const data = await response.json();
        const prices: [number, number][] = data?.prices;
        if (!Array.isArray(prices) || prices.length === 0) throw new Error('Invalid response');
        const txMs = ts * 1000;
        let closest = prices[0];
        let minDiff = Math.abs(prices[0][0] - txMs);
        for (let i = 1; i < prices.length; i++) {
          const diff = Math.abs(prices[i][0] - txMs);
          if (diff < minDiff) {
            minDiff = diff;
            closest = prices[i];
          }
        }
        return closest[1];
      };
      try {
        return await tryFetch(historicalUrl);
      } catch {
        if (ENABLE_PROXY_FALLBACK) {
          try {
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(historicalUrl)}`;
            return await tryFetch(proxyUrl);
          } catch {
            // fall through
          }
        }
        return null; // caller falls back to the current price
      }
    },
    enabled: ts > 0,
    staleTime: 24 * 60 * 60 * 1000, // Historical price doesn't change
    retry: 1,
  });
}
