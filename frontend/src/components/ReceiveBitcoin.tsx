import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import SetAmount from './SetAmount';
import { useBTCPrice } from '../hooks/useQueries';
import { isValidBitcoinAddress } from '../utils/addressValidation';

interface ReceiveBitcoinProps {
  address: string;
  onClose?: () => void;
}

export default function ReceiveBitcoin({ address, onClose }: ReceiveBitcoinProps) {
  const [amount, setAmount] = useState<string>('');
  const [showSetAmount, setShowSetAmount] = useState(false);
  const { data: btcPriceData } = useBTCPrice();

  // Validate address is real - NEVER display fake addresses
  useEffect(() => {
    if (address && !isValidBitcoinAddress(address)) {
      console.error('ReceiveBitcoin: Invalid Bitcoin address detected:', address);
      toast.error('Invalid Bitcoin address. Please try again.');
      if (onClose) {
        onClose();
      }
    }
  }, [address, onClose]);

  // Don't render if address is invalid
  if (!address || !isValidBitcoinAddress(address)) {
    return (
      <div className="fixed inset-0 bg-black z-[9999] flex flex-col items-center justify-center px-5">
        <p className="text-white text-center text-lg mb-4">Unable to load Bitcoin address</p>
        <p className="text-white/60 text-center text-sm mb-8">Please try again later</p>
        <button
          onClick={onClose}
          className="h-16 border-2 border-white/80 bg-transparent hover:bg-white/10 transition-colors flex items-center justify-center px-8"
        >
          <span className="font-bold text-base text-white/80 tracking-[0.15px]">Close</span>
        </button>
      </div>
    );
  }

  // Store both amount and currency to properly display and convert
  const [amountCurrency, setAmountCurrency] = useState<string>('BTC');

  // Use live BTC price, fallback to default if not loaded yet
  const BTC_PRICE_USD = btcPriceData?.usd || 101799;

  // Convert amount to BTC for QR code (if amount is in SATS or fiat, convert to BTC)
  const getBTCAmount = (amountValue: string, currency: string): string => {
    if (!amountValue) return '';
    if (currency === 'BTC') {
      return amountValue;
    } else if (currency === 'SATS') {
      // Convert satoshis to BTC
      const btc = Number(amountValue) / 100000000;
      return btc.toString();
    } else {
      // For fiat currencies, convert to BTC using live price
      const fiatAmount = parseFloat(amountValue.replace(/,/g, ''));
      const btc = fiatAmount / BTC_PRICE_USD;
      return btc.toString();
    }
  };

  // Generate QR code URL - if amount is set, include it in the QR code data
  const btcAmount = amount ? getBTCAmount(amount, amountCurrency) : '';
  const qrData = btcAmount ? `bitcoin:${address}?amount=${btcAmount}` : address;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=370x370&data=${encodeURIComponent(qrData)}&margin=0`;

  // Handle amount confirmation from SetAmount component
  const handleAmountConfirm = (confirmedAmount: string, currency: string) => {
    // Store the amount and currency
    setAmount(confirmedAmount);
    setAmountCurrency(currency);
    setShowSetAmount(false);
  };

  // Get currency label for display
  const getCurrencyLabel = (): string => {
    if (amountCurrency === 'BTC') return 'BTC';
    if (amountCurrency === 'SATS') return 'SAT';
    return amountCurrency; // e.g., 'USD'
  };

  // Format amount for display
  const formatDisplayAmount = (value: string): string => {
    if (!value) return '0';
    // Add commas for thousands separator
    return value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const [addressCopied, setAddressCopied] = useState(false);

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setAddressCopied(true);
      setTimeout(() => setAddressCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  const shareAddress = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Bitcoin Address',
          text: `Send Bitcoin to: ${address}${amount ? ` (Amount: ${amount} BTC)` : ''}`,
        });
      } catch (error) {
        // User cancelled or share failed
        console.error('Share failed:', error);
      }
    } else {
      // Fallback: copy to clipboard
      copyAddress();
    }
  };

  // If SetAmount screen is open, show it
  if (showSetAmount) {
    return (
      <SetAmount
        address={address}
        onConfirm={handleAmountConfirm}
        onClose={() => setShowSetAmount(false)}
        initialCurrency={amountCurrency}
        initialAmount={amount}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-[9999] flex flex-col">
      {/* Main container matching menu screen: pt-8 (32px) */}
      <div className="flex flex-col pt-8 flex-1 min-h-0">
        {/* Header with close button, title, and empty space */}
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
            Receive Bitcoin
          </p>
          <div className="h-8 w-8" /> {/* Empty space for symmetry */}
        </header>

        {/* Content area - flex column with top and bottom alignment */}
        <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
          {/* Top section: QR Code and Address block */}
          <div className="flex flex-col gap-8 shrink-0 pt-2">
            {/* QR Code - centered and responsive */}
            <div className="flex items-center justify-center px-5">
              <div className="w-full max-w-[370px] aspect-square flex items-center justify-center shrink-0">
              <img 
                src={qrCodeUrl} 
                alt="QR Code" 
                  className="w-full h-full object-contain"
                  onError={() => {
                  console.error('Failed to load QR code');
                }}
              />
              </div>
            </div>

            {/* Bitcoin Wallet Address box - tap to copy */}
            <div className="px-5">
              <button
                type="button"
                onClick={copyAddress}
                className="bg-white/10 flex items-center justify-center w-full min-h-16 px-4 py-3 cursor-pointer active:bg-white/15 transition-colors rounded-none border-0 text-left relative"
              >
                <p className="text-white/80 font-mono text-[16px] font-medium text-center break-all leading-relaxed" style={{ letterSpacing: '0.32px', textWrap: 'balance' }}>
                  {address}
                </p>
                {addressCopied && (
                  <p className="absolute inset-0 flex items-center justify-center bg-zinc-900/90 text-white/80 font-sans text-base font-medium" style={{ letterSpacing: '0.32px' }}>
                    Copied!
                  </p>
                )}
              </button>
            </div>
          </div>

          {/* Spacer to push bottom content down */}
          <div className="flex-1 min-h-0" />

          {/* Bottom section: Amount display and buttons */}
          <div className="flex flex-col gap-2 shrink-0 pb-5">
            {/* Amount display row (when amount is set) or Set Amount button */}
          <div className="px-5 flex items-center justify-between w-full shrink-0">
            {amount ? (
              <>
                {/* Amount display - left side */}
                <div className="flex items-center gap-2 h-[22px]">
                  <p className="font-mono text-2xl font-bold text-white" style={{ letterSpacing: '0.96px' }}>
                    {formatDisplayAmount(amount)}
                  </p>
                  <p className="font-mono text-2xl font-bold text-white" style={{ letterSpacing: '0.96px' }}>
                    {getCurrencyLabel()}
                  </p>
                </div>
                {/* Edit button - right side */}
                <button
                  onClick={() => setShowSetAmount(true)}
                  className="h-16 border-2 border-white/40 bg-transparent flex items-center justify-center hover:border-white/60 transition-colors px-8 shrink-0"
                >
                  <span className="font-bold text-base text-white/80 tracking-[0.15px]">Edit</span>
                </button>
              </>
            ) : (
                /* Set Amount button - when no amount is set, full width */
              <button
                onClick={() => setShowSetAmount(true)}
                className="h-16 border-2 border-white/40 bg-transparent flex items-center justify-center hover:border-white/60 transition-colors w-full shrink-0"
              >
                <span className="font-bold text-base text-white/80 tracking-[0.15px]">Set Amount</span>
              </button>
            )}
          </div>

          {/* Buttons container - gap-2 (8px) from amount/set amount */}
          <div className="px-5 flex flex-col gap-2 w-full shrink-0">
            {/* Copy Address button */}
            <button
              onClick={copyAddress}
              className="h-16 border-2 border-white/40 bg-transparent flex items-center justify-center hover:border-white/60 transition-colors w-full"
            >
              <span className="font-bold text-base text-white/80 tracking-[0.15px]">Copy Address</span>
            </button>

            {/* Share button */}
            <button
              onClick={shareAddress}
              className="h-16 border-2 border-white/80 bg-transparent flex items-center justify-center hover:border-white transition-colors w-full"
            >
              <span className="font-bold text-base text-white/80 tracking-[0.15px]">Share</span>
            </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
