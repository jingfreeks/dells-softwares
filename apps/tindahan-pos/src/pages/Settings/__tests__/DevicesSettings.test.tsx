import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { supabase } from "@/lib";
import { DevicesSettings } from "../DevicesSettings";

vi.mock("@/lib/supabaseClient", () => {
  const deviceSelect = vi.fn();
  const staffSelect = vi.fn();
  const from = vi.fn((table: string) => {
    if (table === "devices") return { select: deviceSelect };
    if (table === "staff") return { select: staffSelect };
    throw new Error(`unexpected table ${table}`);
  });
  const single = vi.fn();
  const rpc = vi.fn(() => ({ single }));
  const invoke = vi.fn();
  const getSession = vi.fn();
  return {
    supabase: {
      from,
      rpc,
      functions: { invoke },
      auth: { getSession },
      __mocks: { deviceSelect, staffSelect, from, single, rpc, invoke, getSession },
    },
  };
});

const mockedSupabase = supabase as unknown as {
  __mocks: {
    deviceSelect: ReturnType<typeof vi.fn>;
    staffSelect: ReturnType<typeof vi.fn>;
    single: ReturnType<typeof vi.fn>;
    invoke: ReturnType<typeof vi.fn>;
    getSession: ReturnType<typeof vi.fn>;
  };
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/settings/devices"]}>
      <Routes>
        <Route path="/settings/devices" element={<DevicesSettings />} />
      </Routes>
    </MemoryRouter>
  );
}

function mockDeviceList(rows: unknown[] = []) {
  mockedSupabase.__mocks.deviceSelect.mockResolvedValue({ data: rows, error: null });
  mockedSupabase.__mocks.staffSelect.mockResolvedValue({
    data: [{ id: "staff-1", name: "Aling Nena" }],
    error: null,
  });
}

describe("DevicesSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeviceList();
  });

  it("lists paired devices with who paired them and when", async () => {
    mockDeviceList([
      {
        id: "d1",
        name: "Counter tablet",
        paired_by: "staff-1",
        paired_at: "2026-08-01T10:00:00Z",
        last_seen_at: null,
        unpaired_at: null,
      },
    ]);
    renderPage();

    expect(await screen.findByText("Counter tablet")).toBeInTheDocument();
    expect(screen.getByText(/Paired by Aling Nena/)).toBeInTheDocument();
  });

  it("shows the empty state when no devices are paired", async () => {
    renderPage();
    expect(await screen.findByText("No devices paired yet.")).toBeInTheDocument();
  });

  it("generates a pairing code and shows it with its expiry", async () => {
    const user = userEvent.setup();
    mockedSupabase.__mocks.single.mockResolvedValue({
      data: { code: "AB12CD", expires_at: "2026-08-08T10:10:00Z" },
      error: null,
    });
    renderPage();
    await waitFor(() => expect(screen.getByText("No devices paired yet.")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /Generate pairing code/ }));

    expect(await screen.findByText("AB12CD")).toBeInTheDocument();
  });

  it("unpairs a device after entering the owner PIN", async () => {
    const user = userEvent.setup();
    mockDeviceList([
      {
        id: "d1",
        name: "Counter tablet",
        paired_by: "staff-1",
        paired_at: "2026-08-01T10:00:00Z",
        last_seen_at: null,
        unpaired_at: null,
      },
    ]);
    mockedSupabase.__mocks.getSession.mockResolvedValue({
      data: { session: { access_token: "tok-1" } },
    });
    mockedSupabase.__mocks.invoke.mockResolvedValue({ data: { ok: true }, error: null });
    renderPage();

    await screen.findByText("Counter tablet");
    await user.click(screen.getByRole("button", { name: "Unpair" }));

    for (const digit of ["1", "2", "3", "4"]) {
      await user.click(screen.getByRole("button", { name: digit }));
    }

    await waitFor(() =>
      expect(mockedSupabase.__mocks.invoke).toHaveBeenCalledWith("unpair-device", {
        body: { deviceId: "d1", ownerPin: "1234" },
        headers: { Authorization: "Bearer tok-1" },
      })
    );
  });

  it("shows an inline error for a wrong owner PIN", async () => {
    const user = userEvent.setup();
    mockDeviceList([
      {
        id: "d1",
        name: "Counter tablet",
        paired_by: "staff-1",
        paired_at: "2026-08-01T10:00:00Z",
        last_seen_at: null,
        unpaired_at: null,
      },
    ]);
    mockedSupabase.__mocks.getSession.mockResolvedValue({
      data: { session: { access_token: "tok-1" } },
    });
    mockedSupabase.__mocks.invoke.mockResolvedValue({ data: { error: "INVALID_OWNER_PIN" }, error: null });
    renderPage();

    await screen.findByText("Counter tablet");
    await user.click(screen.getByRole("button", { name: "Unpair" }));

    for (const digit of ["9", "9", "9", "9"]) {
      await user.click(screen.getByRole("button", { name: digit }));
    }

    expect(await screen.findByRole("alert")).toHaveTextContent("That PIN doesn't match any admin at this store.");
  });
});
