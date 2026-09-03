import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { XReadingCard } from "./XReadingCard";

const rpc = vi.fn();
let rows: unknown[] = [];

const from = vi.fn(() => {
  const chain = {
    select: () => chain,
    eq: () => chain,
    order: () => Promise.resolve({ data: rows, error: null }),
  };
  return chain;
});

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpc(...args),
    from: (...args: unknown[]) => from(...(args as [])),
  },
}));

function makeReading(overrides: Record<string, unknown> = {}) {
  return {
    id: "x1",
    store_id: "store-1",
    kind: "X",
    z_counter: null,
    reset_counter: 0,
    business_date: "2026-09-03",
    opened_at: "2026-09-03T00:00:00.000Z",
    closed_at: "2026-09-03T04:30:00.000Z",
    grand_total: 1200,
    gross_sales: 340,
    net_sales: 320,
    total_discounts: 20,
    vatable_sales: 285,
    vat_amount: 35,
    vat_exempt: 0,
    zero_rated: 0,
    transaction_count: 4,
    voided_count: 0,
    voided_total: 0,
    refund_count: 0,
    refund_total: 0,
    beginning_receipt: "OR-0201",
    ending_receipt: "OR-0204",
    payment_breakdown: { cash: { count: 4, total: 320 } },
    late_entry_count: 0,
    late_entry_total: 0,
    device_id: null,
    taken_by: "staff-1",
    created_at: "2026-09-03T04:30:00.000Z",
    ...overrides,
  };
}

const staff = [{ id: "staff-1", name: "Aling Nena" }];

describe("XReadingCard", () => {
  beforeEach(() => {
    rows = [];
    rpc.mockReset();
  });

  it("shows an empty state when no X-reading has been taken", async () => {
    render(<XReadingCard staff={staff} />);
    expect(await screen.findByText("No X-readings taken for this business date.")).toBeInTheDocument();
  });

  // The question an X-reading exists to answer, per design §5: who read the
  // register mid-shift, and what did it say then.
  it("lists each reading with who took it and what it said", async () => {
    rows = [makeReading()];
    render(<XReadingCard staff={staff} />);

    expect(await screen.findByText("Aling Nena")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("₱320.00")).toBeInTheDocument();
    expect(screen.getByText("₱1,200.00")).toBeInTheDocument();
  });

  it("takes an X-reading, not a Z, and shows it without a refetch", async () => {
    const user = userEvent.setup();
    rpc.mockResolvedValue({ data: makeReading({ id: "x2", net_sales: 999 }), error: null });
    render(<XReadingCard staff={staff} />);

    await user.click(await screen.findByRole("button", { name: "Take X-reading" }));

    expect(rpc).toHaveBeenCalledWith("take_reading", expect.objectContaining({ p_kind: "X" }));
    expect(await screen.findByText("₱999.00")).toBeInTheDocument();
  });

  // A PostgREST error is a plain object, not an Error, so `err instanceof Error`
  // silently discarded the server's message -- the first version of this hook
  // did exactly that and showed a generic shrug. describePlatformError also
  // turns the raw code into something a shopkeeper can act on, which is the
  // app's standing rule that nobody is shown the database's own words.
  it("explains a refusal in words rather than showing the raw code", async () => {
    const user = userEvent.setup();
    rpc.mockResolvedValue({ data: null, error: { message: "UNAUTHORIZED_ACTION" } });
    render(<XReadingCard staff={staff} />);

    await user.click(await screen.findByRole("button", { name: "Take X-reading" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/permission/i);
    expect(alert).not.toHaveTextContent("UNAUTHORIZED_ACTION");
    expect(screen.getByRole("button", { name: "Take X-reading" })).toBeEnabled();
  });
});
