import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// The banner reads two independent facts through the modules context. Mocking
// the hooks rather than the network keeps each case to the one thing it is
// about: which message a given pair of facts should produce.
const useHasModule = vi.fn();
const useBillingState = vi.fn();

vi.mock("../lib/modules", () => ({
  useHasModule: (code: string) => useHasModule(code),
  useBillingState: () => useBillingState(),
}));

import { ModuleBanner } from "./ModuleBanner";

const ACTIVE = { subscriptionStatus: "ACTIVE", writesAllowed: true, graceEndsAt: null };

beforeEach(() => {
  useHasModule.mockReset().mockReturnValue(true);
  useBillingState.mockReset().mockReturnValue(ACTIVE);
});

describe("ModuleBanner", () => {
  it("says nothing when the store is healthy and entitled", () => {
    const { container } = render(<ModuleBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("says nothing while the answer is still unknown", () => {
    // Loading resolves to null, and a banner wrongly claiming someone is
    // suspended is worse than a late one.
    useBillingState.mockReturnValue(null);
    const { container } = render(<ModuleBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("reports a suspension, and does not claim the data is gone", () => {
    useBillingState.mockReturnValue({
      subscriptionStatus: "SUSPENDED",
      writesAllowed: false,
      graceEndsAt: null,
    });
    render(<ModuleBanner />);
    expect(screen.getByRole("status")).toHaveTextContent(/account is suspended/i);
    expect(screen.getByRole("status")).toHaveTextContent(/stays visible and exportable/i);
  });

  it("distinguishes a cancelled subscription from a suspended one", () => {
    useBillingState.mockReturnValue({
      subscriptionStatus: "CANCELLED",
      writesAllowed: false,
      graceEndsAt: null,
    });
    render(<ModuleBanner />);
    expect(screen.getByRole("status")).toHaveTextContent(/subscription has ended/i);
  });

  it("warns during grace WITHOUT claiming anything is blocked yet", () => {
    useBillingState.mockReturnValue({
      subscriptionStatus: "PAST_DUE",
      writesAllowed: true,
      graceEndsAt: "2026-08-30T05:40:41Z",
    });
    render(<ModuleBanner />);
    const banner = screen.getByRole("status");
    expect(banner).toHaveTextContent(/overdue/i);
    expect(banner).toHaveTextContent(/everything still works/i);
  });

  it("names the grace deadline when there is one", () => {
    useBillingState.mockReturnValue({
      subscriptionStatus: "PAST_DUE",
      writesAllowed: true,
      graceEndsAt: "2026-08-30T05:40:41Z",
    });
    render(<ModuleBanner />);
    expect(screen.getByRole("status")).toHaveTextContent(
      new Date("2026-08-30T05:40:41Z").toLocaleDateString()
    );
  });

  it("stays coherent when the deadline is missing", () => {
    useBillingState.mockReturnValue({
      subscriptionStatus: "PAST_DUE",
      writesAllowed: true,
      graceEndsAt: null,
    });
    render(<ModuleBanner />);
    expect(screen.getByRole("status")).toHaveTextContent(/Everything still works, after which/i);
  });

  it("falls back to the module message when billing is fine", () => {
    useHasModule.mockReturnValue(false);
    render(<ModuleBanner />);
    expect(screen.getByRole("status")).toHaveTextContent(/inventory is read-only/i);
  });

  it("prefers the billing message when BOTH apply", () => {
    // Paying is the step that unblocks everything; telling someone their
    // module lapsed would send them to the wrong place entirely.
    useHasModule.mockReturnValue(false);
    useBillingState.mockReturnValue({
      subscriptionStatus: "SUSPENDED",
      writesAllowed: false,
      graceEndsAt: null,
    });
    render(<ModuleBanner />);
    expect(screen.getByRole("status")).toHaveTextContent(/account is suspended/i);
    expect(screen.queryByText(/inventory is read-only/i)).not.toBeInTheDocument();
  });
});
