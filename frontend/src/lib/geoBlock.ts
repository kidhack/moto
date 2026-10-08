/**
 * Sanctions geo-blocking (Terms §12). MOTO is served from Internet Computer boundary nodes with no
 * edge layer that knows the visitor's country, so the app looks it up itself and shows a "not
 * available" screen in restricted regions. Covers every way of reaching the app (custom domain and
 * raw canister URL). Not airtight (VPNs), which is the usual expectation for IP-based blocking.
 *
 * Region list to be confirmed by counsel.
 */

/** Countries under comprehensive sanctions: Cuba, Iran, North Korea. */
export const RESTRICTED_COUNTRIES = ['CU', 'IR', 'KP'];

/**
 * Occupied regions of Ukraine (Crimea incl. Sevastopol, Donetsk, Luhansk). Matched by name because
 * geolocation databases disagree on the country (UA vs RU) and the subdivision codes; word stems so
 * transliterations like "Donets'ka" and "Luhans'ka" match too.
 */
const RESTRICTED_REGION_PATTERN = /crimea|krym|sevastopol|donets|luhans|lugans/i;

export interface GeoResult {
  countryCode: string | null;
  region: string | null;
}

export function isRestricted(geo: GeoResult | null): boolean {
  if (!geo) return false; // lookup failed: fail open
  if (geo.countryCode && RESTRICTED_COUNTRIES.includes(geo.countryCode.toUpperCase())) return true;
  return !!geo.region && RESTRICTED_REGION_PATTERN.test(geo.region);
}

type Provider = { url: string; parse: (data: Record<string, unknown>) => GeoResult | null };

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);

/** Free, keyless, CORS-enabled lookups of the caller's own IP; the second is a fallback. */
export const GEO_PROVIDERS: Provider[] = [
  {
    url: 'https://ipwho.is/?fields=success,country_code,region',
    parse: (d) => (d.success === false ? null : { countryCode: str(d.country_code), region: str(d.region) }),
  },
  {
    url: 'https://get.geojs.io/v1/ip/geo.json',
    parse: (d) => ({ countryCode: str(d.country_code), region: str(d.region) }),
  },
];

const CACHE_KEY = 'moto_geo';
const TIMEOUT_MS = 4000;

/** Look up the visitor's country/region; null when every provider fails (the caller fails open). */
export async function lookupGeo(): Promise<GeoResult | null> {
  // One lookup per browser session ("check again on the next visit").
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) return JSON.parse(cached) as GeoResult;
  } catch {
    /* storage unavailable */
  }
  for (const provider of GEO_PROVIDERS) {
    try {
      const res = await fetch(provider.url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!res.ok) continue;
      const geo = provider.parse(await res.json());
      if (!geo || (!geo.countryCode && !geo.region)) continue;
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(geo));
      } catch {
        /* storage unavailable */
      }
      return geo;
    } catch {
      // try the next provider
    }
  }
  return null;
}
