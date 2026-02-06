export interface Currency {
  code: string;
  name: string;
}

export const CURRENCIES: Currency[] = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'CNY', name: 'Chinese Yuan (Renminbi)' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'EUR', name: 'Euro' },
  { code: 'MXN', name: 'Mexican Peso' },
  { code: 'BRL', name: 'Brazilian Real' },
  { code: 'BDT', name: 'Bangladeshi Taka' },
  { code: 'RUB', name: 'Russian Ruble' },
  { code: 'PKR', name: 'Pakistani Rupee' },
  { code: 'IDR', name: 'Indonesian Rupiah' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'KES', name: 'Kenyan Shilling' },
  { code: 'ZAR', name: 'South African Rand' },
  { code: 'TRY', name: 'Turkish Lira' },
  { code: 'NGN', name: 'Nigerian Naira' },
  { code: 'VND', name: 'Vietnamese Đồng' },
  { code: 'EGP', name: 'Egyptian Pound' },
  { code: 'THB', name: 'Thai Baht' },
  { code: 'UAH', name: 'Ukrainian Hryvnia' },
  { code: 'PHP', name: 'Philippine Peso' },
  { code: 'RON', name: 'Romanian Leu' },
  { code: 'GHS', name: 'Ghanaian Cedi' },
  { code: 'MYR', name: 'Malaysian Ringgit' },
  { code: 'UGX', name: 'Ugandan Shilling' },
  { code: 'MZN', name: 'Mozambican Metical' },
  { code: 'MGA', name: 'Malagasy Ariary' },
  { code: 'LKR', name: 'Sri Lankan Rupee' },
  { code: 'TND', name: 'Tunisian Dinar' },
  { code: 'MMK', name: 'Burmese Kyat' },
  { code: 'KHR', name: 'Cambodian Riel' },
  { code: 'IRR', name: 'Iranian Rial' },
  { code: 'OMR', name: 'Omani Rial' },
  { code: 'AFN', name: 'Afghan Afghani' },
  { code: 'UZS', name: 'Uzbekistani Som' },
  { code: 'TZS', name: 'Tanzanian Shilling' },
  { code: 'KGS', name: 'Kyrgyz Som' },
  { code: 'SDG', name: 'Sudanese Pound' },
  { code: 'MRU', name: 'Mauritanian Ouguiya' },
  { code: 'NPR', name: 'Nepalese Rupee' },
  { code: 'HTG', name: 'Haitian Gourde' },
  { code: 'CUP', name: 'Cuban Peso' },
  { code: 'SOS', name: 'Somali Shilling' },
  { code: 'PGK', name: 'Papua New Guinean Kina' },
  { code: 'TTD', name: 'Trinidad and Tobago Dollar' },
];

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

