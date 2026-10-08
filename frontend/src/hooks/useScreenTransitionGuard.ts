import { useState, useEffect } from 'react';

/**
 * Disables primary action buttons for a delay after mount to prevent
 * accidental double-taps (e.g., Next then Confirm on rapid taps).
 * Reset the key when transitioning to a new "screen" so each gets its own cooldown.
 */
export function useScreenTransitionGuard(delayMs = 500, resetKey?: string | number): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
    const t = setTimeout(() => setReady(true), delayMs);
    return () => clearTimeout(t);
  }, [delayMs, resetKey]);

  return !ready; // isDisabled
}
