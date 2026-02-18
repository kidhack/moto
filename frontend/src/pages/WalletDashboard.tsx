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
import { SlideFromRight } from '../components/SlideFromRight';
import { useBackButton } from '../hooks/useBackButton';
import { useTranslation } from '../i18n';

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
  const { t } = useTranslation();
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
  const [settingsExiting, setSettingsExiting] = useState(false);
  const [principalCopied, setPrincipalCopied] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [menuClosing, setMenuClosing] = useState(false);
  const [menuEntering, setMenuEntering] = useState(true);

  useBackButton(showSendModal, () => setShowSendModal(false));
  useBackButton(showReceiveModal, () => setShowReceiveModal(false));
  useBackButton(showAddFundsModal, () => setShowAddFundsModal(false));
  useBackButton(menuOpen, () => { setMenuClosing(true); });
  useBackButton(selectedTransaction !== null, () => setSelectedTransaction(null));

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

  // Reset menu animation state when opening - delay ensures initial clipPath is painted before transition
  useEffect(() => {
    if (menuOpen) {
      setMenuEntering(true);
      const id = setTimeout(() => setMenuEntering(false), 16);
      return () => clearTimeout(id);
    }
  }, [menuOpen]);

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
      toast.success(t('menu.onboardingReset'));
      setTimeout(async () => {
        await clear();
      }, 1000);
    } catch (error) {
      toast.error(t('menu.failedToResetOnboarding'));
    }
  };

  const handleLogOut = async () => {
    setMenuOpen(false);
    try {
      await clear();
      try {
        sessionStorage.setItem('moto_skip_splash', '1');
      } catch {}
      toast.success(t('menu.signedOut'));
      setTimeout(() => {
        window.location.href = window.location.origin + window.location.pathname;
      }, 300);
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error(t('menu.failedToSignOut'));
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
      toast.success(t('menu.canisterWiped'));
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
        toast.error(t('menu.failedToComplete'));
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
    <div className="flex h-dvh min-h-dvh flex-col bg-black text-white overflow-hidden">
      
      {/* Fixed top: header - large tappable logo area for reliable mobile menu open */}
      <div className="flex flex-col shrink-0 pt-4 px-5 relative z-30">
        <header className="flex items-center justify-between">
          {/* Logo mark - same height (h-8) as menu logo, left aligned */}
          <button
            type="button"
            onClick={() => { setMenuOpen(true); setMenuEntering(true); }}
            className="cursor-pointer flex items-center justify-start -m-2 p-2 shrink-0 touch-manipulation"
            aria-label={t('dashboard.openMenu')}
          >
            <img src="/assets/moto-logo-mark.svg" alt="" className="h-8 w-8 object-left pointer-events-none select-none" />
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
              <button onClick={() => setShowAddFundsModal(true)} className="h-8 w-8 flex items-center justify-center hover:bg-white/10 transition-colors" aria-label={t('dashboard.addFunds')}>
                <img src="/assets/addfunds.svg" alt="" className="h-8 w-8" />
              </button>
            )}
          </div>
        </header>
        {/* Top divider - fixed, does not scroll */}
        <div className="h-[1px] w-full bg-white/50 mt-4" />
      </div>

      {/* Scrollable area: only the transaction list - pb for fixed bottom bar */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overscroll-contain relative min-h-0 px-5"
        style={{ paddingBottom: 'calc(105px + env(safe-area-inset-bottom, 0px))' }}
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
                <span className="text-xs text-white/70">{t('dashboard.refreshing')}</span>
              </>
            ) : pullDistance >= 20 ? (
              <>
                <svg className="h-5 w-5 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: `rotate(${-90 + pullProgress * 180}deg)` }}>
                  <path d="M23 4v6h-6M1 20v-6h6" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
                <span className="text-xs text-white/70">{pullProgress >= 1 ? t('dashboard.releaseToRefresh') : t('dashboard.pullToRefresh')}</span>
              </>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col gap-6 pt-4 pb-5 transition-[transform] duration-75 ease-out" style={{ transform: `translateY(${pullDistance}px)` }}>
        {import.meta.env.VITE_USE_TESTNET === 'true' && (
          <div className="bg-yellow-500/20 border border-yellow-500/50 rounded px-4 py-2 text-center">
            <p className="text-yellow-500 text-sm font-medium">{t('dashboard.testnet')}</p>
          </div>
        )}
        {/* Transactions List */}
        <div className="flex flex-col" style={{ gap: 19 }}>
          {isLoadingBalance ? (
            <div className="flex flex-col" style={{ gap: 19 }}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between h-8">
                  <div className="flex items-center gap-[8px]">
                    <div className="h-4 w-4 flex items-center justify-center shrink-0">
                      <div className="h-2 w-2 rounded-full animate-shimmer" />
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="h-5 w-4 rounded animate-shimmer" />
                      <div className="h-5 w-24 rounded animate-shimmer" />
                    </div>
                  </div>
                  <div className="h-5 w-32 rounded animate-shimmer" />
                </div>
              ))}
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
                      className="group flex w-full items-center justify-between h-8 opacity-80 hover:opacity-100 transition-opacity"
                    >
                      <div className="flex items-center gap-[8px]">
                        <div className="h-4 w-4 flex items-center justify-center shrink-0">
                          {txType === 'sent' ? (
                            <div className="h-2 w-2 rounded-full bg-red-500 opacity-60 group-hover:opacity-100 group-active:opacity-100 transition-opacity" />
                          ) : (
                            <div className="h-2 w-2 rounded-full bg-green-500 opacity-60 group-hover:opacity-100 group-active:opacity-100 transition-opacity" />
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-[18px] font-medium text-white/80" style={{ letterSpacing: '0.8px' }}>₿</span>
                          <p className="font-mono text-[18px] font-medium text-white/80" style={{ letterSpacing: '0.8px' }}>
                            {formatBTC(tx.amount)}
                          </p>
                        </div>
                      </div>
                      <p className="font-mono text-[18px] font-normal text-white/50" style={{ letterSpacing: '-0.04em' }}>
                        {formatDate(tx.timestamp)}
                      </p>
                    </button>
                  );
                })}
            </>
          ) : (
            <>
              <div className="flex flex-1 items-center justify-center">
                <p className="text-center text-lg text-white/60">{t('dashboard.noTransactions')}</p>
              </div>
            </>
          )}
        </div>
        </div>
      </div>

      {/* Fixed bottom: divider + Send/Receive buttons - flush with viewport bottom */}
      <div
        className="fixed bottom-0 left-0 right-0 flex flex-col bg-black px-5 z-20"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="h-[1px] w-full bg-white/50" />
        <div className="flex gap-2 pt-4 pb-4">
        <button
          onClick={() => setShowSendModal(true)}
          className="flex-1 h-16 border-2 border-white/80 bg-transparent hover:border-white transition-colors flex items-center justify-center opacity-80 hover:opacity-100"
        >
          <span className="font-bold text-base text-white/80 tracking-[0.15px]">{t('dashboard.send')}</span>
        </button>
        <button
          onClick={() => setShowReceiveModal(true)}
          className="flex-1 h-16 border-2 border-white/80 bg-transparent hover:border-white transition-colors flex items-center justify-center opacity-80 hover:opacity-100"
        >
          <span className="font-bold text-base text-white/80 tracking-[0.15px]">{t('dashboard.receive')}</span>
        </button>
        </div>
      </div>

      {/* Send Modal - slide from right */}
      {showSendModal && sendWallet && (
        <SlideFromRight open={showSendModal} onClose={() => setShowSendModal(false)}>
          <SendTransaction
            wallet={sendWallet}
            onSuccess={() => setShowSendModal(false)}
            onClose={() => setShowSendModal(false)}
          />
        </SlideFromRight>
      )}

      {/* Receive Modal - slide from right */}
      {showReceiveModal && (
        walletAddress ? (
          <SlideFromRight open={showReceiveModal} onClose={() => setShowReceiveModal(false)}>
            <ReceiveBitcoin 
              address={walletAddress} 
              onClose={() => setShowReceiveModal(false)} 
            />
          </SlideFromRight>
        ) : (
          <div className="fixed inset-0 bg-black z-[9999] flex flex-col items-center justify-center px-5">
            {isLoadingAddress ? (
              <>
                <p className="text-white text-center text-lg mb-4">{t('dashboard.loadingAddress')}</p>
                <p className="text-white/60 text-center text-sm mb-8">{t('common.pleaseWait')}</p>
              </>
            ) : walletAddressError ? (
              <>
                <p className="text-white text-center text-lg mb-4">{t('dashboard.unableToLoadAddress')}</p>
                <p className="text-white/60 text-center text-sm mb-4">{walletAddressError.message}</p>
                <p className="text-white/60 text-center text-sm mb-8">{t('common.pleaseRetryLater')}</p>
              </>
            ) : (
              <>
                <p className="text-white text-center text-lg mb-4">{t('dashboard.unableToLoadAddress')}</p>
                <p className="text-white/60 text-center text-sm mb-8">{t('common.pleaseRetryLater')}</p>
              </>
            )}
            <button
              onClick={() => setShowReceiveModal(false)}
              className="h-16 border-2 border-white/80 bg-transparent hover:bg-white/10 transition-colors flex items-center justify-center px-8"
            >
              <span className="font-bold text-base text-white/80 tracking-[0.15px]">{t('common.close')}</span>
            </button>
          </div>
        )
      )}

      {/* Add Funds Modal (same as Receive) - slide from right */}
      {showAddFundsModal && (
        walletAddress ? (
          <SlideFromRight open={showAddFundsModal} onClose={() => setShowAddFundsModal(false)}>
            <ReceiveBitcoin 
              address={walletAddress} 
              onClose={() => setShowAddFundsModal(false)} 
            />
          </SlideFromRight>
        ) : (
          <div className="fixed inset-0 bg-black z-[9999] flex flex-col items-center justify-center px-5">
            {isLoadingAddress ? (
              <>
                <p className="text-white text-center text-lg mb-4">{t('dashboard.loadingAddress')}</p>
                <p className="text-white/60 text-center text-sm mb-8">{t('common.pleaseWait')}</p>
              </>
            ) : walletAddressError ? (
              <>
                <p className="text-white text-center text-lg mb-4">{t('dashboard.unableToLoadAddress')}</p>
                <p className="text-white/60 text-center text-sm mb-4">{walletAddressError.message}</p>
                <p className="text-white/60 text-center text-sm mb-8">{t('common.pleaseRetryLater')}</p>
              </>
            ) : (
              <>
                <p className="text-white text-center text-lg mb-4">{t('dashboard.unableToLoadAddress')}</p>
                <p className="text-white/60 text-center text-sm mb-8">{t('common.pleaseRetryLater')}</p>
              </>
            )}
            <button
              onClick={() => setShowAddFundsModal(false)}
              className="h-16 border-2 border-white/80 bg-transparent hover:bg-white/10 transition-colors flex items-center justify-center px-8"
            >
              <span className="font-bold text-base text-white/80 tracking-[0.15px]">{t('common.close')}</span>
            </button>
          </div>
        )
      )}

             {/* Full-screen Menu Modal - wipe reveal; menu pushes left when Currency/Language open */}
             {(menuOpen || menuClosing) && (
               <div
                 className="fixed inset-0 bg-black z-[9999] origin-top overflow-hidden"
                 style={{
                   clipPath: menuClosing ? 'inset(0 0 100% 0)' : menuEntering ? 'inset(0 0 100% 0)' : 'inset(0 0 0 0)',
                   transition: 'clip-path 100ms ease-out',
                 }}
                 onTransitionEnd={() => {
                   if (menuClosing) {
                     setMenuOpen(false);
                     setMenuClosing(false);
                     setShowCurrencySelector(false);
                     setShowLanguageSelector(false);
                     setSettingsExiting(false);
                   } else if (menuEntering) {
                     setMenuEntering(false);
                   }
                 }}
               >
                 <div
                   className="flex flex-row h-full transition-transform duration-200 ease-out"
                   style={{
                     width: ((showCurrencySelector || showLanguageSelector) || settingsExiting) ? '200%' : '100%',
                     transform: ((showCurrencySelector || showLanguageSelector) && !settingsExiting) ? 'translateX(-50%)' : 'translateX(0)',
                   }}
                   onTransitionEnd={(e) => {
                     if (e.target !== e.currentTarget) return;
                     if (settingsExiting) {
                       setShowCurrencySelector(false);
                       setShowLanguageSelector(false);
                       setSettingsExiting(false);
                     }
                   }}
                 >
                 <div
                   className={`flex flex-col flex-1 min-h-0 shrink-0 ${((showCurrencySelector || showLanguageSelector) || settingsExiting) ? 'w-1/2' : 'w-full'}`}
                 >
                 <div className="flex flex-col flex-1 min-h-0 pt-4 px-5 pb-5">
                   {/* Logo: normal logo (full wordmark) - tap to close, left aligned */}
                   <button
                     onClick={() => setMenuClosing(true)}
                     className="flex items-center justify-start cursor-pointer shrink-0 w-full"
                   >
                     <img src="/assets/moto-logo.svg" alt="MOTO" className="h-8 w-[172px] object-contain object-left" />
                   </button>

                   {/* Divider under logo - same spacing as dashboard */}
                   <div className="h-px w-full bg-white/50 shrink-0 mt-4" />

                   {/* Scrollable content: My Wallet, Currency, Language, Principal ID, Sign Out, Wipe */}
                   <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto pt-6">
                     {/* My Wallet - equal space above and below the name */}
                     {currentPrincipal && (
                       <div className="flex flex-col gap-4">
                         <div className="flex items-center min-h-[2rem]">
                           {editingWalletName ? (
                             <input
                               type="text"
                               value={walletNameInput}
                               onChange={(e) => setWalletNameInput(e.target.value)}
                               onBlur={handleSaveWalletName}
                               onKeyDown={(e) => e.key === 'Enter' && handleSaveWalletName()}
                               className="w-full bg-transparent border-0 rounded-none px-0 py-0 text-white/80 font-mono font-medium text-base tracking-[0.8px] outline-none placeholder:text-white/50"
                               placeholder={DEFAULT_WALLET_NAME}
                               autoFocus
                             />
                           ) : (
                             <button
                               onClick={() => { setWalletNameInput(walletName); setEditingWalletName(true); }}
                               className="w-full flex items-center justify-between min-h-[2rem] opacity-80 hover:opacity-100 transition-opacity text-left"
                             >
                               <span className="font-mono font-medium text-base text-white/80 tracking-[0.8px]">{walletName}</span>
                               <svg className="size-4 text-white/70 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                 <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                               </svg>
                             </button>
                           )}
                         </div>
                         <div className="w-full border-t border-white/50 shrink-0" />
                       </div>
                     )}

                     {/* Currency */}
                     <button
                       onClick={() => { setShowLanguageSelector(false); setShowCurrencySelector(true); }}
                       className="flex gap-3 h-9 items-center w-full opacity-80 hover:opacity-100 transition-opacity text-left"
                     >
                       <img src="/assets/currency.svg" alt="" className="size-5 shrink-0 opacity-80" />
                       <span className="font-medium text-base text-white/80 tracking-[0.8px]">{t('menu.currency')}</span>
                     </button>

                     {/* Language */}
                     <button
                       onClick={() => { setShowCurrencySelector(false); setShowLanguageSelector(true); }}
                       className="flex gap-3 h-9 items-center w-full opacity-80 hover:opacity-100 transition-opacity text-left"
                     >
                       <img src="/assets/language.svg" alt="" className="size-5 shrink-0 opacity-80" />
                       <span className="font-medium text-base text-white/80 tracking-[0.8px]">{t('menu.language')}</span>
                     </button>

                     <div className="w-full border-t border-white/30 shrink-0" />

                     {/* Sign Out */}
                     <button
                       onClick={handleLogOut}
                       className="flex gap-3 h-9 items-center w-full opacity-80 hover:opacity-100 transition-opacity text-left"
                     >
                       <img src="/assets/logout.svg" alt="" className="size-5 shrink-0 opacity-80" />
                       <span className="font-medium text-base text-white/80 tracking-[0.8px]">{t('menu.signOut')}</span>
                     </button>

                     <div className="w-full border-t border-white/30 shrink-0" />

                     {/* Principal ID + blurb */}
                     {currentPrincipal && (
                       <div className="flex flex-col gap-3">
                         <p className="text-white/60 text-xs font-medium">{t('menu.yourPrincipalId')}</p>
                         <div
                           onClick={async () => {
                             try {
                               await navigator.clipboard.writeText(currentPrincipal);
                               setPrincipalCopied(true);
                               setTimeout(() => setPrincipalCopied(false), 2000);
                             } catch {
                               toast.error(t('common.failedToCopy'));
                             }
                           }}
                           className="bg-zinc-900/90 p-3 cursor-pointer flex items-center justify-center relative"
                         >
                           <p className="text-white/80 font-mono text-sm font-medium text-center break-all leading-relaxed" style={{ letterSpacing: '0.32px', textWrap: 'balance' }}>
                             {currentPrincipal}
                           </p>
                           {principalCopied && (
                             <p className="absolute inset-0 flex items-center justify-center bg-zinc-900/90 text-white/80 font-sans text-sm font-medium">
                               {t('common.copied')}
                             </p>
                           )}
                         </div>
<p className="text-white/50 text-xs leading-relaxed">
                          {t('menu.motoDescription')}
                        </p>
                       </div>
                     )}

                     {/* Wipe Canister & Sign Out */}
                     <button
                       onClick={handleWipeCanisterAndSignOut}
                       disabled={signOutAndReset.isPending}
                       className="flex gap-3 h-9 items-center w-full opacity-80 hover:opacity-100 transition-opacity text-left"
                     >
                       <img
                         src="/assets/wipeout.svg"
                         alt=""
                         className="size-5 shrink-0"
                         style={{ filter: 'brightness(0) saturate(100%) invert(27%) sepia(98%) saturate(1000%) hue-rotate(346deg) brightness(104%) contrast(97%)' }}
                       />
                       <span className="font-medium text-base text-red-500 tracking-[0.8px]">
                         {signOutAndReset.isPending ? t('menu.wiping') : t('menu.wipeCanister')}
                       </span>
                     </button>

                     {/* Divider below Wipe Canister & Sign Out */}
                     <div className="w-full border-t border-white/30 shrink-0" />
                   </div>
                 </div>
                 </div>

                 {((showCurrencySelector || showLanguageSelector) || settingsExiting) && (
                   <div className="w-1/2 flex flex-col flex-1 min-h-0 shrink-0 bg-black overflow-hidden">
                     {(showCurrencySelector || settingsExiting) && !showLanguageSelector && (
                       <CurrencySelector onClose={() => setSettingsExiting(true)} embedded />
                     )}
                     {(showLanguageSelector || settingsExiting) && !showCurrencySelector && (
                       <LanguageSelector onClose={() => setSettingsExiting(true)} embedded />
                     )}
                   </div>
                 )}
                 </div>
               </div>
             )}

      {/* Transaction Details - card with swipe */}
      {selectedTransaction && (walletAddress || walletAddressForTx) && (() => {
        const sorted = [...displayTransactions].sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
        const idx = sorted.findIndex((t) => t.id === selectedTransaction.id);
        if (idx < 0) return null;
        return (
          <TransactionDetails
            transactions={sorted}
            selectedIndex={idx}
            walletAddress={walletAddress ?? walletAddressForTx}
            onClose={() => setSelectedTransaction(null)}
            onSelectTransaction={(tx) => setSelectedTransaction(tx)}
          />
        );
      })()}

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('menu.resetOnboardingTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('menu.resetOnboardingDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetOnboarding} disabled={resetOnboarding.isPending}>
              {resetOnboarding.isPending ? t('menu.resetting') : t('menu.resetOnboarding')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
