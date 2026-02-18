export interface Language {
  code: string;
  name: string;
}

export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'zh', name: '中文' },
];

const PREFERRED_LANGUAGE_KEY = 'moto-preferred-language';
const DEFAULT_LANGUAGE = 'en';

export function getPreferredLanguage(): string {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  const stored = localStorage.getItem(PREFERRED_LANGUAGE_KEY);
  return stored || DEFAULT_LANGUAGE;
}

export function setPreferredLanguage(code: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PREFERRED_LANGUAGE_KEY, code);
}

