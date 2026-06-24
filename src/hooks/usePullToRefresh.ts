import { useEffect, useRef, useState } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  disabled?: boolean;
  threshold?: number;
}

export function usePullToRefresh({ onRefresh, disabled = false, threshold = 72 }: UsePullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef(0);
  const pullingRef = useRef(false);
  const pullDistanceRef = useRef(0);
  const refreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);

  onRefreshRef.current = onRefresh;

  useEffect(() => {
    if (disabled) return;

    const isAtTop = () => window.scrollY <= 1;

    const isIgnoredTarget = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return false;
      return Boolean(
        target.closest('[data-pull-refresh-disabled], input, textarea, select, button, a, [contenteditable="true"]'),
      );
    };

    const onTouchStart = (event: TouchEvent) => {
      if (refreshingRef.current || !isAtTop() || isIgnoredTarget(event.target)) return;
      startYRef.current = event.touches[0]?.clientY ?? 0;
      pullingRef.current = true;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!pullingRef.current || refreshingRef.current) return;
      if (!isAtTop()) {
        pullingRef.current = false;
        pullDistanceRef.current = 0;
        setPullDistance(0);
        return;
      }

      const touchY = event.touches[0]?.clientY ?? 0;
      const delta = touchY - startYRef.current;
      if (delta > 0) {
        if (event.cancelable) event.preventDefault();
        const next = Math.min(delta * 0.5, threshold * 1.4);
        pullDistanceRef.current = next;
        setPullDistance(next);
      } else {
        pullingRef.current = false;
        pullDistanceRef.current = 0;
        setPullDistance(0);
      }
    };

    const finishPull = async () => {
      if (!pullingRef.current) return;
      pullingRef.current = false;
      const distance = pullDistanceRef.current;
      pullDistanceRef.current = 0;
      setPullDistance(0);

      if (distance < threshold || refreshingRef.current) return;

      refreshingRef.current = true;
      setIsRefreshing(true);
      try {
        await onRefreshRef.current();
      } finally {
        refreshingRef.current = false;
        setIsRefreshing(false);
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', finishPull);
    window.addEventListener('touchcancel', finishPull);
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', finishPull);
      window.removeEventListener('touchcancel', finishPull);
    };
  }, [disabled, threshold]);

  return { pullDistance, isRefreshing, threshold };
}
