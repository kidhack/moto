import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { useScreenTransitionGuard } from '../hooks/useScreenTransitionGuard';
import { vibrateLight } from '../utils/haptics';
import { SlideFromRight } from './SlideFromRight';
import SetAmount from './SetAmount';
import { useBTCPrice, isPriceStale, getBTCPriceInCurrency } from '../hooks/useQueries';
import { formatFiatCompact } from '../data/currencies';
import { usePreferredCurrency } from '../hooks/usePreferredCurrency';
import StalePriceIndicator from './StalePriceIndicator';
import { useActor } from '../hooks/useActor';
import { isValidBitcoinAddress, isBech32AddressForStorage } from '../utils/addressValidation';
import BackCloseButton from './BackCloseButton';
import { useTranslation } from '../i18n';

interface ReceiveBitcoinProps {
  address: string;
  onClose?: () => void;
}

export default function ReceiveBitcoin({ address, onClose }: ReceiveBitcoinProps) {
  const [amount, setAmount] = useState<string>('');
  const { t } = useTranslation();
  const [showSetAmount, setShowSetAmount] = useState(false);
  const { data: btcPriceData } = useBTCPrice();
  const { preferredCurrency } = usePreferredCurrency();
  const { actor } = useActor();

  // Validate address is real - NEVER display fake addresses
  useEffect(() => {
    if (address && !isValidBitcoinAddress(address)) {
      console.error('ReceiveBitcoin: Invalid Bitcoin address detected:', address);
      toast.error(t('receive.invalidAddress'));
      if (onClose) {
        onClose();
      }
    }
  }, [address, onClose]);

  // Sync this address to the MOTO canister when user opens Receive, so getPrincipalByBitcoinAddress
  // can resolve it for senders (MOTO-to-MOTO). Uses bech32 check so testnet (tb1) is stored too.
  useEffect(() => {
    if (!actor || !address || !isBech32AddressForStorage(address)) return;
    actor
      .setBitcoinAddress(address)
      .then(() => console.log('ReceiveBitcoin: setBitcoinAddress synced for MOTO-to-MOTO'))
      .catch((err) => console.warn('ReceiveBitcoin: setBitcoinAddress failed (wallet may not exist yet):', err));
  }, [actor, address]);

  // Don't render if address is invalid
  if (!address || !isValidBitcoinAddress(address)) {
    return (
      <div className="fixed inset-0 bg-black z-[9999] flex flex-col items-center justify-center px-5">
        <p className="text-white text-center text-lg mb-4">{t('receive.unableToLoadAddress')}</p>
        <p className="text-white/60 text-center text-sm mb-8">{t('common.pleaseRetryLater')}</p>
        <button
          onClick={onClose}
          className="h-16 border-2 border-white/80 bg-transparent hover:bg-white/10 transition-colors flex items-center justify-center px-8"
        >
          <span className="font-bold text-base text-white/80 tracking-[0.15px]">{t('common.close')}</span>
        </button>
      </div>
    );
  }

  // Store both amount and currency to properly display and convert
  const [amountCurrency, setAmountCurrency] = useState<string>('BTC');

  const BTC_PRICE_FIAT = getBTCPriceInCurrency(btcPriceData, preferredCurrency);
  const priceIsStale = isPriceStale(btcPriceData);

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
      const btc = fiatAmount / getBTCPriceInCurrency(btcPriceData, currency);
      return btc.toString();
    }
  };

  // Generate QR code data - if amount is set, include it as BIP21 URI
  const btcAmount = amount ? getBTCAmount(amount, amountCurrency) : '';
  const qrData = btcAmount ? `bitcoin:${address}?amount=${btcAmount}` : address;

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
  const isGuardDisabled = useScreenTransitionGuard(500);

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      vibrateLight();
      setAddressCopied(true);
      setTimeout(() => setAddressCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error(t('common.failedToCopyClipboard'));
    }
  };

  const shareAddress = async () => {
    const currencyLabel = amountCurrency === 'BTC' ? 'BTC' : amountCurrency === 'SATS' ? 'sats' : amountCurrency;
    const amountText = amount ? `${amount} ${currencyLabel} ` : '';
    const text = t('receive.shareRequest', { amount: amountText, address });

    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch (error) {
        console.error('Share failed:', error);
      }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        vibrateLight();
        toast.success(t('common.copiedToClipboard'));
      } catch {
        toast.error(t('common.failedToCopyClipboard'));
      }
    }
  };

  // If SetAmount screen is open, show it with slide-from-right
  if (showSetAmount) {
    return (
      <SlideFromRight open={showSetAmount} onClose={() => setShowSetAmount(false)}>
        <SetAmount
          address={address}
          onConfirm={handleAmountConfirm}
          onClose={() => setShowSetAmount(false)}
          initialCurrency={amountCurrency}
          initialAmount={amount}
        />
      </SlideFromRight>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-[9999] flex flex-col">
      {/* Main container - pt-4 matches dashboard/menu header */}
      <div className="flex flex-col pt-4 flex-1 min-h-0">
        <header className="flex items-center justify-between h-8 shrink-0 px-5">
          <BackCloseButton onClose={() => onClose?.()} />
          <p className="font-medium text-xl text-white tracking-[-0.22px]">
            {t('receive.header')}
          </p>
          <div className="h-8 w-8" /> {/* Empty space for symmetry */}
        </header>

        {/* Content area - no scroll, QR scales to fit */}
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden" style={{ paddingTop: 24 }}>
          {/* QR Code - fills available vertical space, constrained by width */}
          <div className="flex-1 flex items-center justify-center px-5 min-h-0">
            <div className="max-w-[370px] max-h-full aspect-square w-full flex items-center justify-center bg-white p-1 rounded">
              <QRCodeSVG
                value={qrData}
                size={370}
                level="M"
                marginSize={2}
                className="w-full h-full"
              />
            </div>
          </div>

          {/* Bitcoin Wallet Address box - tap to copy */}
          <div className="px-5 shrink-0" style={{ paddingTop: 24 }}>
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
                  {t('common.copied')}
                </p>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom bar - fixed position matching dashboard */}
      <div
        className="shrink-0 flex flex-col bg-black px-5"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex flex-col pt-4 pb-4 gap-2">
          <p className="font-normal text-xs text-center text-white/50 flex items-center justify-center gap-1 pb-1" style={{ letterSpacing: '0.15px' }}>
            {t('price.btcApprox', { price: formatFiatCompact(BTC_PRICE_FIAT, preferredCurrency) })}
            <StalePriceIndicator isStale={priceIsStale} />
          </p>
          {amount ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2 h-[22px]">
                <p className="font-mono text-2xl font-bold text-white" style={{ letterSpacing: '0.96px' }}>
                  {formatDisplayAmount(amount)}
                </p>
                <p className="font-mono text-2xl font-bold text-white" style={{ letterSpacing: '0.96px' }}>
                  {getCurrencyLabel()}
                </p>
              </div>
              <button
                onClick={() => setShowSetAmount(true)}
                disabled={isGuardDisabled}
                className="h-16 border-2 border-white/40 bg-transparent flex items-center justify-center hover:border-white/60 transition-colors px-8 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="font-bold text-base text-white/80 tracking-[0.15px]">{t('receive.edit')}</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSetAmount(true)}
              disabled={isGuardDisabled}
              className="h-16 border-2 border-white/40 bg-transparent flex items-center justify-center hover:border-white/60 transition-colors w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="font-bold text-base text-white/80 tracking-[0.15px]">{t('receive.setAmount')}</span>
            </button>
          )}
          <button
            onClick={shareAddress}
            disabled={isGuardDisabled}
            className="h-16 border-2 border-white/80 bg-transparent flex items-center justify-center hover:border-white transition-colors w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="font-bold text-base text-white/80 tracking-[0.15px]">{t('receive.share')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
