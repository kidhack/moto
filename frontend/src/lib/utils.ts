import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Strip trailing fractional zeros ("1.50" -> "1.5", "2.00" -> "2"). Leaves whole numbers alone ("100" stays "100"). */
export function trimTrailingZeros(value: string): string {
  return value.includes('.') ? value.replace(/\.?0+$/, '') : value;
}
