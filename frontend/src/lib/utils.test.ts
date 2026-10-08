import { describe, expect, it } from 'vitest';
import { trimTrailingZeros } from './utils';

describe('trimTrailingZeros', () => {
  it('keeps whole numbers intact (zero-decimal currencies like JPY)', () => {
    expect(trimTrailingZeros('100')).toBe('100');
    expect(trimTrailingZeros('2500')).toBe('2500');
    expect(trimTrailingZeros('0')).toBe('0');
  });
  it('strips fractional zeros', () => {
    expect(trimTrailingZeros('1.50')).toBe('1.5');
    expect(trimTrailingZeros('2.00')).toBe('2');
    expect(trimTrailingZeros('10.00000000')).toBe('10');
    expect(trimTrailingZeros('0.00012000')).toBe('0.00012');
  });
});
