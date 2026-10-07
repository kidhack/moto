import { useCallback, useRef, useState } from 'react';

const SWIPE_THRESHOLD = 50;

export type SwipeDirection = 'left' | 'right' | 'up';

export function useSwipeGesture(onSwipe: (dir: SwipeDirection) => void) {
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const deltaRef = useRef({ deltaX: 0, deltaY: 0 });
  const [delta, setDelta] = useState({ deltaX: 0, deltaY: 0 });

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    deltaRef.current = { deltaX: 0, deltaY: 0 };
    setDelta({ deltaX: 0, deltaY: 0 });
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!startRef.current) return;
    const deltaX = e.touches[0].clientX - startRef.current.x;
    const deltaY = e.touches[0].clientY - startRef.current.y;
    deltaRef.current = { deltaX, deltaY };
    setDelta({ deltaX, deltaY });
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!startRef.current) return;
    const { deltaX, deltaY } = deltaRef.current;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absX > SWIPE_THRESHOLD || absY > SWIPE_THRESHOLD) {
      if (absX > absY) {
        if (deltaX > 0) {
          onSwipe('right');
        } else {
          onSwipe('left');
        }
      } else {
        if (deltaY < 0) {
          onSwipe('up');
        }
      }
    }

    startRef.current = null;
    setDelta({ deltaX: 0, deltaY: 0 });
  }, [onSwipe]);

  return { handleTouchStart, handleTouchMove, handleTouchEnd, delta };
}
