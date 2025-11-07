export interface Language {
  code: string;
  name: string;
}

// English first (default), then alphabetically sorted by name
export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English' },
  { code: 'ar-eg', name: 'العربية المصرية' },
  { code: 'ar', name: 'العربية' },
  { code: 'az', name: 'Azərbaycan dili' },
  { code: 'am', name: 'አማርኛ' },
  { code: 'id', name: 'Bahasa Indonesia' },
  { code: 'bn', name: 'বাংলা' },
  { code: 'bho', name: 'भोजपुरी' },
  { code: 'su', name: 'Basa Sunda' },
  { code: 'de', name: 'Deutsch' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'ff', name: 'Pulaar / Fulfulde' },
  { code: 'gu', name: 'ગુજરાતી' },
  { code: 'ha', name: 'Harshen Hausa' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'ig', name: 'Asụsụ Igbo' },
  { code: 'it', name: 'Italiano' },
  { code: 'jv', name: 'ꦧꦱꦗꦮ' },
  { code: 'kn', name: 'ಕನ್ನಡ' },
  { code: 'sw', name: 'Kiswahili' },
  { code: 'ko', name: '한국어 / 조선말' },
  { code: 'mg', name: 'Malagasy' },
  { code: 'ml', name: 'മലയാളം' },
  { code: 'mr', name: 'मराठी' },
  { code: 'mai', name: 'मैथिली' },
  { code: 'nl', name: 'Nederlands' },
  { code: 'uz', name: 'Oʻzbekcha / Ўзбекча' },
  { code: 'ps', name: 'پښتو' },
  { code: 'fa', name: 'فارسی' },
  { code: 'pl', name: 'Polski' },
  { code: 'pt', name: 'Português' },
  { code: 'ro', name: 'Română' },
  { code: 'ru', name: 'Русский' },
  { code: 'sd', name: 'سنڌي / सिन्धी' },
  { code: 'ta', name: 'தமிழ்' },
  { code: 'te', name: 'తెలుగు' },
  { code: 'th', name: 'ไทย' },
  { code: 'tl', name: 'Wikang Tagalog / Filipino' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'uk', name: 'Українська' },
  { code: 'ur', name: 'اُردُو' },
  { code: 'vi', name: 'Tiếng Việt' },
  { code: 'wuu', name: '吴语' },
  { code: 'yo', name: 'Yorùbá' },
  { code: 'ja', name: '日本語' },
  { code: 'zh', name: '中文 (普通话)' },
];

const PREFERRED_LANGUAGE_KEY = 'market-town-preferred-language';
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

