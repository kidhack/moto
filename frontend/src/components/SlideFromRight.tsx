import { useState, useEffect, useRef, useCallback, useLayoutEffect, cloneElement, isValidElement } from 'react';

const DURATION_MS = 150;

interface SlideFromRightProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactElement<{ onClose?: () => void }>;
}

/**
 * Wraps modal content with slide-from-bottom enter / slide-out-bottom exit.
 * Intercepts child's onClose: animates out, then calls parent onClose.
 */
export function SlideFromRight({ open, onClose, children }: SlideFromRightProps) {
  const [mounted, setMounted] = useState(false);
  const [entered, setEntered] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setIsExiting(false);
      setEntered(false);
    } else {
      setMounted(false);
      setEntered(false);
    }
  }, [open]);

  useLayoutEffect(() => {
    if (!mounted || entered || isExiting) return;
    const el = containerRef.current;
    if (!el) return;
    // Force the browser to acknowledge the off-screen position before transitioning
    el.getBoundingClientRect();
    setEntered(true);
  }, [mounted, entered, isExiting]);

  const handleCloseRequest = useCallback(() => {
    setIsExiting(true);
  }, []);

  const handleTransitionEnd = useCallback(
    (e: React.TransitionEvent) => {
      if (e.target !== containerRef.current) return;
      if (isExiting) {
        onClose();
      }
    },
    [isExiting, onClose]
  );

  if (!mounted) return null;

  const translateY = (!entered || isExiting) ? '100%' : '0%';

  const childWithClose = isValidElement(children)
    ? cloneElement(children as React.ReactElement<{ onClose?: () => void }>, {
        onClose: handleCloseRequest,
      })
    : children;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] flex flex-col bg-black will-change-transform"
      style={{
        transform: `translateY(${translateY})`,
        transition: `transform ${DURATION_MS}ms ease-out`,
      }}
      onTransitionEnd={handleTransitionEnd}
    >
      {childWithClose}
    </div>
  );
}
