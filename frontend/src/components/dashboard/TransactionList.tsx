import { useEffect, useRef } from 'react';
import type { Transaction, TransactionStatus } from '../../backend';
import { useTranslation } from '../../i18n';

interface TransactionListProps {
  isLoading: boolean;
  transactions: Transaction[];
  walletAddress: string;
  onSelect: (tx: Transaction) => void;
  formatBTC: (sats: bigint) => string;
  formatDate: (timestamp: bigint) => string;
  /** Highlights the row whose details are open (desktop shows them alongside the list). */
  selectedId?: string | null;
  /** Desktop: status column, and every row padded so highlighting doesn't shift its contents. */
  desktop?: boolean;
}

/** Dot color: sent red / received green; dim until a withdrawal completes; gray if it failed. */
function dotClass(isSent: boolean, status: TransactionStatus): string {
  if (status === 'failed') return 'bg-white/40 opacity-60';
  const color = isSent ? 'bg-red-500' : 'bg-green-500';
  if (status === 'pending') return `${color} opacity-25`;
  return `${color} opacity-60 group-hover:opacity-100 group-active:opacity-100`;
}

/** Newest-first transaction rows (with loading shimmer and empty state). Shared by mobile and desktop. */
export default function TransactionList({ isLoading, transactions, walletAddress, onSelect, formatBTC, formatDate, selectedId, desktop = false }: TransactionListProps) {
  const { t } = useTranslation();
  const selectedRef = useRef<HTMLButtonElement>(null);

  // Keep the selected row visible when it changes (keyboard navigation on desktop).
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest' });
  }, [selectedId]);

  // Only exceptions get a label; completed rows stay clean.
  const statusLabel = (tx: Transaction) => {
    const d = tx.deposit;
    if (d?.problem) return t('txDetails.notCredited');
    if (d && d.confirmations != null && d.required) {
      return `${t('txDetails.pending')} · ${t('txDetails.confirmations', { confirmations: d.confirmations, required: d.required })}`;
    }
    return tx.status === 'pending' ? t('txDetails.pending') : tx.status === 'failed' ? t('txDetails.failed') : null;
  };

  return (
    <div className="flex flex-col" style={{ gap: 19 }}>
      {isLoading ? (
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
      ) : transactions.length > 0 && walletAddress ? (
        <>
          {[...transactions]
            .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
            .map((tx) => {
              const isSent = tx.fromAddress === walletAddress;
              const isSelected = tx.id === selectedId;
              return (
                <button
                  key={tx.id}
                  ref={isSelected ? selectedRef : undefined}
                  onClick={() => onSelect(tx)}
                  className={
                    desktop
                      ? `group flex items-center justify-between h-8 -mx-2 px-2 hover:opacity-100 transition-opacity ${isSelected ? 'opacity-100 bg-white/10' : 'opacity-80'}`
                      : 'group flex w-full items-center justify-between h-8 opacity-80 hover:opacity-100 transition-opacity'
                  }
                  style={desktop ? { width: 'calc(100% + 1rem)' } : undefined}
                >
                  <div className={`flex items-center gap-[8px] ${desktop ? 'w-48 shrink-0' : ''}`}>
                    <div className="h-4 w-4 flex items-center justify-center shrink-0">
                      <div className={`h-2 w-2 rounded-full transition-opacity ${dotClass(isSent, tx.status)}`} />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-[18px] font-medium text-white/80" style={{ letterSpacing: '0.8px' }}>₿</span>
                      <p className="font-mono text-[18px] font-medium text-white/80" style={{ letterSpacing: '0.8px' }}>
                        {formatBTC(tx.amount)}
                      </p>
                    </div>
                  </div>
                  {desktop && (
                    <p className="flex-1 min-w-0 truncate text-left text-sm text-white/60">
                      {statusLabel(tx)}
                    </p>
                  )}
                  <p className="font-mono text-[18px] font-normal text-white/50 whitespace-nowrap" style={{ letterSpacing: '-0.04em' }}>
                    {formatDate(tx.timestamp)}
                  </p>
                </button>
              );
            })}
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-center text-lg text-white/60">{t('dashboard.noTransactions')}</p>
        </div>
      )}
    </div>
  );
}
