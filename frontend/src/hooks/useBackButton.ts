import { useEffect, useRef } from 'react';

let skipNextPopState = false;

/**
 * Pushes a history entry when `active` becomes true.
 * Browser back button calls onClose. In-app close cleans up the history entry.
 */
export function useBackButton(active: boolean, onClose: () => void) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!active) return;

    window.history.pushState({ modal: true }, '');
    let closed = false;

    const handlePopState = () => {
      if (skipNextPopState) {
        skipNextPopState = false;
        return;
      }
      if (!closed) {
        closed = true;
        closeRef.current();
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (!closed) {
        closed = true;
        skipNextPopState = true;
        window.history.back();
      }
    };
  }, [active]);
}
