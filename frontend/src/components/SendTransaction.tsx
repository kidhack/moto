import { useState, useEffect, useRef } from 'react';
import { useRetrieveBtc, useTransferCkBTC, usePrincipalByBitcoinAddress } from '../hooks/useQueries';
import { useQRScanner } from '../qr-code/useQRScanner';
import { usePreferredCurrency } from '../hooks/usePreferredCurrency';
import { useBTCPrice, isPriceStale } from '../hooks/useQueries';
import StalePriceIndicator from './StalePriceIndicator';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { toast } from 'sonner';
import { isValidBitcoinAddress } from '../utils/addressValidation';
import type { UserWallet } from '../backend';

/** Shorten principal for display e.g. abcde-...-cai */
function shortenPrincipal(principal: string): string {
  if (principal.length <= 20) return principal;
  return `${principal.slice(0, 5)}...${principal.slice(-4)}`;
}

interface SendTransactionProps {
  wallet: UserWallet;
  onSuccess?: () => void;
  onClose?: () => void;
}

type Step = 'scan' | 'amount' | 'confirm';

// Currency display mode: 'BTC' | 'SATS' | preferred currency code
type CurrencyMode = 'BTC' | 'SATS' | string;

// Parse Bitcoin address from QR code data (handles bitcoin:address?amount=X format)
const parseBitcoinAddress = (data: string): string | null => {
  // Remove whitespace
  const trimmed = data.trim();
  
  // Check if it's a bitcoin: URI
  if (trimmed.startsWith('bitcoin:')) {
    const address = trimmed.replace(/^bitcoin:/, '').split('?')[0];
    // Basic validation - Bitcoin addresses are typically 26-35 characters
    if (address.length >= 26 && address.length <= 62) {
      return address;
    }
  }
  
  // Check if it's a plain address (mainnet: bc1, 1, 3; testnet: tb1, m, n, 2)
  if (trimmed.length >= 26 && trimmed.length <= 62 && /^(bc1|tb1|[13mn2])/.test(trimmed)) {
    return trimmed;
  }
  
  return null;
};

export default function SendTransaction({ wallet, onSuccess, onClose }: SendTransactionProps) {
  const [step, setStep] = useState<Step>('scan');
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [amountCurrency, setAmountCurrency] = useState<CurrencyMode>('SATS');
  const pasteInputRef = useRef<HTMLInputElement>(null);

  const ESTIMATED_FEE = BigInt(1000); // 0.00001 BTC fee estimate (withdraw only)

  const retrieveBtc = useRetrieveBtc();
  const transferCkBTC = useTransferCkBTC();
  const { identity } = useInternetIdentity();
  const principalByAddress = usePrincipalByBitcoinAddress(toAddress.trim() || null);
  const recipientPrincipal = principalByAddress.data ?? null;
  const sendMode: 'ckbtc' | 'btc' | null =
    toAddress.trim() && principalByAddress.data !== undefined
      ? recipientPrincipal
        ? 'ckbtc'
        : 'btc'
      : null;
  const effectiveFee = sendMode === 'ckbtc' ? BigInt(0) : ESTIMATED_FEE;
  const isWithdrawPending = retrieveBtc.isPending;
  const isTransferPending = transferCkBTC.isPending;
  const isConfirmPending = isWithdrawPending || isTransferPending;
  const { preferredCurrency } = usePreferredCurrency();
  const { data: btcPriceData } = useBTCPrice();
  
  const qrScanner = useQRScanner({
    facingMode: 'environment',
  });

  const BTC_PRICE_USD = btcPriceData?.usd ?? 101799;
  const priceIsStale = isPriceStale(btcPriceData);

  // Handle QR code scan result
  useEffect(() => {
    if (qrScanner.qrResults.length > 0 && step === 'scan') {
      const latestResult = qrScanner.qrResults[0];
      const address = parseBitcoinAddress(latestResult.data);
      if (address) {
        setToAddress(address);
        qrScanner.stopScanning();
        setStep('amount');
      }
    }
  }, [qrScanner.qrResults, step]);

  // Ensure video plays when camera becomes active
  useEffect(() => {
    if (qrScanner.isActive && qrScanner.videoRef.current) {
      const video = qrScanner.videoRef.current;
      if (video.srcObject && video.paused) {
        video.play().catch((err) => {
          console.warn('Video play failed in useEffect:', err);
        });
      }
    }
  }, [qrScanner.isActive, qrScanner.videoRef]);

  // Start scanning when component mounts and we're on scan step
  useEffect(() => {
    if (step !== 'scan') {
      // Stop camera when leaving scan step
      if (qrScanner.isActive || qrScanner.isScanning) {
        qrScanner.stopScanning();
      }
      return;
    }

    // Wait for camera support check and QR library to load
    if (qrScanner.isSupported === null || !qrScanner.jsQRLoaded) {
      return;
    }

    // If camera is already active, ensure scanning is started
    if (qrScanner.isActive && !qrScanner.isScanning) {
      qrScanner.startScanning();
      return;
    }

    // If camera is not active and we can start, do it
    if (!qrScanner.isActive && !qrScanner.isLoading) {
      const startCamera = async () => {
        try {
          console.log('Attempting to start camera...', {
            isSupported: qrScanner.isSupported,
            isReady: qrScanner.isReady,
            canStartScanning: qrScanner.canStartScanning,
            isLoading: qrScanner.isLoading,
          });
          
          const success = await qrScanner.startScanning();
          console.log('Camera start result:', success);
          
          if (!success && !qrScanner.error) {
            // Retry after a short delay if no error was set
            setTimeout(() => {
              qrScanner.startScanning();
            }, 500);
          }
        } catch (error) {
          console.error('Error starting camera:', error);
        }
      };
      
      // Small delay to ensure component is mounted
      const timer = setTimeout(startCamera, 200);
      
      return () => {
        clearTimeout(timer);
      };
    }
  }, [
    step,
    qrScanner.isActive,
    qrScanner.isScanning,
    qrScanner.isSupported,
    qrScanner.jsQRLoaded,
    qrScanner.canStartScanning,
    qrScanner.isReady,
    qrScanner.isLoading,
  ]);

  // Handle address detection and validation
  const handleAddressDetected = (address: string) => {
    const trimmed = address.trim();
    if (isValidBitcoinAddress(trimmed)) {
      setToAddress(trimmed);
      setStep('amount');
    } else {
      toast.error('Invalid Bitcoin address');
    }
  };

  // Handle paste from clipboard
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      handleAddressDetected(text);
    } catch (error) {
      // If clipboard API fails, focus hidden input to allow manual paste
      if (pasteInputRef.current) {
        pasteInputRef.current.focus();
        // Trigger a click to ensure focus works on mobile
        setTimeout(() => {
          pasteInputRef.current?.focus();
        }, 100);
      }
    }
  };

  // Handle paste event on hidden input
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    if (pasteInputRef.current) {
      pasteInputRef.current.value = '';
    }
    handleAddressDetected(pastedText);
  };

  // Listen for paste events globally when on scan step
  useEffect(() => {
    if (step !== 'scan') return;

    const handleGlobalPaste = (e: ClipboardEvent) => {
      const pastedText = e.clipboardData?.getData('text');
      if (pastedText) {
        const trimmed = pastedText.trim();
        if (isValidBitcoinAddress(trimmed)) {
          setToAddress(trimmed);
          setStep('amount');
        } else {
          toast.error('Invalid Bitcoin address');
        }
      }
    };

    // Add paste listener to document
    document.addEventListener('paste', handleGlobalPaste);
    
    return () => {
      document.removeEventListener('paste', handleGlobalPaste);
    };
  }, [step]);

  // Convert amount between currencies (same logic as SetAmount)
  const convertAmount = (value: string, fromCurrency: string, toCurrency: string): string => {
    if (!value || value === '0' || value === '') return '0';
    
    const numValue = parseFloat(value.replace(/,/g, ''));
    if (isNaN(numValue)) return '0';

    let btcValue: number;

    if (fromCurrency === 'BTC') {
      btcValue = numValue;
    } else if (fromCurrency === 'SATS') {
      btcValue = numValue / 100000000;
    } else {
      btcValue = numValue / BTC_PRICE_USD;
    }

    let result: number;
    if (toCurrency === 'BTC') {
      result = btcValue;
      return result.toFixed(8).replace(/\.?0+$/, '');
    } else if (toCurrency === 'SATS') {
      result = btcValue * 100000000;
      return Math.round(result).toString();
    } else {
      result = btcValue * BTC_PRICE_USD;
      return result.toFixed(2).replace(/\.?0+$/, '');
    }
  };

  // Cycle currency
  const cycleCurrency = () => {
    const currentAmount = amount.replace(/,/g, '');
    let nextCurrency: CurrencyMode;
    
    if (amountCurrency === 'BTC') {
      nextCurrency = 'SATS';
    } else if (amountCurrency === 'SATS') {
      nextCurrency = preferredCurrency;
    } else {
      nextCurrency = 'BTC';
    }

    if (currentAmount && currentAmount !== '0') {
      const convertedAmount = convertAmount(currentAmount, amountCurrency, nextCurrency);
      setAmount(convertedAmount);
    }
    
    setAmountCurrency(nextCurrency);
  };

  // Format amount for display
  const formatDisplayAmount = (value: string): string => {
    if (!value) return '0';
    const parts = value.split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    if (parts.length > 1) {
      return `${integerPart}.${parts[1]}`;
    }
    return integerPart;
  };

  // Get currency label
  const getCurrencyLabel = (): string => {
    if (amountCurrency === 'BTC') return 'BTC';
    if (amountCurrency === 'SATS') return 'SAT';
    return amountCurrency;
  };

  // Handle number input
  const handleNumberPress = (num: string) => {
    setAmount((prev) => {
      if (prev === '0' && num !== '0') {
        return num;
      }
      if (prev.replace(/,/g, '').length >= 15) {
        return prev;
      }
      return prev + num;
    });
  };

  // Handle backspace
  const handleBackspace = () => {
    setAmount((prev) => {
      if (prev.length <= 1) return '';
      return prev.slice(0, -1);
    });
  };

  // Handle max button (balance minus fee; fee is 0 for ckBTC)
  const handleMaxAmount = () => {
    const maxSendableSatoshis = wallet.balance - effectiveFee;
    if (maxSendableSatoshis <= 0n) {
      setAmount('0');
      setStep('confirm');
      return;
    }
    const maxInCurrency = formatAmountInCurrency(maxSendableSatoshis, amountCurrency);
    setAmount(maxInCurrency.replace(/,/g, ''));
    setStep('confirm');
  };

  // Handle next to confirmation
  const handleNext = () => {
    if (!amount || amount === '0') {
      toast.error('Please enter an amount');
      return;
    }
    setStep('confirm');
  };

  // Parse current amount input to satoshis (for remaining balance while typing)
  const getCurrentAmountSatoshis = (): bigint => {
    const cleanAmount = (amount || '0').replace(/,/g, '');
    if (!cleanAmount || cleanAmount === '0') return BigInt(0);
    if (amountCurrency === 'BTC') {
      return BigInt(Math.floor(parseFloat(cleanAmount) * 100000000));
    }
    if (amountCurrency === 'SATS') {
      return BigInt(parseInt(cleanAmount, 10) || 0);
    }
    const btc = parseFloat(cleanAmount) / BTC_PRICE_USD;
    return BigInt(Math.floor(btc * 100000000));
  };

  // Remaining balance after this send (amount + fee); fee is 0 for ckBTC
  const getRemainingBalanceSatoshis = (): bigint => {
    const amountSatoshis = getCurrentAmountSatoshis();
    return wallet.balance - amountSatoshis - effectiveFee;
  };

  // Calculate transaction details (effectiveFee is 0 for ckBTC)
  const getTransactionDetails = () => {
    const amountSatoshis = getCurrentAmountSatoshis();
    const totalAmount = amountSatoshis + effectiveFee;
    const recipientAmount = amountSatoshis;

    return {
      amountSatoshis,
      estimatedFee: effectiveFee,
      totalAmount,
      recipientAmount,
    };
  };

  // Handle send confirmation: instant ckBTC to market.town user or withdraw to Bitcoin
  const handleConfirm = async () => {
    const { amountSatoshis } = getTransactionDetails();

    if (amountSatoshis > wallet.balance) {
      toast.error('Insufficient balance');
      return;
    }

    if (sendMode === 'ckbtc') {
      if (!recipientPrincipal) return;
      if (identity && identity.getPrincipal().toText() === recipientPrincipal) {
        toast.error("You can't send to yourself");
        return;
      }
      try {
        await transferCkBTC.mutateAsync({
          toPrincipal: recipientPrincipal,
          amount: amountSatoshis,
        });
        toast.success('Sent! Instant transfer to market.town user.');
        if (onSuccess) {
          setTimeout(() => onSuccess(), 1000);
        }
        if (onClose) onClose();
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : typeof error === 'object' && error !== null && 'message' in error
              ? String((error as { message: unknown }).message)
              : 'Transfer failed';
        toast.error(message.length > 80 ? message.slice(0, 80) + '…' : message);
      }
      return;
    }

    try {
      await retrieveBtc.mutateAsync({
        toAddress,
        amount: amountSatoshis,
      });
      toast.success('Withdrawal submitted. Bitcoin will be sent to the address once the network processes it.');
      if (onSuccess) {
        setTimeout(() => onSuccess(), 1000);
      }
    } catch (error: unknown) {
      let message =
        error instanceof Error
          ? error.message
          : typeof error === 'object' && error !== null && 'message' in error
            ? String((error as { message: unknown }).message)
            : 'Failed to send transaction';
      if (message.includes('Insufficient balance')) {
        message = 'Insufficient balance';
      } else if (message.length > 80) {
        const match = message.match(/trap` with message: '([^']+)'/);
        message = match ? match[1] : message.slice(0, 80) + '…';
      }
      toast.error(message);
    }
  };

  // Format for confirmation screen
  const formatSatoshis = (satoshis: bigint) => {
    const btc = Number(satoshis) / 100000000;
    return btc.toFixed(8).replace(/\.?0+$/, '');
  };

  // Format amount in current currency for confirmation screen
  const formatAmountInCurrency = (satoshis: bigint, currency: CurrencyMode): string => {
    const btc = Number(satoshis) / 100000000;
    
    if (currency === 'BTC') {
      return formatSatoshis(satoshis);
    } else if (currency === 'SATS') {
      return satoshis.toString();
    } else {
      // Fiat currency
      const fiat = (btc * BTC_PRICE_USD).toFixed(2);
      return fiat.replace(/\.?0+$/, '');
    }
  };

  // Get currency label for confirmation screen
  const getConfirmationCurrencyLabel = (): string => {
    if (amountCurrency === 'BTC') return 'BTC';
    if (amountCurrency === 'SATS') return 'SAT';
    return amountCurrency;
  };

  const displayAmount = formatDisplayAmount(amount || '0');
  const transactionDetails = step === 'confirm' ? getTransactionDetails() : null;
  const remainingSatoshis = getRemainingBalanceSatoshis();
  const remainingFormatted =
    formatAmountInCurrency(remainingSatoshis >= 0n ? remainingSatoshis : -remainingSatoshis, amountCurrency);
  const isInsufficient = remainingSatoshis < 0n;
  const maxSendableSatoshis = wallet.balance - effectiveFee;
  const maxSendableFormatted =
    maxSendableSatoshis > 0n ? formatAmountInCurrency(maxSendableSatoshis, amountCurrency) : '0';

  // SCAN STEP
  if (step === 'scan') {
    return (
      <div className="fixed inset-0 bg-black z-[9999] flex flex-col">
        <div className="flex flex-col pt-8 flex-1 min-h-0">
          {/* Header */}
          <header className="flex items-center justify-between h-10 mb-8 shrink-0 px-5">
            <button
              onClick={onClose}
              className="h-8 w-8 flex items-center justify-center cursor-pointer transition-opacity"
            >
              <img 
                src="/assets/close.png" 
                alt="Close" 
                className="h-8 w-8 opacity-80 hover:opacity-100 transition-opacity" 
              />
            </button>
            <p className="font-medium text-xl text-white tracking-[-0.22px]">
              Send Bitcoin
            </p>
            <div className="h-8 w-8" />
          </header>

          {/* Content area */}
          <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
            {/* Top section: QR Scanner */}
            <div className="flex flex-col gap-8 shrink-0 pt-2">
              {/* QR Scanner window */}
              <div className="px-5">
                <div className="w-full max-w-[370px] aspect-square mx-auto bg-black/50 rounded-lg overflow-hidden relative">
                  {/* Always render video element so ref is available for stream attachment */}
                  <video
                    ref={qrScanner.videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${qrScanner.isActive ? 'block' : 'hidden'}`}
                    onLoadedMetadata={(e) => {
                      const video = e.currentTarget;
                      video.play().catch((err) => {
                        console.warn('Video play failed:', err);
                      });
                    }}
                  />
                  <canvas ref={qrScanner.canvasRef} className="hidden" />
                  
                  {/* Scanning overlay - only show when active */}
                  {qrScanner.isActive && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-64 h-64 border-2 border-white/40 rounded-lg" />
                    </div>
                  )}
                  
                  {/* Status messages - only show when not active */}
                  {!qrScanner.isActive && (
                    <>
                      {qrScanner.isLoading ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <p className="text-white/60 text-sm">Starting camera...</p>
                        </div>
                      ) : qrScanner.error ? (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-4 px-4">
                          <p className="text-white/60 text-sm text-center">
                            {(qrScanner.error as any)?.message || 'Camera error. Please allow camera access.'}
                          </p>
                          <button
                            onClick={() => qrScanner.retry()}
                            className="h-12 px-6 border-2 border-white/40 bg-transparent hover:border-white/60 transition-colors"
                          >
                            <span className="font-bold text-sm text-white/80">Retry</span>
                          </button>
                        </div>
                      ) : qrScanner.isSupported === false ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <p className="text-white/60 text-sm text-center">Camera not supported on this device</p>
                        </div>
                      ) : qrScanner.isSupported === null ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <p className="text-white/60 text-sm text-center">Checking camera support...</p>
                        </div>
                      ) : !qrScanner.jsQRLoaded ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <p className="text-white/60 text-sm text-center">Loading QR scanner...</p>
                        </div>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-4 px-4">
                          <p className="text-white/60 text-sm text-center">Camera not started</p>
                          <button
                            onClick={async () => {
                              console.log('Manual camera start clicked');
                              const success = await qrScanner.startScanning();
                              console.log('Manual start result:', success, 'isActive:', qrScanner.isActive);
                              if (!success) {
                                toast.error('Failed to start camera. Please check permissions.');
                              }
                            }}
                            className="h-12 px-6 border-2 border-white/40 bg-transparent hover:border-white/60 transition-colors"
                          >
                            <span className="font-bold text-sm text-white/80">Start Camera</span>
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Spacer to push bottom content down */}
            <div className="flex-1 min-h-0" />

            {/* Bottom section: Paste Address button */}
            <div className="flex flex-col gap-2 shrink-0 pb-5 px-5">
              {/* Hidden input for paste detection */}
              <input
                ref={pasteInputRef}
                type="text"
                onPaste={handlePaste}
                className="absolute opacity-0 pointer-events-none w-0 h-0"
                tabIndex={-1}
                aria-hidden="true"
              />
              
              <button
                onClick={handlePasteFromClipboard}
                className="h-16 border-2 border-white/40 bg-transparent flex items-center justify-center hover:border-white/60 transition-colors w-full"
              >
                <span className="font-bold text-base text-white/80 tracking-[0.15px]">Paste Address</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // AMOUNT STEP
  if (step === 'amount') {
    return (
      <div className="fixed inset-0 bg-black z-[9999] flex flex-col">
        <div className="flex flex-col pt-8 flex-1 min-h-0">
          {/* Header */}
          <header className="flex items-center justify-between h-10 mb-8 shrink-0 px-5">
            <button
              onClick={() => {
                if (onClose) {
                  onClose();
                }
              }}
              className="h-8 w-8 flex items-center justify-center cursor-pointer transition-opacity"
            >
              <img 
                src="/assets/close.png" 
                alt="Close" 
                className="h-8 w-8 opacity-80 hover:opacity-100 transition-opacity" 
              />
            </button>
            <p className="font-medium text-xl text-white tracking-[-0.22px]">
              Set Amount
            </p>
            <button
              onClick={cycleCurrency}
              className="h-8 w-8 flex items-center justify-center cursor-pointer transition-opacity hover:opacity-100"
            >
              <img 
                src="/assets/cyclecurrency.svg" 
                alt="Cycle Currency" 
                className="h-8 w-8" 
              />
            </button>
          </header>

          {/* Content area */}
          <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
            {/* Top section: Amount display */}
            <div className="flex flex-col gap-4 items-center justify-center flex-1 min-h-0 px-5">
              <div className="flex items-center gap-2 h-[22px]">
                <p className="font-mono text-[32px] font-bold text-white text-center" style={{ letterSpacing: '1.28px' }}>
                  {displayAmount}
                </p>
                <p className="font-mono text-[32px] font-bold text-white text-center" style={{ letterSpacing: '1.28px' }}>
                  {getCurrencyLabel()}
                </p>
              </div>

              <div className="h-6" />

              {/* Remaining balance - updates as user types */}
              <p
                className={`font-normal text-sm text-center ${isInsufficient ? 'text-red-400' : 'text-white/60'}`}
                style={{ letterSpacing: '0.15px' }}
              >
                {`Remaining balance: ${isInsufficient ? '-' : ''}${formatDisplayAmount(remainingFormatted)} ${getCurrencyLabel()}`}
              </p>
              {/* Current market rate when converting currency */}
              <p className="font-normal text-xs text-center text-white/50 flex items-center justify-center gap-1" style={{ letterSpacing: '0.15px' }}>
                1 BTC ≈ ${BTC_PRICE_USD.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                <StalePriceIndicator isStale={priceIsStale} />
              </p>
            </div>

            {/* Bottom section: Max + Keyboard, then Next button */}
            <div className="flex flex-col gap-8 shrink-0 pb-5 px-5">
              <div className="flex flex-col gap-3">
                {/* Max button - full width above keyboard */}
                <button
                  onClick={handleMaxAmount}
                  className="w-full h-12 bg-white/10 hover:bg-white/15 transition-colors flex items-center justify-center"
                >
                  <span className="font-bold text-sm text-white/80 tracking-[0.15px]">
                    max {formatDisplayAmount(maxSendableFormatted)} {getCurrencyLabel()}
                  </span>
                </button>

                {/* Numeric Keypad */}
                <div className="flex flex-col gap-3">
                {/* Row 1: 1, 2, 3 */}
                <div className="flex gap-2">
                  {[1, 2, 3].map((num) => (
                    <button
                      key={num}
                      onClick={() => handleNumberPress(num.toString())}
                      className="flex-1 h-[46px] rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                    >
                      <span className="font-mono text-2xl font-bold text-white">{num}</span>
                    </button>
                  ))}
                </div>

                {/* Row 2: 4, 5, 6 */}
                <div className="flex gap-2">
                  {[4, 5, 6].map((num) => (
                    <button
                      key={num}
                      onClick={() => handleNumberPress(num.toString())}
                      className="flex-1 h-[46px] rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                    >
                      <span className="font-mono text-2xl font-bold text-white">{num}</span>
                    </button>
                  ))}
                </div>

                {/* Row 3: 7, 8, 9 */}
                <div className="flex gap-2">
                  {[7, 8, 9].map((num) => (
                    <button
                      key={num}
                      onClick={() => handleNumberPress(num.toString())}
                      className="flex-1 h-[46px] rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                    >
                      <span className="font-mono text-2xl font-bold text-white">{num}</span>
                    </button>
                  ))}
                </div>

                {/* Row 4: Backspace, 0, Empty */}
                <div className="flex gap-2">
                  <button
                    onClick={handleBackspace}
                    className="flex-1 h-[46px] rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                  >
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
                    </svg>
                  </button>

                  <button
                    onClick={() => handleNumberPress('0')}
                    className="flex-1 h-[46px] rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                  >
                    <span className="font-mono text-2xl font-bold text-white">0</span>
                  </button>

                  <div className="flex-1" />
                </div>
              </div>
              </div>

              {/* Next button */}
              <button
                onClick={handleNext}
                disabled={!amount || amount === '0' || isInsufficient}
                className="h-16 w-full border-2 border-white/80 bg-transparent hover:border-white transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="font-bold text-base text-white/80 tracking-[0.15px]">Next</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // CONFIRMATION STEP
  const isSelfSend = Boolean(sendMode === 'ckbtc' && identity && recipientPrincipal === identity.getPrincipal().toText());
  const confirmDisabled = isConfirmPending || isInsufficient || isSelfSend || (sendMode === 'ckbtc' && principalByAddress.isLoading);

  return (
    <div className="fixed inset-0 bg-black z-[9999] flex flex-col">
      <div className="flex flex-col pt-8 flex-1 min-h-0">
        {/* Header - hide close and cycle when confirming */}
        <header className="flex items-center justify-between h-10 mb-8 shrink-0 px-5">
          {isConfirmPending ? (
            <div className="h-8 w-8" />
          ) : (
            <button
              onClick={() => {
                if (onClose) {
                  onClose();
                }
              }}
              className="h-8 w-8 flex items-center justify-center cursor-pointer transition-opacity"
            >
              <img 
                src="/assets/close.png" 
                alt="Close" 
                className="h-8 w-8 opacity-80 hover:opacity-100 transition-opacity" 
              />
            </button>
          )}
          <p className="font-medium text-xl text-white tracking-[-0.22px]">
            Confirm Send
          </p>
          {isConfirmPending ? (
            <div className="h-8 w-8" />
          ) : (
            <button
              onClick={cycleCurrency}
              className="h-8 w-8 flex items-center justify-center cursor-pointer transition-opacity hover:opacity-100"
            >
              <img 
                src="/assets/cyclecurrency.svg" 
                alt="Cycle Currency" 
                className="h-8 w-8" 
              />
            </button>
          )}
        </header>

        {/* Content area */}
        <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
          {/* Top section: Send icon and large total amount */}
          <div className="flex flex-col gap-12 items-center justify-center flex-1 min-h-0 px-5">
            {/* Send icon */}
            <div className="h-16 w-12 flex items-center justify-center shrink-0">
              <img 
                src="/assets/sent.svg" 
                alt="Send" 
                className="h-16 w-12 object-contain"
              />
            </div>

            {/* Large total amount display - for ckBTC show recipient amount only (no fee) */}
            {transactionDetails && (
              <div className="flex items-center gap-2 h-[22px]">
                <p className="font-mono text-[32px] font-bold text-white text-center" style={{ letterSpacing: '1.28px' }}>
                  {formatDisplayAmount(formatAmountInCurrency(sendMode === 'ckbtc' ? transactionDetails.recipientAmount : transactionDetails.totalAmount, amountCurrency))}
                </p>
                <p className="font-mono text-[32px] font-bold text-white text-center" style={{ letterSpacing: '1.28px' }}>
                  {getConfirmationCurrencyLabel()}
                </p>
              </div>
            )}
          </div>

          {/* Bottom section: Details and buttons */}
          <div className="flex flex-col gap-8 shrink-0 pb-5 px-5">
            {/* Transaction details - horizontal layout */}
            {transactionDetails && (
              <div className="flex flex-col gap-8 px-0 py-4">
                {/* Amount to recipient */}
                <div className="flex gap-2.5 items-center w-full">
                  <p className="font-medium text-base text-white/80 tracking-[-0.176px] shrink-0">
                    Amount
                  </p>
                  <div className="flex-1 flex justify-end">
                    <p className="font-mono text-base font-medium text-white text-right tracking-[0.32px]">
                      {formatDisplayAmount(formatAmountInCurrency(transactionDetails.recipientAmount, amountCurrency))} {getConfirmationCurrencyLabel()}
                    </p>
                  </div>
                </div>

                {/* Recipient: market.town user (instant) or Bitcoin address */}
                <div className="flex gap-2.5 items-center w-full">
                  <p className="font-medium text-base text-white/80 tracking-[-0.176px] shrink-0">
                    Recipient
                  </p>
                  <div className="flex-1 flex justify-end text-right">
                    {principalByAddress.isLoading ? (
                      <p className="font-mono text-base font-medium text-white/60 tracking-[0.32px]">Looking up...</p>
                    ) : sendMode === 'ckbtc' && recipientPrincipal ? (
                      <p className="font-mono text-base font-medium text-white tracking-[0.32px]">
                        market.town user (instant)
                        <span className="block text-white/70 text-sm mt-0.5">{shortenPrincipal(recipientPrincipal)}</span>
                      </p>
                    ) : (
                      <p className="font-mono text-base font-medium text-white text-right tracking-[0.32px] break-all">
                        {toAddress.length > 20 ? `${toAddress.slice(0, 7)}...${toAddress.slice(-7)}` : toAddress}
                      </p>
                    )}
                  </div>
                </div>

                {/* Fee */}
                <div className="flex gap-2.5 items-center w-full">
                  <p className="font-medium text-base text-white/80 tracking-[-0.176px] shrink-0">
                    Fee
                  </p>
                  <div className="flex-1 flex justify-end">
                    <p className="font-mono text-base font-medium text-white text-right tracking-[0.32px]">
                      {sendMode === 'ckbtc' ? 'No fee' : `${formatDisplayAmount(formatAmountInCurrency(transactionDetails.estimatedFee, amountCurrency))} ${getConfirmationCurrencyLabel()}`}
                    </p>
                  </div>
                </div>

                {/* Balance after send */}
                <div className="flex gap-2.5 items-center w-full">
                  <p className="font-medium text-base text-white/80 tracking-[-0.176px] shrink-0">
                    Balance after send
                  </p>
                  <div className="flex-1 flex justify-end">
                    <p className={`font-mono text-base font-medium text-right tracking-[0.32px] ${isInsufficient ? 'text-red-400' : 'text-white'}`}>
                      {isInsufficient ? '-' : ''}{formatDisplayAmount(remainingFormatted)} {getConfirmationCurrencyLabel()}
                    </p>
                  </div>
                </div>

                {/* Estimated time */}
                <div className="flex gap-2.5 items-center w-full">
                  <p className="font-medium text-base text-white/80 tracking-[-0.176px] shrink-0">
                    Estimated time
                  </p>
                  <div className="flex-1 flex justify-end">
                    <p className="font-mono text-base font-medium text-white text-right tracking-[0.32px]">
                      {sendMode === 'ckbtc' ? 'Instant' : '~30 min (Bitcoin network)'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action buttons - back arrow and confirm; hide back while confirming */}
            <div className="flex gap-4 items-start w-full">
              {!isConfirmPending && (
                <button
                  onClick={() => setStep('amount')}
                  className="h-16 w-20 border-2 border-white/40 bg-transparent flex items-center justify-center hover:border-white/60 transition-colors shrink-0"
                >
                  <img 
                    src="/assets/back.svg" 
                    alt="Back" 
                    className="h-8 w-8" 
                  />
                </button>
              )}

              {/* Confirm button - full width when confirming */}
              <button
                onClick={handleConfirm}
                disabled={confirmDisabled}
                className={`h-16 border-2 border-white/80 bg-transparent flex items-center justify-center hover:border-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isConfirmPending ? 'w-full' : 'flex-1'}`}
              >
                <span className="font-bold text-base text-white/80 tracking-[0.15px]">
                  {isConfirmPending ? 'Sending...' : isSelfSend ? "Can't send to yourself" : 'Confirm'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
