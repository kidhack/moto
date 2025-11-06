import { useState, useEffect } from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useWalletInfo, useEnsureWallet, useResetOnboarding, useSignOutAndReset } from '../hooks/useQueries';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { LogOut, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function WalletDashboard() {
  const { clear } = useInternetIdentity();
  const { data: walletInfo, isLoading } = useWalletInfo();
  const ensureWallet = useEnsureWallet();
  const resetOnboarding = useResetOnboarding();
  const signOutAndReset = useSignOutAndReset();
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);

  // Automatically ensure wallet exists when component mounts
  useEffect(() => {
    if (!isLoading && !walletInfo && !ensureWallet.isPending) {
      ensureWallet.mutate();
    }
  }, [isLoading, walletInfo, ensureWallet]);

  const handleResetOnboarding = async () => {
    try {
      await resetOnboarding.mutateAsync();
      toast.success('Onboarding reset successfully');
      setTimeout(() => {
        clear();
      }, 1000);
    } catch (error) {
      toast.error('Failed to reset onboarding');
    }
  };

  const handleSignOutAndReset = async () => {
    try {
      await signOutAndReset.mutateAsync();
      toast.success('Signed out successfully');
      setTimeout(() => {
        clear();
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out');
    }
  };

  const formatBTC = (satoshis: bigint) => {
    const btc = Number(satoshis) / 100000000;
    return btc.toFixed(8);
  };

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp));
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}${month}${day}·${hours}:${minutes}`;
  };

  if (isLoading || ensureWallet.isPending || (!walletInfo && !ensureWallet.isError)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <img src="/assets/markettown-logo-w.svg" alt="market.town" className="h-16" />
          <p className="text-sm text-white/60">
            {ensureWallet.isPending ? 'Setting up your wallet...' : 'Loading wallet...'}
          </p>
        </div>
      </div>
    );
  }

  if (ensureWallet.isError) {
    return (
      <div className="flex min-h-screen flex-col bg-black text-white">
        <header className="flex h-16 items-center justify-between px-5">
          <img src="/assets/mt-mark.svg" alt="market.town" className="h-10 w-10" />
          <Button variant="ghost" size="sm" onClick={clear}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </header>

        <main className="flex flex-1 items-center justify-center p-4">
          <div className="text-center">
            <p className="text-red-400 mb-4">Failed to initialize wallet</p>
            <Button onClick={() => ensureWallet.mutate()} variant="outline">
              Retry
            </Button>
          </div>
        </main>
      </div>
    );
  }

  if (!walletInfo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <img src="/assets/markettown-logo-w.svg" alt="market.town" className="h-16" />
          <p className="text-sm text-white/60">Loading wallet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      {/* Figma: Header with logo (40px) on left, balance on right, add funds button (32px) on right */}
      <header className="flex h-16 items-center justify-between px-5">
        <button onClick={() => {/* TODO: Navigate to settings */}} className="cursor-pointer">
          <img src="/assets/mt-mark.svg" alt="market.town" className="h-10 w-10" />
        </button>
        <div className="flex items-center gap-3">
          {/* Figma: Balance - IBM Plex Mono Bold, 24px, white, tracking 0.96px */}
          <p 
            className="font-mono text-2xl font-bold text-white"
            style={{ letterSpacing: '0.96px' }}
          >
            {formatBTC(walletInfo.balance)} BTC
          </p>
          {/* Figma: Add funds button - 32px */}
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Figma: Divider - 1px, rgba(255,255,255,0.5) */}
      <div className="h-[1px] w-full bg-white/50" />

      {/* Transactions List */}
      <main className="flex-1 overflow-y-auto px-5 py-6">
        {walletInfo.transactions.length > 0 ? (
          <div className="space-y-6">
            {walletInfo.transactions.map((tx) => {
              const isSent = tx.fromAddress === walletInfo.bitcoinAddress;
              return (
                <button
                  key={tx.id}
                  onClick={() => {/* TODO: Navigate to transaction details */}}
                  className="flex w-full items-center justify-between py-0"
                >
                  <div className="flex flex-col items-start gap-1">
                    {/* Figma: Amount - IBM Plex Mono Medium, 20px, rgba(255,255,255,0.8), tracking 0.8px */}
                    <p 
                      className="font-mono text-xl font-medium text-white/80"
                      style={{ letterSpacing: '0.8px' }}
                    >
                      {isSent ? '-' : '+'}{formatBTC(tx.amount)} BTC
                    </p>
                    {/* Figma: Date - IBM Plex Mono Medium, 20px, rgba(255,255,255,0.8), tracking 0.8px */}
                    <p 
                      className="font-mono text-xl font-medium text-white/80"
                      style={{ letterSpacing: '0.8px' }}
                    >
                      {formatDate(tx.timestamp)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-center text-lg text-white/60">No transactions yet</p>
          </div>
        )}
      </main>

      {/* Figma: Bottom buttons - Send and Receive side-by-side */}
      <div className="flex gap-4 border-t border-white/50 px-5 py-5">
        <Button
          onClick={() => {/* TODO: Navigate to send */}}
          variant="outline"
          className="flex-1 h-16 rounded-none border-2 border-white/80 bg-transparent text-base font-bold text-white/80 hover:bg-white/10"
          style={{ letterSpacing: '0.15px' }}
        >
          Send
        </Button>
        <Button
          onClick={() => {/* TODO: Navigate to receive */}}
          variant="outline"
          className="flex-1 h-16 rounded-none border-2 border-white/80 bg-transparent text-base font-bold text-white/80 hover:bg-white/10"
          style={{ letterSpacing: '0.15px' }}
        >
          Receive
        </Button>
      </div>

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Onboarding?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset your onboarding state and you'll see the first-time user experience again on your next login. You will be signed out after the reset.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetOnboarding} disabled={resetOnboarding.isPending}>
              {resetOnboarding.isPending ? 'Resetting...' : 'Reset Onboarding'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign Out & Reset?</AlertDialogTitle>
            <AlertDialogDescription>
              This will sign you out and clear all session data. You'll need to authenticate again to access your wallet. This action will return you to the splash screen as if you were a new user.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSignOutAndReset} disabled={signOutAndReset.isPending}>
              {signOutAndReset.isPending ? 'Signing Out...' : 'Sign Out & Reset'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
