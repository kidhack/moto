import { useEffect, useState } from 'react';

/** Matches Tailwind's `lg` breakpoint. Below it the app keeps the mobile layout unchanged. */
export const DESKTOP_MIN_WIDTH = 1024;

const QUERY = `(min-width: ${DESKTOP_MIN_WIDTH}px)`;

export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.matchMedia(QUERY).matches);

  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    setIsDesktop(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return isDesktop;
}
