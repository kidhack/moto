import { useState, useEffect } from 'react';
import { II_MANAGE_URL } from '../lib/ic';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useActor } from '../hooks/useActor';
import { useQueryClient } from '@tanstack/react-query';
import { useWalletInfo, useEnsureWallet, useResetOnboarding, useSignOutAndReset, useWalletAddress } from '../hooks/useQueries';
import { useCkBTCMinter } from '../hooks/useCkBTCMinter';
import { useCkBTCLedger } from '../hooks/useCkBTCLedger';
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
import FAQPage from '../components/FAQPage';
import TermsPage from '../components/TermsPage';
import PrivacyPage from '../components/PrivacyPage';
import TransactionDetails from '../components/TransactionDetails';
import { SlideFromRight } from '../components/SlideFromRight';
import { useBackButton } from '../hooks/useBackButton';
import { useTranslation } from '../i18n';
import { usePreferredCurrency } from '../hooks/usePreferredCurrency';
import { usePreferredLanguage } from '../hooks/usePreferredLanguage';
import { LANGUAGES } from '../data/languages';
import { useIsDesktop } from '../hooks/useIsDesktop';
import MenuPanel, { type MenuPanelProps } from '../components/dashboard/MenuPanel';
import BalanceDisplay from '../components/dashboard/BalanceDisplay';
import TransactionList from '../components/dashboard/TransactionList';
import DesktopDashboard from '../components/dashboard/DesktopDashboard';

export default function WalletDashboard() {
  const { clear, identity } = useInternetIdentity();
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const { data: walletInfo, isLoading, error: walletInfoError, isFetching: isWalletInfoFetching, refetch: refetchWalletInfo } = useWalletInfo();
  const { data: walletAddress, isLoading: isLoadingAddress, error: walletAddressError } = useWalletAddress();
  const { address: ckbtcAddress, isFetching: isCkbtcFetching } = useCkBTCMinter(); // Check if we have ckBTC address
  const { balance: ledgerBalance } = useCkBTCLedger();
  const ensureWallet = useEnsureWallet();
  const walletAddressForTx = walletInfo?.bitcoinAddress || ckbtcAddress || '';
  const { transactions: ckbtcTransactions } = useCkBTCTransactions(walletAddressForTx);
  const { t } = useTranslation();
  const { preferredCurrency, setPreferredCurrency } = usePreferredCurrency();
  const { preferredLanguage, setPreferredLanguage } = usePreferredLanguage();
  const languageName = LANGUAGES.find(l => l.code === preferredLanguage)?.name ?? preferredLanguage;
  // Prefer merged list from walletInfo; fall back to ckBTC hook so history shows even if query hasn't merged yet
  const displayTransactions = (walletInfo?.transactions?.length ? walletInfo.transactions : ckbtcTransactions) ?? [];
  
  // Get current principal for debugging
  const currentPrincipal = identity ? identity.getPrincipal().toText() : null;

  // Losing an II passkey with no recovery method means losing the funds, so nudge once there's a balance.
  const recoveryAckKey = currentPrincipal ? `moto_recovery_ack_${currentPrincipal}` : null;
  const [recoveryAcked, setRecoveryAcked] = useState(true);
  useEffect(() => {
    try {
      setRecoveryAcked(!recoveryAckKey || localStorage.getItem(recoveryAckKey) === '1');
    } catch {
      setRecoveryAcked(false);
    }
  }, [recoveryAckKey]);
  const dismissRecoveryBanner = () => {
    try {
      if (recoveryAckKey) localStorage.setItem(recoveryAckKey, '1');
    } catch { /* storage unavailable */ }
    setRecoveryAcked(true);
  };

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
  const [showFAQ, setShowFAQ] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [settingsExiting, setSettingsExiting] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [menuClosing, setMenuClosing] = useState(false);
  const [menuEntering, setMenuEntering] = useState(true);

  useBackButton(showSendModal, () => setShowSendModal(false));
  useBackButton(showReceiveModal, () => setShowReceiveModal(false));
  useBackButton(showAddFundsModal, () => setShowAddFundsModal(false));
  useBackButton(menuOpen, () => { setMenuClosing(true); });
  useBackButton(showFAQ, () => setShowFAQ(false));
  useBackButton(showTerms, () => setShowTerms(false));
  useBackButton(showPrivacy, () => setShowPrivacy(false));
  useBackButton(selectedTransaction !== null, () => setSelectedTransaction(null));

  const DEFAULT_WALLET_NAME = "Nakamoto's Wallet";

  const [walletNameLoaded, setWalletNameLoaded] = useState(false);
  const [walletName, setWalletName] = useState(DEFAULT_WALLET_NAME);
  const [editingWalletName, setEditingWalletName] = useState(false);
  const [walletNameInput, setWalletNameInput] = useState(DEFAULT_WALLET_NAME);

  useEffect(() => {
    if (!walletInfo) return;
    setWalletNameLoaded(true);
    const name = walletInfo.walletName || DEFAULT_WALLET_NAME;
    setWalletName(name);
    setWalletNameInput(name);
  }, [walletInfo?.walletName]);

  const [prefsReady, setPrefsReady] = useState(false);
  useEffect(() => {
    if (prefsReady || !walletInfo || !actor) return;
    if (walletInfo.preferredCurrency) setPreferredCurrency(walletInfo.preferredCurrency);
    if (walletInfo.preferredLanguage) setPreferredLanguage(walletInfo.preferredLanguage);
    setPrefsReady(true);
  }, [walletInfo, actor, prefsReady]);

  useEffect(() => {
    if (!prefsReady || !actor) return;
    actor.setPreferences(preferredCurrency, preferredLanguage).catch(() => {});
  }, [preferredCurrency, preferredLanguage, prefsReady, actor]);
  
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
      } catch { /* storage unavailable (private mode) */ }
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
    // Funds are untouched (they belong to the II principal), but make sure people know that first.
    if (!window.confirm(t('menu.wipeConfirm'))) return;
    setMenuOpen(false);
    // Wallet name is stored in the canister and will be wiped with signOutAndReset
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
      } catch { /* storage unavailable (private mode) */ }
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
        } catch { /* storage unavailable (private mode) */ }
        window.location.href = window.location.origin + window.location.pathname;
      } catch (clearError) {
        console.error('Failed to clear identity:', clearError);
        toast.error(t('menu.failedToComplete'));
      }
    }
  };

  const handleSaveWalletName = async () => {
    if (!currentPrincipal) return;
    const name = (walletNameInput?.trim() || DEFAULT_WALLET_NAME).slice(0, 32);
    setWalletName(name);
    setEditingWalletName(false);
    if (!actor) return;
    try {
      await actor.setWalletName(name);
      queryClient.invalidateQueries({ queryKey: ['walletInfo'] });
    } catch (e) {
      console.error('Failed to save wallet name to canister:', e);
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
          walletName: '',
          preferredCurrency: '',
          preferredLanguage: '',
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

  const isDesktop = useIsDesktop();

  // Menu contents are shared; on mobile, opening a page also closes the full-screen menu.
  const closeMobileMenu = () => { if (!isDesktop) setMenuClosing(true); };
  const menuPanelProps: MenuPanelProps = {
    currentPrincipal,
    walletName,
    walletNameLoaded,
    editingWalletName,
    walletNameInput,
    setWalletNameInput,
    defaultWalletName: DEFAULT_WALLET_NAME,
    onEditWalletName: () => { setWalletNameInput(walletName); setEditingWalletName(true); },
    onSaveWalletName: handleSaveWalletName,
    preferredCurrency,
    languageName,
    onOpenCurrency: () => { setShowLanguageSelector(false); setShowCurrencySelector(true); },
    onOpenLanguage: () => { setShowCurrencySelector(false); setShowLanguageSelector(true); },
    onOpenFAQ: () => { closeMobileMenu(); setShowFAQ(true); },
    onOpenTerms: () => { closeMobileMenu(); setShowTerms(true); },
    onOpenPrivacy: () => { closeMobileMenu(); setShowPrivacy(true); },
    onSignOut: handleLogOut,
    onWipe: handleWipeCanisterAndSignOut,
    isWiping: signOutAndReset.isPending,
  };

  const transactionList = (
    <TransactionList
      isLoading={isLoadingBalance}
      transactions={displayTransactions}
      walletAddress={walletAddressForTx}
      onSelect={(tx) => {
        // Desktop shows details in the right panel, replacing any open Send/Receive.
        if (isDesktop) { setShowSendModal(false); setShowReceiveModal(false); setShowAddFundsModal(false); }
        setSelectedTransaction(tx);
      }}
      formatBTC={formatBTC}
      formatDate={formatDate}
      selectedId={isDesktop ? selectedTransaction?.id ?? null : null}
      desktop={isDesktop}
    />
  );

  // Desktop: ↑/↓ move through the history (details follow in the right panel).
  const sortedTransactions = [...displayTransactions].sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
  const anyOverlayOpen = showFAQ || showTerms || showPrivacy || showCurrencySelector || showLanguageSelector || showSendModal || showReceiveModal || showAddFundsModal;
  useEffect(() => {
    if (!isDesktop || anyOverlayOpen || sortedTransactions.length === 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      e.preventDefault();
      const idx = selectedTransaction ? sortedTransactions.findIndex((tx) => tx.id === selectedTransaction.id) : -1;
      const next = e.key === 'ArrowDown' ? Math.min(idx + 1, sortedTransactions.length - 1) : Math.max(idx - 1, 0);
      setSelectedTransaction(sortedTransactions[next]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const recoveryBanner = !recoveryAcked && ledgerBalance !== null && ledgerBalance > BigInt(0) && (
    <div className="flex items-start gap-3 py-3 border-b border-white/30">
      <p className="text-sm text-amber-300 leading-snug flex-1">{t('recovery.banner')}</p>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <a
          href={II_MANAGE_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={dismissRecoveryBanner}
          className="text-sm font-medium text-white underline underline-offset-2"
        >
          {t('recovery.setUp')}
        </a>
        <button onClick={dismissRecoveryBanner} className="text-sm text-white/50">
          {t('recovery.dismiss')}
        </button>
      </div>
    </div>
  );

  const testnetBadge = import.meta.env.VITE_USE_TESTNET === 'true' && (
    <div className="bg-yellow-500/20 border border-yellow-500/50 rounded px-4 py-2 text-center">
      <p className="text-yellow-500 text-sm font-medium">{t('dashboard.testnet')}</p>
    </div>
  );

  const selectedTransactionDetails = selectedTransaction && (walletAddress || walletAddressForTx) && (() => {
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
        variant={isDesktop ? 'panel' : 'overlay'}
      />
    );
  })();

  const addressUnavailable = (onClose: () => void) => (
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
        onClick={onClose}
        className="h-16 border-2 border-white/80 bg-transparent hover:bg-white/10 transition-colors flex items-center justify-center px-8"
      >
        <span className="font-bold text-base text-white/80 tracking-[0.15px]">{t('common.close')}</span>
      </button>
    </div>
  );

  if (isDesktop) {
    return (
      <DesktopDashboard
        address={walletAddress ?? null}
        menuPanel={<MenuPanel {...menuPanelProps} />}
        balance={<BalanceDisplay balance={ledgerBalance} formatBTC={formatBTC} />}
        showAddFunds={ledgerBalance === null || ledgerBalance <= BigInt(0)}
        onAddFunds={() => setShowAddFundsModal(true)}
        onRefresh={() => refetchWalletInfo()}
        recoveryBanner={recoveryBanner}
        testnetBadge={testnetBadge}
        transactionList={transactionList}
        rightPanel={
          showSendModal && sendWallet ? (
            <SendTransaction wallet={sendWallet} onSuccess={() => setShowSendModal(false)} onClose={() => setShowSendModal(false)} />
          ) : showReceiveModal || showAddFundsModal ? (
            walletAddress ? (
              <ReceiveBitcoin address={walletAddress} onClose={() => { setShowReceiveModal(false); setShowAddFundsModal(false); }} />
            ) : (
              addressUnavailable(() => { setShowReceiveModal(false); setShowAddFundsModal(false); })
            )
          ) : selectedTransactionDetails || null
        }
        onCloseRightPanel={() => { setShowSendModal(false); setShowReceiveModal(false); setShowAddFundsModal(false); setSelectedTransaction(null); }}
        onSend={() => { setSelectedTransaction(null); setShowReceiveModal(false); setShowAddFundsModal(false); setShowSendModal(true); }}
        onReceive={() => { setSelectedTransaction(null); setShowSendModal(false); setShowReceiveModal(true); }}
        modal={
          showFAQ ? { node: <FAQPage onClose={() => setShowFAQ(false)} />, close: () => setShowFAQ(false) }
          : showTerms ? { node: <TermsPage onClose={() => setShowTerms(false)} />, close: () => setShowTerms(false) }
          : showPrivacy ? { node: <PrivacyPage onClose={() => setShowPrivacy(false)} />, close: () => setShowPrivacy(false) }
          : showCurrencySelector ? { node: <CurrencySelector onClose={() => setShowCurrencySelector(false)} embedded />, close: () => setShowCurrencySelector(false) }
          : showLanguageSelector ? { node: <LanguageSelector onClose={() => setShowLanguageSelector(false)} embedded />, close: () => setShowLanguageSelector(false) }
          : null
        }
      />
    );
  }

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
            <BalanceDisplay balance={ledgerBalance} formatBTC={formatBTC} />
            {(ledgerBalance === null || ledgerBalance <= BigInt(0)) && (
              <button onClick={() => setShowAddFundsModal(true)} className="h-8 w-8 flex items-center justify-center hover:bg-white/10 transition-colors" aria-label={t('dashboard.addFunds')}>
                <img src="/assets/addfunds.svg" alt="" className="h-8 w-8" />
              </button>
            )}
          </div>
        </header>
        {/* Top divider - fixed, does not scroll */}
        <div className="h-[1px] w-full bg-white/50 mt-4" />
        {recoveryBanner}
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
        {testnetBadge}
        {/* Transactions List */}
        {transactionList}
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
          addressUnavailable(() => setShowReceiveModal(false))
        )
      )}

      {/* FAQ Modal */}
      {showFAQ && (
        <SlideFromRight open={showFAQ} onClose={() => setShowFAQ(false)}>
          <FAQPage onClose={() => setShowFAQ(false)} />
        </SlideFromRight>
      )}

      {showTerms && (
        <SlideFromRight open={showTerms} onClose={() => setShowTerms(false)}>
          <TermsPage onClose={() => setShowTerms(false)} />
        </SlideFromRight>
      )}

      {showPrivacy && (
        <SlideFromRight open={showPrivacy} onClose={() => setShowPrivacy(false)}>
          <PrivacyPage onClose={() => setShowPrivacy(false)} />
        </SlideFromRight>
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
          addressUnavailable(() => setShowAddFundsModal(false))
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
                     <MenuPanel {...menuPanelProps} />
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
      {selectedTransactionDetails}

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
