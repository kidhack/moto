import { useEffect, useState } from 'react';
import { isRestricted, lookupGeo } from '../lib/geoBlock';

/**
 * True once the visitor is known to be in a sanctioned region. Fails open: while the lookup runs,
 * or if every lookup service fails, the app works normally (checked again next session).
 */
export function useGeoRestriction(): boolean {
  const [restricted, setRestricted] = useState(false);
  useEffect(() => {
    let cancelled = false;
    lookupGeo().then((geo) => {
      if (!cancelled) setRestricted(isRestricted(geo));
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return restricted;
}
