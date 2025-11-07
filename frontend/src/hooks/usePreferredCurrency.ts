import { useState, useEffect } from 'react';
import { getPreferredCurrency, setPreferredCurrency as savePreferredCurrency } from '../data/currencies';

export function usePreferredCurrency() {
  const [preferredCurrency, setPreferredCurrencyState] = useState<string>(() => getPreferredCurrency());

  useEffect(() => {
    // Sync with localStorage on mount
    setPreferredCurrencyState(getPreferredCurrency());
  }, []);

  const setPreferredCurrency = (code: string) => {
    savePreferredCurrency(code);
    setPreferredCurrencyState(code);
  };

  return {
    preferredCurrency,
    setPreferredCurrency,
  };
}

