import { useCallback, useRef, useState } from 'react';

const PULL_THRESHOLD = 60;
const MAX_PULL = 80;
const RESISTANCE = 0.5;

export function usePullToRefresh(onRefresh: () => Promise<unknown> | void) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const startScrollTop = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    startScrollTop.current = scrollRef.current?.scrollTop ?? 0;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isRefreshing) return;
    const el = scrollRef.current;
    if (!el) return;
    const scrollTop = el.scrollTop;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startY.current;
    if (scrollTop <= 0 && deltaY > 0) {
      const distance = Math.min(MAX_PULL, deltaY * RESISTANCE);
      setPullDistance(distance);
    }
  }, [isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(0);
      try {
        await Promise.resolve(onRefresh());
      } finally {
        setIsRefreshing(false);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, isRefreshing, onRefresh]);

  return {
    scrollRef,
    pullDistance,
    isRefreshing,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    pullProgress: Math.min(1, pullDistance / PULL_THRESHOLD),
  };
}
