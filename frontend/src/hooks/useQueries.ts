import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Principal } from '@dfinity/principal';
import { HttpAgent, Actor } from '@dfinity/agent';
import { IcrcLedgerCanister } from '@dfinity/ledger-icrc';
import { useActor } from './useActor';
import { useCkBTCMinter, createCkBTCMinterIDL, CKBTC_MINTER_CANISTER_ID, type CkBTCMinter } from './useCkBTCMinter';
import { useCkBTCLedger, CKBTC_LEDGER_CANISTER_ID } from './useCkBTCLedger';
import { useCkBTCTransactions } from './useCkBTCTransactions';
import { useInternetIdentity } from './useInternetIdentity';
import type { UserWallet, BitcoinAddress, TransactionId, Transaction } from '../backend';
import { setSessionWithdrawal } from '../lib/sessionWithdrawalStore';
import { isValidBitcoinAddress, isBech32AddressForStorage } from '../utils/addressValidation';
import { checkPendingDeposits } from '../utils/bitcoinTestnetChecker';

/** Which price sources contributed (for transparency / FAQ system status) */
export interface PriceSourceStatus {
  coinGecko: boolean;
  mempool: boolean;
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
        usd: parsed.prices.usd ?? FALLBACK_BTC_USD,
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
const FEE_PERCENT = Number(import.meta.env.VITE_FEE_PERCENT ?? 0.5);
const FEE_CAP_USD = Number(import.meta.env.VITE_FEE_CAP_USD ?? 100);
/** Treasury principal that receives app fees (ckBTC). Empty = no fee collected. */
export const FEE_TREASURY_PRINCIPAL =
  (import.meta.env.VITE_FEE_TREASURY_PRINCIPAL as string)?.trim() ||
  'c65im-m2qxx-7nvqc-fl62p-4xqmt-emdce-tmtqf-fggqq-3zh4d-yhdre-2qe';

/**
 * Compute app fee in satoshis: 0.5% of amount, capped at $100 USD equivalent, no minimum.
 * Fee never exceeds amount.
 */
export function computeFeeSats(amountSats: bigint, btcPriceUsd: number): bigint {
  if (amountSats <= 0n || btcPriceUsd <= 0) return 0n;
  const percentFeeSats = (amountSats * BigInt(Math.round(FEE_PERCENT * 10))) / 1000n; // 0.5% = 5/1000
  const capSats = BigInt(Math.floor((FEE_CAP_USD * 100_000_000) / btcPriceUsd));
  const fee = percentFeeSats < capSats ? percentFeeSats : capSats;
  return fee > amountSats ? amountSats : fee;
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
  
  // Refetch wallet info when ckBTC transactions change
  useEffect(() => {
    if (ckbtcTransactions.length > 0 && actor && !isFetching) {
      console.log('useWalletInfo: ckBTC transactions available, invalidating query to merge transactions...');
      queryClient.invalidateQueries({ queryKey: ['walletInfo'] });
    }
  }, [ckbtcTransactions.length, actor, isFetching, queryClient]);
  
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
        let wallet: UserWallet | null = null;
        try {
          const raw = await actor.getWalletInfo();
          // Candid opt returns [value] for Some, [] for None in @dfinity/agent
          wallet = Array.isArray(raw) ? (raw.length > 0 ? raw[0] as UserWallet : null) : (raw ?? null);
        } catch (error) {
          // Wallet might not exist in custom canister yet - that's OK, we can still show balance from ledger
          console.log('useWalletInfo: Wallet not found in custom canister (this is OK if we have ledger balance)');
        }
        
        // If we have a ckBTC balance from the ledger, use that instead of the canister balance
        // The ledger has the real balance, the canister just stores metadata
        // Use ledger balance even if it's 0 (it's the source of truth)
        let finalBalance = BigInt(0);
        if (ckbtcBalance !== null && ckbtcBalance !== undefined) {
          finalBalance = ckbtcBalance;
          // Sync canister balance with ledger so sendTransaction (which checks canister balance) succeeds
          try {
            await actor.syncBalanceFromLedger(ckbtcBalance);
          } catch (syncErr) {
            console.warn('useWalletInfo: syncBalanceFromLedger failed (non-fatal):', syncErr);
          }
        } else if (wallet?.balance) {
          console.log('useWalletInfo: Using canister balance (ledger not available):', wallet.balance.toString());
          finalBalance = wallet.balance;
        } else {
          console.log('useWalletInfo: No balance available from ledger or canister');
        }
        
        // Sync canister's stored Bitcoin address whenever we have a wallet and a bech32 ckBTC address,
        // so getPrincipalByBitcoinAddress works for other users (MOTO-to-MOTO). Use isBech32AddressForStorage
        // so we store the address for both mainnet (bc1) and testnet (tb1) regardless of VITE_USE_TESTNET.
        if (wallet && ckbtcAddress && isBech32AddressForStorage(ckbtcAddress)) {
          try {
            await actor.setBitcoinAddress(ckbtcAddress);
          } catch (addrErr) {
            console.warn('useWalletInfo: setBitcoinAddress failed (non-fatal):', addrErr);
          }
        }
        
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
        
        // Merge transactions from custom canister and ckBTC ledger
        // Deduplicate by transaction ID and sort by timestamp (newest first)
        const canisterTransactions = wallet?.transactions || [];
        const allTransactions: Transaction[] = [...canisterTransactions, ...ckbtcTransactions];
        
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
        
        console.log('useWalletInfo: ========================================');
        console.log('useWalletInfo: Transaction merge summary:');
        console.log('  - Canister transactions:', canisterTransactions.length);
        console.log('  - ckBTC ledger transactions:', ckbtcTransactions.length);
        console.log('  - Merged total:', mergedTransactions.length);
        if (canisterTransactions.length > 0) {
          console.log('useWalletInfo: Sample canister transaction:', canisterTransactions[0]);
        }
        if (ckbtcTransactions.length > 0) {
          console.log('useWalletInfo: Sample ckBTC transaction:', ckbtcTransactions[0]);
        }
        
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

        console.log('useEnsureWallet: Ensuring wallet exists in custom canister...');
        const addressPromise = actor.ensureWalletExists();
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error('Wallet setup timed out after 30 seconds. Please check your connection and try again.'));
          }, 30000);
        });

        const address = await Promise.race([addressPromise, timeoutPromise]);
        
        if (!address || address.length === 0) {
          throw new Error('Failed to create wallet: empty address returned');
        }
        
        const duration = Date.now() - startTime;
        console.log(`useEnsureWallet: Wallet ensured in custom canister in ${duration}ms:`, address);
        
        // Return the canister address (ckBTC address is just for reference, wallet is in canister)
        return address;
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`useEnsureWallet: Error after ${duration}ms:`, error);
        
        if (error instanceof Error) {
          throw error;
        }
        throw new Error(`Failed to ensure wallet exists: ${String(error)}`);
      }
    },
    onSuccess: (address) => {
      console.log('useEnsureWallet: onSuccess called with address:', address);
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

export function useSendTransaction() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<TransactionId, Error, { toAddress: BitcoinAddress; amount: bigint }>({
    mutationFn: async ({ toAddress, amount }) => {
      if (!actor) throw new Error('Actor not initialized');
      try {
        return await actor.sendTransaction(toAddress, amount);
      } catch (error) {
        console.error('Error sending transaction:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['walletInfo'] });
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

/** Look up principal by Bitcoin address (for smart send: instant ckBTC vs withdraw to BTC). */
export function usePrincipalByBitcoinAddress(address: string | null) {
  const { actor } = useActor();
  const normalized = address && address.trim() ? normalizeAddressForLookup(address) : '';
  return useQuery<string | null>({
    queryKey: ['principalByBitcoinAddress', normalized || ''],
    queryFn: async () => {
      if (!actor || !normalized) return null;
      console.log('getPrincipalByBitcoinAddress: looking up', normalized.slice(0, 14) + '...');
      try {
        const raw = await actor.getPrincipalByBitcoinAddress(normalized);
        console.log('getPrincipalByBitcoinAddress: raw response', raw);
        // Candid Opt returns [] for None, [value] for Some. Agent may also return null or Principal directly.
        const principal = Array.isArray(raw) ? (raw.length > 0 ? raw[0] : null) : raw;
        if (!principal) {
          console.log('getPrincipalByBitcoinAddress: no MOTO user for this address');
          return null;
        }
        const principalText =
          typeof principal === 'string'
            ? principal
            : typeof principal?.toText === 'function'
              ? principal.toText()
              : String(principal);
        if (principalText && principalText !== 'null' && principalText !== 'undefined') {
          console.log('getPrincipalByBitcoinAddress: found MOTO user →', principalText.slice(0, 10) + '...');
          return principalText;
        }
        console.log('getPrincipalByBitcoinAddress: could not extract principal text from', principal);
        return null;
      } catch (e) {
        console.warn('getPrincipalByBitcoinAddress: backend call failed', e);
        return null;
      }
    },
    enabled: Boolean(actor && normalized.length > 0),
    staleTime: 0, // always refetch so we never show stale "Bitcoin" after receiver syncs
  });
}

/** Instant ckBTC transfer to another principal (ICRC-1; no minter approval). App fee (0.5%, max $100) sent to treasury when configured. */
export function useTransferCkBTC() {
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation<
    { block_index: bigint },
    Error,
    { toPrincipal: string; amount: bigint; btcPriceUsd: number }
  >({
    mutationFn: async ({ toPrincipal, amount, btcPriceUsd }) => {
      if (!identity) throw new Error('Not authenticated');
      const host = 'https://ic0.app';
      const agent = new HttpAgent({ identity: identity as any, host });
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isLocal) {
        try {
          await agent.fetchRootKey();
        } catch {
          // ignore
        }
      }
      const ledger = IcrcLedgerCanister.create({
        agent,
        canisterId: Principal.fromText(CKBTC_LEDGER_CANISTER_ID),
      });
      const feeSats = FEE_TREASURY_PRINCIPAL ? computeFeeSats(amount, btcPriceUsd) : 0n;
      const toRecipient = amount - feeSats;

      if (FEE_TREASURY_PRINCIPAL && feeSats > 0n) {
        await ledger.transfer({
          to: { owner: Principal.fromText(FEE_TREASURY_PRINCIPAL), subaccount: [] },
          amount: feeSats,
        });
      }
      const blockIndex = await ledger.transfer({
        to: { owner: Principal.fromText(toPrincipal), subaccount: [] },
        amount: toRecipient,
      });
      return { block_index: blockIndex };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['walletInfo'] });
    },
    retry: 1,
  });
}

/** Real ckBTC → BTC withdrawal: ICRC-2 approve then minter retrieve_btc_with_approval. App fee (0.5%, max $100) sent to treasury when configured. */
export function useRetrieveBtc() {
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation<
    { block_index: bigint },
    Error,
    { toAddress: string; amount: bigint; btcPriceUsd: number }
  >({
    mutationFn: async ({ toAddress, amount, btcPriceUsd }) => {
      if (!identity) throw new Error('Not authenticated');
      const host = 'https://ic0.app';
      const agent = new HttpAgent({ identity: identity as any, host });
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isLocal) {
        try {
          await agent.fetchRootKey();
        } catch {
          // ignore
        }
      }
      const ledger = IcrcLedgerCanister.create({
        agent,
        canisterId: Principal.fromText(CKBTC_LEDGER_CANISTER_ID),
      });
      const feeSats = FEE_TREASURY_PRINCIPAL ? computeFeeSats(amount, btcPriceUsd) : 0n;
      if (FEE_TREASURY_PRINCIPAL && feeSats > 0n) {
        await ledger.transfer({
          to: { owner: Principal.fromText(FEE_TREASURY_PRINCIPAL), subaccount: [] },
          amount: feeSats,
        });
      }
      const minterPrincipal = Principal.fromText(CKBTC_MINTER_CANISTER_ID);
      await ledger.approve({
        amount,
        spender: { owner: minterPrincipal, subaccount: [] },
      });
      const minterIDLFactory = createCkBTCMinterIDL();
      const minterActor = Actor.createActor(minterIDLFactory, {
        agent,
        canisterId: CKBTC_MINTER_CANISTER_ID,
      }) as unknown as CkBTCMinter;
      const result = await minterActor.retrieve_btc_with_approval({
        address: toAddress,
        amount,
        from_subaccount: [],
      });
      if ('Err' in result) {
        const err = result.Err as import('./useCkBTCMinter').RetrieveBtcWithApprovalError;
        if ('MalformedAddress' in err) throw new Error(`Invalid address: ${err.MalformedAddress}`);
        if ('AlreadyProcessing' in err) throw new Error('A withdrawal is already in progress. Please wait.');
        if ('AmountTooLow' in err) throw new Error(`Amount below minimum: ${err.AmountTooLow} satoshis`);
        if ('InsufficientFunds' in err) throw new Error(`Insufficient balance. Available: ${err.InsufficientFunds.balance} satoshis`);
        if ('InsufficientAllowance' in err) throw new Error('Approval failed or expired. Please try again.');
        if ('TemporarilyUnavailable' in err) throw new Error(err.TemporarilyUnavailable);
        if ('GenericError' in err) throw new Error(err.GenericError.error_message);
        throw new Error('Withdrawal failed');
      }
      return { block_index: result.Ok.block_index };
    },
    onSuccess: (data, variables) => {
      setSessionWithdrawal(data.block_index.toString(), variables.toAddress);
      queryClient.invalidateQueries({ queryKey: ['walletInfo'] });
    },
    retry: 1,
  });
}

const FALLBACK_BTC_USD = 101799;

import { LIVE_CURRENCY_CG_KEYS } from '../data/currencies';

const USE_TESTNET = import.meta.env.VITE_USE_TESTNET === 'true';
const ENABLE_PROXY_FALLBACK = import.meta.env.VITE_ENABLE_PROXY_FALLBACK === 'true';

const COINGECKO_PRICE_URL =
  `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=${LIVE_CURRENCY_CG_KEYS.join(',')}&include_last_updated_at=true`;
const MEMPOOL_PRICE_URL = USE_TESTNET
  ? 'https://mempool.space/testnet/api/v1/prices'
  : 'https://mempool.space/api/v1/prices';

/** Mempool currencies: USD, EUR, GBP, CAD, CHF, AUD, JPY (lowercase keys) */
const MEMPOOL_CURRENCY_KEYS = ['usd', 'eur', 'gbp', 'cad', 'chf', 'aud', 'jpy'] as const;

const PRICE_AGREEMENT_THRESHOLD = 0.02;   // 2% max divergence
const PRICE_SANITY_JUMP_THRESHOLD = 0.20; // 20% max jump from last good

function makeFallbackPriceData(): BTCPriceData {
  return { prices: { usd: FALLBACK_BTC_USD }, usd: FALLBACK_BTC_USD, lastUpdated: Date.now() / 1000 };
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
  const usd = prices.usd ?? FALLBACK_BTC_USD;
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
  const usd = prices.usd ?? (typeof data.USD === 'number' && isPriceValid(data.USD) ? data.USD : FALLBACK_BTC_USD);
  return { usd, prices, lastUpdated };
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
      const runCoinGeckoProxy = () =>
        fetchBtcPriceFromCoinGecko(`https://api.allorigins.win/raw?url=${encodeURIComponent(COINGECKO_PRICE_URL)}`)
          .then((r) => ({ source: 'coinGecko' as const, data: r, proxy: true }));
      const runMempool = () =>
        fetchBtcPriceFromMempool().then((r) => ({ source: 'mempool' as const, data: r, proxy: false }));

      const [cgResult, mempoolResult] = await Promise.allSettled([
        runCoinGecko(COINGECKO_PRICE_URL),
        runMempool(),
      ]);

      const cgOk = cgResult.status === 'fulfilled' ? cgResult.value : null;
      const mempoolOk = mempoolResult.status === 'fulfilled' ? mempoolResult.value : null;

      let cgValid = false;
      let mempoolValid = false;

      if (cgOk) {
        const cg = cgOk.data;
        cgValid = isPriceValid(cg.usd) && isPriceWithinBounds(cg.usd, lastGoodUsd);
        if (cgValid && mempoolOk) {
          const mp = mempoolOk.data;
          const diverged = isPriceValid(mp.usd) && Math.abs(cg.usd - mp.usd) / Math.max(cg.usd, mp.usd) > PRICE_AGREEMENT_THRESHOLD;
          if (diverged && cg.lastUpdated < mp.lastUpdated) cgValid = false;
        }
      }

      if (mempoolOk) {
        const mp = mempoolOk.data;
        mempoolValid = isPriceValid(mp.usd) && isPriceWithinBounds(mp.usd, lastGoodUsd);
      }

      if (cgValid && cgOk?.data) {
        const result: BTCPriceData = {
          ...cgOk.data,
          priceSourceStatus: {
            coinGecko: true,
            mempool: mempoolValid,
            proxyUsed: cgOk.proxy,
          },
        };
        setStoredBtcPrice(result);
        return result;
      }

      if (mempoolValid && mempoolOk?.data) {
        const mp = mempoolOk.data;
        const result: BTCPriceData = {
          prices: mp.prices,
          usd: mp.usd,
          lastUpdated: mp.lastUpdated,
          priceSourceStatus: { coinGecko: false, mempool: true },
        };
        setStoredBtcPrice(result);
        return result;
      }

      if (ENABLE_PROXY_FALLBACK) {
        try {
          const proxyRes = await runCoinGeckoProxy();
          if (proxyRes.data && isPriceValid(proxyRes.data.usd) && isPriceWithinBounds(proxyRes.data.usd, lastGoodUsd)) {
            const result: BTCPriceData = {
              ...proxyRes.data,
              priceSourceStatus: { coinGecko: true, mempool: false, proxyUsed: true },
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
export function getBTCPriceInCurrency(priceData: BTCPriceData | undefined, currencyCode: string): number {
  if (!priceData) return FALLBACK_BTC_USD;
  const key = currencyCode.toLowerCase();
  if (priceData.prices[key] != null) return priceData.prices[key];
  return priceData.usd;
}

/** BTC price at the time of a transaction. Uses CoinGecko market_chart/range and picks the closest point to the tx timestamp. */
export function useBTCPriceAtTime(timestampSeconds: number | bigint, currencyCode: string = 'USD') {
  const ts = Number(timestampSeconds);
  const rangeSec = 3600;
  const from = Math.max(0, ts - rangeSec);
  const to = ts + rangeSec;
  const vsCurrency = currencyCode.toLowerCase();
  const historicalUrl = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range?vs_currency=${vsCurrency}&from=${from}&to=${to}`;

  return useQuery<number>({
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
        return FALLBACK_BTC_USD;
      }
    },
    enabled: ts > 0,
    staleTime: 24 * 60 * 60 * 1000, // Historical price doesn't change
    retry: 1,
  });
}
