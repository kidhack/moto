import { useState, useEffect } from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useActor } from '../hooks/useActor';
import { useWalletInfo, useEnsureWallet, useResetOnboarding, useSignOutAndReset, useWalletAddress } from '../hooks/useQueries';
import { useCkBTCMinter } from '../hooks/useCkBTCMinter';
import { useCkBTCLedger } from '../hooks/useCkBTCLedger';
import { isBech32AddressForStorage } from '../utils/addressValidation';
import { useCkBTCTransactions } from '../hooks/useCkBTCTransactions';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import type { Transaction } from '../backend';
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
  const { clear, identity } = useInternetIdentity();
  const { actor } = useActor();
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
  const [showSendModal, setShowSendModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showCurrencySelector, setShowCurrencySelector] = useState(false);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [principalCopied, setPrincipalCopied] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const WALLET_NAME_KEY_PREFIX = 'moto_wallet_name_';
  const DEFAULT_WALLET_NAME = "Nakamoto's Wallet";
  const getStoredWalletName = (principal: string) => {
    try {
      const s = localStorage.getItem(WALLET_NAME_KEY_PREFIX + principal);
      return s?.trim() || DEFAULT_WALLET_NAME;
    } catch {
      return DEFAULT_WALLET_NAME;
    }
  };
  const setStoredWalletName = (principal: string, name: string) => {
    try {
      const trimmed = name?.trim() || DEFAULT_WALLET_NAME;
      localStorage.setItem(WALLET_NAME_KEY_PREFIX + principal, trimmed);
    } catch {
      // ignore
    }
  };
  const clearStoredWalletName = (principal: string) => {
    try {
      localStorage.removeItem(WALLET_NAME_KEY_PREFIX + principal);
    } catch {
      // ignore
    }
  };

  const [walletName, setWalletName] = useState(DEFAULT_WALLET_NAME);
  const [editingWalletName, setEditingWalletName] = useState(false);
  const [walletNameInput, setWalletNameInput] = useState(DEFAULT_WALLET_NAME);

  useEffect(() => {
    if (currentPrincipal) {
      setWalletName(getStoredWalletName(currentPrincipal));
      setWalletNameInput(getStoredWalletName(currentPrincipal));
    }
  }, [currentPrincipal]);
  
  // Debug: Log principal when menu opens
  useEffect(() => {
    if (menuOpen && currentPrincipal) {
      console.log('Menu opened - Current Principal ID:', currentPrincipal);
    }
  }, [menuOpen, currentPrincipal]);

  // Ensure wallet exists in the canister so we can store this user's Bitcoin address for MOTO-to-MOTO lookup.
  // Do NOT wait for isCkbtcFetching: the minter can be slow; we need the canister wallet to exist first.
  useEffect(() => {
    if (!actor) return;
    if (!ensureWallet.isPending && !ensureWallet.isSuccess) {
      ensureWallet.mutate();
    }
  }, [actor, ensureWallet]);

  // Explicitly sync this user's ckBTC address to the canister as soon as we have both wallet and address.
  // This guarantees getPrincipalByBitcoinAddress can resolve our address for senders (MOTO-to-MOTO),
  // independent of useWalletInfo query timing.
  useEffect(() => {
    if (!actor || !ensureWallet.isSuccess || !ckbtcAddress || !isBech32AddressForStorage(ckbtcAddress)) return;
    let cancelled = false;
    actor
      .setBitcoinAddress(ckbtcAddress)
      .then(() => {
        if (!cancelled) console.log('WalletDashboard: setBitcoinAddress synced for MOTO-to-MOTO', ckbtcAddress.slice(0, 12) + '...');
      })
      .catch((err) => {
        if (!cancelled) console.warn('WalletDashboard: setBitcoinAddress failed:', err);
      });
    return () => { cancelled = true; };
  }, [actor, ensureWallet.isSuccess, ckbtcAddress]);

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

  const handleLogOut = async () => {
    setMenuOpen(false);
    try {
      await clear();
      try {
        sessionStorage.setItem('moto_skip_splash', '1');
      } catch {}
      toast.success('Signed out');
      setTimeout(() => {
        window.location.href = window.location.origin + window.location.pathname;
      }, 300);
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out. Please refresh the page.');
    }
  };

  const handleWipeCanisterAndSignOut = async () => {
    setMenuOpen(false);
    if (currentPrincipal) clearStoredWalletName(currentPrincipal);
    try {
      try {
        await signOutAndReset.mutateAsync();
        console.log('WalletDashboard: Backend signOutAndReset successful');
      } catch (backendError) {
        console.warn('WalletDashboard: Backend signOutAndReset failed (continuing with local logout):', backendError);
      }
      await clear();
      try {
        sessionStorage.setItem('moto_skip_splash', '1');
      } catch {}
      toast.success('Canister wiped and signed out');
      setTimeout(() => {
        window.location.href = window.location.origin + window.location.pathname;
      }, 300);
    } catch (error) {
      console.error('Wipe and sign out error:', error);
      try {
        await clear();
        try {
          sessionStorage.setItem('moto_skip_splash', '1');
        } catch {}
        window.location.href = window.location.origin + window.location.pathname;
      } catch (clearError) {
        console.error('Failed to clear identity:', clearError);
        toast.error('Failed to complete. Please refresh the page.');
      }
    }
  };

  const handleSaveWalletName = () => {
    if (!currentPrincipal) return;
    const name = walletNameInput?.trim() || DEFAULT_WALLET_NAME;
    setWalletName(name);
    setStoredWalletName(currentPrincipal, name);
    setEditingWalletName(false);
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

  // Fallback wallet for Send modal when displayWalletInfo is null (e.g. custom canister actor unavailable)
  // Uses ledger balance + ckBTC address so user can still send via ckBTC ledger
  const sendWallet =
    displayWalletInfo ??
    (ledgerBalance !== null && ckbtcAddress && identity
      ? {
          principal: identity.getPrincipal(),
          bitcoinAddress: ckbtcAddress,
          transactions: [] as Transaction[],
          balance: ledgerBalance,
          onboardingComplete: true,
          createdAt: BigInt(0),
          lastUpdated: BigInt(0),
        }
      : null);

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
    <div className="flex h-screen flex-col bg-black text-white overflow-hidden">
      
      {/* Fixed top: header (no scroll) */}
      <div className="flex flex-col shrink-0 pt-8 px-5">
        <header className="flex items-center justify-between">
          <button onClick={() => setMenuOpen(true)} className="cursor-pointer">
            <img src="/assets/moto-logo-mark.svg" alt="MOTO" className="h-10 w-10" />
          </button>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-2xl font-bold text-white" style={{ letterSpacing: '0.96px' }}>₿</span>
              {isLoadingBalance ? (
                <div className="h-8 w-24 rounded animate-shimmer" aria-hidden />
              ) : ledgerBalance !== null ? (
                <p className="font-mono text-2xl font-bold text-white" style={{ letterSpacing: '0.96px' }}>{formatBTC(ledgerBalance)}</p>
              ) : displayWalletInfo ? (
                <p className="font-mono text-2xl font-bold text-white" style={{ letterSpacing: '0.96px' }}>{formatBTC(displayWalletInfo.balance)}</p>
              ) : (
                <p className="font-mono text-2xl font-bold text-white" style={{ letterSpacing: '0.96px' }}>0</p>
              )}
            </div>
            {(ledgerBalance === null || ledgerBalance <= BigInt(0)) && (
              <button onClick={() => setShowAddFundsModal(true)} className="h-8 w-8 flex items-center justify-center hover:bg-white/10 transition-colors">
                <img src="/assets/addfunds.svg" alt="Add Funds" className="h-8 w-8" />
              </button>
            )}
          </div>
        </header>
        {/* Top divider - fixed, does not scroll (match main menu: mt-6) */}
        <div className="h-[1px] w-full bg-white/50 mt-6" />
      </div>

      {/* Scrollable area: only the transaction list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overscroll-contain relative min-h-0 px-5"
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
        <div className="flex flex-col gap-6 pt-4 pb-5 transition-[transform] duration-75 ease-out" style={{ transform: `translateY(${pullDistance}px)` }}>
        {import.meta.env.VITE_USE_TESTNET === 'true' && (
          <div className="bg-yellow-500/20 border border-yellow-500/50 rounded px-4 py-2 text-center">
            <p className="text-yellow-500 text-sm font-medium">⚠️ TESTNET</p>
          </div>
        )}
        {/* Transactions List */}
        <div className="flex flex-col gap-6">
          {isLoadingBalance ? (
            <div className="flex flex-col gap-4">
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
          ) : displayTransactions.length > 0 && walletAddressForTx ? (
            <>
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
                      <div className="flex items-center gap-[8px]">
                        <div className="h-8 w-6 flex items-center justify-center shrink-0">
                          {txType === 'sent' ? (
                            <img src="/assets/tx-sent.svg" alt="Sent" className="h-8 w-6 object-contain opacity-60" />
                          ) : txType === 'received' ? (
                            <img src="/assets/tx-recieve.svg" alt="Received" className="h-8 w-6 object-contain opacity-60" />
                          ) : (
                            <img src="/assets/addfunds.svg" alt="Added Funds" className="h-8 w-6 object-contain" />
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-[18px] font-medium text-white/80" style={{ letterSpacing: '0.8px' }}>₿</span>
                          <p className="font-mono text-[18px] font-medium text-white/80" style={{ letterSpacing: '0.8px' }}>
                            {formatBTC(tx.amount)}
                          </p>
                        </div>
                      </div>
                      <p className="font-mono text-[18px] font-normal text-white/50" style={{ letterSpacing: '0.8px' }}>
                        {formatDate(tx.timestamp)}
                      </p>
                    </button>
                  );
                })}
            </>
          ) : (
            <>
              <div className="flex flex-1 items-center justify-center">
                <p className="text-center text-lg text-white/60">No transactions yet</p>
              </div>
            </>
          )}
        </div>
        </div>
      </div>

      {/* Fixed bottom: divider + Send/Receive buttons - do not scroll (px-5 matches top section so divider width matches) */}
      <div className="flex flex-col shrink-0 px-5">
        <div className="h-[1px] w-full bg-white/50" />
        <div className="flex gap-4 pb-5 pt-4">
        <button
          onClick={() => setShowSendModal(true)}
          className="flex-1 h-16 border-2 border-white/80 bg-transparent hover:border-white transition-colors flex items-center justify-center opacity-80 hover:opacity-100"
        >
          <span className="font-bold text-base text-white/80 tracking-[0.15px]">Send</span>
        </button>
        <button
          onClick={() => setShowReceiveModal(true)}
          className="flex-1 h-16 border-2 border-white/80 bg-transparent hover:border-white transition-colors flex items-center justify-center opacity-80 hover:opacity-100"
        >
          <span className="font-bold text-base text-white/80 tracking-[0.15px]">Receive</span>
        </button>
        </div>
      </div>

      {/* Send Modal - Full screen */}
      {showSendModal && sendWallet && (
        <SendTransaction
          wallet={sendWallet}
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

             {/* Full-screen Menu Modal - Figma layout: logo, dividers, sections, Close at bottom */}
             {menuOpen && (
               <div className="fixed inset-0 bg-black z-[9999] flex flex-col">
                 <div className="flex flex-col flex-1 min-h-0 pt-8 px-5 pb-5">
                   {/* Logo: normal logo (full wordmark) */}
                   <button
                     onClick={() => setMenuOpen(false)}
                     className="flex items-center cursor-pointer shrink-0"
                   >
                     <img src="/assets/moto-logo.svg" alt="MOTO" className="h-10 w-[172px] object-contain object-center" />
                   </button>

                   {/* Divider under logo */}
                   <div className="h-px w-full bg-white/50 shrink-0 mt-6" />

                   {/* Scrollable content: My Wallet, Currency, Language, Principal ID, Sign Out, Wipe */}
                   <div className="flex flex-col gap-6 flex-1 min-h-0 overflow-y-auto pt-6">
                     {/* My Wallet - equal space above and below the name */}
                     {currentPrincipal && (
                       <div className="flex flex-col gap-6">
                         <div className="flex items-center min-h-[2rem]">
                           {editingWalletName ? (
                             <input
                               type="text"
                               value={walletNameInput}
                               onChange={(e) => setWalletNameInput(e.target.value)}
                               onBlur={handleSaveWalletName}
                               onKeyDown={(e) => e.key === 'Enter' && handleSaveWalletName()}
                               className="w-full bg-transparent border-0 rounded-none px-0 py-0 text-white/80 font-mono font-medium text-xl tracking-[0.8px] outline-none placeholder:text-white/50"
                               placeholder={DEFAULT_WALLET_NAME}
                               autoFocus
                             />
                           ) : (
                             <button
                               onClick={() => { setWalletNameInput(walletName); setEditingWalletName(true); }}
                               className="w-full flex items-center justify-between min-h-[2rem] opacity-80 hover:opacity-100 transition-opacity text-left"
                             >
                               <span className="font-mono font-medium text-xl text-white/80 tracking-[0.8px]">{walletName}</span>
                               <svg className="size-5 text-white/70 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                 <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                               </svg>
                             </button>
                           )}
                         </div>
                         <div className="h-px w-full bg-white/20" />
                       </div>
                     )}

                     {/* Currency */}
                     <button
                       onClick={() => { setMenuOpen(false); setShowCurrencySelector(true); }}
                       className="flex gap-4 h-10 items-center w-full opacity-80 hover:opacity-100 transition-opacity text-left"
                     >
                       <img src="/assets/currency.svg" alt="" className="size-6 shrink-0 opacity-80" />
                       <span className="font-medium text-xl text-white/80 tracking-[0.8px]">Currency</span>
                     </button>

                     {/* Language */}
                     <button
                       onClick={() => { setMenuOpen(false); setShowLanguageSelector(true); }}
                       className="flex gap-4 h-10 items-center w-full opacity-80 hover:opacity-100 transition-opacity text-left"
                     >
                       <img src="/assets/language.svg" alt="" className="size-6 shrink-0 opacity-80" />
                       <span className="font-medium text-xl text-white/80 tracking-[0.8px]">Language</span>
                     </button>

                     <div className="h-px w-full bg-white/20" />

                     {/* Sign Out */}
                     <button
                       onClick={handleLogOut}
                       className="flex gap-4 h-10 items-center w-full opacity-80 hover:opacity-100 transition-opacity text-left"
                     >
                       <img src="/assets/logout.svg" alt="" className="size-6 shrink-0 opacity-80" />
                       <span className="font-medium text-xl text-white/80 tracking-[0.8px]">Sign Out</span>
                     </button>

                     <div className="h-px w-full bg-white/20" />

                     {/* Principal ID + blurb */}
                     {currentPrincipal && (
                       <div className="flex flex-col gap-3">
                         <p className="text-white/60 text-[14px] font-medium">Principal ID</p>
                         <div
                           onClick={async () => {
                             try {
                               await navigator.clipboard.writeText(currentPrincipal);
                               setPrincipalCopied(true);
                               setTimeout(() => setPrincipalCopied(false), 2000);
                             } catch {
                               toast.error('Failed to copy');
                             }
                           }}
                           className="bg-zinc-900/90 p-3 cursor-pointer flex items-center justify-center relative"
                         >
                           <p className="text-white/80 font-mono text-[16px] font-medium text-center break-all leading-relaxed" style={{ letterSpacing: '0.32px', textWrap: 'balance' }}>
                             {currentPrincipal}
                           </p>
                           {principalCopied && (
                             <p className="absolute inset-0 flex items-center justify-center bg-zinc-900/90 text-white/80 font-sans text-[16px] font-medium">
                               Copied!
                             </p>
                           )}
                         </div>
<p className="text-white/50 text-[14px] leading-relaxed">
                          MOTO is 100% decentralized and on-chain. App settings are stored in your private canister and all financial data is stored on ledger.
                        </p>
                       </div>
                     )}

                     {/* Wipe Canister & Sign Out */}
                     <button
                       onClick={handleWipeCanisterAndSignOut}
                       disabled={signOutAndReset.isPending}
                       className="flex gap-4 h-10 items-center w-full opacity-80 hover:opacity-100 transition-opacity text-left"
                     >
                       <img
                         src="/assets/wipeout.svg"
                         alt=""
                         className="size-6 shrink-0"
                         style={{ filter: 'brightness(0) saturate(100%) invert(27%) sepia(98%) saturate(1000%) hue-rotate(346deg) brightness(104%) contrast(97%)' }}
                       />
                       <span className="font-medium text-xl text-red-500 tracking-[0.8px]">
                         {signOutAndReset.isPending ? 'Wiping...' : 'Wipe Canister & Sign Out'}
                       </span>
                     </button>

                     {/* Divider below Wipe Canister & Sign Out */}
                     <div className="h-px w-full bg-white/20" />
                   </div>

                   {/* Close button - bottom, full width */}
                   <button
                     onClick={() => setMenuOpen(false)}
                     className="w-full h-16 mt-6 border border-white/80 bg-transparent hover:bg-white/10 transition-colors flex items-center justify-center shrink-0"
                   >
                     <span className="font-bold text-base text-white/80 tracking-[0.15px]">Close</span>
                   </button>
                 </div>
               </div>
             )}

      {/* Currency Selector Modal */}
      {showCurrencySelector && (
        <CurrencySelector onClose={() => { setShowCurrencySelector(false); setMenuOpen(true); }} />
      )}

      {/* Language Selector Modal */}
      {showLanguageSelector && (
        <LanguageSelector onClose={() => { setShowLanguageSelector(false); setMenuOpen(true); }} />
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

    </div>
  );
}
