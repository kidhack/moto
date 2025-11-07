import { useState, useEffect } from 'react';
import { getPreferredLanguage, setPreferredLanguage as savePreferredLanguage } from '../data/languages';

export function usePreferredLanguage() {
  const [preferredLanguage, setPreferredLanguageState] = useState<string>(() => getPreferredLanguage());

  useEffect(() => {
    // Sync with localStorage on mount
    setPreferredLanguageState(getPreferredLanguage());
  }, []);

  const setPreferredLanguage = (code: string) => {
    savePreferredLanguage(code);
    setPreferredLanguageState(code);
  };

  return {
    preferredLanguage,
    setPreferredLanguage,
  };
}

