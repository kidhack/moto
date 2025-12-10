import { useState, useEffect } from 'react';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useActor } from './hooks/useActor';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import WalletDashboard from './pages/WalletDashboard';
import LoginPage from './pages/LoginPage';
import { useOnboardingStatus } from './hooks/useQueries';

export default function App() {
  const [splashComplete, setSplashComplete] = useState(false);
  const { identity, isInitializing } = useInternetIdentity();
  const { actor } = useActor();
  const { data: isOnboardingComplete, isLoading: isCheckingOnboarding, refetch: refetchOnboarding } = useOnboardingStatus();

  useEffect(() => {
    // Complete splash after 3.45 seconds (3s wait + 450ms animation - 5x faster)
    const timer = setTimeout(() => {
      setSplashComplete(true);
    }, 3450);
    return () => clearTimeout(timer);
  }, []);

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

  // Always show WalletDashboard - skip onboarding flow entirely
  // Auto-complete onboarding in the background
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
      <div className="min-h-screen bg-black">
        <WalletDashboard />
        <Toaster />
      </div>
    </ThemeProvider>
  );
}
