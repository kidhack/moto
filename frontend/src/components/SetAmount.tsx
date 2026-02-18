import { useState } from 'react';
import { usePreferredCurrency } from '../hooks/usePreferredCurrency';
import { useScreenTransitionGuard } from '../hooks/useScreenTransitionGuard';
import { useBTCPrice, isPriceStale, getBTCPriceInCurrency } from '../hooks/useQueries';
import { formatFiatCompact, getCurrencyMeta } from '../data/currencies';
import StalePriceIndicator from './StalePriceIndicator';
import { useTranslation } from '../i18n';

interface SetAmountProps {
  address: string;
  onConfirm: (amount: string, currency: string) => void;
  onClose: () => void;
  initialCurrency?: string;
  initialAmount?: string;
}

// Currency display mode: 'BTC' | 'SATS' | preferred currency code
type CurrencyMode = 'BTC' | 'SATS' | string;

export default function SetAmount({ address: _address, onConfirm, onClose, initialCurrency, initialAmount }: SetAmountProps) {
  const { preferredCurrency } = usePreferredCurrency();
  const { t } = useTranslation();
  const { data: btcPriceData } = useBTCPrice();
  const [currencyMode, setCurrencyMode] = useState<CurrencyMode>(initialCurrency || 'SATS');
  const [amount, setAmount] = useState<string>(initialAmount || '');

  const BTC_PRICE_FIAT = getBTCPriceInCurrency(btcPriceData, preferredCurrency);
  const priceIsStale = isPriceStale(btcPriceData);

  // Convert amount between currencies
  const convertAmount = (value: string, fromCurrency: string, toCurrency: string): string => {
    if (!value || value === '0' || value === '') return '0';
    
    const numValue = parseFloat(value.replace(/,/g, ''));
    if (isNaN(numValue)) return '0';

    let btcValue: number;

    // Convert from source currency to BTC
    if (fromCurrency === 'BTC') {
      btcValue = numValue;
    } else if (fromCurrency === 'SATS') {
      btcValue = numValue / 100000000;
    } else {
      // Fiat currency — convert to BTC using that currency's price
      btcValue = numValue / getBTCPriceInCurrency(btcPriceData, fromCurrency);
    }

    // Convert from BTC to target currency
    let result: number;
    if (toCurrency === 'BTC') {
      result = btcValue;
      // Format BTC with up to 8 decimal places, remove trailing zeros
      return result.toFixed(8).replace(/\.?0+$/, '');
    } else if (toCurrency === 'SATS') {
      result = btcValue * 100000000;
      // SATS should be whole numbers
      return Math.round(result).toString();
    } else {
      // Fiat currency — convert from BTC using that currency's price
      result = btcValue * getBTCPriceInCurrency(btcPriceData, toCurrency);
      const decimals = getCurrencyMeta(toCurrency).decimals;
      return result.toFixed(decimals).replace(/\.?0+$/, '');
    }
  };

  // Cycle through: BTC -> SATS -> Preferred Currency -> BTC
  const cycleCurrency = () => {
    const currentAmount = amount.replace(/,/g, '');
    let nextCurrency: CurrencyMode;
    
    if (currencyMode === 'BTC') {
      nextCurrency = 'SATS';
    } else if (currencyMode === 'SATS') {
      nextCurrency = preferredCurrency;
    } else {
      nextCurrency = 'BTC';
    }

    // Convert amount to new currency
    if (currentAmount && currentAmount !== '0') {
      const convertedAmount = convertAmount(currentAmount, currencyMode, nextCurrency);
      setAmount(convertedAmount);
    }
    
    setCurrencyMode(nextCurrency);
  };

  // Format amount for display
  const formatDisplayAmount = (value: string): string => {
    if (!value) return '0';
    // Handle decimal numbers - format integer and decimal parts separately
    const parts = value.split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    if (parts.length > 1) {
      return `${integerPart}.${parts[1]}`;
    }
    return integerPart;
  };

  // Get currency label
  const getCurrencyLabel = (): string => {
    if (currencyMode === 'BTC') return 'BTC';
    if (currencyMode === 'SATS') return 'SAT';
    return currencyMode; // e.g., 'USD'
  };

  // Handle number input
  const handleNumberPress = (num: string) => {
    setAmount((prev) => {
      if (num === '.' && prev.includes('.')) return prev;
      if (num === '.' && prev === '') return '0.';
      if (prev === '0' && num === '0') return '0';
      if (prev === '0' && num !== '.') return num;
      if (prev.replace(/,/g, '').length >= 15) return prev;
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

  // Handle confirm — zero or empty clears the set amount
  const handleConfirm = () => {
    const cleanAmount = (amount || '').replace(/,/g, '');
    const numericValue = parseFloat(cleanAmount) || 0;
    if (numericValue === 0) {
      onConfirm('', currencyMode);
    } else {
      onConfirm(cleanAmount, currencyMode);
    }
  };

  const displayAmount = formatDisplayAmount(amount || '0');
  const isConfirmDisabled = useScreenTransitionGuard(500);

  return (
    <div className="fixed inset-0 bg-black z-[9999] flex flex-col">
      {/* Main container - pt-4 matches dashboard/menu header */}
      <div className="flex flex-col pt-4 flex-1 min-h-0">
        <header className="flex items-center justify-between h-8 shrink-0 px-5">
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center cursor-pointer transition-opacity"
            aria-label={t('common.close')}
          >
            <img 
              src="/assets/close.png" 
              alt="" 
              className="h-8 w-8 opacity-80 hover:opacity-100 transition-opacity" 
            />
          </button>
          <p className="font-medium text-xl text-white tracking-[-0.22px]">
            {t('setAmount.header')}
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
        {/* Content area - centered, scrollable */}
        <div className="flex flex-col gap-8 flex-1 min-h-0 overflow-y-auto pb-5">
          {/* Amount display - centered, gap-[32px] from header (via mb-8 on header) */}
          <div className="flex flex-col gap-4 items-center justify-center flex-1 min-h-0 px-5">
            <div className="flex items-center gap-2 h-[22px]">
              <p className="font-mono text-[32px] font-bold text-white text-center" style={{ letterSpacing: '1.28px' }}>
                {displayAmount}
              </p>
              <p className="font-mono text-[32px] font-bold text-white text-center" style={{ letterSpacing: '1.28px' }}>
                {getCurrencyLabel()}
              </p>
            </div>
            <p className="font-normal text-xs text-center text-white/50 flex items-center justify-center gap-1" style={{ letterSpacing: '0.15px' }}>
              {t('price.btcApprox', { price: formatFiatCompact(BTC_PRICE_FIAT, preferredCurrency) })}
              <StalePriceIndicator isStale={priceIsStale} />
            </p>
          </div>

          {/* Numeric Keypad */}
          <div className="flex flex-col gap-3 px-5">
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
      </div>

      {/* Set button - fixed bottom, matches dashboard button position */}
      <div
        className="shrink-0 flex flex-col bg-black px-5"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="pt-4 pb-4">
          <button
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
            className="h-16 w-full border-2 border-white/80 bg-transparent hover:border-white transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="font-bold text-base text-white/80 tracking-[0.15px]">{t('setAmount.set')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
