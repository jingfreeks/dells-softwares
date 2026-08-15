import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { supabase } from "@/lib";
import { AuditLogSettings } from "../AuditLogSettings";

vi.mock("@/lib/supabaseClient", () => {
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

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/settings/audit-log"]}>
      <Routes>
        <Route path="/settings/audit-log" element={<AuditLogSettings />} />
      </Routes>
    </MemoryRouter>
  );
}

function chain(data: unknown) {
  const result = Promise.resolve({ data, error: null });
  return {
    order: vi.fn(() => ({
      limit: vi.fn(() => result),
    })),
    in: vi.fn(() => result),
    then: (result as Promise<unknown>).then.bind(result),
  };
}

describe("AuditLogSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedSupabase.__mocks.staffSelect.mockReturnValue(
      Promise.resolve({ data: [{ id: "staff-1", name: "Aling Nena" }], error: null })
    );
    mockedSupabase.__mocks.salesSelect.mockReturnValue(chain([{ id: "sale-1", receipt_number: "000001" }]));
  });

  it("lists a voided-sale audit entry with actor, receipt number, and reason", async () => {
    mockedSupabase.__mocks.auditLogSelect.mockReturnValue(
      chain([
        {
          id: "log-1",
          actor_id: "staff-1",
          action: "sale_voided",
          entity_type: "sale",
          entity_id: "sale-1",
          reason: "Customer changed their mind",
          created_at: "2026-08-15T10:00:00Z",
        },
      ])
    );

    renderPage();

    expect(await screen.findByText(/Sale voided/)).toBeInTheDocument();
    expect(screen.getByText(/Receipt 000001/)).toBeInTheDocument();
    expect(screen.getByText(/By Aling Nena/)).toBeInTheDocument();
    expect(screen.getByText(/Customer changed their mind/)).toBeInTheDocument();
  });

  it("shows the empty state when there are no entries", async () => {
    mockedSupabase.__mocks.auditLogSelect.mockReturnValue(chain([]));
    renderPage();
    expect(await screen.findByText("No audit log entries yet.")).toBeInTheDocument();
  });

  it("shows an error message when the log fails to load", async () => {
    mockedSupabase.__mocks.auditLogSelect.mockReturnValue({
      order: vi.fn(() => ({
        limit: vi.fn(() => Promise.resolve({ data: null, error: { message: "Unable to load the audit log." } })),
      })),
    });
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load the audit log.");
  });
});
