import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { makeSaleRecord } from "@/test/testUtils";
import { RefundModal } from "./RefundModal";

const eq = vi.fn().mockResolvedValue({ data: [], error: null });
const select = vi.fn(() => ({ eq }));
const from = vi.fn((_table: string) => ({ select }));

vi.mock("@/lib/supabaseClient", () => ({
  supabase: { from: (table: string) => from(table) },
}));

describe("RefundModal", () => {
  beforeEach(() => {
    eq.mockReset().mockResolvedValue({ data: [], error: null });
  });

  it("shows only product lines, not services", async () => {
    const sale = makeSaleRecord({
      items: [
        { id: "si-1", productId: "p1", name: "Sardines", quantity: 3, price: 25, itemType: "product", fee: 0, lineTotal: 75 },
        { id: "si-2", productId: "", name: "E-Load", quantity: 1, price: 50, itemType: "service", fee: 0, lineTotal: 50 },
      ],
    });
    render(<RefundModal open sale={sale} onSubmit={vi.fn()} onClose={vi.fn()} />);

    expect(await screen.findByText("Sardines")).toBeInTheDocument();
    expect(screen.queryByText("E-Load")).not.toBeInTheDocument();
  });

  it("caps the quantity input at what's left to refund, accounting for prior refunds", async () => {
    eq.mockResolvedValue({ data: [{ sale_item_id: "si-1", quantity: 1 }], error: null });
    const sale = makeSaleRecord({
      items: [{ id: "si-1", productId: "p1", name: "Sardines", quantity: 3, price: 25, itemType: "product", fee: 0, lineTotal: 75 }],
    });
    const user = userEvent.setup();
    render(<RefundModal open sale={sale} onSubmit={vi.fn()} onClose={vi.fn()} />);

    const input = await screen.findByLabelText("Qty to refund");
    expect(await screen.findByText(/Already refunded 1/)).toBeInTheDocument();

    await user.clear(input);
    await user.type(input, "99");
    // 3 sold - 1 already refunded = 2 remaining, however high the typed value.
    expect(input).toHaveValue(2);
  });

  it("disables the confirm button until a reason is typed", async () => {
    const sale = makeSaleRecord();
    render(<RefundModal open sale={sale} onSubmit={vi.fn()} onClose={vi.fn()} />);

    await screen.findByText("Sardines");
    const confirmButton = screen.getByRole("button", { name: "Refund" });
    expect(confirmButton).toBeDisabled();
  });

  it("says so plainly when nothing is left to refund", async () => {
    eq.mockResolvedValue({ data: [{ sale_item_id: "sale-item-1", quantity: 2 }], error: null });
    const sale = makeSaleRecord(); // default item: id "sale-item-1", quantity 2
    render(<RefundModal open sale={sale} onSubmit={vi.fn()} onClose={vi.fn()} />);

    expect(await screen.findByText(/already been refunded/)).toBeInTheDocument();
  });

  it("submits only the lines with a positive quantity, and closes on success", async () => {
    const sale = makeSaleRecord({
      items: [{ id: "si-1", productId: "p1", name: "Sardines", quantity: 3, price: 25, itemType: "product", fee: 0, lineTotal: 75 }],
    });
    const onSubmit = vi.fn().mockResolvedValue("refund-1");
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<RefundModal open sale={sale} onSubmit={onSubmit} onClose={onClose} />);

    const input = await screen.findByLabelText("Qty to refund");
    await user.clear(input);
    await user.type(input, "1");
    await user.type(screen.getByLabelText("Reason for the refund"), "Wrong size");
    await user.click(screen.getByRole("button", { name: "Refund" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(sale, "Wrong size", [{ saleItemId: "si-1", quantity: 1 }])
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("keeps the dialog open and shows an error when the refund fails", async () => {
    const sale = makeSaleRecord({
      items: [{ id: "si-1", productId: "p1", name: "Sardines", quantity: 3, price: 25, itemType: "product", fee: 0, lineTotal: 75 }],
    });
    const onSubmit = vi.fn().mockRejectedValue(new Error("REFUND_EXCEEDS_SOLD_QUANTITY: Sardines"));
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<RefundModal open sale={sale} onSubmit={onSubmit} onClose={onClose} />);

    const input = await screen.findByLabelText("Qty to refund");
    await user.clear(input);
    await user.type(input, "1");
    await user.type(screen.getByLabelText("Reason for the refund"), "test");
    await user.click(screen.getByRole("button", { name: "Refund" }));

    expect(await screen.findByText("REFUND_EXCEEDS_SOLD_QUANTITY: Sardines")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
