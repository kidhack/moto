import { useState, useEffect, useCallback } from 'react';
import { getPreferredCurrency, setPreferredCurrency as savePreferredCurrency } from '../data/currencies';

const CURRENCY_CHANGE_EVENT = 'moto-currency-change';

export function usePreferredCurrency() {
  const [preferredCurrency, setPreferredCurrencyState] = useState<string>(() => getPreferredCurrency());

  useEffect(() => {
    const handler = () => setPreferredCurrencyState(getPreferredCurrency());
    window.addEventListener(CURRENCY_CHANGE_EVENT, handler);
    return () => window.removeEventListener(CURRENCY_CHANGE_EVENT, handler);
  }, []);

  const setPreferredCurrency = useCallback((code: string) => {
    savePreferredCurrency(code);
    setPreferredCurrencyState(code);
    window.dispatchEvent(new Event(CURRENCY_CHANGE_EVENT));
  }, []);

  return {
    preferredCurrency,
    setPreferredCurrency,
  };
}

