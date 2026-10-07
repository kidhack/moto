import { useEffect, useState, type ReactNode } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { useTranslation } from '../../i18n';
import { ContainedModal, ContainedPanel } from './Contained';

interface DesktopDashboardProps {
  /** The user's ckBTC deposit address, shown with a QR code when no flow is open. */
  address: string | null;
  menuPanel: ReactNode;
  balance: ReactNode;
  showAddFunds: boolean;
  onAddFunds: () => void;
  onRefresh: () => void;
  recoveryBanner: ReactNode;
  testnetBadge: ReactNode;
  transactionList: ReactNode;
  /** Send or Receive screen, rendered inside the right column; null shows the action buttons. */
  rightPanel: ReactNode;
  onCloseRightPanel: () => void;
  onSend: () => void;
  onReceive: () => void;
  /** Screens that are full-screen on mobile (legal pages, selectors, tx details) open as a centered modal. */
  modal: { node: ReactNode; close: () => void } | null;
}

/**
 * Desktop (≥1024px) dashboard filling the window: menu on the left, balance and history in the
 * (flexible) middle, and Send/Receive on the right. All data and state come from WalletDashboard.
 */
const thinScrollbar = { scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.2) transparent' } as const;

export default function DesktopDashboard({
  address,
  menuPanel,
  balance,
  showAddFunds,
  onAddFunds,
  onRefresh,
  recoveryBanner,
  testnetBadge,
  transactionList,
  rightPanel,
  onCloseRightPanel,
  onSend,
  onReceive,
  modal,
}: DesktopDashboardProps) {
  const { t } = useTranslation();
  const rightPanelOpen = rightPanel !== null;
  const [addressCopied, setAddressCopied] = useState(false);
  const copyAddress = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setAddressCopied(true);
      setTimeout(() => setAddressCopied(false), 2000);
    } catch {
      toast.error(t('common.failedToCopy'));
    }
  };

  // Esc closes Send/Receive (a modal on top handles its own Esc first).
  useEffect(() => {
    if (!rightPanelOpen || modal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRightPanel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rightPanelOpen, modal, onCloseRightPanel]);

  return (
    <div className="flex h-dvh min-h-dvh bg-black text-white overflow-hidden">
      <div className="flex flex-1 min-w-0 h-full">
        {/* Left: menu */}
        <aside className="w-[240px] xl:w-[290px] 2xl:w-[320px] shrink-0 flex flex-col min-h-0 pt-4 px-5 pb-5">
          <img src="/assets/moto-logo.svg" alt="MOTO" className="h-8 w-[172px] object-contain object-left shrink-0" />
          <div className="h-px w-full bg-white/50 shrink-0 mt-4" />
          <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto pt-6" style={thinScrollbar}>{menuPanel}</div>
        </aside>

        <div className="w-px bg-white/50 shrink-0" />

        {/* Center: balance + history */}
        <main className="flex-1 min-w-0 flex flex-col min-h-0">
          <div className="flex flex-col shrink-0 pt-4 px-5">
            <header className="flex items-center justify-between h-8">
              {balance}
              <div className="flex items-center gap-2">
                {showAddFunds && (
                  <button onClick={onAddFunds} className="h-8 w-8 flex items-center justify-center hover:bg-white/10 transition-colors" aria-label={t('dashboard.addFunds')} title={t('dashboard.addFunds')}>
                    <img src="/assets/addfunds.svg" alt="" className="h-8 w-8" />
                  </button>
                )}
                {/* No pull-to-refresh on desktop */}
                <button onClick={onRefresh} className="h-8 w-8 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors" aria-label={t('dashboard.refresh')} title={t('dashboard.refresh')}>
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 4v6h-6M1 20v-6h6" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                </button>
              </div>
            </header>
            <div className="h-px w-full bg-white/50 mt-4" />
            {recoveryBanner}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-5" style={thinScrollbar}>
            <div className="flex flex-col gap-6 pt-4 pb-5">
              {testnetBadge}
              {transactionList}
            </div>
          </div>
        </main>

        <div className="w-px bg-white/50 shrink-0" />

        {/* Right: Send / Receive */}
        <ContainedPanel className="w-[340px] xl:w-[400px] 2xl:w-[440px] shrink-0">
          {rightPanelOpen ? (
            rightPanel
          ) : (
            <div className="flex h-full flex-col pt-4 px-5 pb-5">
              <header className="flex items-center h-8 shrink-0">
                <p className="font-medium text-base text-white/80 tracking-[0.8px]">{t('dashboard.yourAddress')}</p>
              </header>
              <div className="h-px w-full bg-white/50 shrink-0 mt-4" />
              <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-4 py-6">
                {address ? (
                  <>
                    <div className="bg-white p-1 rounded w-[200px] xl:w-[220px] aspect-square">
                      <QRCodeSVG value={address} size={220} level="M" marginSize={2} className="w-full h-full" />
                    </div>
                    <button
                      type="button"
                      onClick={copyAddress}
                      className="relative w-full bg-white/10 hover:bg-white/15 transition-colors px-4 py-3"
                    >
                      <p className="text-white/80 font-mono text-sm font-medium text-center break-all leading-relaxed" style={{ letterSpacing: '0.32px' }}>
                        {address}
                      </p>
                      {addressCopied && (
                        <p className="absolute inset-0 flex items-center justify-center bg-zinc-900/90 text-white/80 text-sm font-medium">{t('common.copied')}</p>
                      )}
                    </button>
                  </>
                ) : (
                  <div className="w-[200px] xl:w-[220px] aspect-square rounded animate-shimmer" aria-hidden />
                )}
              </div>
              <div className="flex flex-col gap-2 shrink-0">
              <button
                onClick={onSend}
                className="w-full h-16 border-2 border-white/80 bg-transparent hover:border-white transition-colors flex items-center justify-center opacity-80 hover:opacity-100"
              >
                <span className="font-bold text-base text-white/80 tracking-[0.15px]">{t('dashboard.send')}</span>
              </button>
              <button
                onClick={onReceive}
                className="w-full h-16 border-2 border-white/80 bg-transparent hover:border-white transition-colors flex items-center justify-center opacity-80 hover:opacity-100"
              >
                <span className="font-bold text-base text-white/80 tracking-[0.15px]">{t('dashboard.receive')}</span>
              </button>
              </div>
            </div>
          )}
        </ContainedPanel>
      </div>

      {modal && <ContainedModal onClose={modal.close}>{modal.node}</ContainedModal>}
    </div>
  );
}
