import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { UpgradeModal } from "../UpgradeModal";
import type { LockedByPlan } from "@/lib/plan/plan";

const GROUP: LockedByPlan = {
  plan: {
    planCode: "BUSINESS",
    name: "Business",
    pricePhp: 599,
    billingInterval: "MONTHLY",
    features: new Set(["inventory.purchase_orders", "inventory.stock_count"]),
    sortOrder: 2,
  },
  priceLabel: "₱599/monthly",
  features: [
    { code: "inventory.purchase_orders", moduleCode: "INVENTORY", name: "Purchase orders", held: false },
    { code: "inventory.stock_count", moduleCode: "INVENTORY", name: "Stock counts", held: false },
  ],
};

function PlanPageStub() {
  return <p>Plan settings page</p>;
}

function renderModal(group: LockedByPlan | null, onClose = vi.fn()) {
  render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Routes>
        <Route path="/dashboard" element={<UpgradeModal group={group} onClose={onClose} />} />
        <Route path="/settings/plan" element={<PlanPageStub />} />
      </Routes>
    </MemoryRouter>
  );
  return onClose;
}

describe("UpgradeModal", () => {
  it("renders nothing when there is no group to show", () => {
    renderModal(null);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the target plan's name, price, and the features it would unlock", () => {
    renderModal(GROUP);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Upgrade to Business/)).toBeInTheDocument();
    expect(screen.getByText(/₱599\/monthly/)).toBeInTheDocument();
    expect(screen.getByText("Purchase orders")).toBeInTheDocument();
    expect(screen.getByText("Stock counts")).toBeInTheDocument();
  });

  it("closes without navigating when Maybe later is clicked", async () => {
    const onClose = renderModal(GROUP);
    await userEvent.click(screen.getByRole("button", { name: /maybe later/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Plan settings page")).not.toBeInTheDocument();
  });

  it("Compare plans navigates to the plan page and closes the modal", async () => {
    const onClose = renderModal(GROUP);
    await userEvent.click(screen.getByRole("link", { name: /compare plans/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Plan settings page")).toBeInTheDocument();
  });

  it("closing via the overlay or the X button also calls onClose", async () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <UpgradeModal group={GROUP} onClose={onClose} />
      </MemoryRouter>
    );
    await userEvent.click(screen.getByLabelText("Close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
