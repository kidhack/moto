import { describe, expect, it } from 'vitest';
import { GEO_PROVIDERS, isRestricted } from './geoBlock';

describe('isRestricted', () => {
  it('blocks comprehensively sanctioned countries', () => {
    for (const cc of ['CU', 'IR', 'KP', 'ir']) expect(isRestricted({ countryCode: cc, region: null })).toBe(true);
  });

  it('blocks occupied regions whichever country the database reports', () => {
    expect(isRestricted({ countryCode: 'UA', region: 'Autonomous Republic of Crimea' })).toBe(true);
    expect(isRestricted({ countryCode: 'RU', region: 'Crimea' })).toBe(true);
    expect(isRestricted({ countryCode: 'RU', region: 'Respublika Krym' })).toBe(true);
    expect(isRestricted({ countryCode: 'UA', region: 'Sevastopol' })).toBe(true);
    expect(isRestricted({ countryCode: 'UA', region: 'Donetsk Oblast' })).toBe(true);
    expect(isRestricted({ countryCode: 'UA', region: "Luhans'ka Oblast'" })).toBe(true);
    expect(isRestricted({ countryCode: 'RU', region: 'Luganskaya Oblast' })).toBe(true);
    expect(isRestricted({ countryCode: 'UA', region: "Donets'ka Oblast'" })).toBe(true);
  });

  it('allows everywhere else, and fails open when the lookup failed', () => {
    expect(isRestricted({ countryCode: 'UA', region: 'Kyiv City' })).toBe(false);
    expect(isRestricted({ countryCode: 'RU', region: 'Moscow' })).toBe(false);
    expect(isRestricted({ countryCode: 'US', region: 'California' })).toBe(false);
    expect(isRestricted({ countryCode: null, region: null })).toBe(false);
    expect(isRestricted(null)).toBe(false);
  });
});

describe('provider parsing', () => {
  it('reads ipwho.is and geojs.io responses', () => {
    expect(GEO_PROVIDERS[0].parse({ success: true, country_code: 'IR', region: 'Tehran' })).toEqual({ countryCode: 'IR', region: 'Tehran' });
    expect(GEO_PROVIDERS[0].parse({ success: false, message: 'rate limited' })).toBeNull();
    expect(GEO_PROVIDERS[1].parse({ country_code: 'UA', region: 'Crimea' })).toEqual({ countryCode: 'UA', region: 'Crimea' });
  });
});
