import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Principal } from '@dfinity/principal';
import { useActor } from './useActor';
import { useCkBTCMinter } from './useCkBTCMinter';
import { useCkBTCLedger } from './useCkBTCLedger';
import { useCkBTCTransactions } from './useCkBTCTransactions';
import { useInternetIdentity } from './useInternetIdentity';
import type { UserWallet, BitcoinAddress, TransactionId, Transaction } from '../backend';
import { DUMMY_WALLET, USE_DUMMY_DATA } from '../data/dummyData';
import { isValidBitcoinAddress } from '../utils/addressValidation';
import { checkPendingDeposits } from '../utils/bitcoinTestnetChecker';

interface BTCPriceData {
  usd: number;
  lastUpdated: number;
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
  const isEnabled = USE_DUMMY_DATA || (!!actor && !isFetching);
  
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
      USE_DUMMY_DATA,
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
      // Use dummy data if enabled
      if (USE_DUMMY_DATA) {
        console.log('useWalletInfo: Using dummy data');
        return DUMMY_WALLET;
      }

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
          console.log('useWalletInfo: ========================================');
          console.log('useWalletInfo: Using ckBTC ledger balance');
          console.log('useWalletInfo: Balance (satoshis):', ckbtcBalance.toString());
          console.log('useWalletInfo: Balance (BTC):', (Number(ckbtcBalance) / 100000000).toString());
          console.log('useWalletInfo: Balance (formatted):', (Number(ckbtcBalance) / 100000000).toFixed(6));
          console.log('useWalletInfo: Balance is zero?', ckbtcBalance === BigInt(0));
          
          // Check if balance matches expected value from mempool
          const expectedBalance = BigInt(1616679); // 0.01616679 BTC
          if (ckbtcBalance === BigInt(10000000)) {
            console.warn('');
            console.warn('useWalletInfo: ⚠️⚠️⚠️ BALANCE MISMATCH ⚠️⚠️⚠️');
            console.warn('useWalletInfo: Ledger shows: 10,000,000 satoshis (0.1 BTC)');
            console.warn('useWalletInfo: Mempool shows: 1,616,679 satoshis (0.01616679 BTC)');
            console.warn('');
            console.warn('useWalletInfo: LIKELY CAUSE: Bitcoin deposit not yet converted to ckBTC');
            console.warn('useWalletInfo: - Bitcoin deposits take 10-30 minutes to process');
            console.warn('useWalletInfo: - The 0.1 BTC might be from a different account/test faucet');
            console.warn('useWalletInfo: - Wait for the minter to convert your Bitcoin deposit');
            console.warn('');
          } else if (ckbtcBalance === expectedBalance) {
            console.log('useWalletInfo: ✅ Balance matches expected value from mempool.space');
          } else if (ckbtcBalance > BigInt(0) && ckbtcBalance !== expectedBalance) {
            console.warn('useWalletInfo: ⚠️ Balance differs from mempool.space');
            console.warn('useWalletInfo: Ledger:', ckbtcBalance.toString(), 'satoshis');
            console.warn('useWalletInfo: Mempool: 1,616,679 satoshis');
            console.warn('useWalletInfo: This might be normal if deposit is still processing');
          }
          console.log('useWalletInfo: ========================================');
          finalBalance = ckbtcBalance;
        } else if (wallet?.balance) {
          console.log('useWalletInfo: Using canister balance (ledger not available):', wallet.balance.toString());
          finalBalance = wallet.balance;
        } else {
          console.log('useWalletInfo: No balance available from ledger or canister');
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
        if (mergedTransactions.length > 0) {
          console.log('useWalletInfo: Sample merged transaction:', mergedTransactions[0]);
        } else {
          console.warn('useWalletInfo: ⚠️ No transactions found after merge');
          console.warn('useWalletInfo: This could mean:');
          console.warn('  1. No transactions exist yet');
          console.warn('  2. Index canister decode is failing (check useCkBTCTransactions logs)');
          console.warn('  3. Transactions exist but are being filtered out');
        }
        console.log('useWalletInfo: ========================================');
        
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
    retry: USE_DUMMY_DATA ? 0 : 2, // No retries for dummy data
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    // Refetch when ensureWallet succeeds or balance changes to get fresh wallet data
    refetchOnMount: true,
    // Poll for updates every 10 seconds to catch new transactions
    refetchInterval: USE_DUMMY_DATA ? false : 10000, // Refetch every 10 seconds
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
      // Use dummy data if enabled
      if (USE_DUMMY_DATA) {
        console.log('useWalletAddress: Using dummy data');
        return DUMMY_WALLET.bitcoinAddress;
      }

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
    enabled: USE_DUMMY_DATA || !isCkbtcFetching, // Only run when ckBTC minter has finished loading
    retry: USE_DUMMY_DATA ? 0 : 2,
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
      // Use dummy data if enabled
      if (USE_DUMMY_DATA) {
        console.log('useOnboardingStatus: Using dummy data');
        return DUMMY_WALLET.onboardingComplete;
      }

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
    // Check onboarding status when:
    // 1. Using dummy data, OR
    // 2. We have an actor AND ckBTC has finished loading (whether we got an address or not), OR
    // 3. We have an actor AND ensureWallet has completed (success or error)
    enabled: Boolean(USE_DUMMY_DATA || (!!actor && !isFetching && (!isCkbtcFetching || !!ckbtcAddress || ensureWallet.isSuccess || ensureWallet.isError))),
    retry: USE_DUMMY_DATA ? 0 : 2,
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
      
      // Use dummy data if enabled
      if (USE_DUMMY_DATA) {
        console.log('useEnsureWallet: Using dummy data');
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
        return DUMMY_WALLET.bitcoinAddress;
      }
      
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

export function useBTCPrice() {
  return useQuery<BTCPriceData>({
    queryKey: ['btcPrice'],
    queryFn: async () => {
      try {
        // Use CoinGecko's free API (no API key required)
        const response = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_last_updated_at=true'
        );
        
        if (!response.ok) {
          throw new Error(`Failed to fetch BTC price: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.bitcoin || typeof data.bitcoin.usd !== 'number') {
          throw new Error('Invalid response format from CoinGecko API');
        }
        
        return {
          usd: data.bitcoin.usd,
          lastUpdated: data.bitcoin.last_updated_at || Date.now() / 1000,
        };
      } catch (error) {
        console.error('Error fetching BTC price:', error);
        // Fallback to a default price if API fails
        return {
          usd: 101799, // Default fallback price
          lastUpdated: Date.now() / 1000,
        };
      }
    },
    refetchInterval: 10000, // Refetch every 10 seconds
    staleTime: 0, // Always consider data stale to ensure frequent updates
    retry: 2,
    retryDelay: 1000,
  });
}
