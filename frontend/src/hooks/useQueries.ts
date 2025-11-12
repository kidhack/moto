import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useCkBTCMinter } from './useCkBTCMinter';
import type { UserWallet, BitcoinAddress, TransactionId } from '../backend';
import { DUMMY_WALLET, USE_DUMMY_DATA } from '../data/dummyData';

interface BTCPriceData {
  usd: number;
  lastUpdated: number;
}

export function useWalletInfo() {
  const { actor, isFetching } = useActor();

  return useQuery<UserWallet | null>({
    queryKey: ['walletInfo'],
    queryFn: async () => {
      // Use dummy data if enabled
      if (USE_DUMMY_DATA) {
        console.log('useWalletInfo: Using dummy data');
        return DUMMY_WALLET;
      }

      if (!actor) return null;
      try {
        const wallet = await actor.getWalletInfo();
        // Handle optional wallet (null if wallet doesn't exist yet)
        return wallet;
      } catch (error) {
        console.error('Error fetching wallet info:', error);
        // If wallet doesn't exist, return null instead of throwing
        // This prevents 503 errors when wallet hasn't been created yet
        if (error instanceof Error && error.message.includes('Wallet not found')) {
          return null;
        }
        throw error;
      }
    },
    enabled: USE_DUMMY_DATA || (!!actor && !isFetching),
    retry: USE_DUMMY_DATA ? 0 : 2, // No retries for dummy data
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

export function useWalletAddress() {
  // Use ckBTC minter to get address directly from principal (no custom canister needed)
  // On localhost, ckBTC minter is not available, so we'll use custom canister
  const { address: ckbtcAddress, isFetching: isCkbtcFetching, error: ckbtcError } = useCkBTCMinter();
  const { actor, isFetching: isActorFetching } = useActor();

  return useQuery<BitcoinAddress>({
    queryKey: ['walletAddress'],
    queryFn: async () => {
      // Use dummy data if enabled
      if (USE_DUMMY_DATA) {
        console.log('useWalletAddress: Using dummy data');
        return DUMMY_WALLET.bitcoinAddress;
      }

      // First try to get address from ckBTC minter (preferred method on production)
      if (ckbtcAddress) {
        console.log('useWalletAddress: Using ckBTC minter address:', ckbtcAddress);
        return ckbtcAddress;
      }

      // On localhost or if ckBTC minter fails, use custom canister
      if (actor) {
        try {
          console.log('useWalletAddress: Using custom canister (localhost or ckBTC minter unavailable)...');
        const address = await actor.ensureWalletExists();
          if (address && address.length > 0) {
            return address;
          }
        } catch (error) {
          console.error('useWalletAddress: Custom canister failed:', error);
          // If custom canister also fails, throw the error
          throw error;
        }
      }

      // If both fail, throw error
      if (ckbtcError && !actor) {
        throw ckbtcError;
      }
      throw new Error('Failed to get wallet address: no address available and no canister configured');
    },
    enabled: USE_DUMMY_DATA || (!isCkbtcFetching && (!actor || !isActorFetching)),
    retry: USE_DUMMY_DATA ? 0 : 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
}

export function useOnboardingStatus() {
  const { actor, isFetching } = useActor();
  const ensureWallet = useEnsureWallet();

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
    // Only check onboarding status after wallet is ensured (or if wallet ensure failed)
    enabled: USE_DUMMY_DATA || (!!actor && !isFetching && (ensureWallet.isSuccess || ensureWallet.isError)),
    retry: USE_DUMMY_DATA ? 0 : 2,
    retryDelay: (attemptIndex) => Math.min(500 * 2 ** attemptIndex, 5000),
    staleTime: 0, // Always refetch to ensure we have the latest status
  });
}

export function useEnsureWallet() {
  // Use ckBTC minter to get address (no custom canister needed for address on production)
  // On localhost, use custom canister since ckBTC minter is not available
  const { address: ckbtcAddress, isFetching: isCkbtcFetching, error: ckbtcError } = useCkBTCMinter();
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<BitcoinAddress, Error>({
    mutationFn: async () => {
      console.log('useEnsureWallet: Ensuring wallet exists...');
      const startTime = Date.now();
      
      // Use dummy data if enabled
      if (USE_DUMMY_DATA) {
        console.log('useEnsureWallet: Using dummy data');
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
        return DUMMY_WALLET.bitcoinAddress;
      }
      
      try {
        // First try to get address from ckBTC minter (preferred on production)
        if (ckbtcAddress) {
          const duration = Date.now() - startTime;
          console.log(`useEnsureWallet: Got address from ckBTC minter in ${duration}ms:`, ckbtcAddress);
          return ckbtcAddress;
        }

        // On localhost or if ckBTC minter is not available, use custom canister
        if (actor) {
          console.log('useEnsureWallet: Using custom canister (localhost or ckBTC minter unavailable)...');
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
          console.log(`useEnsureWallet: Got address from custom canister in ${duration}ms:`, address);
          return address;
        }

        // If no actor and ckBTC minter failed, throw error
        if (ckbtcError) {
          throw ckbtcError;
        }

        // If still fetching ckBTC, wait a bit (but this shouldn't happen on localhost)
        if (isCkbtcFetching) {
          throw new Error('Wallet setup timed out waiting for ckBTC address. Please try again.');
        }

        throw new Error('Failed to get wallet address: no address available and no canister configured');
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
      // Update cache with the new address
      queryClient.setQueryData(['walletAddress'], address);
      // Invalidate related queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['walletInfo'] });
      queryClient.invalidateQueries({ queryKey: ['onboardingStatus'] });
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
