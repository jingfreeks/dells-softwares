import { useEffect, useRef, useState } from "react";

const BATCH_SIZE = 10;
// The underlying data is already in memory (no network round trip per
// batch) — this short delay just gives "Loading more products…" something
// real to show at the scroll boundary, per the batching requirement, rather
// than flashing then instantly vanishing.
const LOADING_INDICATOR_MS = 150;

/**
 * Client-side windowing over an already-fetched, already-filtered product
 * list: renders `BATCH_SIZE` at a time and grows on `loadMore()`, appending
 * rather than replacing. `resetKey` should change exactly when the active
 * filter does (category or search query) so switching tabs starts back at
 * the first batch instead of carrying over an unrelated scroll position.
 */
export function useBatchedProducts<T>(items: T[], resetKey: string) {
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
    setIsLoadingMore(false);
    if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
  }, [resetKey]);

  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    };
  }, []);

  const hasMore = visibleCount < items.length;

  function loadMore() {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    loadingTimeoutRef.current = setTimeout(() => {
      setVisibleCount((prev) => prev + BATCH_SIZE);
      setIsLoadingMore(false);
    }, LOADING_INDICATOR_MS);
  }

  return {
    batch: items.slice(0, visibleCount),
    hasMore,
    isLoadingMore,
    loadMore,
  };
}
