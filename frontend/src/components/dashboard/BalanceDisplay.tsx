interface BalanceDisplayProps {
  /** Ledger balance in sats; null until the first ledger read completes. */
  balance: bigint | null;
  formatBTC: (sats: bigint) => string;
}

/** "₿ 0.123" balance with a shimmer until the first ledger read. Shared by mobile and desktop. */
export default function BalanceDisplay({ balance, formatBTC }: BalanceDisplayProps) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-2xl font-bold text-white" style={{ letterSpacing: '0.96px' }}>₿</span>
      {balance === null ? (
        <div className="h-8 w-24 rounded animate-shimmer" aria-hidden />
      ) : (
        <p className="font-mono text-2xl font-bold text-white" style={{ letterSpacing: '0.96px' }}>{formatBTC(balance)}</p>
      )}
    </div>
  );
}
