import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CartPanel } from "./CartPanel";
import "../../authTheme.css";

function baseProps() {
  return {
    cart: [],
    serviceLines: [],
    packPricingEnabled: false,
    priceLabel: () => null,
    onIncrement: vi.fn(),
    onRemove: vi.fn(),
    onRemoveService: vi.fn(),
    subtotal: 500,
    total: 500,
    discountsEnabled: false,
    discountType: null,
    onDiscountTypeChange: vi.fn(),
    discountValue: "",
    onDiscountValueChange: vi.fn(),
    discountAmount: 0,
    paymentType: "cash" as const,
    onSelectPaymentType: vi.fn(),
    tendered: "500",
    onTenderedChange: vi.fn(),
    quickCashAmounts: [500],
    change: 0,
    referenceNo: "",
    onReferenceNoChange: vi.fn(),
    selectedCustomer: null,
    onClearCustomer: vi.fn(),
    customerQuery: "",
    onCustomerQueryChange: vi.fn(),
    customerResults: [],
    onSelectCustomer: vi.fn(),
    addingCustomer: false,
    onQuickAddCustomer: vi.fn(),
    customerError: null,
    lastReceiptTotal: null,
    checkoutError: null,
    holdError: null,
    checkingOut: false,
    holdingSale: false,
    onCancelSale: vi.fn(),
    onCompleteSale: vi.fn(),
    onHold: vi.fn(),
  };
}

describe("CartPanel — discount control (BIR compliance, Phase 2c)", () => {
  it("hides the discount control entirely when the store doesn't hold pos.discounts", () => {
    render(<CartPanel {...baseProps()} discountsEnabled={false} />);
    expect(screen.queryByText("Add discount")).not.toBeInTheDocument();
  });

  it("shows an 'Add discount' link when the feature is enabled and no discount is set", () => {
    render(<CartPanel {...baseProps()} discountsEnabled />);
    expect(screen.getByText("Add discount")).toBeInTheDocument();
  });

  it("shows the type/value inputs once a discount type is chosen", async () => {
    const user = userEvent.setup();
    const onDiscountTypeChange = vi.fn();
    render(<CartPanel {...baseProps()} discountsEnabled onDiscountTypeChange={onDiscountTypeChange} />);

    await user.click(screen.getByText("Add discount"));
    expect(onDiscountTypeChange).toHaveBeenCalledWith("percentage");
  });

  it("shows Subtotal/Discount rows only when a discount is actually applied", () => {
    const { rerender } = render(<CartPanel {...baseProps()} discountsEnabled discountAmount={0} />);
    expect(screen.queryByText("Subtotal")).not.toBeInTheDocument();
    expect(screen.queryByText("Discount")).not.toBeInTheDocument();

    rerender(
      <CartPanel
        {...baseProps()}
        discountsEnabled
        discountType="flat"
        subtotal={550}
        discountAmount={50}
        total={500}
      />
    );
    expect(screen.getByText("Subtotal")).toBeInTheDocument();
    expect(screen.getByText("Discount")).toBeInTheDocument();
  });
});
