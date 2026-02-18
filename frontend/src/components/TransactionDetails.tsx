import { type Transaction } from '../backend';
import { usePreferredCurrency } from '../hooks/usePreferredCurrency';
import { useBTCPrice, useBTCPriceAtTime, isPriceStale } from '../hooks/useQueries';
import StalePriceIndicator from './StalePriceIndicator';
import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useSwipeGesture } from '../hooks/useSwipeGesture';
import { vibrateLight } from '../utils/haptics';

interface TransactionDetailsProps {
  transactions: Transaction[];
  selectedIndex: number;
  walletAddress: string;
  onClose: () => void;
  onSelectTransaction: (tx: Transaction) => void;
}

type CurrencyMode = 'BTC' | 'SATS' | string;

interface TxCardProps {
  transaction: Transaction;
  walletAddress: string;
  currencyMode: CurrencyMode;
  onCycleCurrency: () => void;
  onClose: () => void;
  formatBTC: (s: bigint) => string;
  formatSats: (s: bigint) => string;
  formatAmount: (s: bigint) => string;
  formatDate: (t: bigint) => string;
  formatAddress: (a: string) => string;
  getBlockExplorerUrl: (id: string) => string;
  getStatusDisplay: (s: string) => string;
  getUSDValue: (s: bigint) => string;
  copiedField: 'to' | null;
  copyToClipboard: (text: string, _label: string, field: 'to') => void;
  priceAtTimeLoading: boolean;
  BTC_PRICE_USD: number;
  marketPriceStale: boolean;
}

function TxCard({
  transaction,
  walletAddress,
  currencyMode,
  onCycleCurrency,
  onClose,
  formatBTC,
  formatSats,
  formatAmount,
  formatDate,
  formatAddress,
  getBlockExplorerUrl,
  getStatusDisplay,
  getUSDValue,
  copiedField,
  copyToClipboard,
  priceAtTimeLoading,
  BTC_PRICE_USD,
  marketPriceStale,
}: TxCardProps) {
  const isSent = transaction.fromAddress === walletAddress;
  const txType = isSent ? 'sent' : (transaction.toAddress === walletAddress ? 'received' : 'added');

  return (
    <div
      className="flex-shrink-0 w-full flex flex-col rounded-xl overflow-hidden"
      style={{ backgroundColor: '#111111', minHeight: '100%' }}
    >
      {/* Header */}
      <header className="flex items-center justify-between shrink-0 px-4 pt-4 pb-2">
        <button
          onClick={onClose}
          className="h-8 w-8 flex items-center justify-center cursor-pointer transition-opacity"
          aria-label="Close"
        >
          <img src="/assets/close.png" alt="" className="h-8 w-8 opacity-80 hover:opacity-100 transition-opacity" />
        </button>
        <p className="font-medium text-lg text-white tracking-[-0.22px] truncate">
          {txType === 'received' ? 'Received Bitcoin' : 'Transaction Details'}
        </p>
        <button
          onClick={onCycleCurrency}
          className="h-8 w-8 flex items-center justify-center cursor-pointer transition-opacity hover:opacity-100 shrink-0"
          aria-label="Cycle currency"
        >
          <img src="/assets/cyclecurrency.svg" alt="" className="h-8 w-8" />
        </button>
      </header>

      {/* Centered icon + amount above text rows */}
      <div className="flex flex-col items-center justify-center flex-1 min-h-0 px-4 py-4">
        <div className="flex flex-col gap-2 items-center shrink-0">
          <div className="h-12 w-9 flex items-center justify-center">
            {txType === 'sent' ? (
              <img src="/assets/tx-sent.svg" alt="Sent" className="h-12 w-9 object-contain opacity-60" />
            ) : txType === 'received' ? (
              <img src="/assets/tx-recieve.svg" alt="Received" className="h-12 w-9 object-contain opacity-60" />
            ) : (
              <img src="/assets/addfunds.svg" alt="Added" className="h-12 w-9 object-contain opacity-60" />
            )}
          </div>
          <div className="flex items-center gap-2">
            {currencyMode === 'BTC' && (
              <>
                <p className="font-mono text-2xl font-bold text-white" style={{ letterSpacing: '1.28px' }}>
                  {formatBTC(transaction.amount)}
                </p>
                <p className="font-mono text-2xl font-bold text-white" style={{ letterSpacing: '1.28px' }}>
                  BTC
                </p>
              </>
            )}
            {currencyMode === 'SATS' && (
              <p className="font-mono text-2xl font-bold text-white" style={{ letterSpacing: '1.28px' }}>
                {formatSats(transaction.amount)} sats
              </p>
            )}
            {currencyMode !== 'BTC' && currencyMode !== 'SATS' && (
              <p className="font-mono text-2xl font-bold text-white" style={{ letterSpacing: '1.28px' }}>
                {formatAmount(transaction.amount)}
              </p>
            )}
          </div>
        </div>

        {/* Text rows - aligned to bottom of card */}
        <div className="flex flex-col gap-2 w-full mt-auto pt-4 shrink-0">
          <div className="flex gap-2 items-center text-base">
            <span className="text-white/80 shrink-0">Date</span>
            <span className="font-mono text-white flex-1 text-right truncate">{formatDate(transaction.timestamp)}</span>
          </div>
          <div className="flex gap-2 items-center text-base">
            <span className="text-white/80 shrink-0">{txType === 'received' ? 'From' : 'To'}</span>
            {txType === 'received' && (transaction.sourceBitcoinAddress ?? transaction.fromAddress) === 'Bitcoin Network' ? (
              <span className="font-mono text-white flex-1 text-right">Pending</span>
            ) : txType === 'sent' && transaction.toAddress === 'Bitcoin Network' ? (
              <span className="font-mono text-white flex-1 text-right">Pending</span>
            ) : (
              <button
                onClick={() =>
                  copyToClipboard(
                    txType === 'received' ? (transaction.sourceBitcoinAddress ?? transaction.fromAddress) : transaction.toAddress,
                    'Address',
                    'to'
                  )
                }
                className="font-mono text-white flex-1 text-right truncate cursor-pointer"
              >
                {copiedField === 'to' ? 'Copied!' : formatAddress(txType === 'received' ? (transaction.sourceBitcoinAddress ?? transaction.fromAddress) : transaction.toAddress)}
              </button>
            )}
          </div>
          <div className="flex gap-2 items-center text-base">
            <span className="text-white/80 shrink-0">Value</span>
            <span className="font-mono text-white flex-1 text-right">${getUSDValue(transaction.amount)}</span>
          </div>
          <div className="flex gap-2 items-center text-base">
            <span className="text-white/80 shrink-0">Price</span>
            <span className="font-mono text-white flex-1 text-right flex items-center justify-end gap-1">
              {priceAtTimeLoading ? '…' : `$${BTC_PRICE_USD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              <StalePriceIndicator isStale={marketPriceStale} />
            </span>
          </div>
          <div className="flex gap-2 items-center text-base">
            <span className="text-white/80 shrink-0">Tx</span>
            <a
              href={getBlockExplorerUrl(transaction.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-white flex-1 text-right truncate hover:underline"
            >
              {formatAddress(transaction.id)}
            </a>
          </div>
          <div className="flex gap-2 items-center text-base">
            <span className="text-white/80 shrink-0">Status</span>
            <span className="font-mono text-white flex-1 text-right capitalize">{getStatusDisplay(transaction.status)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TransactionDetails({
  transactions,
  selectedIndex,
  walletAddress,
  onClose,
  onSelectTransaction,
}: TransactionDetailsProps) {
  const transaction = transactions[selectedIndex];
  if (!transaction) return null;

  const [localIndex, setLocalIndex] = useState(selectedIndex);
  const isTransitioningRef = useRef(false);

  useEffect(() => {
    setLocalIndex(selectedIndex);
  }, [selectedIndex]);

  const { preferredCurrency } = usePreferredCurrency();
  const { data: currentPrice } = useBTCPrice();
  const { data: priceAtTxTime, isLoading: priceAtTimeLoading } = useBTCPriceAtTime(transaction.timestamp);
  const [currencyMode, setCurrencyMode] = useState<CurrencyMode>('BTC');

  const canSwipeLeft = localIndex < transactions.length - 1;
  const canSwipeRight = localIndex > 0;

  useEffect(() => {
    setCurrencyMode('BTC');
  }, [localIndex]);

  const handleSwipe = useCallback(
    (dir: 'left' | 'right' | 'up') => {
      if (dir === 'up') {
        onClose();
        return;
      }
      if (dir === 'left' && canSwipeLeft) {
        isTransitioningRef.current = true;
        setLocalIndex((i) => i + 1);
        onSelectTransaction(transactions[localIndex + 1]);
      } else if (dir === 'right' && canSwipeRight) {
        isTransitioningRef.current = true;
        setLocalIndex((i) => i - 1);
        onSelectTransaction(transactions[localIndex - 1]);
      }
    },
    [localIndex, transactions, onClose, onSelectTransaction, canSwipeLeft, canSwipeRight]
  );

  const { handleTouchStart, handleTouchMove, handleTouchEnd, delta } = useSwipeGesture(handleSwipe);

  const BTC_PRICE_USD = priceAtTxTime ?? currentPrice?.usd ?? 101799;
  const marketPriceStale = priceAtTxTime == null && isPriceStale(currentPrice);

  const cycleCurrency = () => {
    if (currencyMode === 'BTC') setCurrencyMode('SATS');
    else if (currencyMode === 'SATS') setCurrencyMode(preferredCurrency);
    else setCurrencyMode('BTC');
  };

  const formatBTC = (satoshis: bigint) => {
    const btc = Number(satoshis) / 100000000;
    return btc.toFixed(6).replace(/\.?0+$/, '') || '0.00';
  };

  const formatSats = (satoshis: bigint) => satoshis.toString();

  const getUSDValue = (satoshis: bigint) => {
    const btc = Number(satoshis) / 100000000;
    return (btc * BTC_PRICE_USD).toFixed(2);
  };

  const formatAmount = (satoshis: bigint) => {
    if (currencyMode === 'BTC') return `${formatBTC(satoshis)} BTC`;
    if (currencyMode === 'SATS') return `${formatSats(satoshis)} sats`;
    return `$${getUSDValue(satoshis)}`;
  };

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}·${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const formatAddress = (address: string) => `${address.slice(0, 7)}...${address.slice(-6)}`;

  const getBlockExplorerUrl = (transactionId: string) => {
    const numericIndex = transactionId.replace(/^icrc1-(mint-|burn-)?/, '');
    const index = /^\d+$/.test(numericIndex) ? numericIndex : transactionId;
    return `https://dashboard.internetcomputer.org/bitcoin/transaction/${encodeURIComponent(index)}`;
  };

  const getStatusDisplay = (status: string) => {
    if (status === 'confirmed') return 'Complete';
    if (status === 'pending') return 'Pending';
    if (status === 'failed') return 'Failed';
    return status;
  };

  const [copiedField, setCopiedField] = useState<'to' | null>(null);
  const copyToClipboard = async (text: string, _label: string, field: 'to') => {
    try {
      await navigator.clipboard.writeText(text);
      vibrateLight();
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const handleBackdropClick = (e: React.MouseEvent | React.TouchEvent) => {
    const target = e.target as Node;
    if (containerRef.current && !containerRef.current.contains(target)) {
      onClose();
    }
  };

  const cardWidthPercent = 100 / transactions.length;
  const translateX = `calc(${-localIndex * cardWidthPercent}% + ${delta.deltaX}px)`;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col bg-black/60"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={handleBackdropClick}
    >
      {/* Top divider - card top aligns with this */}
      <div className="h-[1px] w-full bg-white/50 shrink-0" />

      {/* Card area: card top at divider, 16px below card */}
      <div className="flex-1 flex flex-col items-center min-h-0 overflow-hidden">
        <div
          ref={containerRef}
          className="w-full max-w-md flex-1 min-h-0 overflow-hidden flex flex-col"
          style={{ paddingBottom: 16 }}
        >
          <div className="flex-1 flex items-stretch gap-0 min-h-0 overflow-hidden">
            {/* Left peek - prev card edge when can swipe right */}
            {canSwipeRight ? (
              <div className="w-3 shrink-0 rounded-l-lg self-stretch opacity-70" style={{ backgroundColor: '#111111' }} aria-hidden />
            ) : null}
            <div className="flex-1 min-w-0 overflow-hidden px-1">
              <div
                className="flex h-full"
                style={{
                  transform: `translateX(${translateX})`,
                  width: `${transactions.length * 100}%`,
                }}
              >
            {transactions.map((tx) => (
                <div key={tx.id} className="flex-shrink-0 h-full" style={{ width: `${cardWidthPercent}%` }}>
                  <TxCard
                    transaction={tx}
                    walletAddress={walletAddress}
                    currencyMode={currencyMode}
                    onCycleCurrency={cycleCurrency}
                    onClose={onClose}
                    formatBTC={formatBTC}
                    formatSats={formatSats}
                    formatAmount={formatAmount}
                    formatDate={formatDate}
                    formatAddress={formatAddress}
                    getBlockExplorerUrl={getBlockExplorerUrl}
                    getStatusDisplay={getStatusDisplay}
                    getUSDValue={getUSDValue}
                    copiedField={copiedField}
                    copyToClipboard={copyToClipboard}
                    priceAtTimeLoading={priceAtTimeLoading}
                    BTC_PRICE_USD={BTC_PRICE_USD}
                    marketPriceStale={marketPriceStale}
                  />
                </div>
              ))}
              </div>
            </div>
            {/* Right peek - next card edge when can swipe left */}
            {canSwipeLeft ? (
              <div className="w-3 shrink-0 rounded-r-lg self-stretch opacity-70" style={{ backgroundColor: '#111111' }} aria-hidden />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
