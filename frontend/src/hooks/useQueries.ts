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
import { isValidBitcoinAddress } from '../utils/addressValidation';
import { checkPendingDeposits } from '../utils/bitcoinTestnetChecker';

export interface BTCPriceData {
  usd: number;
  lastUpdated: number;
}

const BTC_PRICE_STORAGE_KEY = 'moto_btc_price';
const STALE_PRICE_THRESHOLD_SEC = 5 * 60; // 5 min

function getStoredBtcPrice(): BTCPriceData | null {
  try {
    const raw = localStorage.getItem(BTC_PRICE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { usd?: number; lastUpdated?: number };
    if (typeof parsed?.usd === 'number' && typeof parsed?.lastUpdated === 'number') {
      return { usd: parsed.usd, lastUpdated: parsed.lastUpdated };
    }
  } catch {
    // ignore
  }
  return null;
}

function setStoredBtcPrice(data: BTCPriceData): void {
  try {
    localStorage.setItem(BTC_PRICE_STORAGE_KEY, JSON.stringify(data));
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
          wallet = await actor.getWalletInfo();
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
        
        // Sync canister's stored Bitcoin address whenever we have a wallet and real ckBTC address,
        // so getPrincipalByBitcoinAddress works for other users (even if our balance hasn't loaded yet).
        if (wallet && ckbtcAddress && isValidBitcoinAddress(ckbtcAddress)) {
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
          // Create a minimal wallet object if we have balance, address, or transactions
          principal: identity ? identity.getPrincipal() : Principal.anonymous(),
          bitcoinAddress: realBitcoinAddress,
          transactions: mergedTransactions,
          balance: finalBalance,
          onboardingComplete: true,
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
      try {
        const principal = await actor.getPrincipalByBitcoinAddress(normalized);
        if (!principal) return null;
        // Canister may return Principal (object with toText) or string depending on Candid/agent
        const principalText =
          typeof principal === 'string'
            ? principal
            : typeof (principal as Principal).toText === 'function'
              ? (principal as Principal).toText()
              : null;
        if (principalText) {
          console.log('getPrincipalByBitcoinAddress: found MOTO user', { address: normalized.slice(0, 12) + '...', principal: principalText });
          return principalText;
        }
        return null;
      } catch (e) {
        console.warn('getPrincipalByBitcoinAddress: backend call failed (canister may not have this method yet)', e);
        return null;
      }
    },
    enabled: Boolean(actor && normalized.length > 0),
    staleTime: 60 * 1000, // 1 min cache per address
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

export function useBTCPrice() {
  return useQuery<BTCPriceData>({
    queryKey: ['btcPrice'],
    initialData: () => getStoredBtcPrice() ?? undefined,
    queryFn: async () => {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const onIC = origin.includes('icp0.io') || origin.includes('ic0.app');
      try {
        if (onIC) {
          const stored = getStoredBtcPrice();
          if (stored) return stored;
          return { usd: FALLBACK_BTC_USD, lastUpdated: Date.now() / 1000 };
        }
        const response = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_last_updated_at=true'
        );
        if (!response.ok) throw new Error(`Failed to fetch BTC price: ${response.statusText}`);
        const data = await response.json();
        if (!data.bitcoin || typeof data.bitcoin.usd !== 'number') {
          throw new Error('Invalid response format from CoinGecko API');
        }
        const result: BTCPriceData = {
          usd: data.bitcoin.usd,
          lastUpdated: data.bitcoin.last_updated_at || Date.now() / 1000,
        };
        setStoredBtcPrice(result);
        return result;
      } catch {
        const stored = getStoredBtcPrice();
        if (stored) return stored;
        return { usd: FALLBACK_BTC_USD, lastUpdated: Date.now() / 1000 };
      }
    },
    refetchInterval: 60 * 1000, // 1 min (avoids 429 when CORS works)
    staleTime: 2 * 60 * 1000, // 2 min
    retry: 1,
    retryDelay: 2000,
    placeholderData: (previousData) => previousData ?? getStoredBtcPrice() ?? { usd: FALLBACK_BTC_USD, lastUpdated: Date.now() / 1000 },
  });
}

/** BTC price at the time of a transaction. Uses CoinGecko market_chart/range and picks the closest point to the tx timestamp. */
export function useBTCPriceAtTime(timestampSeconds: number | bigint) {
  const ts = Number(timestampSeconds);
  const rangeSec = 3600; // 1 hour either side so we get points around the tx time
  const from = Math.max(0, ts - rangeSec);
  const to = ts + rangeSec;
  return useQuery<number>({
    queryKey: ['btcPriceAtTime', ts],
    queryFn: async () => {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      if (origin.includes('icp0.io') || origin.includes('ic0.app')) {
        return FALLBACK_BTC_USD;
      }
      try {
        const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range?vs_currency=usd&from=${from}&to=${to}`
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch historical BTC price: ${response.statusText}`);
      }
      const data = await response.json();
      const prices: [number, number][] = data?.prices;
      if (!Array.isArray(prices) || prices.length === 0) {
        throw new Error('Invalid historical price response');
      }
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
      } catch {
        return FALLBACK_BTC_USD;
      }
    },
    enabled: ts > 0,
    staleTime: 24 * 60 * 60 * 1000, // Historical price doesn't change
    retry: 1,
  });
}
