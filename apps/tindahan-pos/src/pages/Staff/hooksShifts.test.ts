import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useStoreData } from "@/lib";
import { supabase } from "@/lib/supabaseClient";
import { makeStoreDataValue, makeSaleRecord } from "../../test/testUtils";
import { useOpenShifts, useShiftHistory } from "./hooksShifts";

vi.mock("@/lib/storeData", () => ({ useStoreData: vi.fn() }));
vi.mock("@/lib/supabaseClient", () => {
  const select = vi.fn();
  const from = vi.fn(() => ({ select }));
  return { supabase: { from, __mocks: { select, from } } };
});

const mockedSupabase = supabase as unknown as { __mocks: { select: ReturnType<typeof vi.fn> } };

function chain(data: unknown) {
  const result = Promise.resolve({ data, error: null });
  const stub = {
    is: vi.fn(() => stub),
    order: vi.fn(() => stub),
    limit: vi.fn(() => stub),
    then: (resolve: (v: unknown) => void) => result.then(resolve),
  };
  return stub;
}

describe("useOpenShifts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("computes running sales/transaction totals for each open shift", async () => {
    mockedSupabase.__mocks.select.mockReturnValue(
      chain([{ id: "sess-1", staff_id: "staff-2", created_at: "2026-08-15T07:00:00Z", opening_float: 2000, staff: { name: "Cashier Joy" } }])
    );
    const fetchSalesInRange = vi.fn().mockResolvedValue([
      makeSaleRecord({ id: "s1", status: "completed", total: 100 }),
      makeSaleRecord({ id: "s2", status: "voided", total: 50 }),
    ]);
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ fetchSalesInRange }));

    const { result } = renderHook(() => useOpenShifts());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.openShifts).toEqual([
      {
        id: "sess-1",
        staffId: "staff-2",
        staffName: "Cashier Joy",
        createdAt: "2026-08-15T07:00:00Z",
        openingFloat: 2000,
        salesTotal: 100,
        transactionCount: 1,
      },
    ]);
    expect(fetchSalesInRange).toHaveBeenCalledWith(
      expect.objectContaining({ startDate: "2026-08-15T07:00:00Z", cashierId: "staff-2" })
    );
  });

  it("returns an empty list when no one is on shift", async () => {
    mockedSupabase.__mocks.select.mockReturnValue(chain([]));
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue());

    const { result } = renderHook(() => useOpenShifts());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.openShifts).toEqual([]);
  });
});

describe("useShiftHistory", () => {
  beforeEach(() => vi.clearAllMocks());

  it("labels an open shift in-progress and a closed-without-count shift accordingly", async () => {
    mockedSupabase.__mocks.select.mockReturnValue(
      chain([
        {
          id: "sess-open",
          staff_id: "staff-1",
          created_at: "2026-08-15T07:00:00Z",
          revoked_at: null,
          opening_float: 2000,
          closing_float: null,
          variance: null,
          staff: { name: "Aling Nena" },
        },
        {
          id: "sess-skipped",
          staff_id: "staff-2",
          created_at: "2026-08-14T07:00:00Z",
          revoked_at: "2026-08-14T15:00:00Z",
          opening_float: 2000,
          closing_float: null,
          variance: null,
          staff: { name: "Cashier Joy" },
        },
      ])
    );
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ fetchSalesInRange: vi.fn().mockResolvedValue([]) }));

    const { result } = renderHook(() => useShiftHistory());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.shifts.map((s) => s.status)).toEqual(["in-progress", "no-count"]);
  });

  it("buckets sales into the matching shift window by cashier", async () => {
    mockedSupabase.__mocks.select.mockReturnValue(
      chain([
        {
          id: "sess-1",
          staff_id: "staff-1",
          created_at: "2026-08-15T07:00:00Z",
          revoked_at: "2026-08-15T15:00:00Z",
          opening_float: 2000,
          closing_float: 3175,
          variance: -40,
          staff: { name: "Aling Nena" },
        },
      ])
    );
    const inWindow = makeSaleRecord({
      id: "s1",
      status: "completed",
      total: 100,
      cashierId: "staff-1",
      timestamp: "2026-08-15T10:00:00Z",
    });
    const outOfWindow = makeSaleRecord({
      id: "s2",
      status: "completed",
      total: 50,
      cashierId: "staff-1",
      timestamp: "2026-08-16T10:00:00Z",
    });
    vi.mocked(useStoreData).mockReturnValue(
      makeStoreDataValue({ fetchSalesInRange: vi.fn().mockResolvedValue([inWindow, outOfWindow]) })
    );

    const { result } = renderHook(() => useShiftHistory());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.shifts[0].salesTotal).toBe(100);
    expect(result.current.shifts[0].transactionCount).toBe(1);
  });
});
