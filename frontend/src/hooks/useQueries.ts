import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { UserWallet, BitcoinAddress, TransactionId } from '../backend';

export function useWalletInfo() {
  const { actor, isFetching } = useActor();

  return useQuery<UserWallet | null>({
    queryKey: ['walletInfo'],
    queryFn: async () => {
      if (!actor) return null;
      try {
        return await actor.getWalletInfo();
      } catch (error) {
        console.error('Error fetching wallet info:', error);
        throw error;
      }
    },
    enabled: !!actor && !isFetching,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

export function useWalletAddress() {
  const { actor, isFetching } = useActor();

  return useQuery<BitcoinAddress>({
    queryKey: ['walletAddress'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      try {
        // First ensure wallet exists, then get the address
        const address = await actor.ensureWalletExists();
        if (!address || address.length === 0) {
          throw new Error('Failed to get wallet address');
        }
        return address;
      } catch (error) {
        console.error('Error fetching wallet address:', error);
        throw error;
      }
    },
    enabled: !!actor && !isFetching,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
}

export function useOnboardingStatus() {
  const { actor, isFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['onboardingStatus'],
    queryFn: async () => {
      if (!actor) return false;
      try {
        return await actor.isOnboardingComplete();
      } catch (error) {
        console.error('Error fetching onboarding status:', error);
        // If wallet doesn't exist yet, onboarding is not complete
        return false;
      }
    },
    enabled: !!actor && !isFetching,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(500 * 2 ** attemptIndex, 5000),
    staleTime: 0, // Always refetch to ensure we have the latest status
  });
}

export function useEnsureWallet() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<BitcoinAddress, Error>({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      try {
        const address = await actor.ensureWalletExists();
        if (!address || address.length === 0) {
          throw new Error('Failed to create wallet');
        }
        return address;
      } catch (error) {
        console.error('Error ensuring wallet exists:', error);
        throw error;
      }
    },
    onSuccess: (address) => {
      // Update cache with the new address
      queryClient.setQueryData(['walletAddress'], address);
      // Invalidate related queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['walletInfo'] });
      queryClient.invalidateQueries({ queryKey: ['onboardingStatus'] });
    },
    retry: 2,
    retryDelay: 1000,
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
