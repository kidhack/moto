import { type Transaction } from '../backend';
import { usePreferredCurrency } from '../hooks/usePreferredCurrency';
import { useBTCPrice, useBTCPriceAtTime, isPriceStale } from '../hooks/useQueries';
import StalePriceIndicator from './StalePriceIndicator';
import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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

  const isTestnet = import.meta.env.VITE_USE_TESTNET === 'true';
  const isMintOrBurn = transaction.id.startsWith('icrc1-mint-') || transaction.id.startsWith('icrc1-burn-');
  const network = isMintOrBurn
    ? (isTestnet ? 'BTC Testnet' : 'BTC')
    : (isTestnet ? 'ckTESTBTC' : 'ckBTC');

  return (
    <div
      className="flex-shrink-0 w-full flex flex-col overflow-hidden"
      style={{ backgroundColor: '#111111', minHeight: '100%', borderRadius: 2 }}
    >
      {/* Header - 20px inner padding */}
      <header className="flex items-center justify-between h-8 shrink-0 px-5 mb-5" style={{ marginTop: 16 }}>
        <button
          onClick={onClose}
          className="h-8 w-8 flex items-center justify-center cursor-pointer transition-opacity"
          aria-label="Close"
        >
          <img src="/assets/close.png" alt="" className="h-8 w-8 opacity-80 hover:opacity-100 transition-opacity" />
        </button>
        <p className="font-medium text-lg text-white tracking-[-0.22px] truncate">
          {txType === 'received' ? 'Received' : 'Sent'}
        </p>
        <button
          onClick={onCycleCurrency}
          className="h-8 w-8 flex items-center justify-center cursor-pointer transition-opacity hover:opacity-100 shrink-0"
          aria-label="Cycle currency"
        >
          <img src="/assets/cyclecurrency.svg" alt="" className="h-8 w-8" />
        </button>
      </header>

      {/* Icon + balance 64px below header */}
      <div className="flex flex-col items-center px-5" style={{ marginTop: 64, gap: 24 }}>
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

      {/* Detail rows pinned to bottom */}
      <div className="mt-auto shrink-0 px-5 pb-5">
        <div className="flex flex-col gap-2 w-full">
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
          {transaction.fee > 0n && (
            <div className="flex gap-2 items-center text-base">
              <span className="text-white/80 shrink-0">Fee</span>
              <span className="font-mono text-white flex-1 text-right">
                {currencyMode === 'BTC' ? `${formatBTC(transaction.fee)} BTC` : currencyMode === 'SATS' ? `${formatSats(transaction.fee)} sats` : `$${getUSDValue(transaction.fee)}`}
              </span>
            </div>
          )}
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
            <span className="text-white/80 shrink-0">Network</span>
            <span className="font-mono text-white flex-1 text-right">{network}</span>
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
  const [carouselWidth, setCarouselWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width } = entries[0]?.contentRect ?? {};
      if (typeof width === 'number') setCarouselWidth(width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const GAP = 8;
  const SIDE_PADDING = 20;
  const cardWidth = carouselWidth > 0 ? Math.max(0, carouselWidth - SIDE_PADDING * 2) : 0;
  const trackWidth = carouselWidth > 0 ? transactions.length * cardWidth + (transactions.length - 1) * GAP : 0;
  const stepPx = cardWidth + GAP;
  const centerOffset = (carouselWidth - cardWidth) / 2;
  const isDragging = delta.deltaX !== 0;
  const translateXPx = centerOffset - localIndex * stepPx + delta.deltaX;

  const handleBackdropClick = (e: React.MouseEvent | React.TouchEvent) => {
    const target = e.target as Node;
    if (containerRef.current && !containerRef.current.contains(target)) {
      onClose();
    }
  };

  const content = (
    <div
      className="fixed inset-0 z-[9999] flex flex-col bg-black/60"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={handleBackdropClick}
    >
      {/* Spacer - card top aligns with bottom of dashboard header + 8px down */}
      <div className="shrink-0" style={{ height: 73 }} />

      {/* Card area: edge-to-edge viewport, 8px between cards */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div
          ref={containerRef}
          className="w-full flex-1 min-h-0 overflow-hidden flex flex-col"
          style={{ paddingBottom: 16 }}
        >
          <div className="flex-1 flex min-h-0 overflow-hidden">
            <div
              className="flex h-full flex-nowrap"
              style={{
                transform: `translateX(${translateXPx}px)`,
                transition: isDragging ? 'none' : 'transform 300ms ease-out',
                width: trackWidth,
                gap: `${GAP}px`,
              }}
            >
            {transactions.map((tx) => (
                <div key={tx.id} className="flex-shrink-0 h-full overflow-hidden" style={{ width: cardWidth, borderRadius: 2, border: '2px solid black' }}>
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
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
