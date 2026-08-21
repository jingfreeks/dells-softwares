import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Mocking the two hooks rather than the network keeps each case about the
// one thing it tests: which message a given (role, billing state) pair
// should produce.
const useAuth = vi.fn();
const useBillingState = vi.fn();

vi.mock("@/lib", () => ({
  useAuth: () => useAuth(),
  useBillingState: () => useBillingState(),
}));

import { BillingBanner } from "../BillingBanner";

const ADMIN = { user: { role: "admin" } };
const CASHIER = { user: { role: "cashier" } };
const DEVICE = { user: null };

const ACTIVE = {
  organizationStatus: "ACTIVE",
  subscriptionStatus: "ACTIVE",
  writesAllowed: true,
  graceEndsAt: null,
};
const SUSPENDED = { ...ACTIVE, subscriptionStatus: "SUSPENDED", writesAllowed: false };
const CANCELLED = { ...ACTIVE, subscriptionStatus: "CANCELLED", writesAllowed: false };
const PAST_DUE = {
  ...ACTIVE,
  subscriptionStatus: "PAST_DUE",
  graceEndsAt: "2026-08-30T05:40:41Z",
};

beforeEach(() => {
  useAuth.mockReset().mockReturnValue(ADMIN);
  useBillingState.mockReset().mockReturnValue(ACTIVE);
});

describe("BillingBanner", () => {
  it("says nothing when the account is in good standing", () => {
    const { container } = render(<BillingBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("says nothing while the answer is still unknown", () => {
    useBillingState.mockReturnValue(null);
    const { container } = render(<BillingBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("warns an admin that the account is suspended", () => {
    useBillingState.mockReturnValue(SUSPENDED);
    render(<BillingBanner />);
    expect(screen.getByRole("status")).toHaveTextContent(/account is suspended/i);
  });

  it("distinguishes a cancelled subscription from a suspended one", () => {
    useBillingState.mockReturnValue(CANCELLED);
    render(<BillingBanner />);
    expect(screen.getByRole("status")).toHaveTextContent(/subscription has ended/i);
  });

  it("tells them selling still works, because it does", () => {
    // Suspension withdraws back-office writes only. Implying the till is
    // dead would be false and would cause a panic call.
    useBillingState.mockReturnValue(SUSPENDED);
    render(<BillingBanner />);
    expect(screen.getByRole("status")).toHaveTextContent(/selling still works/i);
  });

  it("never claims existing records are gone", () => {
    useBillingState.mockReturnValue(SUSPENDED);
    render(<BillingBanner />);
    expect(screen.getByRole("status")).toHaveTextContent(/nothing you.{0,3}ve already recorded/i);
  });

  it("warns during grace and names the deadline", () => {
    useBillingState.mockReturnValue(PAST_DUE);
    render(<BillingBanner />);
    const banner = screen.getByRole("status");
    expect(banner).toHaveTextContent(/overdue/i);
    expect(banner).toHaveTextContent(new Date(PAST_DUE.graceEndsAt).toLocaleDateString());
  });

  it("stays coherent when the grace deadline is missing", () => {
    useBillingState.mockReturnValue({ ...PAST_DUE, graceEndsAt: null });
    render(<BillingBanner />);
    expect(screen.getByRole("status")).toHaveTextContent(/Everything still works\. After that/i);
  });

  // The judgement call this component exists to encode.
  it("shows NOTHING to a cashier, even when suspended", () => {
    // A cashier cannot pay the bill, and the POS screen faces the customer.
    useAuth.mockReturnValue(CASHIER);
    useBillingState.mockReturnValue(SUSPENDED);
    const { container } = render(<BillingBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows nothing to a cashier during grace either", () => {
    useAuth.mockReturnValue(CASHIER);
    useBillingState.mockReturnValue(PAST_DUE);
    const { container } = render(<BillingBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows nothing on a bare paired device", () => {
    // A register has no staff row at all, and sits facing the customer.
    useAuth.mockReturnValue(DEVICE);
    useBillingState.mockReturnValue(SUSPENDED);
    const { container } = render(<BillingBanner />);
    expect(container).toBeEmptyDOMElement();
  });
});
