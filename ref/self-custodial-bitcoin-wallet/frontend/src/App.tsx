import { useState, useEffect } from 'react';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import WalletDashboard from './pages/WalletDashboard';
import LoginPage from './pages/LoginPage';
import OnboardingFlow from './pages/OnboardingFlow';
import { useOnboardingStatus, useEnsureWallet } from './hooks/useQueries';

export default function App() {
  const [splashComplete, setSplashComplete] = useState(false);
  const { identity, isInitializing } = useInternetIdentity();
  const { data: isOnboardingComplete, isLoading: isCheckingOnboarding, refetch: refetchOnboarding } = useOnboardingStatus();
  const ensureWallet = useEnsureWallet();

  useEffect(() => {
    // Complete splash after 5.25 seconds (3s wait + 2.25s animation) - 50% slower
    const timer = setTimeout(() => {
      setSplashComplete(true);
    }, 5250);
    return () => clearTimeout(timer);
  }, []);

  // Ensure wallet exists when user logs in
  useEffect(() => {
    if (identity && !ensureWallet.isPending && !ensureWallet.isSuccess) {
      ensureWallet.mutate(undefined, {
        onSuccess: () => {
          // After wallet is created, refetch onboarding status
          refetchOnboarding();
        }
      });
    }
  }, [identity, ensureWallet, refetchOnboarding]);

  if (!splashComplete) {
    return (
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <LoginPage showSplashAnimation={true} />
      </ThemeProvider>
    );
  }

  if (isInitializing) {
    return (
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <div className="flex min-h-screen items-center justify-center bg-black">
          <div className="flex flex-col items-center gap-4">
            <img src="/assets/moto-logo-mark.svg" alt="MOTO" className="h-16" />
          </div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
      <div className="min-h-screen bg-black">
        {!identity ? (
          <LoginPage showSplashAnimation={false} />
        ) : isCheckingOnboarding || ensureWallet.isPending ? (
          <div className="flex min-h-screen items-center justify-center bg-black">
            <div className="flex flex-col items-center gap-4">
              <img src="/assets/moto-logo-mark.svg" alt="MOTO" className="h-16" />
              <p className="text-sm text-white/60">
                {ensureWallet.isPending ? 'Setting up your wallet...' : 'Loading...'}
              </p>
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
