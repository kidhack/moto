import { useState } from 'react';
import { usePreferredCurrency } from '../hooks/usePreferredCurrency';
import { useBTCPrice } from '../hooks/useQueries';

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
  const { data: btcPriceData } = useBTCPrice();
  const [currencyMode, setCurrencyMode] = useState<CurrencyMode>(initialCurrency || 'SATS');
  const [amount, setAmount] = useState<string>(initialAmount || '');

  // Use live BTC price, fallback to default if not loaded yet
  const BTC_PRICE_USD = btcPriceData?.usd || 101799;

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
      // Fiat currency (USD, etc.) - convert to BTC
      btcValue = numValue / BTC_PRICE_USD;
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
      // Fiat currency (USD, etc.) - convert from BTC
      result = btcValue * BTC_PRICE_USD;
      // Format fiat with 2 decimal places
      return result.toFixed(2).replace(/\.?0+$/, '');
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
      // Prevent leading zeros
      if (prev === '0' && num !== '0') {
        return num;
      }
      // Prevent too many digits (max 15 digits)
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

  // Handle confirm
  const handleConfirm = () => {
    if (!amount || amount === '0') {
      return;
    }
    // Remove commas before passing to parent
    const cleanAmount = amount.replace(/,/g, '');
    onConfirm(cleanAmount, currencyMode);
  };

  const displayAmount = formatDisplayAmount(amount || '0');

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
            Set Amount
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
          </div>

          {/* Keyboard and Confirm button - gap-[32px] from amount display */}
          <div className="flex flex-col gap-8 px-5 pb-5">
            {/* Numeric Keypad - gap-[12px] between rows (gap-3) */}
            <div className="flex flex-col gap-3 py-5">
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
                {/* Backspace button */}
                <button
                  onClick={handleBackspace}
                  className="flex-1 h-[46px] rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
                  </svg>
                </button>

                {/* 0 button */}
                <button
                  onClick={() => handleNumberPress('0')}
                  className="flex-1 h-[46px] rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <span className="font-mono text-2xl font-bold text-white">0</span>
                </button>

                {/* Empty space */}
                <div className="flex-1" />
              </div>
            </div>

            {/* Confirm button */}
            <button
              onClick={handleConfirm}
              disabled={!amount || amount === '0'}
              className="h-16 w-full border-2 border-white/80 bg-transparent hover:border-white transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="font-bold text-base text-white/80 tracking-[0.15px]">Confirm Amount</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
