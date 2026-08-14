import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBatchedProducts } from "./useBatchedProducts";

function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i + 1);
}

describe("useBatchedProducts", () => {
  it("shows only the first 10 items when more than 10 are available", () => {
    const { result } = renderHook(() => useBatchedProducts(range(25), "All "));
    expect(result.current.batch).toEqual(range(10));
    expect(result.current.hasMore).toBe(true);
  });

  it("shows all items when fewer than the batch size are available", () => {
    const { result } = renderHook(() => useBatchedProducts(range(4), "All "));
    expect(result.current.batch).toEqual(range(4));
    expect(result.current.hasMore).toBe(false);
  });

  it("appends the next batch on loadMore, without dropping the first batch", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useBatchedProducts(range(25), "All "));

    act(() => result.current.loadMore());
    expect(result.current.isLoadingMore).toBe(true);
    // Still only the first batch until the transient loading window elapses.
    expect(result.current.batch).toEqual(range(10));

    act(() => vi.advanceTimersByTime(200));
    expect(result.current.isLoadingMore).toBe(false);
    expect(result.current.batch).toEqual(range(20));
    expect(result.current.hasMore).toBe(true);

    vi.useRealTimers();
  });

  it("stops offering more once every item has been loaded", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useBatchedProducts(range(15), "All "));

    act(() => result.current.loadMore());
    act(() => vi.advanceTimersByTime(200));
    expect(result.current.batch).toEqual(range(15));
    expect(result.current.hasMore).toBe(false);

    // A further call must not error or grow the batch past the data.
    act(() => result.current.loadMore());
    act(() => vi.advanceTimersByTime(200));
    expect(result.current.batch).toEqual(range(15));

    vi.useRealTimers();
  });

  it("resets back to the first batch when resetKey changes (e.g. category switch)", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ key }) => useBatchedProducts(range(25), key), {
      initialProps: { key: "All " },
    });

    act(() => result.current.loadMore());
    act(() => vi.advanceTimersByTime(200));
    expect(result.current.batch).toEqual(range(20));

    rerender({ key: "Beverage " });
    expect(result.current.batch).toEqual(range(10));

    vi.useRealTimers();
  });
});
