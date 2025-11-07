import { useState, useEffect } from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useWalletInfo, useEnsureWallet, useResetOnboarding, useSignOutAndReset, useWalletAddress } from '../hooks/useQueries';
import type { Transaction } from '../backend';
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
import { toast } from 'sonner';
import SendTransaction from '../components/SendTransaction';
import ReceiveBitcoin from '../components/ReceiveBitcoin';
import CurrencySelector from '../components/CurrencySelector';
import LanguageSelector from '../components/LanguageSelector';
import TransactionDetails from '../components/TransactionDetails';

export default function WalletDashboard() {
  const { clear } = useInternetIdentity();
  const { data: walletInfo, isLoading } = useWalletInfo();
  const { data: walletAddress } = useWalletAddress();
  const ensureWallet = useEnsureWallet();
  const resetOnboarding = useResetOnboarding();
  const signOutAndReset = useSignOutAndReset();
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showCurrencySelector, setShowCurrencySelector] = useState(false);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

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
    // Remove trailing zeros but keep at least 2 decimal places
    return btc.toFixed(8).replace(/\.?0+$/, '');
  };

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp));
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}·${hours}:${minutes}`;
  };

  // Get transaction icon based on type
  const getTransactionIcon = (tx: typeof walletInfo.transactions[0], walletAddress: string) => {
    if (!walletInfo) return 'sent';
    const isSent = tx.fromAddress === walletAddress;
    const isReceived = tx.toAddress === walletAddress && !isSent;
    // For now, we'll use simple icons - you can replace with actual SVG icons from Figma
    if (isSent) {
      return 'sent'; // Will use SVG icon
    } else if (isReceived) {
      return 'received'; // Will use SVG icon
    } else {
      return 'added'; // Added funds icon
    }
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
      {/* Main container matching Figma: pt-8 (32px) px-5 (20px) */}
      <div className="flex flex-col gap-8 pt-8 px-5 pb-5 flex-1 overflow-y-auto">
        {/* Figma: Header with logo (40px) on left, balance on right, add funds button (32px) on right */}
        <header className="flex items-center justify-between">
          <button 
            onClick={() => setMenuOpen(true)}
            className="cursor-pointer"
          >
            <img src="/assets/mt-mark.svg" alt="market.town" className="h-10 w-10" />
          </button>
          <div className="flex items-center gap-4">
            {/* Figma: Balance - IBM Plex Mono Bold, 24px, white, tracking 0.96px */}
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-2xl font-bold text-white" style={{ letterSpacing: '0.96px' }}>₿</span>
              <p 
                className="font-mono text-2xl font-bold text-white"
                style={{ letterSpacing: '0.96px' }}
              >
                {formatBTC(walletInfo.balance)}
              </p>
            </div>
            {/* Figma: Add funds button - 32px */}
            <button
              onClick={() => setShowAddFundsModal(true)}
              className="h-8 w-8 flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <img src="/assets/addfunds.svg" alt="Add Funds" className="h-8 w-8" />
            </button>
          </div>
        </header>

        {/* Transactions List - One line per transaction */}
        <div className="flex flex-col gap-6 flex-1">
          {walletInfo.transactions.length > 0 ? (
            <>
              {/* Figma: Divider - 1px, rgba(255,255,255,0.5) - constrained to content width */}
              <div className="h-[1px] w-full bg-white/50" />
              
              {[...walletInfo.transactions]
                .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
                .map((tx) => {
                const isSent = tx.fromAddress === walletInfo.bitcoinAddress;
                const txType = getTransactionIcon(tx, walletInfo.bitcoinAddress);
                
                return (
                  <button
                    key={tx.id}
                    onClick={() => setSelectedTransaction(tx)}
                    className="flex w-full items-center justify-between h-8 opacity-80 hover:opacity-100 transition-opacity"
                  >
                    <div className="flex items-center gap-2">
                      {/* Transaction Icon - 32px x 24px */}
                      <div className="h-8 w-6 flex items-center justify-center">
                        {txType === 'sent' ? (
                          <img src="/assets/sent.svg" alt="Sent" className="h-8 w-6 object-contain" />
                        ) : txType === 'received' ? (
                          <img src="/assets/recieved.svg" alt="Received" className="h-8 w-6 object-contain" />
                        ) : (
                          <img src="/assets/addfunds.svg" alt="Added Funds" className="h-8 w-6 object-contain" />
                        )}
                      </div>
                      {/* Figma: Amount - IBM Plex Mono Medium, 20px, rgba(255,255,255,0.8), tracking 0.8px */}
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-xl font-medium text-white" style={{ letterSpacing: '0.8px' }}>₿</span>
                        <p 
                          className="font-mono text-xl font-medium text-white"
                          style={{ letterSpacing: '0.8px' }}
                        >
                          {formatBTC(tx.amount)}
                        </p>
                      </div>
                    </div>
                    {/* Figma: Date - IBM Plex Mono Medium, 20px, rgba(255,255,255,0.8), tracking 0.8px */}
                    <p 
                      className="font-mono text-xl font-medium text-white"
                      style={{ letterSpacing: '0.8px' }}
                    >
                      {formatDate(tx.timestamp)}
                    </p>
                  </button>
                );
              })}
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-center text-lg text-white/60">No transactions yet</p>
            </div>
          )}
        </div>

        {/* Figma: Bottom buttons - Send and Receive side-by-side as icon buttons - no divider above */}
        <div className="flex gap-4 shrink-0">
          <button
            onClick={() => setShowSendModal(true)}
            className="flex-1 h-16 border-2 border-white/80 bg-transparent hover:border-white transition-colors flex items-center justify-center opacity-80 hover:opacity-100"
          >
            {/* Send icon */}
            <img src="/assets/sent.svg" alt="Send" className="h-8 w-8" />
          </button>
          <button
            onClick={() => setShowReceiveModal(true)}
            className="flex-1 h-16 border-2 border-white/80 bg-transparent hover:border-white transition-colors flex items-center justify-center opacity-80 hover:opacity-100"
          >
            {/* Receive icon */}
            <img src="/assets/recieved.svg" alt="Receive" className="h-8 w-8" />
          </button>
        </div>
      </div>

      {/* Send Modal */}
      {showSendModal && walletInfo && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-black border-2 border-white/20 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-white/20 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Send Bitcoin</h2>
              <button onClick={() => setShowSendModal(false)} className="text-white/80 hover:text-white">
                ✕
              </button>
            </div>
            <div className="p-4">
              <SendTransaction 
                wallet={walletInfo} 
                onSuccess={() => setShowSendModal(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Receive Modal - Full screen */}
      {showReceiveModal && walletAddress && (
        <ReceiveBitcoin 
          address={walletAddress} 
          onClose={() => setShowReceiveModal(false)} 
        />
      )}

      {/* Add Funds Modal (same as Receive) - Full screen */}
      {showAddFundsModal && walletAddress && (
        <ReceiveBitcoin 
          address={walletAddress} 
          onClose={() => setShowAddFundsModal(false)} 
        />
      )}

      {/* Full-screen Menu Modal - Matching home screen spacing */}
      {menuOpen && (
        <div className="fixed inset-0 bg-black z-[9999] flex flex-col">
          {/* Main container matching home screen: pt-8 (32px) px-5 (20px) */}
          <div className="flex flex-col gap-8 pt-8 px-5 pb-5 flex-1 overflow-y-auto">
            {/* Logo - full logo (mark + type side by side) - left aligned like home screen header, clickable to close */}
            <button 
              onClick={() => setMenuOpen(false)}
              className="flex items-center cursor-pointer"
            >
              <div className="relative h-[40px]" style={{ width: '279.844px' }}>
                {/* Logo mark */}
                <img src="/assets/mt-mark.svg" alt="market.town" className="h-10 w-10 absolute left-0 top-1/2 -translate-y-1/2" />
                {/* Logo type - to the right of the mark */}
                <img src="/assets/mt-type.svg" alt="market.town" className="h-[40px] absolute left-[20.99%] top-0" style={{ width: 'calc(100% - 20.99%)' }} />
              </div>
            </button>
            
            {/* Menu items container - with more spacing between items */}
            <div className="flex flex-col gap-10 flex-1">
              {/* Divider - constrained to content width like home screen */}
              <div className="h-[1px] w-full bg-white/50" />
              
              {/* Currency */}
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setShowCurrencySelector(true);
                }}
                className="flex gap-4 h-8 items-center opacity-80 hover:opacity-100 transition-opacity"
              >
                <img src="/assets/currency.svg" alt="Currency" className="size-6" />
                <div className="flex flex-col font-medium justify-center text-xl text-white tracking-[0.8px]">
                  <p className="leading-[1.5]">Currency</p>
                </div>
              </button>
              
              {/* Language */}
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setShowLanguageSelector(true);
                }}
                className="flex gap-4 h-8 items-center opacity-80 hover:opacity-100 transition-opacity"
              >
                <img src="/assets/language.svg" alt="Language" className="size-6" />
                <div className="flex flex-col font-medium justify-center text-xl text-white tracking-[0.8px]">
                  <p className="leading-[1.5]">Language</p>
                </div>
              </button>
              
              {/* Divider */}
              <div className="h-[1px] w-full bg-white/50" />
              
              {/* Log out */}
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setShowSignOutDialog(true);
                }}
                className="flex gap-4 h-8 items-center opacity-80 hover:opacity-100 transition-opacity"
              >
                <img src="/assets/logout.svg" alt="Log out" className="size-6" />
                <div className="flex flex-col font-medium justify-center text-xl text-white tracking-[0.8px]">
                  <p className="leading-[1.5]">Log out</p>
                </div>
              </button>
            </div>
            
            {/* Close Button - matching buttons section (gap-4, shrink-0) */}
            <div className="flex gap-4 shrink-0">
              <button
                onClick={() => setMenuOpen(false)}
                className="flex-1 h-16 border-2 border-white/80 bg-transparent hover:bg-white/10 transition-colors flex items-center justify-center"
              >
                <span className="font-bold text-base text-white/80 tracking-[0.15px]">Close</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Currency Selector Modal */}
      {showCurrencySelector && (
        <CurrencySelector onClose={() => setShowCurrencySelector(false)} />
      )}

      {/* Language Selector Modal */}
      {showLanguageSelector && (
        <LanguageSelector onClose={() => setShowLanguageSelector(false)} />
      )}

      {/* Transaction Details Modal */}
      {selectedTransaction && walletAddress && (
        <TransactionDetails 
          transaction={selectedTransaction} 
          walletAddress={walletAddress}
          onClose={() => setSelectedTransaction(null)} 
        />
      )}

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
