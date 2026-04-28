import { useState, useEffect, useRef } from 'react';
import { Principal } from '@dfinity/principal';
import { useScreenTransitionGuard } from '../hooks/useScreenTransitionGuard';
import { vibrateLight } from '../utils/haptics';
import { useRetrieveBtc, useTransferCkBTC, usePrincipalByBitcoinAddress, computeFeeSats, useCkBTCWithdrawalFee } from '../hooks/useQueries';
import { useQRScanner } from '../qr-code/useQRScanner';
import { usePreferredCurrency } from '../hooks/usePreferredCurrency';
import { useBTCPrice, isPriceStale, getBTCPriceInCurrency } from '../hooks/useQueries';
import { formatFiatCompact, getCurrencyMeta } from '../data/currencies';
import StalePriceIndicator from './StalePriceIndicator';
import BackCloseButton from './BackCloseButton';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { toast } from 'sonner';
import { isValidBitcoinAddress } from '../utils/addressValidation';
import { useTranslation } from '../i18n';
import type { UserWallet } from '../backend';

/** If text is a valid ICP principal, return its string form; otherwise null. */
function parsePrincipalInput(text: string): string | null {
  const t = text.trim();
  if (!t) return null;
  try {
    const p = Principal.fromText(t);
    if (p.toText() === Principal.anonymous().toText()) return null;
    return p.toText();
  } catch {
    return null;
  }
}

interface SendTransactionProps {
  wallet: UserWallet;
  onSuccess?: () => void;
  onClose?: () => void;
}

type Step = 'scan' | 'amount' | 'confirm';

// Currency display mode: 'BTC' | 'SATS' | preferred currency code
type CurrencyMode = 'BTC' | 'SATS' | string;

// Parse Bitcoin address (and optional amount) from QR code data (BIP21: bitcoin:address?amount=X)
const parseBitcoinURI = (data: string): { address: string; amount?: string } | null => {
  const trimmed = data.trim();

  if (trimmed.startsWith('bitcoin:')) {
    const withoutScheme = trimmed.replace(/^bitcoin:/, '');
    const [address, queryString] = withoutScheme.split('?');
    if (address.length >= 26 && address.length <= 62) {
      const params = new URLSearchParams(queryString || '');
      const amount = params.get('amount') || undefined;
      return { address, amount };
    }
  }

  if (trimmed.length >= 26 && trimmed.length <= 62 && /^(bc1|tb1|[13mn2])/.test(trimmed)) {
    return { address: trimmed };
  }

  return null;
};

export default function SendTransaction({ wallet, onSuccess, onClose }: SendTransactionProps) {
  const [step, setStep] = useState<Step>('scan');
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [amountCurrency, setAmountCurrency] = useState<CurrencyMode>('SATS');
  const { t } = useTranslation();
  const { preferredCurrency } = usePreferredCurrency();
  const pasteInputRef = useRef<HTMLInputElement>(null);
  const lastPasteTouchRef = useRef<number>(0);

  const retrieveBtc = useRetrieveBtc();
  const transferCkBTC = useTransferCkBTC();
  const { data: withdrawalInfo } = useCkBTCWithdrawalFee();
  const { identity } = useInternetIdentity();
  const input = toAddress.trim();
  const pastedPrincipal = parsePrincipalInput(input);
  const addressForLookup = input && !pastedPrincipal ? input : null;
  const principalByAddress = usePrincipalByBitcoinAddress(addressForLookup);
  const recipientPrincipal = pastedPrincipal ?? principalByAddress.data ?? null;
  const sendMode: 'ckbtc' | 'btc' | null =
    !input
      ? null
      : pastedPrincipal
        ? 'ckbtc'
        : principalByAddress.data !== undefined
          ? recipientPrincipal
            ? 'ckbtc'
            : 'btc'
          : null;
  const { data: btcPriceData } = useBTCPrice();
  const BTC_PRICE_FIAT = getBTCPriceInCurrency(btcPriceData, preferredCurrency);
  const priceIsStale = isPriceStale(btcPriceData);

  // Parse current amount input to satoshis (used for fee and balance)
  const getCurrentAmountSatoshis = (): bigint => {
    const cleanAmount = (amount || '0').replace(/,/g, '');
    if (!cleanAmount || cleanAmount === '0') return BigInt(0);
    if (amountCurrency === 'BTC') {
      return BigInt(Math.floor(parseFloat(cleanAmount) * 100000000));
    }
    if (amountCurrency === 'SATS') {
      return BigInt(parseInt(cleanAmount, 10) || 0);
    }
    const btc = parseFloat(cleanAmount) / BTC_PRICE_FIAT;
    return BigInt(Math.floor(btc * 100000000));
  };
  const currentAmountSatoshis = getCurrentAmountSatoshis();
  const btcPriceUsdForFee = btcPriceData?.usd ?? 101799;
  const appFeeSats = computeFeeSats(currentAmountSatoshis, btcPriceUsdForFee);
  // Use live minter fee (kyt_fee) instead of hardcoded estimate; fallback keeps behavior resilient.
  const withdrawalNetworkFeeSats = withdrawalInfo?.kytFee ?? 1000n;
  const dynamicWithdrawMinutes = Math.max(10, (withdrawalInfo?.minConfirmations ?? 3) * 10);
  const estimatedWithdrawText = `~${dynamicWithdrawMinutes} min`;
  const effectiveFee = sendMode === 'ckbtc' ? appFeeSats : withdrawalNetworkFeeSats + appFeeSats;
  const isWithdrawPending = retrieveBtc.isPending;
  const isTransferPending = transferCkBTC.isPending;
  const isConfirmPending = isWithdrawPending || isTransferPending;
  const isPrimaryButtonDisabled = useScreenTransitionGuard(500, step);

  const qrScanner = useQRScanner({
    facingMode: 'environment',
  });

  // Handle QR code scan result
  useEffect(() => {
    if (qrScanner.qrResults.length > 0 && step === 'scan') {
      const latestResult = qrScanner.qrResults[0];
      const parsed = parseBitcoinURI(latestResult.data);
      if (parsed) {
        setToAddress(parsed.address);
        if (parsed.amount) {
          setAmount(parsed.amount);
          setAmountCurrency('BTC');
        }
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

  // Handle address or principal detection (paste / QR)
  const handleAddressDetected = (input: string) => {
    const trimmed = input.trim();
    const parsed = parseBitcoinURI(trimmed);
    if (parsed && isValidBitcoinAddress(parsed.address)) {
      setToAddress(parsed.address);
      if (parsed.amount) {
        setAmount(parsed.amount);
        setAmountCurrency('BTC');
      }
      setStep('amount');
    } else if (parsePrincipalInput(trimmed)) {
      setToAddress(trimmed);
      setStep('amount');
    } else if (isValidBitcoinAddress(trimmed)) {
      setToAddress(trimmed);
      setStep('amount');
    } else {
      toast.error(t('send.enterAddress'));
    }
  };

  // Handle paste from clipboard (runs in user gesture to preserve iOS Safari support)
  const handlePasteFromClipboard = () => {
    const fallback = () => {
      const el = pasteInputRef.current;
      if (el) {
        el.focus();
        document.execCommand('paste');
      }
    };

    navigator.clipboard
      .readText()
      .then((text) => handleAddressDetected(text))
      .catch(() => fallback());
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
        handleAddressDetected(pastedText);
      }
    };

    document.addEventListener('paste', handleGlobalPaste);
    return () => document.removeEventListener('paste', handleGlobalPaste);
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
      btcValue = numValue / getBTCPriceInCurrency(btcPriceData, fromCurrency);
    }

    let result: number;
    if (toCurrency === 'BTC') {
      result = btcValue;
      return result.toFixed(8).replace(/\.?0+$/, '');
    } else if (toCurrency === 'SATS') {
      result = btcValue * 100000000;
      return Math.round(result).toString();
    } else {
      result = btcValue * getBTCPriceInCurrency(btcPriceData, toCurrency);
      const decimals = getCurrencyMeta(toCurrency).decimals;
      return result.toFixed(decimals).replace(/\.?0+$/, '');
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

  // Strip leading zeros from amount string (e.g. "000001" -> "1"), keep "0" and preserve decimals
  const normalizeAmountInput = (value: string): string => {
    const raw = value.replace(/,/g, '');
    if (!raw) return '';
    const parts = raw.split('.');
    const intPart = parts[0].replace(/^0+/, '') || '0';
    const decPart = parts.length > 1 ? parts[1] : '';
    return decPart ? `${intPart}.${decPart}` : intPart;
  };

  // Handle number input
  const handleNumberPress = (num: string) => {
    setAmount((prev) => {
      const rawPrev = prev.replace(/,/g, '');
      if (num === '.' && rawPrev.includes('.')) return prev;
      if (num === '.' && rawPrev === '') return '0.';
      if (rawPrev.length >= 15) return prev;
      const next = normalizeAmountInput(rawPrev + num);
      return next;
    });
  };

  // Handle backspace
  const handleBackspace = () => {
    setAmount((prev) => {
      if (prev.length <= 1) return '';
      return prev.slice(0, -1);
    });
  };

  // Handle max button. In all modes, sender pays amount + fee.
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
      toast.error(t('send.pleaseEnterAmount'));
      return;
    }
    setStep('confirm');
  };

  // Remaining balance after this send. In all modes, we debit amountSatoshis + effectiveFee.
  const getRemainingBalanceSatoshis = (): bigint => {
    const amountSatoshis = getCurrentAmountSatoshis();
    return wallet.balance - amountSatoshis - effectiveFee;
  };

  // Calculate transaction details (includes app fee 0.5%, max $100)
  const getTransactionDetails = () => {
    const amountSatoshis = getCurrentAmountSatoshis();
    const totalAmount = amountSatoshis + effectiveFee;
    // Recipient always receives the exact amount entered by sender.
    const recipientAmount = amountSatoshis;

    return {
      amountSatoshis,
      estimatedFee: effectiveFee,
      appFeeSats: appFeeSats,
      totalAmount,
      recipientAmount,
    };
  };

  // Handle send confirmation: instant ckBTC to MOTO user or withdraw to Bitcoin
  const handleConfirm = async () => {
    vibrateLight();
    const { amountSatoshis } = getTransactionDetails();

    if (amountSatoshis + effectiveFee > wallet.balance) {
      toast.error(t('send.insufficientBalance'));
      return;
    }

    if (sendMode === 'ckbtc') {
      if (!recipientPrincipal) return;
      if (identity && identity.getPrincipal().toText() === recipientPrincipal) {
        toast.error(t('send.cantSendToYourself'));
        return;
      }
      if (amountSatoshis + effectiveFee > wallet.balance) {
        toast.error(t('send.insufficientBalance'));
        return;
      }
      try {
        await transferCkBTC.mutateAsync({
          toPrincipal: recipientPrincipal,
          amount: amountSatoshis,
          btcPriceUsd: btcPriceUsdForFee,
        });
        toast.success(t('send.sentInstant'));
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
              : t('send.transferFailed');
        toast.error(message.length > 80 ? message.slice(0, 80) + '…' : message);
      }
      return;
    }

    if (amountSatoshis + effectiveFee > wallet.balance) {
      toast.error(t('send.insufficientBalanceFee'));
      return;
    }
    try {
      await retrieveBtc.mutateAsync({
        toAddress,
        amount: amountSatoshis,
        btcPriceUsd: btcPriceUsdForFee,
      });
      toast.success(t('send.withdrawalSubmitted'));
      if (onSuccess) {
        setTimeout(() => onSuccess(), 1000);
      }
    } catch (error: unknown) {
      let message =
        error instanceof Error
          ? error.message
          : typeof error === 'object' && error !== null && 'message' in error
            ? String((error as { message: unknown }).message)
            : t('send.failedToSend');
      if (message.includes('Insufficient balance')) {
        message = t('send.insufficientBalance');
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
      const fiatPrice = getBTCPriceInCurrency(btcPriceData, amountCurrency);
      const decimals = getCurrencyMeta(amountCurrency).decimals;
      const fiat = (btc * fiatPrice).toFixed(decimals);
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
        <div className="flex flex-col pt-4 flex-1 min-h-0">
          <header className="flex items-center justify-between h-8 shrink-0 px-5">
            <BackCloseButton onClose={() => onClose?.()} />
            <p className="font-medium text-xl text-white tracking-[-0.22px]">
              {t('send.header')}
            </p>
            <div className="h-8 w-8" />
          </header>

          {/* Content area */}
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* QR Scanner - centered vertically */}
            <div className="flex-1 flex items-center justify-center min-h-0 px-5">
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
                  <canvas ref={qrScanner.canvasRef} className="absolute top-0 left-0 w-full h-full opacity-0 pointer-events-none" aria-hidden />
                  
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
                          <p className="text-white/60 text-sm">{t('send.startingCamera')}</p>
                        </div>
                      ) : qrScanner.error ? (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-4 px-4">
                          <p className="text-white/60 text-sm text-center">
                            {(qrScanner.error as any)?.message || t('send.cameraError')}
                          </p>
                          <button
                            onClick={() => qrScanner.retry()}
                            className="h-12 px-6 border-2 border-white/40 bg-transparent hover:border-white/60 transition-colors"
                          >
                            <span className="font-bold text-sm text-white/80">{t('common.retry')}</span>
                          </button>
                        </div>
                      ) : qrScanner.isSupported === false ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <p className="text-white/60 text-sm text-center">{t('send.cameraNotSupported')}</p>
                        </div>
                      ) : qrScanner.isSupported === null ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <p className="text-white/60 text-sm text-center">{t('send.checkingCamera')}</p>
                        </div>
                      ) : !qrScanner.jsQRLoaded ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <p className="text-white/60 text-sm text-center">{t('send.loadingQR')}</p>
                        </div>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-4 px-4">
                          <p className="text-white/60 text-sm text-center">{t('send.cameraNotStarted')}</p>
                          <button
                            onClick={async () => {
                              console.log('Manual camera start clicked');
                              const success = await qrScanner.startScanning();
                              console.log('Manual start result:', success, 'isActive:', qrScanner.isActive);
                              if (!success) {
                                toast.error(t('send.failedToStartCamera'));
                              }
                            }}
                            className="h-12 px-6 border-2 border-white/40 bg-transparent hover:border-white/60 transition-colors"
                          >
                            <span className="font-bold text-sm text-white/80">{t('send.startCamera')}</span>
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
            </div>

          </div>
        </div>

        {/* Bottom bar - matches dashboard button position */}
        <div
          className="shrink-0 flex flex-col bg-black px-5"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="pt-4 pb-4">
            <input
              ref={pasteInputRef}
              type="text"
              onPaste={handlePaste}
              className="absolute opacity-0 pointer-events-none w-0 h-0"
              tabIndex={-1}
              aria-hidden="true"
            />
            <button
              type="button"
              onClick={() => {
                if (Date.now() - lastPasteTouchRef.current < 400) return;
                handlePasteFromClipboard();
              }}
              onPointerUp={(e) => {
                if (e.pointerType === 'touch') {
                  e.preventDefault();
                  lastPasteTouchRef.current = Date.now();
                  handlePasteFromClipboard();
                }
              }}
              className="h-16 border-2 border-white/80 bg-transparent flex items-center justify-center hover:border-white transition-colors w-full select-none"
              style={{
                WebkitTouchCallout: 'none',
                WebkitUserSelect: 'none',
                userSelect: 'none',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <span className="font-bold text-base text-white/80 tracking-[0.15px] pointer-events-none">{t('send.pasteAddress')}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // AMOUNT STEP
  if (step === 'amount') {
    return (
      <div className="fixed inset-0 bg-black z-[9999] flex flex-col">
        <div className="flex flex-col pt-4 flex-1 min-h-0">
          <header className="flex items-center justify-between h-8 shrink-0 px-5">
            <BackCloseButton onClose={() => onClose?.()} />
            <p className="font-medium text-xl text-white tracking-[-0.22px]">
              {t('send.setAmount')}
            </p>
            <button
              onClick={cycleCurrency}
              className="h-8 w-8 flex items-center justify-center cursor-pointer opacity-80 transition-opacity hover:opacity-100 active:opacity-100"
              aria-label={t('send.cycleCurrency')}
            >
              <img 
                src="/assets/cyclecurrency.svg" 
                alt="" 
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
                {isInsufficient ? t('send.remainingBalanceNeg', { amount: formatDisplayAmount(remainingFormatted), currency: getCurrencyLabel() }) : t('send.remainingBalance', { amount: formatDisplayAmount(remainingFormatted), currency: getCurrencyLabel() })}
              </p>
              {/* Current market rate when converting currency */}
              <p className="font-normal text-xs text-center text-white/50 flex items-center justify-center gap-1" style={{ letterSpacing: '0.15px' }}>
                {t('price.btcApprox', { price: formatFiatCompact(BTC_PRICE_FIAT, preferredCurrency) })}
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
                    {t('send.max', { amount: formatDisplayAmount(maxSendableFormatted), currency: getCurrencyLabel() })}
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

                {/* Row 4: Backspace, 0, Period */}
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

                  <button
                    onClick={() => handleNumberPress('.')}
                    className="flex-1 h-[46px] rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                  >
                    <span className="font-mono text-2xl font-bold text-white">.</span>
                  </button>
                </div>
              </div>
              </div>

              {/* Next button */}
              <button
                onClick={handleNext}
                disabled={!amount || amount === '0' || isInsufficient || isPrimaryButtonDisabled}
                className="h-16 w-full border-2 border-white/80 bg-transparent hover:border-white transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="font-bold text-base text-white/80 tracking-[0.15px]">{t('send.next')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // CONFIRMATION STEP
  const isSelfSend = Boolean(sendMode === 'ckbtc' && identity && recipientPrincipal === identity.getPrincipal().toText());
  const isNetworkResolving = Boolean(toAddress.trim() && sendMode === null);
  const confirmDisabled = Boolean(
    isConfirmPending ||
    isInsufficient ||
    isSelfSend ||
    isPrimaryButtonDisabled ||
    (sendMode === 'ckbtc' && principalByAddress.isLoading) ||
    (toAddress.trim() && sendMode === null)
  );

  return (
    <div className="fixed inset-0 bg-black z-[9999] flex flex-col">
      <div className="flex flex-col pt-4 flex-1 min-h-0">
        <header className="flex items-center justify-between h-8 shrink-0 px-5">
          {isConfirmPending ? (
            <div className="h-8 w-8" />
          ) : (
            <BackCloseButton onClose={() => onClose?.()} />
          )}
          <p className="font-medium text-xl text-white tracking-[-0.22px]">
            {t('send.confirmSend')}
          </p>
          {isConfirmPending ? (
            <div className="h-8 w-8" />
          ) : (
            <button
              onClick={cycleCurrency}
              className="h-8 w-8 flex items-center justify-center cursor-pointer transition-opacity hover:opacity-100"
              aria-label={t('send.cycleCurrency')}
            >
              <img 
                src="/assets/cyclecurrency.svg" 
                alt="" 
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
                alt={t('txDetails.sent')} 
                className="h-16 w-12 object-contain"
              />
            </div>

            {/* Large amount display - always the send amount (same as Set Amount screen) */}
            {transactionDetails && (
              <div className="flex items-center gap-2 h-[22px]">
                <p className="font-mono text-[32px] font-bold text-white text-center" style={{ letterSpacing: '1.28px' }}>
                  {formatDisplayAmount(formatAmountInCurrency(transactionDetails.amountSatoshis, amountCurrency))}
                </p>
                <p className="font-mono text-[32px] font-bold text-white text-center" style={{ letterSpacing: '1.28px' }}>
                  {getConfirmationCurrencyLabel()}
                </p>
              </div>
            )}
          </div>

          {/* Bottom section: Details and buttons */}
          <div className="flex flex-col gap-4 shrink-0 pb-5 px-5">
            {/* Transaction details - horizontal layout */}
            {transactionDetails && (
              <div className="flex flex-col gap-4 px-0 py-4">
                {/* Recipient */}
                <div className="flex gap-2.5 items-center w-full">
                  <p className="font-medium text-base text-white/80 tracking-[-0.176px] shrink-0">
                    {t('send.recipient')}
                  </p>
                  <div className="flex-1 flex justify-end text-right">
                    {principalByAddress.isLoading ? (
                      <p className="font-mono text-base font-medium text-white/60 tracking-[0.32px]">{t('send.lookingUp')}</p>
                    ) : (
                      <p className="font-mono text-base font-medium text-white text-right tracking-[0.32px] break-all">
                        {toAddress.length > 20 ? `${toAddress.slice(0, 7)}...${toAddress.slice(-7)}` : toAddress}
                      </p>
                    )}
                  </div>
                </div>

                {/* Network */}
                <div className="flex gap-2.5 items-center w-full">
                  <p className="font-medium text-base text-white/80 tracking-[-0.176px] shrink-0">
                    {t('send.network')}
                  </p>
                  <div className="flex-1 flex justify-end">
                    <p className="font-mono text-base font-medium text-white text-right tracking-[0.32px]">
                      {isNetworkResolving
                        ? t('send.checking')
                        : sendMode === 'ckbtc'
                          ? 'ckBTC'
                          : t('send.bitcoin')}
                    </p>
                  </div>
                </div>

                {/* Estimated time */}
                <div className="flex gap-2.5 items-center w-full">
                  <p className="font-medium text-base text-white/80 tracking-[-0.176px] shrink-0">
                    {t('send.estimatedTime')}
                  </p>
                  <div className="flex-1 flex justify-end">
                    <p className="font-mono text-base font-medium text-white text-right tracking-[0.32px]">
                      {isNetworkResolving ? '—' : sendMode === 'ckbtc' ? t('send.instant') : estimatedWithdrawText}
                    </p>
                  </div>
                </div>

                {/* Amount (send amount) */}
                <div className="flex gap-2.5 items-center w-full">
                  <p className="font-medium text-base text-white/80 tracking-[-0.176px] shrink-0">
                    {t('send.amount')}
                  </p>
                  <div className="flex-1 flex justify-end">
                    <p className="font-mono text-base font-medium text-white text-right tracking-[0.32px]">
                      {formatDisplayAmount(formatAmountInCurrency(transactionDetails.amountSatoshis, amountCurrency))} {getConfirmationCurrencyLabel()}
                    </p>
                  </div>
                </div>

                {/* Fee */}
                <div className="flex gap-2.5 items-center w-full">
                  <p className="font-medium text-base text-white/80 tracking-[-0.176px] shrink-0">
                    {t('send.fee')}
                  </p>
                  <div className="flex-1 flex justify-end">
                    <p className="font-mono text-base font-medium text-white text-right tracking-[0.32px]">
                      {formatDisplayAmount(formatAmountInCurrency(transactionDetails.estimatedFee, amountCurrency))} {getConfirmationCurrencyLabel()}
                    </p>
                  </div>
                </div>

                {/* Total */}
                <div className="flex gap-2.5 items-center w-full">
                  <p className="font-medium text-base text-white/80 tracking-[-0.176px] shrink-0">
                    {t('send.total')}
                  </p>
                  <div className="flex-1 flex justify-end">
                    <p className="font-mono text-base font-medium text-white text-right tracking-[0.32px]">
                      {formatDisplayAmount(formatAmountInCurrency(transactionDetails.totalAmount, amountCurrency))} {getConfirmationCurrencyLabel()}
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
                  className="h-16 w-16 flex items-center justify-center shrink-0 opacity-80 hover:opacity-100 transition-opacity"
                  aria-label={t('common.back')}
                >
                  <img 
                    src="/assets/back.svg" 
                    alt="" 
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
                  {isConfirmPending ? t('send.sending') : isSelfSend ? t('send.cantSendToYourself') : t('send.confirm')}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
