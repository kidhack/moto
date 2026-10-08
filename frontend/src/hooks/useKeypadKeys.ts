import { useEffect, useRef } from 'react';

interface KeypadKeyHandlers {
  onDigit: (key: string) => void;
  onBackspace: () => void;
  onEnter?: () => void;
}

/**
 * Lets a physical keyboard drive an on-screen amount keypad (desktop): digits and "." / ",",
 * Backspace, Enter. Ignored while focus is in a text field or a modifier key is held.
 */
export function useKeypadKeys(enabled: boolean, handlers: KeypadKeyHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      const { onDigit, onBackspace, onEnter } = handlersRef.current;
      if (/^[0-9]$/.test(e.key)) {
        onDigit(e.key);
      } else if (e.key === '.' || e.key === ',') {
        onDigit('.');
      } else if (e.key === 'Backspace') {
        onBackspace();
      } else if (e.key === 'Enter' && onEnter) {
        onEnter();
      } else {
        return;
      }
      e.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
}
