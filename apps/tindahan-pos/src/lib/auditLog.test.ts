import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { supabase } from "./supabaseClient";
import { useAuditLog } from "./auditLog";

vi.mock("./supabaseClient", () => {
  const auditLogSelect = vi.fn();
  const staffSelect = vi.fn();
  const salesSelect = vi.fn();
  const from = vi.fn((table: string) => {
    if (table === "audit_log") return { select: auditLogSelect };
    if (table === "staff") return { select: staffSelect };
    if (table === "sales") return { select: salesSelect };
    throw new Error(`unexpected table ${table}`);
  });
  return {
    supabase: {
      from,
      __mocks: { auditLogSelect, staffSelect, salesSelect, from },
    },
  };
});

const mockedSupabase = supabase as unknown as {
  __mocks: {
    auditLogSelect: ReturnType<typeof vi.fn>;
    staffSelect: ReturnType<typeof vi.fn>;
    salesSelect: ReturnType<typeof vi.fn>;
  };
};

function chain(data: unknown) {
  const result = Promise.resolve({ data, error: null });
  return {
    order: vi.fn(() => ({
      limit: vi.fn(() => result),
    })),
    in: vi.fn(() => result),
  };
}

describe("useAuditLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedSupabase.__mocks.staffSelect.mockReturnValue(
      Promise.resolve({ data: [{ id: "staff-1", name: "Aling Nena" }], error: null })
    );
    mockedSupabase.__mocks.salesSelect.mockReturnValue(chain([{ id: "sale-1", receipt_number: "000003" }]));
  });

  it("resolves actor names and receipt numbers onto audit_log rows", async () => {
    mockedSupabase.__mocks.auditLogSelect.mockReturnValue(
      chain([
        {
          id: "log-1",
          actor_id: "staff-1",
          action: "sale_voided",
          entity_type: "sale",
          entity_id: "sale-1",
          reason: "Demo void",
          created_at: "2026-08-15T08:54:57Z",
        },
      ])
    );

    const { result } = renderHook(() => useAuditLog());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.entries).toEqual([
      {
        id: "log-1",
        action: "sale_voided",
        actionLabel: "Sale voided",
        actorName: "Aling Nena",
        entityLabel: "Receipt 000003",
        reason: "Demo void",
        createdAt: "2026-08-15T08:54:57Z",
      },
    ]);
  });

  it("passes a custom limit through to the query", async () => {
    mockedSupabase.__mocks.auditLogSelect.mockReturnValue(chain([]));

    renderHook(() => useAuditLog({ limit: 5 }));

    await waitFor(() => expect(mockedSupabase.__mocks.auditLogSelect).toHaveBeenCalled());
    const orderCall = mockedSupabase.__mocks.auditLogSelect.mock.results[0].value.order.mock.results[0].value;
    expect(orderCall.limit).toHaveBeenCalledWith(5);
  });

  it("surfaces a load error", async () => {
    mockedSupabase.__mocks.auditLogSelect.mockReturnValue({
      order: vi.fn(() => ({
        limit: vi.fn(() => Promise.resolve({ data: null, error: { message: "boom" } })),
      })),
    });

    const { result } = renderHook(() => useAuditLog());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.loadError).toBe("boom");
  });
});
