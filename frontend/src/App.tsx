import { useState, useEffect } from 'react';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useActor } from './hooks/useActor';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import WalletDashboard from './pages/WalletDashboard';
import LoginPage from './pages/LoginPage';
import OnboardingFlow from './pages/OnboardingFlow';
import { useOnboardingStatus, useEnsureWallet } from './hooks/useQueries';
import { USE_DUMMY_DATA } from './data/dummyData';

export default function App() {
  const [splashComplete, setSplashComplete] = useState(false);
  const { identity, isInitializing } = useInternetIdentity();
  const { actor, isFetching: isActorFetching, error: actorError } = useActor();
  // Only check onboarding status after wallet is ensured
  const ensureWallet = useEnsureWallet();
  const { data: isOnboardingComplete, isLoading: isCheckingOnboarding, refetch: refetchOnboarding } = useOnboardingStatus();

  useEffect(() => {
    // Complete splash after 5.25 seconds (3s wait + 2.25s animation) - 50% slower
    const timer = setTimeout(() => {
      setSplashComplete(true);
    }, 5250);
    return () => clearTimeout(timer);
  }, []);

  // Ensure wallet exists when user logs in (no actor needed - uses ckBTC minter directly)
  useEffect(() => {
    if (identity && !ensureWallet.isPending && !ensureWallet.isSuccess && !ensureWallet.isError) {
      console.log('App: Ensuring wallet exists...', {
        hasIdentity: !!identity,
        hasActor: !!actor,
        isActorFetching,
        ensureWalletState: {
          isPending: ensureWallet.isPending,
          isSuccess: ensureWallet.isSuccess,
          isError: ensureWallet.isError,
          error: ensureWallet.error,
        }
      });
      ensureWallet.mutate(undefined, {
        onSuccess: (address) => {
          console.log('App: Wallet ensured successfully with address:', address);
          // After wallet is created, refetch onboarding status
          refetchOnboarding();
        },
        onError: (error) => {
          console.error('App: Failed to ensure wallet:', error);
          // Error will be displayed in the UI
        }
      });
    }
  }, [identity, ensureWallet, refetchOnboarding, actor, isActorFetching]);

  // Monitor for stuck mutations (pending for more than 35 seconds)
  useEffect(() => {
    if (ensureWallet.isPending) {
      const timeout = setTimeout(() => {
        if (ensureWallet.isPending) {
          console.error('App: Wallet setup has been pending for more than 35 seconds. This might indicate a stuck mutation.');
          // The mutation timeout should have triggered by now, but log this for debugging
        }
      }, 35000); // 35 seconds (5 seconds after the 30 second timeout)
      
      return () => clearTimeout(timeout);
    }
  }, [ensureWallet.isPending]);

  // Show login page if no identity (with or without splash animation)
  if (!identity) {
    return (
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <LoginPage showSplashAnimation={!splashComplete} />
      </ThemeProvider>
    );
  }

  if (!splashComplete) {
    // This shouldn't happen if user is logged in, but handle it just in case
    return (
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <div className="flex min-h-screen items-center justify-center bg-black">
          <div className="flex flex-col items-center gap-4">
            <img src="/assets/mt-mark.svg" alt="Market Town" className="h-16" />
          </div>
        </div>
      </ThemeProvider>
    );
  }

  if (isInitializing) {
    return (
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <div className="flex min-h-screen items-center justify-center bg-black">
          <div className="flex flex-col items-center gap-4">
            <img src="/assets/mt-mark.svg" alt="Market Town" className="h-16" />
          </div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
      <div className="min-h-screen bg-black">
        {isCheckingOnboarding || ensureWallet.isPending ? (
          <div className="flex min-h-screen items-center justify-center bg-black">
            <div className="flex flex-col items-center gap-4">
              <img src="/assets/mt-mark.svg" alt="Market Town" className="h-16" />
              <p className="text-sm text-white/60">
                {ensureWallet.isPending ? 'Setting up your wallet...' : 'Loading...'}
              </p>
            </div>
          </div>
        ) : ensureWallet.isError ? (
          <div className="flex min-h-screen items-center justify-center bg-black">
            <div className="flex flex-col items-center gap-4 px-4">
              <img src="/assets/mt-mark.svg" alt="Market Town" className="h-16" />
              <p className="text-sm text-red-400 text-center max-w-md">
                {ensureWallet.error?.message || 'Failed to set up wallet. Please try again.'}
              </p>
              <button
                onClick={() => {
                  console.log('App: Retrying wallet setup...');
                  ensureWallet.mutate(undefined, {
                    onSuccess: () => {
                      console.log('App: Wallet ensured successfully on retry');
                      refetchOnboarding();
                    },
                    onError: (error) => {
                      console.error('App: Failed to ensure wallet on retry:', error);
                    }
                  });
                }}
                className="mt-4 px-4 py-2 border border-white/80 text-white/80 hover:bg-white/10 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        ) : !isOnboardingComplete ? (
          <OnboardingFlow />
        ) : (
          <WalletDashboard />
        )}
        <Toaster />
      </div>
    </ThemeProvider>
  );
}
