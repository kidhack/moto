import { useState } from 'react';
import { toast } from 'sonner';
import SetAmount from './SetAmount';

interface ReceiveBitcoinProps {
  address: string;
  onClose?: () => void;
}

export default function ReceiveBitcoin({ address, onClose }: ReceiveBitcoinProps) {
  const [amount, setAmount] = useState<string>('');
  const [showSetAmount, setShowSetAmount] = useState(false);

  // Store both amount and currency to properly display and convert
  const [amountCurrency, setAmountCurrency] = useState<string>('BTC');

  // Convert amount to BTC for QR code (if amount is in SATS, convert to BTC)
  const getBTCAmount = (amountValue: string, currency: string): string => {
    if (!amountValue) return '';
    if (currency === 'BTC') {
      return amountValue;
    } else if (currency === 'SATS') {
      // Convert satoshis to BTC
      const btc = Number(amountValue) / 100000000;
      return btc.toString();
    } else {
      // For fiat currencies, we'd need to fetch BTC price and convert
      // For now, assume 1:1 conversion (this would need proper conversion in production)
      return amountValue;
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
    toast.success(`Amount set: ${confirmedAmount} ${currency}`);
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

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      toast.success('Address copied to clipboard');
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

        {/* Content area - centered, scrollable */}
        <div className="flex flex-col gap-2 flex-1 min-h-0 overflow-y-auto pb-5 items-center justify-center">
          <div className="px-5 flex flex-col gap-2 items-center w-full max-w-[372px]">
            {/* QR Code - 370px × 369px */}
            <div className="h-[369px] w-[370px] flex items-center justify-center shrink-0">
              <img 
                src={qrCodeUrl} 
                alt="QR Code" 
                className="h-[369px] w-[370px]"
                onError={(e) => {
                  console.error('Failed to load QR code');
                }}
              />
            </div>

            {/* Bitcoin Wallet Address box - gap-2 (8px) from QR code */}
            <div className="bg-white/10 flex items-center justify-center w-[372px] min-h-[48px] px-4 py-3 shrink-0">
              <p className="font-mono text-base font-bold text-white/80 text-center break-all" style={{ letterSpacing: '0.32px' }}>
                {address}
              </p>
            </div>
          </div>

          {/* Amount display row (when amount is set) or Set Amount button - gap-2 (8px) from address box */}
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
              /* Set Amount button - when no amount is set, centered */
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
  );
}
