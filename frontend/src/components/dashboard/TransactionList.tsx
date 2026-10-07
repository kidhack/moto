import type { Transaction } from '../../backend';
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
}

/** Newest-first transaction rows (with loading shimmer and empty state). Shared by mobile and desktop. */
export default function TransactionList({ isLoading, transactions, walletAddress, onSelect, formatBTC, formatDate, selectedId }: TransactionListProps) {
  const { t } = useTranslation();

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
              return (
                <button
                  key={tx.id}
                  onClick={() => onSelect(tx)}
                  className={`group flex w-full items-center justify-between h-8 hover:opacity-100 transition-opacity ${
                    tx.id === selectedId ? 'opacity-100 bg-white/10 -mx-2 px-2 w-[calc(100%+1rem)]' : 'opacity-80'
                  }`}
                >
                  <div className="flex items-center gap-[8px]">
                    <div className="h-4 w-4 flex items-center justify-center shrink-0">
                      {isSent ? (
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
