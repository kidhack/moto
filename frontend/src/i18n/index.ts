import { useCallback } from 'react';
import { usePreferredLanguage } from '../hooks/usePreferredLanguage';
import en from './translations/en';
import zh from './translations/zh';
import hi from './translations/hi';
import es from './translations/es';
import fr from './translations/fr';

const translations: Record<string, Record<string, string>> = {
  en,
  zh,
  hi,
  es,
  fr,
};

/**
 * Returns a `t(key, vars?)` function that resolves the key in the
 * user's preferred language, falling back to English.
 *
 * Interpolation: `t('send.remainingBalance', { amount: '0.5', currency: 'BTC' })`
 * replaces `{{amount}}` and `{{currency}}` in the translated string.
 */
export function useTranslation() {
  const { preferredLanguage } = usePreferredLanguage();

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      const dict = translations[preferredLanguage] ?? en;
      let str = dict[key] ?? en[key] ?? key;

      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          str = str.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
        }
      }

      return str;
    },
    [preferredLanguage],
  );

  return { t };
}
