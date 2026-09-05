import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Mocking the two hooks rather than the network keeps each case about the
// one thing it tests: which message a given (role, billing state) pair
// should produce.
const useAuth = vi.fn();
const useBillingState = vi.fn();

// Partial, not wholesale: the banner also formats a date, and a mock that
// replaces the whole module silently removes the real formatter. Spreading the
// original keeps everything this test is not about — including the pinned
// date formatting it now asserts.
vi.mock("@/lib", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useAuth: () => useAuth(),
  useBillingState: () => useBillingState(),
}));

import { BillingBanner } from "../BillingBanner";

function renderBanner() {
  return render(
    <MemoryRouter>
      <BillingBanner />
    </MemoryRouter>
  );
}

const NOW = new Date("2026-08-28T12:00:00Z");

const ADMIN = { user: { role: "admin" } };
const CASHIER = { user: { role: "cashier" } };
const DEVICE = { user: null };

const ACTIVE = {
  organizationStatus: "ACTIVE",
  subscriptionStatus: "ACTIVE",
  writesAllowed: true,
  graceEndsAt: null,
  trialEndsAt: null,
};
const SUSPENDED = { ...ACTIVE, subscriptionStatus: "SUSPENDED", writesAllowed: false };
const CANCELLED = { ...ACTIVE, subscriptionStatus: "CANCELLED", writesAllowed: false };
const PAST_DUE = {
  ...ACTIVE,
  subscriptionStatus: "PAST_DUE",
  graceEndsAt: "2026-08-30T05:40:41Z",
};
const TRIALING = {
  ...ACTIVE,
  subscriptionStatus: "TRIALING",
  trialEndsAt: "2026-09-05T05:40:41Z",
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  useAuth.mockReset().mockReturnValue(ADMIN);
  useBillingState.mockReset().mockReturnValue(ACTIVE);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("BillingBanner", () => {
  it("says nothing when the account is in good standing", () => {
    const { container } = renderBanner();
    expect(container).toBeEmptyDOMElement();
  });

  it("says nothing while the answer is still unknown", () => {
    useBillingState.mockReturnValue(null);
    const { container } = renderBanner();
    expect(container).toBeEmptyDOMElement();
  });

  it("warns an admin that the account is suspended", () => {
    useBillingState.mockReturnValue(SUSPENDED);
    renderBanner();
    expect(screen.getByRole("status")).toHaveTextContent(/account is suspended/i);
  });

  it("distinguishes a cancelled subscription from a suspended one", () => {
    useBillingState.mockReturnValue(CANCELLED);
    renderBanner();
    expect(screen.getByRole("status")).toHaveTextContent(/subscription has ended/i);
  });

  it("tells them selling still works, because it does", () => {
    // Suspension withdraws back-office writes only. Implying the till is
    // dead would be false and would cause a panic call.
    useBillingState.mockReturnValue(SUSPENDED);
    renderBanner();
    expect(screen.getByRole("status")).toHaveTextContent(/selling still works/i);
  });

  it("never claims existing records are gone", () => {
    useBillingState.mockReturnValue(SUSPENDED);
    renderBanner();
    expect(screen.getByRole("status")).toHaveTextContent(/nothing you.{0,3}ve already recorded/i);
  });

  it("warns during grace and names the deadline", () => {
    useBillingState.mockReturnValue(PAST_DUE);
    renderBanner();
    const banner = screen.getByRole("status");
    expect(banner).toHaveTextContent(/overdue/i);
    // A literal, not toLocaleDateString(). Building the expectation the same
    // way the component used to build the value made this a tautology: it
    // asserted "renders whatever this device renders" and would have passed
    // just as well while the banner showed the wrong day on a tablet in
    // another zone. 05:40 UTC on the 30th is still the 30th in Manila.
    expect(banner).toHaveTextContent("Aug 30, 2026");
  });

  it("stays coherent when the grace deadline is missing", () => {
    useBillingState.mockReturnValue({ ...PAST_DUE, graceEndsAt: null });
    renderBanner();
    expect(screen.getByRole("status")).toHaveTextContent(/Everything still works\. After that/i);
  });

  it("tells an admin they're on a trial, and how many days are left", () => {
    useBillingState.mockReturnValue(TRIALING);
    renderBanner();
    const banner = screen.getByRole("status");
    expect(banner).toHaveTextContent(/free trial/i);
    expect(banner).toHaveTextContent(/8 days left/i);
  });

  it("says the trial reverts to Basic, not that anything is lost", () => {
    useBillingState.mockReturnValue(TRIALING);
    renderBanner();
    const banner = screen.getByRole("status");
    expect(banner).toHaveTextContent(/move back to Basic/i);
    expect(banner).toHaveTextContent(/stays exactly where it is/i);
  });

  it("shows the urgent severity in the final day", () => {
    useBillingState.mockReturnValue({ ...TRIALING, trialEndsAt: "2026-08-29T05:40:41Z" });
    renderBanner();
    expect(screen.getByRole("status")).toHaveTextContent(/free trial ends/i);
  });

  it("says nothing when TRIALING but the deadline is missing", () => {
    // Backend invariant: my_store_billing_state() only sets trial_ends_at
    // while TRIALING. If it's ever absent there is nothing true to compute
    // a countdown from, so this renders nothing rather than guess.
    useBillingState.mockReturnValue({ ...TRIALING, trialEndsAt: null });
    const { container } = renderBanner();
    expect(container).toBeEmptyDOMElement();
  });

  it("shows nothing to a cashier during a trial either", () => {
    useAuth.mockReturnValue(CASHIER);
    useBillingState.mockReturnValue(TRIALING);
    const { container } = renderBanner();
    expect(container).toBeEmptyDOMElement();
  });

  // The judgement call this component exists to encode.
  it("shows NOTHING to a cashier, even when suspended", () => {
    // A cashier cannot pay the bill, and the POS screen faces the customer.
    useAuth.mockReturnValue(CASHIER);
    useBillingState.mockReturnValue(SUSPENDED);
    const { container } = renderBanner();
    expect(container).toBeEmptyDOMElement();
  });

  it("shows nothing to a cashier during grace either", () => {
    useAuth.mockReturnValue(CASHIER);
    useBillingState.mockReturnValue(PAST_DUE);
    const { container } = renderBanner();
    expect(container).toBeEmptyDOMElement();
  });

  it("shows nothing on a bare paired device", () => {
    // A register has no staff row at all, and sits facing the customer.
    useAuth.mockReturnValue(DEVICE);
    useBillingState.mockReturnValue(SUSPENDED);
    const { container } = renderBanner();
    expect(container).toBeEmptyDOMElement();
  });
});
