import { useState, useEffect, useCallback } from 'react';
import { getPreferredLanguage, setPreferredLanguage as savePreferredLanguage } from '../data/languages';

const LANG_CHANGE_EVENT = 'moto-language-change';

export function usePreferredLanguage() {
  const [preferredLanguage, setPreferredLanguageState] = useState<string>(() => getPreferredLanguage());

  useEffect(() => {
    const handler = () => setPreferredLanguageState(getPreferredLanguage());
    window.addEventListener(LANG_CHANGE_EVENT, handler);
    return () => window.removeEventListener(LANG_CHANGE_EVENT, handler);
  }, []);

  const setPreferredLanguage = useCallback((code: string) => {
    savePreferredLanguage(code);
    setPreferredLanguageState(code);
    window.dispatchEvent(new Event(LANG_CHANGE_EVENT));
  }, []);

  return {
    preferredLanguage,
    setPreferredLanguage,
  };
}

