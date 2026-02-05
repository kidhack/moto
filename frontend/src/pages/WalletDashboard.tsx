import { useState, useEffect } from 'react';
import { LogOut } from 'lucide-react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useWalletInfo, useEnsureWallet, useResetOnboarding, useSignOutAndReset, useWalletAddress } from '../hooks/useQueries';
import { useCkBTCMinter } from '../hooks/useCkBTCMinter';
import { useCkBTCLedger } from '../hooks/useCkBTCLedger';
import { useCkBTCTransactions } from '../hooks/useCkBTCTransactions';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
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
  const { clear, identity, displayName } = useInternetIdentity();
  const { data: walletInfo, isLoading, error: walletInfoError, isFetching: isWalletInfoFetching, refetch: refetchWalletInfo } = useWalletInfo();
  const { data: walletAddress, isLoading: isLoadingAddress, error: walletAddressError } = useWalletAddress();
  const { address: ckbtcAddress, isFetching: isCkbtcFetching } = useCkBTCMinter(); // Check if we have ckBTC address
  const { balance: ledgerBalance } = useCkBTCLedger();
  const ensureWallet = useEnsureWallet();
  const walletAddressForTx = walletInfo?.bitcoinAddress || ckbtcAddress || '';
  const { transactions: ckbtcTransactions } = useCkBTCTransactions(walletAddressForTx);
  // Prefer merged list from walletInfo; fall back to ckBTC hook so history shows even if query hasn't merged yet
  const displayTransactions = (walletInfo?.transactions?.length ? walletInfo.transactions : ckbtcTransactions) ?? [];
  
  // Get current principal for debugging
  const currentPrincipal = identity ? identity.getPrincipal().toText() : null;

  // Debug logging
  useEffect(() => {
    console.log('WalletDashboard: State check', {
      walletInfo: walletInfo ? {
        exists: true,
        balance: walletInfo.balance.toString(),
        balanceBTC: (Number(walletInfo.balance) / 100000000).toString(),
        hasAddress: !!walletInfo.bitcoinAddress,
        transactionsCount: walletInfo.transactions.length,
      } : 'null',
      isLoading,
      isWalletInfoFetching,
      ledgerBalance: ledgerBalance?.toString() ?? 'null',
      walletInfoError: walletInfoError?.message,
      ensureWalletStatus: ensureWallet.isSuccess ? 'success' : ensureWallet.isError ? 'error' : ensureWallet.isPending ? 'pending' : 'idle',
      ensureWalletError: ensureWallet.error?.message,
      ckbtcAddress: !!ckbtcAddress,
      isCkbtcFetching,
      displayTransactionsCount: displayTransactions.length,
    });
  }, [walletInfo, isLoading, isWalletInfoFetching, ledgerBalance, walletInfoError, ensureWallet.isSuccess, ensureWallet.isError, ensureWallet.isPending, ensureWallet.error, ckbtcAddress, isCkbtcFetching, displayTransactions.length]);
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
  const [principalCopied, setPrincipalCopied] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  
  // Debug: Log principal when menu opens
  useEffect(() => {
    if (menuOpen && currentPrincipal) {
      console.log('Menu opened - Current Principal ID:', currentPrincipal);
    }
  }, [menuOpen, currentPrincipal]);

  // Ensure wallet exists so we can fetch wallet info (balance, transactions)
  // Even if we have ckBTC address, we still need to ensure wallet exists in custom canister
  // to get balance and transaction data
  useEffect(() => {
    // Don't do anything if ckBTC is still loading
    if (isCkbtcFetching) {
      return;
    }
    
    // Always ensure wallet exists so we can fetch wallet info
    // This creates/ensures the wallet in the custom canister which stores balance/transactions
    if (!ensureWallet.isPending && !ensureWallet.isSuccess && !walletInfo) {
      console.log('WalletDashboard: Ensuring wallet exists to fetch wallet info...');
      ensureWallet.mutate();
    }
  }, [ckbtcAddress, isCkbtcFetching, ensureWallet, walletInfo]);

  const handleResetOnboarding = async () => {
    try {
      await resetOnboarding.mutateAsync();
      toast.success('Onboarding reset successfully');
      setTimeout(async () => {
        await clear();
      }, 1000);
    } catch (error) {
      toast.error('Failed to reset onboarding');
    }
  };

  const handleSignOutAndReset = async () => {
    try {
      // Try to call backend signOutAndReset, but don't fail if it errors
      // The important part is clearing the local identity
      try {
        await signOutAndReset.mutateAsync();
        console.log('WalletDashboard: Backend signOutAndReset successful');
      } catch (backendError) {
        console.warn('WalletDashboard: Backend signOutAndReset failed (continuing with local logout):', backendError);
        // Continue with local logout even if backend fails
      }
      
      // Clear the identity and reload
      await clear();
      toast.success('Signed out successfully');
      
      // Small delay to ensure state is cleared, then reload
      setTimeout(() => {
        // Force a hard reload to clear all cached state
        window.location.href = window.location.origin + window.location.pathname;
      }, 300);
    } catch (error) {
      console.error('Sign out error:', error);
      // Even if there's an error, try to clear and reload
      try {
        await clear();
        window.location.href = window.location.origin + window.location.pathname;
      } catch (clearError) {
        console.error('Failed to clear identity:', clearError);
        toast.error('Failed to sign out completely. Please refresh the page.');
      }
    }
  };

  const formatBTC = (satoshis: bigint) => {
    const btc = Number(satoshis) / 100000000;
    // Show up to 6 decimal places (minimum 2, maximum 6)
    const formatted = btc.toFixed(6);
    // Remove trailing zeros but keep at least 2 decimal places
    return formatted.replace(/\.?0+$/, '') || '0.00';
  };

  const formatDate = (timestamp: bigint) => {
    // Transaction timestamps are in seconds (Unix time); Date expects milliseconds
    const date = new Date(Number(timestamp) * 1000);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}·${hours}:${minutes}`;
  };

  // Get transaction icon based on type
  const getTransactionIcon = (tx: Transaction, walletAddress: string) => {
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

  // Always show the dashboard - use loading skeletons for balance while data loads
  // Only use actual walletInfo - don't show fallback data
  const displayWalletInfo = walletInfo;

  // Shimmer only on first load before we have a confirmed balance from the ledger; once we have one (including 0), keep showing it and don’t shimmer on poll
  const hasConfirmedBalance = ledgerBalance !== null;
  const isLoadingBalance = !hasConfirmedBalance;

  const {
    scrollRef,
    pullDistance,
    isRefreshing,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    pullProgress,
  } = usePullToRefresh(async () => {
    await refetchWalletInfo();
  });

  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      
      {/* Scrollable area: whole page content pulls down; bottom buttons stay fixed below */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overscroll-contain relative min-h-0"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Pull-to-refresh: indicator in the gap that appears when content is pulled down. Text/icon only after 20px pull. */}
        <div
          className="absolute left-0 right-0 top-0 flex items-center justify-center bg-black z-10 transition-[height] duration-75 ease-out"
          style={{ height: Math.max(0, pullDistance) }}
        >
          <div className="flex flex-col items-center justify-end gap-1 pb-2">
            {isRefreshing ? (
              <>
                <div className="h-6 w-6 rounded-full border-2 border-white/60 border-t-white animate-spin" />
                <span className="text-xs text-white/70">Refreshing…</span>
              </>
            ) : pullDistance >= 20 ? (
              <>
                <svg className="h-5 w-5 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: `rotate(${-90 + pullProgress * 180}deg)` }}>
                  <path d="M23 4v6h-6M1 20v-6h6" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
                <span className="text-xs text-white/70">{pullProgress >= 1 ? 'Release to refresh' : 'Pull to refresh'}</span>
              </>
            ) : null}
          </div>
        </div>
        {/* Page content: translates down with pull so the whole page moves */}
        <div
          className="flex flex-col gap-8 pt-8 px-5 pb-5 transition-[transform] duration-75 ease-out"
          style={{ transform: `translateY(${pullDistance}px)` }}
        >
          {/* Testnet indicator */}
          {import.meta.env.VITE_USE_TESTNET === 'true' && (
            <div className="bg-yellow-500/20 border border-yellow-500/50 rounded px-4 py-2 text-center">
              <p className="text-yellow-500 text-sm font-medium">
                ⚠️ TESTNET → Using ckTESTBTC
              </p>
            </div>
          )}
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
              {isLoadingBalance ? (
                <div className="h-8 w-24 rounded animate-shimmer" aria-hidden />
              ) : displayWalletInfo ? (
                <p 
                  className="font-mono text-2xl font-bold text-white"
                  style={{ letterSpacing: '0.96px' }}
                >
                  {formatBTC(displayWalletInfo.balance)}
                </p>
              ) : (
                <p 
                  className="font-mono text-2xl font-bold text-white"
                  style={{ letterSpacing: '0.96px' }}
                >
                  0
                </p>
              )}
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
          {isLoadingBalance ? (
            <div className="flex flex-col gap-4">
              <div className="h-[1px] w-full bg-white/50" />
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between py-2 px-5">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-6 bg-white/20 animate-pulse rounded" />
                    <div className="h-6 w-32 bg-white/20 animate-pulse rounded" />
                  </div>
                  <div className="h-6 w-24 bg-white/20 animate-pulse rounded" />
                </div>
              ))}
              <div className="h-[1px] w-full bg-white/50" />
            </div>
          ) : displayTransactions.length > 0 ? (
            <>
              {/* Figma: Divider - 1px, rgba(255,255,255,0.5) - constrained to content width */}
              <div className="h-[1px] w-full bg-white/50" />
              
              {[...displayTransactions]
                .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
                .map((tx) => {
                  const txType = getTransactionIcon(tx, walletAddressForTx);
                
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
                      {/* Figma: Amount - IBM Plex Mono Medium, 18px (reduced from 20px for mobile), rgba(255,255,255,0.8), tracking 0.8px */}
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-[18px] font-medium text-white" style={{ letterSpacing: '0.8px' }}>₿</span>
                        <p 
                          className="font-mono text-[18px] font-medium text-white"
                          style={{ letterSpacing: '0.8px' }}
                        >
                          {formatBTC(tx.amount)}
                        </p>
                      </div>
                    </div>
                    {/* Figma: Date - IBM Plex Mono, 18px, font-weight 400, rgba(255,255,255,0.8), tracking 0.8px */}
                    <p 
                      className="font-mono text-[18px] font-normal text-white"
                      style={{ letterSpacing: '0.8px' }}
                    >
                      {formatDate(tx.timestamp)}
                    </p>
                  </button>
                );
              })}
              <div className="h-[1px] w-full bg-white/50" />
            </>
          ) : (
            <>
              <div className="h-[1px] w-full bg-white/50" />
              <div className="flex flex-1 items-center justify-center">
                <p className="text-center text-lg text-white/60">No transactions yet</p>
              </div>
              <div className="h-[1px] w-full bg-white/50" />
            </>
          )}
        </div>
        </div>
      </div>

      {/* Fixed bottom action buttons - do not move with pull-to-refresh */}
      <div className="flex gap-4 shrink-0 px-5 pb-5">
        <button
          onClick={() => setShowSendModal(true)}
          className="flex-1 h-16 border-2 border-white/80 bg-transparent hover:border-white transition-colors flex items-center justify-center opacity-80 hover:opacity-100"
        >
          <img src="/assets/sent.svg" alt="Send" className="h-8 w-8" />
        </button>
        <button
          onClick={() => setShowReceiveModal(true)}
          className="flex-1 h-16 border-2 border-white/80 bg-transparent hover:border-white transition-colors flex items-center justify-center opacity-80 hover:opacity-100"
        >
          <img src="/assets/recieved.svg" alt="Receive" className="h-8 w-8" />
        </button>
      </div>

      {/* Send Modal - Full screen */}
      {showSendModal && displayWalletInfo && (
        <SendTransaction
          wallet={displayWalletInfo}
          onSuccess={() => setShowSendModal(false)}
          onClose={() => setShowSendModal(false)}
        />
      )}

      {/* Receive Modal - Full screen - Show modal even if address is loading */}
      {showReceiveModal && (
        walletAddress ? (
          <ReceiveBitcoin 
            address={walletAddress} 
            onClose={() => setShowReceiveModal(false)} 
          />
        ) : (
          <div className="fixed inset-0 bg-black z-[9999] flex flex-col items-center justify-center px-5">
            {isLoadingAddress ? (
              <>
                <p className="text-white text-center text-lg mb-4">Loading Bitcoin address...</p>
                <p className="text-white/60 text-center text-sm mb-8">Please wait</p>
              </>
            ) : walletAddressError ? (
              <>
                <p className="text-white text-center text-lg mb-4">Unable to load Bitcoin address</p>
                <p className="text-white/60 text-center text-sm mb-4">{walletAddressError.message}</p>
                <p className="text-white/60 text-center text-sm mb-8">Please try again later</p>
              </>
            ) : (
              <>
                <p className="text-white text-center text-lg mb-4">Unable to load Bitcoin address</p>
                <p className="text-white/60 text-center text-sm mb-8">Please try again later</p>
              </>
            )}
            <button
              onClick={() => setShowReceiveModal(false)}
              className="h-16 border-2 border-white/80 bg-transparent hover:bg-white/10 transition-colors flex items-center justify-center px-8"
            >
              <span className="font-bold text-base text-white/80 tracking-[0.15px]">Close</span>
            </button>
          </div>
        )
      )}

      {/* Add Funds Modal (same as Receive) - Show modal even if address is loading */}
      {showAddFundsModal && (
        walletAddress ? (
          <ReceiveBitcoin 
            address={walletAddress} 
            onClose={() => setShowAddFundsModal(false)} 
          />
        ) : (
          <div className="fixed inset-0 bg-black z-[9999] flex flex-col items-center justify-center px-5">
            {isLoadingAddress ? (
              <>
                <p className="text-white text-center text-lg mb-4">Loading Bitcoin address...</p>
                <p className="text-white/60 text-center text-sm mb-8">Please wait</p>
              </>
            ) : walletAddressError ? (
              <>
                <p className="text-white text-center text-lg mb-4">Unable to load Bitcoin address</p>
                <p className="text-white/60 text-center text-sm mb-4">{walletAddressError.message}</p>
                <p className="text-white/60 text-center text-sm mb-8">Please try again later</p>
              </>
            ) : (
              <>
                <p className="text-white text-center text-lg mb-4">Unable to load Bitcoin address</p>
                <p className="text-white/60 text-center text-sm mb-8">Please try again later</p>
              </>
            )}
            <button
              onClick={() => setShowAddFundsModal(false)}
              className="h-16 border-2 border-white/80 bg-transparent hover:bg-white/10 transition-colors flex items-center justify-center px-8"
            >
              <span className="font-bold text-base text-white/80 tracking-[0.15px]">Close</span>
            </button>
          </div>
        )
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
              
              {/* Account info - show above Sign Out (principal; display name when II provides one) */}
              {currentPrincipal && (
                <div 
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(currentPrincipal);
                      setPrincipalCopied(true);
                      setTimeout(() => setPrincipalCopied(false), 2000);
                    } catch (err) {
                      console.error('Failed to copy principal:', err);
                      toast.error('Failed to copy');
                    }
                  }}
                  className="bg-black/90 border border-white/20 rounded p-4 text-xs cursor-pointer hover:bg-black/95 hover:border-white/30 transition-colors active:scale-[0.98]"
                >
                  <div className="text-white/60 mb-2 font-bold">
                    {displayName ? 'Signed in as' : 'Market.Town account'}
                  </div>
                  {displayName ? (
                    <div className="text-white mb-2 font-medium">{displayName}</div>
                  ) : null}
                  <div className="text-white/60 text-[11px] leading-relaxed mb-1">Principal (this app):</div>
                  <div className="text-white break-all mb-3 font-mono">{principalCopied ? 'Copied!' : currentPrincipal}</div>
                  <div className="text-white/60 text-[11px] leading-relaxed">
                    {displayName
                      ? 'You can set a username in Internet Identity (id.ai). Your principal is unique per app.'
                      : 'Internet Identity can use usernames instead of ID numbers. Your principal is unique per app.'}
                  </div>
                  <div className="bg-amber-950/50 border border-amber-600/50 text-amber-200 text-[11px] leading-relaxed mt-3 p-3 rounded">
                    <p className="font-semibold text-amber-100 mb-1">⚠️ Save this principal before changing Internet Identity</p>
                    <p className="mb-2">
                      Changing your Internet Identity (e.g. upgrading to a username, adding devices, or switching accounts) can give you a <strong>different principal</strong> in this app. Your balance here is tied to <strong>this</strong> principal only. If you change identity and cannot sign in with the old one again, you will <strong>lose access to that balance</strong> from this app—even though the funds still exist on the old principal.
                    </p>
                    <p>
                      <strong>Recommendation:</strong> Tap below to copy this principal and store it somewhere safe <em>before</em> making any change in Internet Identity. If you ever lose access, recovering the balance would require signing in again with the same identity that had it.
                    </p>
                  </div>
                  <div className="text-white/40 text-[10px] mt-2 italic">
                    Tap to copy principal
                  </div>
                </div>
              )}
              
              {/* Sign Out */}
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setShowSignOutDialog(true);
                }}
                className="flex gap-4 h-8 items-center opacity-80 hover:opacity-100 transition-opacity"
              >
                <img src="/assets/logout.svg" alt="Sign Out" className="size-6" />
                <div className="flex flex-col font-medium justify-center text-xl text-white tracking-[0.8px]">
                  <p className="leading-[1.5]">Sign Out</p>
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
      {selectedTransaction && (walletAddress || walletAddressForTx) && (
        <TransactionDetails 
          transaction={selectedTransaction} 
          walletAddress={walletAddress ?? walletAddressForTx}
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
