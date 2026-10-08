import { useEffect, type ReactNode } from 'react';

/**
 * The app's screens (Send, Receive, legal pages, transaction details…) are built as `fixed inset-0`
 * full-screen layers for mobile. A transformed ancestor becomes the containing block for fixed
 * descendants, so wrapping them here makes them fill this box instead of the viewport. That lets
 * desktop reuse them unchanged inside a panel or a centered modal.
 */
export function ContainedPanel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ transform: 'translateZ(0)' }}>
      {children}
    </div>
  );
}

/** Centered phone-width modal for screens that are full-screen on mobile. Esc or backdrop click closes. */
export function ContainedModal({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>
        <ContainedPanel className="w-[420px] h-[min(760px,calc(100dvh-64px))] border border-white/30 bg-black">
          {children}
        </ContainedPanel>
      </div>
    </div>
  );
}
