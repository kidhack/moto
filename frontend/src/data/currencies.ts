export interface Currency {
  code: string;
  name: string;
  /** CoinGecko key (lowercase code) — only set for currencies with live BTC price */
  cgKey?: string;
  symbol: string;
  /** Number of decimal places for display */
  decimals: number;
}

/**
 * Top 20 currencies with live BTC price conversion via CoinGecko,
 * followed by additional currencies without live pricing.
 */
export const CURRENCIES: Currency[] = [
  { code: 'USD', name: 'US Dollar', cgKey: 'usd', symbol: '$', decimals: 2 },
  { code: 'EUR', name: 'Euro', cgKey: 'eur', symbol: '€', decimals: 2 },
  { code: 'CNY', name: 'Chinese Yuan', cgKey: 'cny', symbol: '¥', decimals: 2 },
  { code: 'JPY', name: 'Japanese Yen', cgKey: 'jpy', symbol: '¥', decimals: 0 },
  { code: 'GBP', name: 'British Pound', cgKey: 'gbp', symbol: '£', decimals: 2 },
  { code: 'INR', name: 'Indian Rupee', cgKey: 'inr', symbol: '₹', decimals: 2 },
  { code: 'AUD', name: 'Australian Dollar', cgKey: 'aud', symbol: 'A$', decimals: 2 },
  { code: 'CAD', name: 'Canadian Dollar', cgKey: 'cad', symbol: 'C$', decimals: 2 },
  { code: 'CHF', name: 'Swiss Franc', cgKey: 'chf', symbol: 'CHF', decimals: 2 },
  { code: 'HKD', name: 'Hong Kong Dollar', cgKey: 'hkd', symbol: 'HK$', decimals: 2 },
  { code: 'SGD', name: 'Singapore Dollar', cgKey: 'sgd', symbol: 'S$', decimals: 2 },
  { code: 'SEK', name: 'Swedish Krona', cgKey: 'sek', symbol: 'kr', decimals: 2 },
  { code: 'KRW', name: 'South Korean Won', cgKey: 'krw', symbol: '₩', decimals: 0 },
  { code: 'NOK', name: 'Norwegian Krone', cgKey: 'nok', symbol: 'kr', decimals: 2 },
  { code: 'NZD', name: 'New Zealand Dollar', cgKey: 'nzd', symbol: 'NZ$', decimals: 2 },
  { code: 'MXN', name: 'Mexican Peso', cgKey: 'mxn', symbol: '$', decimals: 2 },
  { code: 'TWD', name: 'Taiwan Dollar', cgKey: 'twd', symbol: 'NT$', decimals: 0 },
  { code: 'ZAR', name: 'South African Rand', cgKey: 'zar', symbol: 'R', decimals: 2 },
  { code: 'BRL', name: 'Brazilian Real', cgKey: 'brl', symbol: 'R$', decimals: 2 },
  { code: 'DKK', name: 'Danish Krone', cgKey: 'dkk', symbol: 'kr', decimals: 2 },
];

/** CoinGecko key list for the top-20 currencies (used to build the API URL) */
export const LIVE_CURRENCY_CG_KEYS = CURRENCIES
  .filter((c) => c.cgKey)
  .map((c) => c.cgKey!);

const PREFERRED_CURRENCY_KEY = 'moto-preferred-currency';
const DEFAULT_CURRENCY = 'USD';

export function getPreferredCurrency(): string {
  if (typeof window === 'undefined') return DEFAULT_CURRENCY;
  const stored = localStorage.getItem(PREFERRED_CURRENCY_KEY);
  return stored || DEFAULT_CURRENCY;
}

export function setPreferredCurrency(code: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PREFERRED_CURRENCY_KEY, code);
}

/** Look up Currency metadata by code */
export function getCurrencyMeta(code: string): Currency {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
}

/**
 * Format a fiat amount using the currency's symbol and decimal rules.
 * Uses Intl.NumberFormat for locale-aware grouping.
 */
export function formatFiat(amount: number, currencyCode: string): string {
  const meta = getCurrencyMeta(currencyCode);
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: meta.decimals,
    maximumFractionDigits: meta.decimals,
  }).format(amount);
  return `${meta.symbol}${formatted}`;
}

/**
 * Format a fiat amount with no decimals (for compact display like "1 BTC ≈ $101,799").
 */
export function formatFiatCompact(amount: number, currencyCode: string): string {
  const meta = getCurrencyMeta(currencyCode);
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  return `${meta.symbol}${formatted}`;
}
