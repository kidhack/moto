import { useState, useEffect } from 'react';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useActor } from './hooks/useActor';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import WalletDashboard from './pages/WalletDashboard';
import LoginPage from './pages/LoginPage';
import SplashScreen from './pages/SplashScreen';
import { useOnboardingStatus } from './hooks/useQueries';

const SKIP_SPLASH_KEY = 'moto_skip_splash';

export default function App() {
  const [splashComplete, setSplashComplete] = useState(() => {
    try {
      if (sessionStorage.getItem(SKIP_SPLASH_KEY)) {
        sessionStorage.removeItem(SKIP_SPLASH_KEY);
        return true;
      }
    } catch {}
    return false;
  });
  const { identity, isInitializing } = useInternetIdentity();
  const { actor } = useActor();
  const { data: isOnboardingComplete, isLoading: isCheckingOnboarding, refetch: refetchOnboarding } = useOnboardingStatus();

  // Match splash animation: 3s hold + 275ms delay + 300ms move = 3575ms before switching to sign-in
  useEffect(() => {
    if (splashComplete) return;
    const timer = setTimeout(() => setSplashComplete(true), 3575);
    return () => clearTimeout(timer);
  }, [splashComplete]);

  // Auto-complete onboarding immediately when user signs in (skip onboarding flow)
  useEffect(() => {
    if (!identity) return;
    
    // Auto-complete onboarding immediately - don't wait for anything
    if (actor && !isOnboardingComplete && !isCheckingOnboarding) {
      actor.completeOnboarding().then(() => {
        console.log('App: Onboarding auto-completed');
        refetchOnboarding();
      }).catch((error) => {
        console.error('App: Failed to auto-complete onboarding:', error);
        // Don't block the UI - continue anyway
      });
    }
  }, [identity, actor, isOnboardingComplete, isCheckingOnboarding, refetchOnboarding]);



  // Not signed in: show splash then sign-in as separate screens
  if (!identity) {
    return (
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        {!splashComplete ? <SplashScreen /> : <LoginPage />}
      </ThemeProvider>
    );
  }

  if (!splashComplete) {
    // This shouldn't happen if user is logged in, but handle it just in case
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

  // Always show WalletDashboard - skip onboarding flow entirely
  // Auto-complete onboarding in the background
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
      <div className="min-h-screen bg-black">
        <WalletDashboard />
        <Toaster position="top-center" />
      </div>
    </ThemeProvider>
  );
}
