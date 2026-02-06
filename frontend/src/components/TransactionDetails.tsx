import { type Transaction } from '../backend';
import { usePreferredCurrency } from '../hooks/usePreferredCurrency';
import { useBTCPrice, useBTCPriceAtTime, isPriceStale } from '../hooks/useQueries';
import StalePriceIndicator from './StalePriceIndicator';
import { useState } from 'react';
import { toast } from 'sonner';

interface TransactionDetailsProps {
  transaction: Transaction;
  walletAddress: string;
  onClose: () => void;
}

// Currency display mode: 'BTC' | 'SATS' | preferred currency code
type CurrencyMode = 'BTC' | 'SATS' | string;

export default function TransactionDetails({ transaction, walletAddress, onClose }: TransactionDetailsProps) {
  const isSent = transaction.fromAddress === walletAddress;
  const txType = isSent ? 'sent' : (transaction.toAddress === walletAddress ? 'received' : 'added');
  const { preferredCurrency } = usePreferredCurrency();
  const { data: currentPrice } = useBTCPrice();
  const { data: priceAtTxTime, isLoading: priceAtTimeLoading } = useBTCPriceAtTime(transaction.timestamp);
  const [currencyMode, setCurrencyMode] = useState<CurrencyMode>('BTC');

  // Use price at time of transaction for this tx's USD value and Market Price row; fallback to current price then default
  const BTC_PRICE_USD = priceAtTxTime ?? currentPrice?.usd ?? 101799;
  // Show stale when showing current/fallback price and that price is stale (historical price at tx time is not "stale")
  const marketPriceStale = priceAtTxTime == null && isPriceStale(currentPrice);

  // Cycle through: BTC -> SATS -> Preferred Currency -> BTC
  const cycleCurrency = () => {
    if (currencyMode === 'BTC') {
      setCurrencyMode('SATS');
    } else if (currencyMode === 'SATS') {
      setCurrencyMode(preferredCurrency);
    } else {
      setCurrencyMode('BTC');
    }
  };

  const formatBTC = (satoshis: bigint) => {
    const btc = Number(satoshis) / 100000000;
    // Show up to 6 decimal places
    const formatted = btc.toFixed(6);
    return formatted.replace(/\.?0+$/, '') || '0.00';
  };

  const formatSats = (satoshis: bigint) => {
    return satoshis.toString();
  };

  // USD conversion using price at time of transaction
  const getUSDValue = (satoshis: bigint) => {
    const btc = Number(satoshis) / 100000000;
    return (btc * BTC_PRICE_USD).toFixed(2);
  };

  const formatAmount = (satoshis: bigint) => {
    if (currencyMode === 'BTC') {
      return `${formatBTC(satoshis)} BTC`;
    } else if (currencyMode === 'SATS') {
      return `${formatSats(satoshis)} sats`;
    } else {
      // For now, show USD equivalent - in production, convert to preferred currency
      const usdValue = getUSDValue(satoshis);
      return `$${usdValue}`;
    }
  };

  const formatDate = (timestamp: bigint) => {
    // Transaction timestamps are in seconds (Unix time); Date expects milliseconds
    const date = new Date(Number(timestamp) * 1000);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}.${month}.${day}·${hours}:${minutes}`;
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 7)}...${address.slice(-6)}`;
  };

  const getBlockExplorerUrl = (transactionId: string) => {
    // For ckBTC transactions, use the Internet Computer dashboard
    // The transaction ID is used as the index
    return `https://dashboard.internetcomputer.org/bitcoin/transaction/${transactionId}`;
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
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-[9999] flex flex-col">
      {/* Main container matching menu screen: pt-8 (32px) */}
      <div className="flex flex-col pt-8 flex-1 min-h-0">
        {/* Header with close button, title, and currency cycle button */}
        <header className="flex items-center justify-between h-10 mb-8 shrink-0 px-5">
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center cursor-pointer transition-opacity"
          >
            {/* Close icon - 80% opacity, 100% on hover */}
            <img 
              src="/assets/close.png" 
              alt="Close" 
              className="h-8 w-8 opacity-80 hover:opacity-100 transition-opacity" 
            />
          </button>
          <p className="font-medium text-xl text-white tracking-[-0.22px]">
            {txType === 'received' ? 'Received Bitcoin' : 'Transaction Details'}
          </p>
          <button
            onClick={cycleCurrency}
            className="h-8 w-8 flex items-center justify-center cursor-pointer transition-opacity hover:opacity-100"
          >
            {/* Currency cycle button */}
            <img 
              src="/assets/cyclecurrency.svg" 
              alt="Cycle Currency" 
              className="h-8 w-8" 
            />
          </button>
        </header>

        {/* Content area - scrollable, aligned to bottom above close button */}
        <div className="flex flex-col gap-12 flex-1 min-h-0 overflow-y-auto pb-5 justify-end">
          <div className="px-5 flex flex-col gap-12 items-center">
            {/* Icon + amount moved up 80px; icon opacity matches dashboard list */}
            <div className="flex flex-col gap-6 items-center -mt-20">
              {/* Transaction Icon - 64px × 48px */}
              <div className="h-16 w-12 flex items-center justify-center">
                {txType === 'sent' ? (
                  <img src="/assets/tx-sent.svg" alt="Sent" className="h-16 w-12 object-contain opacity-60" />
                ) : txType === 'received' ? (
                  <img src="/assets/tx-recieve.svg" alt="Received" className="h-16 w-12 object-contain opacity-60" />
                ) : (
                  <img src="/assets/addfunds.svg" alt="Added Funds" className="h-16 w-12 object-contain opacity-60" />
                )}
              </div>

              {/* Amount - IBM Plex Mono Bold, 32px with BTC text */}
              <div className="flex items-center gap-2">
                {currencyMode === 'BTC' && (
                  <>
                    <p className="font-mono text-[32px] font-bold text-white" style={{ letterSpacing: '1.28px' }}>
                      {formatBTC(transaction.amount)}
                    </p>
                    <p className="font-mono text-[32px] font-bold text-white" style={{ letterSpacing: '1.28px' }}>
                      BTC
                    </p>
                  </>
                )}
                {currencyMode === 'SATS' && (
                  <p className="font-mono text-[32px] font-bold text-white" style={{ letterSpacing: '1.28px' }}>
                    {formatSats(transaction.amount)} sats
                  </p>
                )}
                {currencyMode !== 'BTC' && currencyMode !== 'SATS' && (
                  <p className="font-mono text-[32px] font-bold text-white" style={{ letterSpacing: '1.28px' }}>
                    {formatAmount(transaction.amount)}
                  </p>
                )}
              </div>
            </div>

            {/* Details section - 80px space above rows */}
            <div className="flex flex-col gap-4 w-full py-4 mt-20">
              {/* Date */}
              <div className="flex items-center gap-[10px]">
                <span className="font-medium text-base text-white/80 shrink-0" style={{ letterSpacing: '-0.176px' }}>
                  Date
                </span>
                <span className="font-mono text-base font-normal text-white text-right flex-1" style={{ letterSpacing: '0.32px' }}>
                  {formatDate(transaction.timestamp)}
                </span>
              </div>

              {/* From (received: wallet that sent the Bitcoin) or To (sent) - clickable to copy */}
              <div className="flex items-center gap-[10px]">
                <span className="font-medium text-base text-white/80 shrink-0" style={{ letterSpacing: '-0.176px' }}>
                  {txType === 'received' ? 'From' : 'To'}
                </span>
                <button
                  onClick={() => copyToClipboard(
                    txType === 'received' ? (transaction.sourceBitcoinAddress ?? transaction.fromAddress) : transaction.toAddress,
                    'Address',
                    'to'
                  )}
                  className="font-mono text-base text-white text-right flex-1 cursor-pointer no-underline"
                  style={{ letterSpacing: '0.32px' }}
                  title={`Click to copy: ${txType === 'received' ? (transaction.sourceBitcoinAddress ?? transaction.fromAddress) : transaction.toAddress}`}
                >
                  {copiedField === 'to' ? 'Copied!' : formatAddress(txType === 'received' ? (transaction.sourceBitcoinAddress ?? transaction.fromAddress) : transaction.toAddress)}
                </button>
              </div>

              {/* Value (USD) */}
              <div className="flex items-center gap-[10px]">
                <span className="font-medium text-base text-white/80 shrink-0" style={{ letterSpacing: '-0.176px' }}>
                  Value
                </span>
                <span className="font-mono text-base text-white text-right flex-1" style={{ letterSpacing: '0.32px' }}>
                  ${getUSDValue(transaction.amount)}
                </span>
              </div>

              {/* Market Price (at time of transaction) */}
              <div className="flex items-center gap-[10px]">
                <span className="font-medium text-base text-white/80 shrink-0" style={{ letterSpacing: '-0.176px' }}>
                  Market Price
                </span>
                <span className="font-mono text-base text-white text-right flex-1 flex items-center justify-end gap-1" style={{ letterSpacing: '0.32px' }}>
                  {priceAtTimeLoading ? '…' : `$${BTC_PRICE_USD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  <StalePriceIndicator isStale={marketPriceStale} />
                </span>
              </div>

              {/* Transaction - link to chain */}
              <div className="flex items-center gap-[10px]">
                <span className="font-medium text-base text-white/80 shrink-0" style={{ letterSpacing: '-0.176px' }}>
                  Transaction
                </span>
                <a
                  href={getBlockExplorerUrl(transaction.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-base text-white text-right flex-1 hover:underline"
                  style={{ letterSpacing: '0.32px' }}
                >
                  {formatAddress(transaction.id)}
                </a>
              </div>

              {/* Network */}
              <div className="flex items-center gap-[10px]">
                <span className="font-medium text-base text-white/80 shrink-0" style={{ letterSpacing: '-0.176px' }}>
                  Network
                </span>
                <span className="font-mono text-base text-white text-right flex-1" style={{ letterSpacing: '0.32px' }}>
                  ckBTC
                </span>
              </div>

              {/* Status */}
              <div className="flex items-center gap-[10px]">
                <span className="font-medium text-base text-white/80 shrink-0" style={{ letterSpacing: '-0.176px' }}>
                  Status
                </span>
                <span className="font-mono text-base text-white text-right flex-1 capitalize" style={{ letterSpacing: '0.32px' }}>
                  {getStatusDisplay(transaction.status)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Close Button - matching Figma */}
        <div className="px-5 pb-5 shrink-0">
          <button
            onClick={onClose}
            className="w-full h-16 border-2 border-white/80 bg-transparent hover:bg-white/10 transition-colors flex items-center justify-center"
          >
            <span className="font-bold text-base text-white/80 tracking-[0.15px]">Close</span>
          </button>
        </div>
      </div>
    </div>
  );
}

